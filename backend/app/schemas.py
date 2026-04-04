"""
Pydantic v2 request/response schemas.
All models use camelCase aliases to match the TypeScript client exactly.
"""

from __future__ import annotations

from typing import Literal

import base64

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    """Base model with camelCase JSON aliases (input + output)."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


# ─── Shared sub-models ───────────────────────────────────────────────────────


class Medication(_CamelModel):
    name: str
    frequency: str
    instructions: str


class ZoneContent(_CamelModel):
    parent_instructions: list[str]
    child_instructions: list[str]
    icon: str
    color: str


class ActionPlan(_CamelModel):
    id: str
    created_at: str
    green: ZoneContent
    yellow: ZoneContent
    red: ZoneContent
    raw: str


# ─── Flare log ───────────────────────────────────────────────────────────────


class FlareLog(_CamelModel):
    id: str
    child_id: str
    timestamp: str
    zone: Literal["green", "yellow", "red"]
    mood_score: int
    affected_areas: list[str]
    notes: str
    photo_uri: str | None
    photo_uris: list[str] | None = None
    points_awarded: int


# ─── Generate plan ───────────────────────────────────────────────────────────


class GeneratePlanProfile(_CamelModel):
    name: str
    age: int
    location: str
    diagnosis: str
    medications: list[Medication]
    triggers: list[str]
    affected_areas: list[str]


class GeneratePlanRequest(_CamelModel):
    profile: GeneratePlanProfile
    temperature: float
    humidity: float


class GeneratePlanResponse(_CamelModel):
    plan: ActionPlan


# ─── Chat ────────────────────────────────────────────────────────────────────


class ChatMessage(_CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatProfile(_CamelModel):
    name: str
    age: int
    diagnosis: str
    medications: list[Medication]
    triggers: list[str]


class ChatRequest(_CamelModel):
    messages: list[ChatMessage]
    recent_logs: list[FlareLog] = []
    profile: ChatProfile


class ChatResponse(_CamelModel):
    message: str


# ─── Appointment summary ──────────────────────────────────────────────────────


class AppointmentSummaryRequest(_CamelModel):
    profile: GeneratePlanProfile
    logs: list[FlareLog] = []
    appointment_date: str


class AppointmentSummaryResponse(_CamelModel):
    summary: str


# ─── MAVL — Watch analysis ────────────────────────────────────────────────────


_ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_MAX_PHOTO_B64_BYTES = 2_800_000  # ~2.7 MB base64 ≈ 2 MB decoded


class WatchPhoto(_CamelModel):
    """A single dated photo entry from a MAVL watch session."""

    # base64-encoded image bytes; data-URI prefix stripped automatically
    photo_b64: str
    # restricted to types the Anthropic vision API accepts
    media_type: Literal["image/jpeg", "image/png", "image/gif", "image/webp"] = "image/jpeg"
    timestamp: str          # ISO 8601 timestamp when photo was taken
    area: str               # e.g., "left elbow crease"
    notes: str | None = None  # optional child-entered observation

    @field_validator("photo_b64")
    @classmethod
    def strip_and_validate_b64(cls, v: str) -> str:
        # Strip data-URI prefix that React Native / Expo sometimes produces
        if "base64," in v:
            v = v.split("base64,", 1)[1]
        v = v.strip()
        if not v:
            raise ValueError("photo_b64 must not be empty")
        if len(v) > _MAX_PHOTO_B64_BYTES:
            raise ValueError(
                f"photo_b64 exceeds maximum allowed size ({_MAX_PHOTO_B64_BYTES} chars). "
                "Compress the image before uploading."
            )
        # Validate that the remaining string is valid base64
        try:
            base64.b64decode(v, validate=True)
        except Exception:
            raise ValueError("photo_b64 is not valid base64")
        return v

    @field_validator("notes")
    @classmethod
    def cap_notes(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 500:
            raise ValueError("notes must not exceed 500 characters")
        return v


class WatchAnalysisRequest(_CamelModel):
    child_name: str = Field(min_length=1, max_length=100)
    age: int
    diagnosis: str = Field(min_length=1, max_length=200)
    watch_area: str = Field(min_length=1, max_length=100)  # body area being monitored
    watch_duration_days: int  # 7, 14, or 21
    photos: list[WatchPhoto]  # 1–10 photos, oldest → newest
    triggers: list[str] = []


class WatchAnalysisResponse(_CamelModel):
    summary: str
    trend: Literal["improving", "stable", "worsening", "insufficient_data"]
    key_observations: list[str]
    questions_for_doctor: list[str]
