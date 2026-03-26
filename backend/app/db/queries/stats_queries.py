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
