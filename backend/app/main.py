from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db import engine
from app.rate_limit import limiter
from app.api.facilities import router as facilities_router
from app.api.departments import router as departments_router
from app.api.work_areas import router as work_areas_router
from app.api.cost_items import router as cost_items_router
from app.api.summary import router as summary_router
from app.api.attachments import router as attachments_router
from app.api.import_export import router as import_export_router
from app.api.budget_adjustments import router as budget_adjustments_router
from app.api.audit import router as audit_router
from app.api.bulk_operations import router as bulk_operations_router
from app.api.dashboard import router as dashboard_router
from app.api.export import router as export_router
from app.api.comparison import router as comparison_router
from app.api.transfers import router as transfers_router
from app.api.permissions import router as permissions_router
from app.api.users import router as users_router
from app.api.config import router as config_router
from app.api.data import router as data_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    yield
    await engine.dispose()


# ── Disable docs when not in debug mode ──────────────────────────────────
_docs_url = "/docs" if settings.DEBUG else None
_redoc_url = "/redoc" if settings.DEBUG else None

app = FastAPI(
    title="CAPEX Budget Management Tool",
    description="Backend API for TYTAN Technologies CAPEX budget planning",
    version="2.1",
    lifespan=lifespan,
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

# ── Rate limiting ────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — explicit method list instead of wildcard ──────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ── Security headers middleware ──────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


# ── Routers ──────────────────────────────────────────────────────────────
app.include_router(facilities_router)
app.include_router(departments_router)
app.include_router(work_areas_router)
app.include_router(cost_items_router)
app.include_router(summary_router)
app.include_router(import_export_router)
app.include_router(export_router)
app.include_router(attachments_router)
app.include_router(budget_adjustments_router)
app.include_router(audit_router)
app.include_router(bulk_operations_router)
app.include_router(dashboard_router)
app.include_router(comparison_router)
app.include_router(transfers_router)
app.include_router(permissions_router)
app.include_router(users_router)
app.include_router(config_router)
app.include_router(data_router)


# ── Health check ─────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "version": "2.1",
        "auth": "disabled" if settings.AUTH_DISABLED else "enabled",
        "debug": settings.DEBUG,
    }
