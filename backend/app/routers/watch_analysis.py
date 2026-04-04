"""
POST /analyze-watch

MAVL (Monitored Area Visual Log) analysis endpoint.
Accepts a chronological sequence of base64-encoded photos of a monitored
body area and returns a trend assessment + key observations via Claude Opus 4.6.

Constraints:
- Maximum 10 photos per call (enforced at schema + router level)
- Photos must be base64-encoded JPEG/PNG/GIF/WebP (validated at schema level)
- Auth: Clerk JWT required (parent account only)
"""

from __future__ import annotations

import json

import anthropic
from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_clerk_jwt
from ..config import settings
from ..prompts import WATCH_ANALYSIS_SYSTEM, watch_analysis_user_content
from ..schemas import WatchAnalysisRequest, WatchAnalysisResponse

router = APIRouter()

_MAX_PHOTOS = 10

# Module-level singleton — avoids creating a new httpx connection pool per request.
# Initialised lazily on first request so settings are resolved after app startup.
_anthropic_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


@router.post("/analyze-watch", response_model=WatchAnalysisResponse)
async def analyze_watch(
    body: WatchAnalysisRequest,
    _claims: dict = Depends(verify_clerk_jwt),
) -> WatchAnalysisResponse:
    if not body.photos:
        raise HTTPException(status_code=400, detail="photos array must not be empty")

    if len(body.photos) > _MAX_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {_MAX_PHOTOS} photos per analysis call",
        )

    client = _get_client()

    # by_alias=False ensures dict keys match the snake_case names used in
    # watch_analysis_user_content() (photo_b64, media_type, etc.), not camelCase aliases.
    user_content = watch_analysis_user_content(
        child_name=body.child_name,
        age=body.age,
        diagnosis=body.diagnosis,
        watch_area=body.watch_area,
        watch_duration_days=body.watch_duration_days,
        triggers=body.triggers,
        photos=[p.model_dump(by_alias=False) for p in body.photos],
    )

    try:
        response = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=WATCH_ANALYSIS_SYSTEM,
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.APIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 500,
            detail=f"Anthropic API error: {exc.message or str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Upstream analysis service unavailable",
        )

    text_block = next(
        (b for b in response.content if b.type == "text"), None
    )
    if not text_block:
        raise HTTPException(status_code=500, detail="Empty response from Claude")

    raw = text_block.text.strip()

    # Strip markdown fences if Claude ignored the instruction
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(
            line for line in lines if not line.startswith("```")
        ).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Claude returned non-JSON response: {exc}",
        )

    valid_trends = {"improving", "stable", "worsening", "insufficient_data"}
    trend = data.get("trend", "insufficient_data")
    if trend not in valid_trends:
        trend = "insufficient_data"

    return WatchAnalysisResponse(
        summary=data.get("summary", ""),
        trend=trend,
        key_observations=data.get("key_observations", []),
        questions_for_doctor=data.get("questions_for_doctor", []),
    )
