"""
POST /appointment-summary

Generates a clinical pre-appointment summary for the dermatologist.
Uses Claude Opus 4.6 with extended thinking.
"""

from __future__ import annotations

import anthropic
from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_clerk_jwt
from ..config import settings
from ..log_context import compute_log_summary
from ..prompts import APPOINTMENT_SUMMARY_SYSTEM, appointment_summary_user_message
from ..schemas import AppointmentSummaryRequest, AppointmentSummaryResponse

router = APIRouter()


@router.post("/appointment-summary", response_model=AppointmentSummaryResponse)
async def appointment_summary(
    body: AppointmentSummaryRequest,
    _claims: dict = Depends(verify_clerk_jwt),
) -> AppointmentSummaryResponse:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    log_summary = compute_log_summary(body.logs, body.appointment_date)

    user_message = appointment_summary_user_message(
        child_name=body.profile.name,
        age=body.profile.age,
        diagnosis=body.profile.diagnosis,
        medications=[m.model_dump(by_alias=False) for m in body.profile.medications],
        affected_areas=body.profile.affected_areas,
        triggers=body.profile.triggers,
        appointment_date=body.appointment_date,
        log_summary=log_summary,
    )

    try:
        async with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=8000,
            thinking={"type": "enabled", "budget_tokens": 5000},
            system=APPOINTMENT_SUMMARY_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
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
    summary = text_block.text if text_block else ""

    return AppointmentSummaryResponse(summary=summary)
