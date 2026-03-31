from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from neo4j import AsyncDriver, AsyncSession

from app.db.neo4j_driver import get_driver
from app.dependencies import get_session, require_nutritionist
from app.models.meal import MealEntryOut, MealDetail
from app.models.stats import PeriodStats
from app.models.user import UserOut, OutboundLinkRequestOut
from app.models.comment import CommentCreate, CommentOut, WeekCommentCreate, MealCommentsMap
from app.db.queries.user_queries import (
    get_patients_for_nutritionist,
    get_user_by_email,
    create_link_request,
    get_outbound_requests_for_nutritionist,
)
from app.db.queries.nutrition_queries import get_patient_meals
from app.db.queries.comment_queries import (
    create_meal_comment,
    create_week_comment,
    get_meal_comments,
    get_meal_comments_by_date_range,
    get_week_comments,
    update_comment,
    delete_comment,
)
from app.services.meal_service import _meal_record_to_out, get_meal_detail_full_for_nutritionist
from app.services.stats_service import build_stats, week_range, month_range
from app.models.alcohol import AlcoholDaySummary
from app.db.queries.alcohol_queries import get_alcohol_entries_for_patient
from app.services.alcohol_service import group_into_day_summaries

router = APIRouter(prefix="/nutritionist", tags=["nutritionist"])


@router.get("/patients", response_model=list[UserOut])
async def list_patients(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    patients = await get_patients_for_nutritionist(session, current_user["id"])
    return [UserOut(id=p["id"], email=p["email"], name=p["name"], role=p["role"]) for p in patients]


class LinkByEmailRequest(BaseModel):
    email: EmailStr


@router.post("/patients/link-by-email", response_model=OutboundLinkRequestOut, status_code=202)
async def link_patient_by_email(
    data: LinkByEmailRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    patient = await get_user_by_email(session, data.email)
    if not patient or patient.get("role") != "patient":
        raise HTTPException(status_code=404, detail="Paciente não encontrado com esse e-mail.")
    request = await create_link_request(session, current_user["id"], patient["id"])
    if not request:
        raise HTTPException(status_code=409, detail="Já existe uma solicitação pendente ou vínculo ativo com este paciente.")
    return OutboundLinkRequestOut(**request)


@router.get("/patients/pending-requests", response_model=list[OutboundLinkRequestOut])
async def list_pending_requests(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    requests = await get_outbound_requests_for_nutritionist(session, current_user["id"])
    return [OutboundLinkRequestOut(**r) for r in requests]


@router.get("/patients/{patient_id}/meals/{meal_id}/detail", response_model=MealDetail)
async def patient_meal_detail(
    patient_id: str,
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    from fastapi import HTTPException
    result = await get_meal_detail_full_for_nutritionist(session, current_user["id"], patient_id, meal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Meal not found or access denied")
    return result


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
    driver: AsyncDriver = Depends(get_driver),
    current_user: dict = Depends(require_nutritionist),
):
    start, end = week_range(week_start)
    return await build_stats(driver, patient_id, start, end, "week")


@router.get("/patients/{patient_id}/stats/month", response_model=PeriodStats)
async def patient_stats_month(
    patient_id: str,
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    driver: AsyncDriver = Depends(get_driver),
    current_user: dict = Depends(require_nutritionist),
):
    start, end = month_range(year, month)
    return await build_stats(driver, patient_id, start, end, "month")


@router.get("/patients/{patient_id}/comments/meals", response_model=MealCommentsMap)
async def batch_meal_comments(
    patient_id: str,
    start: str = Query(...),
    end: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    """Nutritionist: get all meal comments for a patient's meals in a date range."""
    grouped = await get_meal_comments_by_date_range(
        session, patient_id, start, end, current_user["id"]
    )
    return MealCommentsMap(comments_by_meal=grouped)


# ── Comment endpoints ─────────────────────────────────────────────────────────

@router.post(
    "/patients/{patient_id}/meals/{meal_id}/comments",
    response_model=CommentOut,
    status_code=201,
)
async def add_meal_comment(
    patient_id: str,
    meal_id: str,
    data: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    return await create_meal_comment(session, current_user["id"], patient_id, meal_id, data.content)


@router.get("/patients/{patient_id}/meals/{meal_id}/comments", response_model=list[CommentOut])
async def list_meal_comments(
    patient_id: str,
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    return await get_meal_comments(session, meal_id, current_user["id"])


@router.post(
    "/patients/{patient_id}/comments/week",
    response_model=CommentOut,
    status_code=201,
)
async def add_week_comment(
    patient_id: str,
    data: WeekCommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    return await create_week_comment(session, current_user["id"], patient_id, data.week_start, data.content)


@router.get("/patients/{patient_id}/comments/week", response_model=list[CommentOut])
async def list_week_comments(
    patient_id: str,
    week_start: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    return await get_week_comments(session, patient_id, week_start, current_user["id"])


@router.patch("/comments/{comment_id}", response_model=CommentOut)
async def edit_comment(
    comment_id: str,
    data: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    return await update_comment(session, current_user["id"], comment_id, data.content)


@router.delete("/comments/{comment_id}", status_code=204)
async def remove_comment(
    comment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    await delete_comment(session, current_user["id"], comment_id)


# ── Alcohol endpoints ──────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/alcohol", response_model=list[AlcoholDaySummary])
async def patient_alcohol(
    patient_id: str,
    start: str = Query(...),
    end: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_nutritionist),
):
    records = await get_alcohol_entries_for_patient(
        session, current_user["id"], patient_id, start, end
    )
    return group_into_day_summaries(records)
