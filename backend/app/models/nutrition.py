from typing import Literal

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


# ── Nutrition Calculation Trace ────────────────────────────────────


class NutrientAdjustment(BaseModel):
    field: str
    original_value: float
    adjusted_value: float
    reason: str
    source: str


class IngredientTrace(BaseModel):
    ingredient: str
    estimated_grams: float | None = None
    source: Literal["taco", "taco_decomposition", "label", "web_search", "llm_estimate"]
    taco_food_name: str | None = None
    taco_id: int | None = None
    taco_confidence: float | None = None
    nutrients_from_source: list[NutrientValue] = []
    adjustments: list[NutrientAdjustment] = []
    reasoning: str = ""


class NutritionCalculationTrace(BaseModel):
    ingredient_traces: list[IngredientTrace] = []
    reconciliation_notes: list[str] = []
    sources_used: list[str] = []
    overall_confidence: float = 0.0
    analyzed_at: str = ""


class ImageDetailResult(BaseModel):
    detailed_description: str = ""
    visible_nutrition_info: list[dict] = []
    product_identifiers: list[dict] = []
    portion_context: str = ""
