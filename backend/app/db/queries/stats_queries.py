from neo4j import AsyncSession


async def get_meal_type_counts(session: AsyncSession, user_id: str, start: str, end: str) -> dict:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        RETURN
            count(m) AS total_meals,
            count(CASE WHEN m.meal_type = 'breakfast' THEN 1 END) AS breakfast,
            count(CASE WHEN m.meal_type = 'lunch' THEN 1 END) AS lunch,
            count(CASE WHEN m.meal_type = 'dinner' THEN 1 END) AS dinner,
            count(CASE WHEN m.meal_type = 'snack' THEN 1 END) AS snack
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    record = await result.single()
    if not record:
        return {"total_meals": 0, "breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    return dict(record)


async def get_top_dishes(session: AsyncSession, user_id: str, start: str, end: str, limit: int = 5) -> list[dict]:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        MATCH (m)-[:CONTAINS_DISH]->(d:Dish)
        RETURN d.name AS name, count(d) AS count
        ORDER BY count DESC
        LIMIT $limit
        """,
        user_id=user_id,
        start=start,
        end=end,
        limit=limit,
    )
    return [{"name": r["name"], "count": r["count"]} async for r in result]


async def get_top_ingredients(session: AsyncSession, user_id: str, start: str, end: str, limit: int = 10) -> list[dict]:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        MATCH (m)-[:HAS_INGREDIENT]->(i:Ingredient)
        RETURN i.name AS name, count(i) AS count
        ORDER BY count DESC
        LIMIT $limit
        """,
        user_id=user_id,
        start=start,
        end=end,
        limit=limit,
    )
    return [{"name": r["name"], "count": r["count"]} async for r in result]


async def get_nutrition_flag_counts(session: AsyncSession, user_id: str, start: str, end: str) -> dict:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        RETURN
            count(m) AS total,
            count(CASE WHEN m.has_vegetables = true THEN 1 END) AS meals_with_vegetables,
            count(CASE WHEN m.is_fruit = true THEN 1 END) AS fruit_count,
            count(CASE WHEN m.is_dessert = true THEN 1 END) AS dessert_count,
            count(CASE WHEN m.is_ultra_processed = true THEN 1 END) AS ultra_processed_count,
            count(CASE WHEN m.has_protein = true THEN 1 END) AS meals_with_protein,
            count(CASE WHEN m.meal_source = 'homemade' THEN 1 END) AS homemade_count,
            count(CASE WHEN m.meal_source = 'restaurant' THEN 1 END) AS restaurant_count,
            count(CASE WHEN m.meal_source = 'delivery' THEN 1 END) AS delivery_count,
            count(CASE WHEN m.nutrition_analyzed = true THEN 1 END) AS analyzed_count
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    record = await result.single()
    if not record:
        return {
            "total": 0, "meals_with_vegetables": 0, "fruit_count": 0,
            "dessert_count": 0, "ultra_processed_count": 0,
            "meals_with_protein": 0, "homemade_count": 0,
            "restaurant_count": 0, "delivery_count": 0,
            "analyzed_count": 0,
        }
    return dict(record)


async def get_nutrition_flags_per_day(session: AsyncSession, user_id: str, start: str, end: str) -> list[dict]:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        WITH toString(day.date) AS date, m
        ORDER BY date
        RETURN date,
            count(m) AS total,
            count(CASE WHEN m.has_vegetables = true THEN 1 END) AS vegetables,
            count(CASE WHEN m.is_fruit = true THEN 1 END) AS fruits,
            count(CASE WHEN m.is_dessert = true THEN 1 END) AS desserts,
            count(CASE WHEN m.is_ultra_processed = true THEN 1 END) AS ultra_processed,
            count(CASE WHEN m.has_protein = true THEN 1 END) AS protein,
            count(CASE WHEN m.meal_source = 'homemade' THEN 1 END) AS homemade,
            count(CASE WHEN m.meal_source = 'restaurant' THEN 1 END) AS restaurant,
            count(CASE WHEN m.meal_source = 'delivery' THEN 1 END) AS delivery
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    return [dict(r) async for r in result]


async def get_meals_per_day(session: AsyncSession, user_id: str, start: str, end: str) -> list[dict]:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        RETURN toString(day.date) AS date, count(m) AS count
        ORDER BY date
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    return [{"date": r["date"], "count": r["count"]} async for r in result]


async def get_logging_consistency(session: AsyncSession, user_id: str, start: str, end: str) -> dict:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})
        WITH u, date($start) AS s, date($end) AS e
        WITH u, s, e, duration.inDays(s, e).days + 1 AS total_days
        OPTIONAL MATCH (u)-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= s AND day.date <= e
        WITH total_days, count(DISTINCT day.date) AS days_with_meals
        RETURN total_days, days_with_meals, total_days - days_with_meals AS gap_days
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    record = await result.single()
    if not record:
        return {"total_days": 0, "days_with_meals": 0, "gap_days": 0}
    return dict(record)


async def get_diet_diversity(session: AsyncSession, user_id: str, start: str, end: str) -> dict:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        MATCH (m)-[:HAS_INGREDIENT]->(i:Ingredient)
        RETURN count(DISTINCT i) AS unique_ingredients, count(i) AS total_uses
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    record = await result.single()
    if not record:
        return {"unique_ingredients": 0, "total_uses": 0}
    return dict(record)


async def get_meal_timing(session: AsyncSession, user_id: str, start: str, end: str) -> list[dict]:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        RETURN m.meal_type AS meal_type,
               m.eaten_at.hour AS hour,
               count(*) AS count
        ORDER BY meal_type, hour
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    return [dict(r) async for r in result]


async def get_alcohol_stats(session: AsyncSession, user_id: str, start: str, end: str) -> dict:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED_ALCOHOL]->(a:AlcoholEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        WITH toString(day.date) AS date, sum(a.doses) AS daily_doses
        ORDER BY date
        RETURN collect({date: date, doses: daily_doses}) AS doses_per_day,
               sum(daily_doses) AS total_doses,
               count(date) AS days_with_alcohol
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    record = await result.single()
    if not record:
        return {"total_doses": 0, "days_with_alcohol": 0, "doses_per_day": []}
    return dict(record)


async def get_period_macros(session: AsyncSession, user_id: str, start: str, end: str) -> list[dict]:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
          AND m.nutrition_analyzed = true
        MATCH (m)-[hi:HAS_INGREDIENT]->(i:Ingredient)-[mt:MAPS_TO]->(f:Food)-[r:HAS_NUTRIENT]->(n:Nutrient)
        WHERE n.key IN ['energy_kcal', 'protein_g', 'carbohydrate_g', 'lipid_g', 'fiber_g']
        WITH toString(day.date) AS date,
             n.key AS nutrient_key,
             sum(
               CASE WHEN hi.grams IS NOT NULL
                 THEN r.per_100g * coalesce(mt.fraction, 1.0) * hi.grams / 100.0
                 ELSE r.per_100g * coalesce(mt.fraction, 1.0)
               END
             ) AS daily_total
        RETURN date, nutrient_key, round(daily_total, 1) AS value
        ORDER BY date, nutrient_key
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    return [dict(r) async for r in result]
