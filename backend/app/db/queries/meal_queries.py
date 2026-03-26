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
        MERGE (d:Dish {name: toLower($dish_name)})
        MERGE (m)-[:CONTAINS_DISH]->(d)
        FOREACH (ing_name IN $ingredients |
            MERGE (i:Ingredient {name: toLower(ing_name)})
            MERGE (m)-[:HAS_INGREDIENT]->(i)
        )
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


async def apply_meal_correction(
    session: AsyncSession, meal_id: str, user_id: str, dish_name: str, ingredients: list[str]
) -> dict | None:
    """Update dish_name and replace all ingredients for a meal."""
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        // Remove existing ingredient and dish relationships
        OPTIONAL MATCH (m)-[ri:HAS_INGREDIENT]->()
        DELETE ri
        WITH m
        OPTIONAL MATCH (m)-[rd:CONTAINS_DISH]->()
        DELETE rd
        WITH m
        SET m.dish_name = $dish_name
        MERGE (d:Dish {name: toLower($dish_name)})
        MERGE (m)-[:CONTAINS_DISH]->(d)
        FOREACH (ing_name IN $ingredients |
            MERGE (i:Ingredient {name: toLower(ing_name)})
            MERGE (m)-[:HAS_INGREDIENT]->(i)
        )
        RETURN m
        """,
        meal_id=meal_id,
        user_id=user_id,
        dish_name=dish_name,
        ingredients=ingredients,
    )
    record = await result.single()
    if not record:
        return None
    meal = dict(record["m"])
    meal["ingredients"] = ingredients
    return meal


async def save_portion_estimates(
    session: AsyncSession, meal_id: str, user_id: str,
    portions: list[dict], plate_composition: list[dict],
) -> bool:
    """Save grams on HAS_INGREDIENT relationships and plate_composition on MealEntry."""
    import json
    # Save plate_composition as JSON string on MealEntry
    await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        SET m.plate_composition = $plate_composition,
            m.nutrition_analyzed = true
        """,
        meal_id=meal_id,
        user_id=user_id,
        plate_composition=json.dumps(plate_composition, ensure_ascii=False),
    )
    # Update grams on each HAS_INGREDIENT relationship
    for p in portions:
        await session.run(
            """
            MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
            MATCH (m)-[r:HAS_INGREDIENT]->(i:Ingredient {name: toLower($ingredient)})
            SET r.grams = $grams
            """,
            meal_id=meal_id,
            user_id=user_id,
            ingredient=p["ingredient"],
            grams=p["grams"],
        )
    return True


async def get_meal_full_detail(session: AsyncSession, meal_id: str, user_id: str) -> dict | None:
    """Get meal with ingredients (including grams) and plate_composition."""
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        OPTIONAL MATCH (m)-[r:HAS_INGREDIENT]->(i:Ingredient)
        RETURN m,
            collect({name: i.name, grams: r.grams}) AS ingredients_detail
        """,
        meal_id=meal_id,
        user_id=user_id,
    )
    record = await result.single()
    if not record:
        return None
    meal = dict(record["m"])
    meal["ingredients_detail"] = record["ingredients_detail"]
    return meal


async def get_meal_full_detail_nutritionist(
    session: AsyncSession, nutritionist_id: str, patient_id: str, meal_id: str
) -> dict | None:
    """Get full meal detail for a nutritionist who supervises the patient."""
    result = await session.run(
        """
        MATCH (:User {id: $nutritionist_id})-[:SUPERVISES]->(p:User {id: $patient_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        OPTIONAL MATCH (m)-[r:HAS_INGREDIENT]->(i:Ingredient)
        RETURN m,
            collect({name: i.name, grams: r.grams}) AS ingredients_detail
        """,
        nutritionist_id=nutritionist_id,
        patient_id=patient_id,
        meal_id=meal_id,
    )
    record = await result.single()
    if not record:
        return None
    meal = dict(record["m"])
    meal["ingredients_detail"] = record["ingredients_detail"]
    return meal


async def delete_meal(session: AsyncSession, meal_id: str, user_id: str) -> tuple[bool, str | None]:
    """Remove meal node; returns (True, image_path) if deleted, (False, None) if not found."""
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        WITH m, m.image_path AS image_path
        DETACH DELETE m
        RETURN image_path AS image_path
        """,
        meal_id=meal_id,
        user_id=user_id,
    )
    record = await result.single()
    if not record:
        return False, None
    path = record["image_path"]
    return True, str(path) if path is not None else None
