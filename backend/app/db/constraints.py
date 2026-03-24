from neo4j import AsyncDriver

CONSTRAINTS = [
    "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
    "CREATE CONSTRAINT meal_id_unique IF NOT EXISTS FOR (m:MealEntry) REQUIRE m.id IS UNIQUE",
    "CREATE CONSTRAINT dish_name_unique IF NOT EXISTS FOR (d:Dish) REQUIRE d.name IS UNIQUE",
    "CREATE CONSTRAINT ingredient_name_unique IF NOT EXISTS FOR (i:Ingredient) REQUIRE i.name IS UNIQUE",
    "CREATE CONSTRAINT day_date_unique IF NOT EXISTS FOR (d:Day) REQUIRE d.date IS UNIQUE",
]

INDEXES = [
    "CREATE INDEX meal_eaten_at IF NOT EXISTS FOR (m:MealEntry) ON (m.eaten_at)",
    "CREATE INDEX meal_type_idx IF NOT EXISTS FOR (m:MealEntry) ON (m.meal_type)",
    "CREATE INDEX user_email_idx IF NOT EXISTS FOR (u:User) ON (u.email)",
]


async def create_constraints(driver: AsyncDriver) -> None:
    async with driver.session() as session:
        for stmt in CONSTRAINTS + INDEXES:
            await session.run(stmt)
