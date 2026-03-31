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


class NutritionFlags(BaseModel):
    meals_with_vegetables: int = 0
    fruit_count: int = 0
    dessert_count: int = 0
    ultra_processed_count: int = 0
    meals_with_protein: int = 0
    homemade_count: int = 0
    restaurant_count: int = 0
    delivery_count: int = 0
    analyzed_count: int = 0


class DayNutritionFlags(BaseModel):
    date: str
    total: int = 0
    vegetables: int = 0
    fruits: int = 0
    desserts: int = 0
    ultra_processed: int = 0
    protein: int = 0
    homemade: int = 0
    restaurant: int = 0
    delivery: int = 0


class LoggingConsistency(BaseModel):
    total_days: int = 0
    days_with_meals: int = 0
    gap_days: int = 0


class DietDiversity(BaseModel):
    unique_ingredients: int = 0
    total_uses: int = 0


class MealTimingEntry(BaseModel):
    meal_type: str
    hour: int
    count: int


class AlcoholDayDoses(BaseModel):
    date: str
    doses: int


class AlcoholStats(BaseModel):
    total_doses: int = 0
    days_with_alcohol: int = 0
    doses_per_day: list[AlcoholDayDoses] = []


class DailyMacros(BaseModel):
    date: str
    energy_kcal: float = 0
    protein_g: float = 0
    carbohydrate_g: float = 0
    lipid_g: float = 0
    fiber_g: float = 0


class PeriodStats(BaseModel):
    period: str
    date_range: DateRange
    total_meals: int
    meal_type_distribution: MealTypeDistribution
    meals_per_day: list[DayCount]
    top_dishes: list[TopItem]
    top_ingredients: list[TopItem]
    nutrition_flags: NutritionFlags
    nutrition_flags_per_day: list[DayNutritionFlags] = []
    logging_consistency: LoggingConsistency = LoggingConsistency()
    diet_diversity: DietDiversity = DietDiversity()
    meal_timing: list[MealTimingEntry] = []
    alcohol_stats: AlcoholStats = AlcoholStats()
    daily_macros: list[DailyMacros] = []
