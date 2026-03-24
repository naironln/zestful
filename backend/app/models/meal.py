from pydantic import BaseModel
from typing import Literal
from datetime import datetime


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


class MealPatch(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = None
    notes: str | None = None
