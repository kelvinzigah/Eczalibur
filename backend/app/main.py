"""
Eczalibur FastAPI backend.
Serves Claude API calls that were previously handled by Expo +api.ts routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .routers import appointment, chat, generate_plan, watch_analysis

app = FastAPI(title="Eczalibur API", version="1.0.0")

# Hard ceiling on /analyze-watch request body: 10 photos × 2.8 MB each + JSON overhead
_WATCH_BODY_LIMIT = 30 * 1024 * 1024  # 30 MB


class WatchBodySizeLimit(BaseHTTPMiddleware):
    """Reject /analyze-watch requests that exceed the payload ceiling before reading the body."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/analyze-watch":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > _WATCH_BODY_LIMIT:
                return Response(
                    content="Request payload too large",
                    status_code=413,
                )
        return await call_next(request)


app.add_middleware(WatchBodySizeLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_plan.router)
app.include_router(chat.router)
app.include_router(appointment.router)
app.include_router(watch_analysis.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
