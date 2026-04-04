"""
Pydantic v2 request/response schemas.
All models use camelCase aliases to match the TypeScript client exactly.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
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
