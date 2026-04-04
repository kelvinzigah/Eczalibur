"""
POST /generate-plan

Generates a 3-zone Written Action Plan using Claude Opus 4.6.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_clerk_jwt
from ..config import settings
from ..prompts import GENERATE_PLAN_SYSTEM, generate_plan_user_message
from ..schemas import ActionPlan, GeneratePlanRequest, GeneratePlanResponse, ZoneContent

router = APIRouter()


@router.post("/generate-plan", response_model=GeneratePlanResponse)
async def generate_plan(
    body: GeneratePlanRequest,
    _claims: dict = Depends(verify_clerk_jwt),
) -> GeneratePlanResponse:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    user_message = generate_plan_user_message(
        child_name=body.profile.name,
        age=body.profile.age,
        diagnosis=body.profile.diagnosis,
        medications=[m.model_dump(by_alias=False) for m in body.profile.medications],
        triggers=body.profile.triggers,
        affected_areas=body.profile.affected_areas,
        temperature=body.temperature,
        humidity=body.humidity,
        location=body.profile.location,
    )

    try:
        message = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=16000,
            thinking={"type": "enabled", "budget_tokens": 10000},
            system=GENERATE_PLAN_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
    except anthropic.APIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 500,
            detail=f"Anthropic API error: {exc.message}",
        )

    text_block = next((b for b in message.content if b.type == "text"), None)
    if not text_block:
        raise HTTPException(status_code=500, detail="No text response from Claude")

    raw = text_block.text.strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail=f"Claude returned invalid JSON: {raw[:200]}"
        )

    plan = ActionPlan(
        id=str(uuid.uuid4()),
        created_at=datetime.now(timezone.utc).isoformat(),
        green=ZoneContent(**parsed["green"]),
        yellow=ZoneContent(**parsed["yellow"]),
        red=ZoneContent(**parsed["red"]),
        raw=raw,
    )

    return GeneratePlanResponse(plan=plan)
