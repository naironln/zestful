from pydantic import BaseModel
from typing import Literal
from datetime import datetime

from app.models.nutrition import NutrientValue, PlateComposition, PortionEstimate


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


class MealPatch(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = None
    notes: str | None = None


class MealCorrection(BaseModel):
    correction: str
