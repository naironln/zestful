from fastapi import APIRouter, Depends, Query
from neo4j import AsyncSession

from app.dependencies import get_session, require_nutritionist
from app.models.meal import MealEntryOut
from app.models.stats import PeriodStats
from app.models.user import UserOut
from app.db.queries.user_queries import get_patients_for_nutritionist, link_patient_to_nutritionist
from app.db.queries.nutrition_queries import get_patient_meals
from app.services.meal_service import _meal_record_to_out
from app.services.stats_service import build_stats, week_range, month_range

router = APIRouter(prefix="/nutritionist", tags=["nutritionist"])


@router.get("/patients", response_model=list[UserOut])
async def list_patients(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    patients = await get_patients_for_nutritionist(session, current_user["id"])
    return [UserOut(id=p["id"], email=p["email"], name=p["name"], role=p["role"]) for p in patients]


@router.post("/patients/{patient_id}/link", status_code=204)
async def link_patient(
    patient_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    await link_patient_to_nutritionist(session, current_user["id"], patient_id)


@router.get("/patients/{patient_id}/meals", response_model=list[MealEntryOut])
async def patient_meals(
    patient_id: str,
    start: str = Query(...),
    end: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    meals = await get_patient_meals(session, current_user["id"], patient_id, start, end)
    return [_meal_record_to_out(m) for m in meals]


@router.get("/patients/{patient_id}/stats/week", response_model=PeriodStats)
async def patient_stats_week(
    patient_id: str,
    week_start: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    start, end = week_range(week_start)
    return await build_stats(session, patient_id, start, end, "week")


@router.get("/patients/{patient_id}/stats/month", response_model=PeriodStats)
async def patient_stats_month(
    patient_id: str,
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    start, end = month_range(year, month)
    return await build_stats(session, patient_id, start, end, "month")
