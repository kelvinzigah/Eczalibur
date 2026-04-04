"""
POST /chat

Parent chat grounded in flare log data. Never diagnoses or prescribes.
Uses Claude Opus 4.6.
"""

from __future__ import annotations

import anthropic
from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_clerk_jwt
from ..config import settings
from ..log_context import build_chat_log_context
from ..prompts import CHAT_SYSTEM
from ..schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    _claims: dict = Depends(verify_clerk_jwt),
) -> ChatResponse:
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages array must not be empty")

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    log_context = build_chat_log_context(body.recent_logs)
    meds_str = ", ".join(m.name for m in body.profile.medications) or "none"
    triggers_str = ", ".join(body.profile.triggers) or "none"

    system_with_context = (
        f"{CHAT_SYSTEM}\n\n---\nCHILD PROFILE:\n"
        f"Name: {body.profile.name}, Age: {body.profile.age}, "
        f"Diagnosis: {body.profile.diagnosis}\n"
        f"Medications: {meds_str}\n"
        f"Known triggers: {triggers_str}\n\n"
        f"{log_context}"
    )

    try:
        async with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=system_with_context,
            messages=[{"role": m.role, "content": m.content} for m in body.messages],
        ) as stream:
            final_message = await stream.get_final_message()
    except anthropic.APIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 500,
            detail=f"Anthropic API error: {exc.message}",
        )

    text_block = next(
        (b for b in final_message.content if b.type == "text"), None
    )
    text = text_block.text if text_block else ""

    return ChatResponse(message=text)
