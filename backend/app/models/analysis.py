from pydantic import BaseModel
from typing import Literal


class LLMAnalysisResult(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] = "snack"
    dish_name: str = "Unknown dish"
    cuisine_origin: str = "brasileira"
    ingredients: list[str] = []
    confidence: float = 0.0
