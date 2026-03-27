from pydantic import BaseModel
from typing import Literal
from datetime import datetime

from app.models.nutrition import NutrientValue, PlateComposition, PortionEstimate


class MealNutritionFlags(BaseModel):
    has_vegetables: bool = False
    is_fruit: bool = False
    is_dessert: bool = False
    is_ultra_processed: bool = False
    has_protein: bool = False
    meal_source: Literal["homemade", "restaurant", "delivery"] | None = None


class MealEntryOut(BaseModel):
    id: str
    meal_type: str
    dish_name: str
    ingredients: list[str]
    eaten_at: datetime
    logged_at: datetime
    image_url: str | None
    notes: str | None
    confidence: float | None
    nutrition_flags: MealNutritionFlags | None = None


class IngredientWithPortion(BaseModel):
    name: str
    grams: float | None = None


class MealDetail(BaseModel):
    id: str
    meal_type: str
    dish_name: str
    ingredients: list[IngredientWithPortion]
    eaten_at: datetime
    logged_at: datetime
    image_url: str | None
    notes: str | None
    confidence: float | None
    plate_composition: list[PlateComposition] | None = None
    nutrients: list[NutrientValue] | None = None
    nutrition_flags: MealNutritionFlags | None = None


class MealPatch(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = None
    notes: str | None = None
    has_vegetables: bool | None = None
    is_fruit: bool | None = None
    is_dessert: bool | None = None
    is_ultra_processed: bool | None = None
    has_protein: bool | None = None
    meal_source: Literal["homemade", "restaurant", "delivery", "none"] | None = None


class MealCorrection(BaseModel):
    correction: str
