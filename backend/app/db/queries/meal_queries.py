from neo4j import AsyncSession


async def create_meal_entry(session: AsyncSession, data: dict) -> dict:
    """Create MealEntry node, Dish nodes, Ingredient nodes, Day node, and all relationships."""
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})
        CREATE (m:MealEntry {
            id: $id,
            meal_type: $meal_type,
            dish_name: $dish_name,
            eaten_at: datetime($eaten_at),
            logged_at: datetime(),
            image_path: $image_path,
            raw_llm_response: $raw_llm_response,
            notes: $notes,
            confidence: $confidence
        })
        MERGE (day:Day {date: date($date)})
        CREATE (u)-[:LOGGED]->(m)
        CREATE (m)-[:ON_DAY]->(day)
        WITH m
        UNWIND $ingredients AS ing_name
            MERGE (i:Ingredient {name: toLower(ing_name)})
            MERGE (m)-[:HAS_INGREDIENT]->(i)
        WITH m
        MERGE (d:Dish {name: toLower($dish_name)})
        MERGE (m)-[:CONTAINS_DISH]->(d)
        RETURN m
        """,
        **data,
    )
    record = await result.single()
    return dict(record["m"])


async def get_meal_with_details(session: AsyncSession, meal_id: str, user_id: str) -> dict | None:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        OPTIONAL MATCH (m)-[:HAS_INGREDIENT]->(i:Ingredient)
        RETURN m, collect(i.name) AS ingredients
        """,
        meal_id=meal_id,
        user_id=user_id,
    )
    record = await result.single()
    if not record:
        return None
    meal = dict(record["m"])
    meal["ingredients"] = record["ingredients"]
    return meal


async def get_meals_by_range(
    session: AsyncSession, user_id: str, start: str, end: str, meal_type: str | None = None
) -> list[dict]:
    type_filter = "AND m.meal_type = $meal_type" if meal_type else ""
    result = await session.run(
        f"""
        MATCH (u:User {{id: $user_id}})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        {type_filter}
        OPTIONAL MATCH (m)-[:HAS_INGREDIENT]->(i:Ingredient)
        RETURN m, collect(i.name) AS ingredients, day.date AS date
        ORDER BY m.eaten_at DESC
        """,
        user_id=user_id,
        start=start,
        end=end,
        meal_type=meal_type,
    )
    meals = []
    async for record in result:
        meal = dict(record["m"])
        meal["ingredients"] = record["ingredients"]
        meals.append(meal)
    return meals


async def patch_meal(session: AsyncSession, meal_id: str, user_id: str, updates: dict) -> dict | None:
    set_clauses = ", ".join(f"m.{k} = ${k}" for k in updates)
    result = await session.run(
        f"""
        MATCH (u:User {{id: $user_id}})-[:LOGGED]->(m:MealEntry {{id: $meal_id}})
        SET {set_clauses}
        RETURN m
        """,
        meal_id=meal_id,
        user_id=user_id,
        **updates,
    )
    record = await result.single()
    return dict(record["m"]) if record else None


async def delete_meal(session: AsyncSession, meal_id: str, user_id: str) -> bool:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        DETACH DELETE m
        RETURN count(m) AS deleted
        """,
        meal_id=meal_id,
        user_id=user_id,
    )
    record = await result.single()
    return record["deleted"] > 0 if record else False
