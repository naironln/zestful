from pydantic import BaseModel
from typing import Literal


class LLMAnalysisResult(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] = "snack"
    dish_name: str = "Unknown dish"
    cuisine_origin: str = "brasileira"
    ingredients: list[str] = []
    confidence: float = 0.0
    has_vegetables: bool = False
    is_fruit: bool = False
    is_dessert: bool = False
    is_ultra_processed: bool = False
    has_protein: bool = False
    meal_source: Literal["homemade", "restaurant", "delivery"] | None = None
