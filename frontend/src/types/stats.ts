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
}
