export interface DateRange {
  start: string
  end: string
}

export interface MealTypeDistribution {
  breakfast: number
  lunch: number
  dinner: number
  snack: number
}

export interface DayCount {
  date: string
  count: number
}

export interface TopItem {
  name: string
  count: number
}

export interface NutritionFlags {
  meals_with_vegetables: number
  fruit_count: number
  dessert_count: number
  ultra_processed_count: number
  meals_with_protein: number
  homemade_count: number
  restaurant_count: number
  delivery_count: number
  analyzed_count: number
}

export interface DayNutritionFlags {
  date: string
  total: number
  vegetables: number
  fruits: number
  desserts: number
  ultra_processed: number
  protein: number
  homemade: number
  restaurant: number
  delivery: number
}

export interface LoggingConsistency {
  total_days: number
  days_with_meals: number
  gap_days: number
}

export interface DietDiversity {
  unique_ingredients: number
  total_uses: number
}

export interface MealTimingEntry {
  meal_type: string
  hour: number
  count: number
}

export interface AlcoholDayDoses {
  date: string
  doses: number
}

export interface AlcoholStats {
  total_doses: number
  days_with_alcohol: number
  doses_per_day: AlcoholDayDoses[]
}

export interface DailyMacros {
  date: string
  energy_kcal: number
  protein_g: number
  carbohydrate_g: number
  lipid_g: number
  fiber_g: number
}

export interface PeriodStats {
  period: string
  date_range: DateRange
  total_meals: number
  meal_type_distribution: MealTypeDistribution
  meals_per_day: DayCount[]
  top_dishes: TopItem[]
  top_ingredients: TopItem[]
  nutrition_flags: NutritionFlags
  nutrition_flags_per_day: DayNutritionFlags[]
  logging_consistency: LoggingConsistency
  diet_diversity: DietDiversity
  meal_timing: MealTimingEntry[]
  alcohol_stats: AlcoholStats
  daily_macros: DailyMacros[]
}
