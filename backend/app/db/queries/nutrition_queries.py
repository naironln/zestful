from neo4j import AsyncSession


async def get_patient_meals(
    session: AsyncSession, nutritionist_id: str, patient_id: str, start: str, end: str
) -> list[dict]:
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id})-[:SUPERVISES]->(p:User {id: $patient_id})
        MATCH (p)-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        OPTIONAL MATCH (m)-[:HAS_INGREDIENT]->(i:Ingredient)
        RETURN m, collect(i.name) AS ingredients, day.date AS date
        ORDER BY m.eaten_at DESC
        """,
        nutritionist_id=nutritionist_id,
        patient_id=patient_id,
        start=start,
        end=end,
    )
    meals = []
    async for record in result:
        meal = dict(record["m"])
        meal["ingredients"] = record["ingredients"]
        meals.append(meal)
    return meals
