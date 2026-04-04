"""
Eczalibur FastAPI backend.
Serves Claude API calls that were previously handled by Expo +api.ts routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import appointment, chat, generate_plan

app = FastAPI(title="Eczalibur API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_plan.router)
app.include_router(chat.router)
app.include_router(appointment.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
