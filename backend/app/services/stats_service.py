import asyncio
from collections import defaultdict
from datetime import date, timedelta

from neo4j import AsyncDriver

from app.db.queries.stats_queries import (
    get_meal_type_counts,
    get_top_dishes,
    get_top_ingredients,
    get_meals_per_day,
    get_nutrition_flag_counts,
    get_nutrition_flags_per_day,
    get_logging_consistency,
    get_diet_diversity,
    get_meal_timing,
    get_alcohol_stats,
    get_period_macros,
)
from app.models.stats import (
    PeriodStats, DateRange, MealTypeDistribution, DayCount, TopItem,
    NutritionFlags, DayNutritionFlags, LoggingConsistency, DietDiversity,
    MealTimingEntry, AlcoholStats, AlcoholDayDoses, DailyMacros,
)


async def _run(driver: AsyncDriver, fn, user_id: str, start: str, end: str):
    """Open a dedicated session for a single query function."""
    async with driver.session() as session:
        return await fn(session, user_id, start, end)


async def build_stats(driver: AsyncDriver, user_id: str, start: str, end: str, period: str) -> PeriodStats:
    (
        type_counts,
        meals_per_day,
        top_dishes,
        top_ingredients,
        flag_counts,
        flags_per_day_raw,
        consistency,
        diversity,
        timing_raw,
        alcohol_raw,
        macros_raw,
    ) = await asyncio.gather(
        _run(driver, get_meal_type_counts, user_id, start, end),
        _run(driver, get_meals_per_day, user_id, start, end),
        _run(driver, get_top_dishes, user_id, start, end),
        _run(driver, get_top_ingredients, user_id, start, end),
        _run(driver, get_nutrition_flag_counts, user_id, start, end),
        _run(driver, get_nutrition_flags_per_day, user_id, start, end),
        _run(driver, get_logging_consistency, user_id, start, end),
        _run(driver, get_diet_diversity, user_id, start, end),
        _run(driver, get_meal_timing, user_id, start, end),
        _run(driver, get_alcohol_stats, user_id, start, end),
        _run(driver, get_period_macros, user_id, start, end),
    )

    dist = MealTypeDistribution(
        breakfast=type_counts.get("breakfast", 0) or 0,
        lunch=type_counts.get("lunch", 0) or 0,
        dinner=type_counts.get("dinner", 0) or 0,
        snack=type_counts.get("snack", 0) or 0,
    )

    nutrition_flags = NutritionFlags(
        meals_with_vegetables=flag_counts.get("meals_with_vegetables", 0) or 0,
        fruit_count=flag_counts.get("fruit_count", 0) or 0,
        dessert_count=flag_counts.get("dessert_count", 0) or 0,
        ultra_processed_count=flag_counts.get("ultra_processed_count", 0) or 0,
        meals_with_protein=flag_counts.get("meals_with_protein", 0) or 0,
        homemade_count=flag_counts.get("homemade_count", 0) or 0,
        restaurant_count=flag_counts.get("restaurant_count", 0) or 0,
        delivery_count=flag_counts.get("delivery_count", 0) or 0,
        analyzed_count=flag_counts.get("analyzed_count", 0) or 0,
    )

    flags_per_day = [
        DayNutritionFlags(
            date=d["date"],
            total=d.get("total", 0) or 0,
            vegetables=d.get("vegetables", 0) or 0,
            fruits=d.get("fruits", 0) or 0,
            desserts=d.get("desserts", 0) or 0,
            ultra_processed=d.get("ultra_processed", 0) or 0,
            protein=d.get("protein", 0) or 0,
            homemade=d.get("homemade", 0) or 0,
            restaurant=d.get("restaurant", 0) or 0,
            delivery=d.get("delivery", 0) or 0,
        )
        for d in flags_per_day_raw
    ]

    # Fill missing days with zero counts for meals_per_day
    existing_dates = {d["date"]: d["count"] for d in meals_per_day}
    filled_meals_per_day = [
        DayCount(date=day_str, count=existing_dates.get(day_str, 0))
        for day_str in _generate_date_range(start, end)
    ]

    # Build alcohol stats
    alcohol = AlcoholStats(
        total_doses=alcohol_raw.get("total_doses", 0) or 0,
        days_with_alcohol=alcohol_raw.get("days_with_alcohol", 0) or 0,
        doses_per_day=[
            AlcoholDayDoses(date=d["date"], doses=d["doses"])
            for d in (alcohol_raw.get("doses_per_day") or [])
        ],
    )

    # Build daily macros from flat rows
    macros_by_date: dict[str, dict[str, float]] = defaultdict(lambda: {
        "energy_kcal": 0.0, "protein_g": 0.0, "carbohydrate_g": 0.0, "lipid_g": 0.0, "fiber_g": 0.0,
    })
    for row in macros_raw:
        macros_by_date[row["date"]][row["nutrient_key"]] = row["value"]
    daily_macros = [
        DailyMacros(date=d, **nutrients)
        for d, nutrients in sorted(macros_by_date.items())
    ]

    return PeriodStats(
        period=period,
        date_range=DateRange(start=start, end=end),
        total_meals=type_counts.get("total_meals", 0) or 0,
        meal_type_distribution=dist,
        meals_per_day=filled_meals_per_day,
        top_dishes=[TopItem(name=d["name"], count=d["count"]) for d in top_dishes if d["name"]],
        top_ingredients=[TopItem(name=i["name"], count=i["count"]) for i in top_ingredients if i["name"]],
        nutrition_flags=nutrition_flags,
        nutrition_flags_per_day=flags_per_day,
        logging_consistency=LoggingConsistency(
            total_days=consistency.get("total_days", 0) or 0,
            days_with_meals=consistency.get("days_with_meals", 0) or 0,
            gap_days=consistency.get("gap_days", 0) or 0,
        ),
        diet_diversity=DietDiversity(
            unique_ingredients=diversity.get("unique_ingredients", 0) or 0,
            total_uses=diversity.get("total_uses", 0) or 0,
        ),
        meal_timing=[
            MealTimingEntry(meal_type=t["meal_type"], hour=t["hour"], count=t["count"])
            for t in timing_raw
        ],
        alcohol_stats=alcohol,
        daily_macros=daily_macros,
    )


def _generate_date_range(start: str, end: str) -> list[str]:
    s = date.fromisoformat(start)
    e = date.fromisoformat(end)
    return [(s + timedelta(days=i)).isoformat() for i in range((e - s).days + 1)]


def day_range(target_date: str) -> tuple[str, str]:
    return target_date, target_date


def week_range(week_start: str) -> tuple[str, str]:
    start = date.fromisoformat(week_start)
    end = start + timedelta(days=6)
    return week_start, end.isoformat()


def month_range(year: int, month: int) -> tuple[str, str]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start.isoformat(), end.isoformat()
