from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from neo4j import AsyncSession

from app.dependencies import get_session, get_current_user
from app.models.meal import MealEntryOut, MealPatch, MealCorrection, MealDetail
from app.models.comment import CommentOut
from app.db.queries.meal_queries import patch_meal
from app.db.queries.comment_queries import get_meal_comments, get_week_comments
from app.services.meal_service import (
    upload_meal,
    list_meals,
    get_meal,
    correct_meal,
    analyze_meal_nutrition,
    get_meal_detail_full,
    delete_meal_for_user,
)

router = APIRouter(prefix="/meals", tags=["meals"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@router.post("/upload", response_model=MealEntryOut, status_code=201)
async def upload(
    file: UploadFile = File(...),
    notes: str | None = Form(None),
    eaten_at: str | None = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}",
        )
    return await upload_meal(session, current_user["id"], file, notes, eaten_at)


@router.get("", response_model=list[MealEntryOut])
async def get_meals(
    start: str,
    end: str,
    meal_type: str | None = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    return await list_meals(session, current_user["id"], start, end, meal_type)


@router.get("/comments/week", response_model=list[CommentOut])
async def get_my_week_comments(
    week_start: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Patient views nutritionist comments for a given week."""
    return await get_week_comments(session, current_user["id"], week_start, current_user["id"])


@router.get("/{meal_id}/comments", response_model=list[CommentOut])
async def get_my_meal_comments(
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Patient views nutritionist comments on one of their meals."""
    return await get_meal_comments(session, meal_id, current_user["id"])


@router.get("/{meal_id}", response_model=MealEntryOut)
async def get_meal_detail(
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    meal = await get_meal(session, current_user["id"], meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    return meal


@router.patch("/{meal_id}", response_model=MealEntryOut)
async def update_meal(
    meal_id: str,
    data: MealPatch,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    meal = await patch_meal(session, meal_id, current_user["id"], updates)
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    meal["ingredients"] = []
    from app.services.meal_service import _meal_record_to_out
    return _meal_record_to_out(meal)


@router.post("/{meal_id}/analyze-nutrition", response_model=MealDetail)
async def analyze_nutrition_endpoint(
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    result = await analyze_meal_nutrition(session, current_user["id"], meal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Meal not found or image unavailable")
    return result


@router.get("/{meal_id}/detail", response_model=MealDetail)
async def meal_detail_endpoint(
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    result = await get_meal_detail_full(session, current_user["id"], meal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Meal not found")
    return result


@router.post("/{meal_id}/correct", response_model=MealEntryOut)
async def correct_meal_endpoint(
    meal_id: str,
    data: MealCorrection,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    meal = await correct_meal(session, current_user["id"], meal_id, data.correction)
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    return meal


@router.delete("/{meal_id}", status_code=204)
async def remove_meal(
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    deleted = await delete_meal_for_user(session, current_user["id"], meal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meal not found")
