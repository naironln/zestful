from collections import Counter
from datetime import date, timedelta

from neo4j import AsyncSession

from app.db.queries.stats_queries import (
    get_stats_for_range,
    get_top_dishes,
    get_top_ingredients,
    get_meals_per_day,
)
from app.models.stats import PeriodStats, DateRange, MealTypeDistribution, DayCount, TopItem


async def build_stats(session: AsyncSession, user_id: str, start: str, end: str, period: str) -> PeriodStats:
    raw = await get_stats_for_range(session, user_id, start, end)
    meals_per_day = await get_meals_per_day(session, user_id, start, end)
    top_dishes = await get_top_dishes(session, user_id, start, end)
    top_ingredients = await get_top_ingredients(session, user_id, start, end)

    # Meal type distribution
    type_counts: Counter = Counter()
    for entry in raw.get("meal_entries", []):
        type_counts[entry["type"]] += 1

    dist = MealTypeDistribution(
        breakfast=type_counts.get("breakfast", 0),
        lunch=type_counts.get("lunch", 0),
        dinner=type_counts.get("dinner", 0),
        snack=type_counts.get("snack", 0),
    )

    return PeriodStats(
        period=period,
        date_range=DateRange(start=start, end=end),
        total_meals=raw.get("total_meals", 0) or 0,
        meal_type_distribution=dist,
        meals_per_day=[DayCount(date=d["date"], count=d["count"]) for d in meals_per_day],
        top_dishes=[TopItem(name=d["name"], count=d["count"]) for d in top_dishes if d["name"]],
        top_ingredients=[TopItem(name=i["name"], count=i["count"]) for i in top_ingredients if i["name"]],
    )


def day_range(target_date: str) -> tuple[str, str]:
    return target_date, target_date


def week_range(week_start: str) -> tuple[str, str]:
    start = date.fromisoformat(week_start)
    end = start + timedelta(days=6)
    return week_start, end.isoformat()


def month_range(year: int, month: int) -> tuple[str, str]:
    start = date(year, month, 1)
    # Last day of month
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start.isoformat(), end.isoformat()
