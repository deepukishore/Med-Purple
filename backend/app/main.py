import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from time import monotonic
from collections import defaultdict, deque
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import is_development_origin
from app.services.seed import seed_content
from app.api import (
    auth,
    dashboard,
    mcqs,
    medbytes,
    anatomy,
    collections,
    planner,
    community,
    tutor,
    lectures,
    progress,
    resources,
    doubts,
    profiles,
    activities,
    features,
    productivity,
    realtime,
    stories,
)

logger = logging.getLogger(__name__)


async def story_maintenance():
    while True:
        await asyncio.sleep(60)
        try:
            stories.run_story_maintenance()
        except Exception:
            logger.exception("Study story scheduled publishing or expiry cleanup failed.")


@asynccontextmanager
async def lifespan(app):
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
        if settings.seed_content:
            seed_content(db)
    maintenance = asyncio.create_task(story_maintenance())
    try:
        yield
    finally:
        maintenance.cancel()
        with suppress(asyncio.CancelledError):
            await maintenance


app = FastAPI(
    title="Med Purple API",
    version="1.0.0",
    description="Shared study API for the React web and Expo apps.",
    lifespan=lifespan,
)


class LocalNetworkCORSMiddleware(CORSMiddleware):
    def is_allowed_origin(self, origin: str) -> bool:
        return super().is_allowed_origin(origin) or (
            settings.environment == "development" and is_development_origin(origin)
        )


app.add_middleware(
    LocalNetworkCORSMiddleware,
    allow_origins=[
        origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Client"],
)
# Local protection. Configure shared gateway limits before horizontally scaling.
buckets = defaultdict(deque)


@app.middleware("http")
async def protect(request: Request, call_next):
    if request.url.path.startswith("/api/v1/auth/") and request.method == "POST":
        key = request.client.host if request.client else "unknown"
        now = monotonic()
        window = buckets[key]
        while window and window[0] < now - 60:
            window.popleft()
        if len(window) >= 40:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again in a minute."},
                headers={"Retry-After": "60"},
            )
        window.append(now)
        if len(buckets) > 10000:
            for k in list(buckets):
                if not buckets[k] or buckets[k][-1] < now - 60:
                    del buckets[k]
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


for module in (
    auth,
    dashboard,
    mcqs,
    medbytes,
    anatomy,
    collections,
    planner,
    community,
    tutor,
    lectures,
    progress,
    resources,
    doubts,
    profiles,
    activities,
    features,
    productivity,
    realtime,
    stories,
):
    app.include_router(module.router, prefix="/api/v1")
app.mount(
    "/media", StaticFiles(directory=Path(__file__).parent / "media"), name="media"
)


@app.get("/health", tags=["Operations"])
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok", "version": "1.0.0"}
