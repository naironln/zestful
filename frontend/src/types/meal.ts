export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealEntry {
  id: string
  meal_type: MealType
  dish_name: string
  ingredients: string[]
  eaten_at: string
  logged_at: string
  image_url: string | null
  notes: string | null
  confidence: number | null
}

export interface IngredientWithPortion {
  name: string
  grams: number | null
}

export interface PlateComposition {
  label: string
  percentage: number
}

export interface NutrientValue {
  key: string
  name: string
  unit: string
  per_100g: number
}

export interface MealDetail {
  id: string
  meal_type: MealType
  dish_name: string
  ingredients: IngredientWithPortion[]
  eaten_at: string
  logged_at: string
  image_url: string | null
  notes: string | null
  confidence: number | null
  plate_composition: PlateComposition[] | null
  nutrients: NutrientValue[] | null
}
