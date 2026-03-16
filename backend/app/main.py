from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import engine
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    yield
    await engine.dispose()


app = FastAPI(
    title="CAPEX Budget Management Tool",
    description="Backend API for TYTAN Technologies CAPEX budget planning",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
