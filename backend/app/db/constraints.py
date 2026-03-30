from neo4j import AsyncDriver

CONSTRAINTS = [
    "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
    "CREATE CONSTRAINT meal_id_unique IF NOT EXISTS FOR (m:MealEntry) REQUIRE m.id IS UNIQUE",
    "CREATE CONSTRAINT dish_name_unique IF NOT EXISTS FOR (d:Dish) REQUIRE d.name IS UNIQUE",
    "CREATE CONSTRAINT ingredient_name_unique IF NOT EXISTS FOR (i:Ingredient) REQUIRE i.name IS UNIQUE",
    "CREATE CONSTRAINT day_date_unique IF NOT EXISTS FOR (d:Day) REQUIRE d.date IS UNIQUE",
    "CREATE CONSTRAINT comment_id_unique IF NOT EXISTS FOR (c:Comment) REQUIRE c.id IS UNIQUE",
    # TACO nutrition data
    "CREATE CONSTRAINT food_taco_id_unique IF NOT EXISTS FOR (f:Food) REQUIRE f.taco_id IS UNIQUE",
    "CREATE CONSTRAINT food_category_name_unique IF NOT EXISTS FOR (fc:FoodCategory) REQUIRE fc.name IS UNIQUE",
    "CREATE CONSTRAINT nutrient_key_unique IF NOT EXISTS FOR (n:Nutrient) REQUIRE n.key IS UNIQUE",
]

INDEXES = [
    "CREATE INDEX link_request_status IF NOT EXISTS FOR ()-[r:LINK_REQUEST]-() ON (r.status)",
    "CREATE INDEX meal_eaten_at IF NOT EXISTS FOR (m:MealEntry) ON (m.eaten_at)",
    "CREATE INDEX meal_type_idx IF NOT EXISTS FOR (m:MealEntry) ON (m.meal_type)",
    "CREATE INDEX user_email_idx IF NOT EXISTS FOR (u:User) ON (u.email)",
    # TACO indexes
    "CREATE INDEX food_name_idx IF NOT EXISTS FOR (f:Food) ON (f.name)",
    "CREATE INDEX ingredient_mapped IF NOT EXISTS FOR (i:Ingredient) ON (i.mapped)",
    # Nutrition classification indexes
    "CREATE INDEX meal_has_vegetables IF NOT EXISTS FOR (m:MealEntry) ON (m.has_vegetables)",
    "CREATE INDEX meal_is_fruit IF NOT EXISTS FOR (m:MealEntry) ON (m.is_fruit)",
    "CREATE INDEX meal_is_dessert IF NOT EXISTS FOR (m:MealEntry) ON (m.is_dessert)",
    "CREATE INDEX meal_is_ultra_processed IF NOT EXISTS FOR (m:MealEntry) ON (m.is_ultra_processed)",
]


async def create_constraints(driver: AsyncDriver) -> None:
    async with driver.session() as session:
        for stmt in CONSTRAINTS + INDEXES:
            await session.run(stmt)
