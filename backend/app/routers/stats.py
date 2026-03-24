from fastapi import APIRouter, Depends, Query
from neo4j import AsyncSession

from app.dependencies import get_session, get_current_user
from app.models.stats import PeriodStats
from app.services.stats_service import build_stats, day_range, week_range, month_range

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/day", response_model=PeriodStats)
async def stats_day(
    date: str = Query(..., description="YYYY-MM-DD"),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    start, end = day_range(date)
    return await build_stats(session, current_user["id"], start, end, "day")


@router.get("/week", response_model=PeriodStats)
async def stats_week(
    week_start: str = Query(..., description="YYYY-MM-DD (Monday)"),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    start, end = week_range(week_start)
    return await build_stats(session, current_user["id"], start, end, "week")


@router.get("/month", response_model=PeriodStats)
async def stats_month(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    start, end = month_range(year, month)
    return await build_stats(session, current_user["id"], start, end, "month")
