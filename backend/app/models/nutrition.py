from pydantic import BaseModel


class NutrientValue(BaseModel):
    key: str
    name: str
    unit: str
    per_100g: float


class PortionEstimate(BaseModel):
    ingredient: str
    grams: int


class PlateComposition(BaseModel):
    label: str
    percentage: float


class IngredientNutrition(BaseModel):
    ingredient: str
    food_name: str | None
    taco_id: int | None
    grams: int | None = None
    nutrients: list[NutrientValue]


class MealNutrition(BaseModel):
    meal_id: str
    dish_name: str
    ingredients: list[IngredientNutrition]


class MealNutritionSummary(BaseModel):
    meal_id: str
    meal_type: str
    dish_name: str
    nutrients: list[NutrientValue]


class DailyNutrition(BaseModel):
    date: str
    meals: list[MealNutritionSummary]
    totals: list[NutrientValue]


class TacoFood(BaseModel):
    taco_id: int
    name: str
    category: str


class TacoFoodDetail(BaseModel):
    taco_id: int
    name: str
    category: str
    humidity: float | None
    nutrients: list[NutrientValue]


class TacoCategory(BaseModel):
    name: str
    food_count: int


class MappingStatus(BaseModel):
    total: int
    mapped: int
    unmapped: int


class MappingResult(BaseModel):
    total: int
    mapped: int
    failed: int
