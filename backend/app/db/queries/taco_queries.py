from neo4j import AsyncSession


async def get_meal_nutrition(session: AsyncSession, meal_id: str, user_id: str) -> dict | None:
    """Get aggregated nutrition for a meal based on its ingredients' TACO mappings.

    When grams are available on the HAS_INGREDIENT relationship, nutrient values
    are scaled: value = per_100g * (grams / 100). Otherwise per_100g is returned as-is.
    """
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry {id: $meal_id})
        OPTIONAL MATCH (m)-[hi:HAS_INGREDIENT]->(i:Ingredient)-[mt:MAPS_TO]->(f:Food)-[r:HAS_NUTRIENT]->(n:Nutrient)
        WITH m, i, f, hi,
             collect({
                 key: n.key,
                 name: n.name,
                 unit: n.unit,
                 per_100g: CASE WHEN hi.grams IS NOT NULL
                     THEN r.per_100g * coalesce(mt.fraction, 1.0) * hi.grams / 100.0
                     ELSE r.per_100g * coalesce(mt.fraction, 1.0)
                 END
             }) AS nutrients
        RETURN
            m.id AS meal_id,
            m.dish_name AS dish_name,
            collect({
                ingredient: i.name,
                food_name: f.name,
                taco_id: f.taco_id,
                grams: hi.grams,
                nutrients: nutrients
            }) AS ingredients
        """,
        meal_id=meal_id,
        user_id=user_id,
    )
    record = await result.single()
    if not record:
        return None

    return {
        "meal_id": record["meal_id"],
        "dish_name": record["dish_name"],
        "ingredients": record["ingredients"],
    }


async def get_daily_nutrition(session: AsyncSession, user_id: str, date: str) -> list[dict]:
    """Get nutrition summary for all meals on a given day."""
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(d:Day {date: date($date)})
        OPTIONAL MATCH (m)-[hi:HAS_INGREDIENT]->(i:Ingredient)-[mt:MAPS_TO]->(f:Food)-[r:HAS_NUTRIENT]->(n:Nutrient)
        WITH m, n.key AS nkey, n.name AS nname, n.unit AS nunit,
             sum(CASE WHEN hi.grams IS NOT NULL
                 THEN r.per_100g * coalesce(mt.fraction, 1.0) * hi.grams / 100.0
                 ELSE r.per_100g * coalesce(mt.fraction, 1.0)
             END) AS total
        WITH m, collect({key: nkey, name: nname, unit: nunit, total: total}) AS nutrients
        RETURN
            m.id AS meal_id,
            m.meal_type AS meal_type,
            m.dish_name AS dish_name,
            nutrients
        ORDER BY m.eaten_at
        """,
        user_id=user_id,
        date=date,
    )
    meals = []
    async for record in result:
        meals.append({
            "meal_id": record["meal_id"],
            "meal_type": record["meal_type"],
            "dish_name": record["dish_name"],
            "nutrients": [n for n in record["nutrients"] if n["key"] is not None],
        })
    return meals


async def get_ingredient_mapping_status(session: AsyncSession) -> dict:
    """Get counts of mapped vs unmapped ingredients."""
    result = await session.run(
        """
        MATCH (i:Ingredient)
        OPTIONAL MATCH (i)-[:MAPS_TO]->(f:Food)
        RETURN
            count(i) AS total,
            count(f) AS mapped,
            count(i) - count(f) AS unmapped
        """
    )
    record = await result.single()
    return dict(record) if record else {"total": 0, "mapped": 0, "unmapped": 0}


async def search_taco_foods(session: AsyncSession, query: str, limit: int = 20) -> list[dict]:
    """Search TACO foods by name (case-insensitive partial match)."""
    result = await session.run(
        """
        MATCH (f:Food)-[:BELONGS_TO]->(fc:FoodCategory)
        WHERE f.name_lower CONTAINS $query
        RETURN f.taco_id AS taco_id, f.name AS name, fc.name AS category
        ORDER BY f.name
        LIMIT $limit
        """,
        query=query.lower(),
        limit=limit,
    )
    foods = []
    async for record in result:
        foods.append(dict(record))
    return foods


async def get_food_nutrients(session: AsyncSession, taco_id: int) -> dict | None:
    """Get full nutrient profile of a TACO food."""
    result = await session.run(
        """
        MATCH (f:Food {taco_id: $taco_id})-[:BELONGS_TO]->(fc:FoodCategory)
        OPTIONAL MATCH (f)-[r:HAS_NUTRIENT]->(n:Nutrient)
        RETURN
            f.taco_id AS taco_id,
            f.name AS name,
            fc.name AS category,
            f.humidity AS humidity,
            collect({key: n.key, name: n.name, unit: n.unit, per_100g: r.per_100g}) AS nutrients
        """,
        taco_id=taco_id,
    )
    record = await result.single()
    if not record:
        return None
    return dict(record)


async def get_taco_categories(session: AsyncSession) -> list[dict]:
    """List all TACO food categories with food count."""
    result = await session.run(
        """
        MATCH (fc:FoodCategory)<-[:BELONGS_TO]-(f:Food)
        RETURN fc.name AS name, count(f) AS food_count
        ORDER BY fc.name
        """
    )
    categories = []
    async for record in result:
        categories.append(dict(record))
    return categories
