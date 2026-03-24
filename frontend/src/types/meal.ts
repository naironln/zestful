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
