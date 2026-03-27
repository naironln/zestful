from neo4j import AsyncSession


async def get_stats_for_range(session: AsyncSession, user_id: str, start: str, end: str) -> dict:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        OPTIONAL MATCH (m)-[:HAS_INGREDIENT]->(i:Ingredient)
        OPTIONAL MATCH (m)-[:CONTAINS_DISH]->(d:Dish)
        WITH m, day, collect(DISTINCT i.name) AS ingredients, collect(DISTINCT d.name) AS dishes
        RETURN
            count(m) AS total_meals,
            collect({type: m.meal_type, date: toString(day.date)}) AS meal_entries,
            collect(DISTINCT {name: dishes[0], meal_id: m.id}) AS dish_entries,
            [x IN collect(ingredients) | x] AS all_ingredients
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    record = await result.single()
    if not record:
        return {"total_meals": 0, "meal_entries": [], "dish_entries": [], "all_ingredients": []}
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
            count(CASE WHEN m.meal_source = 'delivery' THEN 1 END) AS delivery_count
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
