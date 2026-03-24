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

export interface PeriodStats {
  period: string
  date_range: DateRange
  total_meals: number
  meal_type_distribution: MealTypeDistribution
  meals_per_day: DayCount[]
  top_dishes: TopItem[]
  top_ingredients: TopItem[]
}
