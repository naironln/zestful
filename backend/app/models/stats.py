from pydantic import BaseModel


class DateRange(BaseModel):
    start: str
    end: str


class MealTypeDistribution(BaseModel):
    breakfast: int = 0
    lunch: int = 0
    dinner: int = 0
    snack: int = 0


class DayCount(BaseModel):
    date: str
    count: int


class TopItem(BaseModel):
    name: str
    count: int


class PeriodStats(BaseModel):
    period: str
    date_range: DateRange
    total_meals: int
    meal_type_distribution: MealTypeDistribution
    meals_per_day: list[DayCount]
    top_dishes: list[TopItem]
    top_ingredients: list[TopItem]
