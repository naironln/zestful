from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import AsyncSession

from app.dependencies import get_session, get_current_user
from app.models.nutrition import (
    DailyNutrition,
    MappingResult,
    MappingStatus,
    MealNutrition,
    NutrientValue,
    TacoCategory,
    TacoFood,
    TacoFoodDetail,
)
from app.db.queries.taco_queries import (
    get_daily_nutrition,
    get_food_nutrients,
    get_ingredient_mapping_status,
    get_meal_nutrition,
    get_taco_categories,
    search_taco_foods,
)
from app.services.nutrition_mapping_service import map_unmapped_ingredients

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


# ── Meal nutrition ──────────────────────────────────────────────────


@router.get("/meals/{meal_id}", response_model=MealNutrition)
async def meal_nutrition(
    meal_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    data = await get_meal_nutrition(session, meal_id, current_user["id"])
    if not data:
        raise HTTPException(status_code=404, detail="Meal not found")
    return data


@router.get("/daily", response_model=DailyNutrition)
async def daily_nutrition(
    date: str = Query(..., description="YYYY-MM-DD"),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    meals = await get_daily_nutrition(session, current_user["id"], date)

    # Aggregate totals across all meals
    totals_map: dict[str, NutrientValue] = {}
    for meal in meals:
        for n in meal["nutrients"]:
            key = n["key"]
            if key in totals_map:
                totals_map[key].per_100g += n["total"]
            else:
                totals_map[key] = NutrientValue(
                    key=key, name=n["name"], unit=n["unit"], per_100g=n["total"]
                )

    return DailyNutrition(
        date=date,
        meals=[
            {
                "meal_id": m["meal_id"],
                "meal_type": m["meal_type"],
                "dish_name": m["dish_name"],
                "nutrients": [
                    {"key": n["key"], "name": n["name"], "unit": n["unit"], "per_100g": n["total"]}
                    for n in m["nutrients"]
                ],
            }
            for m in meals
        ],
        totals=list(totals_map.values()),
    )


# ── TACO food database ─────────────────────────────────────────────


@router.get("/taco/search", response_model=list[TacoFood])
async def search_foods(
    q: str = Query(..., min_length=2, description="Search term"),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    return await search_taco_foods(session, q, limit)


@router.get("/taco/categories", response_model=list[TacoCategory])
async def list_categories(
    session: AsyncSession = Depends(get_session),
):
    return await get_taco_categories(session)


@router.get("/taco/{taco_id}", response_model=TacoFoodDetail)
async def food_detail(
    taco_id: int,
    session: AsyncSession = Depends(get_session),
):
    data = await get_food_nutrients(session, taco_id)
    if not data:
        raise HTTPException(status_code=404, detail="TACO food not found")
    return data


# ── Ingredient mapping ──────────────────────────────────────────────


@router.get("/mapping/status", response_model=MappingStatus)
async def mapping_status(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    return await get_ingredient_mapping_status(session)


@router.post("/mapping/run", response_model=MappingResult)
async def run_mapping(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Trigger batch mapping of unmapped ingredients to TACO foods using Claude."""
    return await map_unmapped_ingredients(session)
