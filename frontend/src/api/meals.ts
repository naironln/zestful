import { apiClient } from './client'
import type { MealEntry, MealDetail, MealSource } from '@/types/meal'

export const mealsApi = {
  upload: (formData: FormData) =>
    apiClient.post<MealEntry>('/meals/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  list: (params: {
    start: string
    end: string
    meal_type?: string
    has_vegetables?: boolean
    is_fruit?: boolean
    is_dessert?: boolean
    is_ultra_processed?: boolean
    has_protein?: boolean
    meal_source?: MealSource
  }) => apiClient.get<MealEntry[]>('/meals', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<MealEntry>(`/meals/${id}`).then((r) => r.data),

  patch: (id: string, data: {
    meal_type?: string
    notes?: string
    has_vegetables?: boolean
    is_fruit?: boolean
    is_dessert?: boolean
    is_ultra_processed?: boolean
    has_protein?: boolean
    meal_source?: MealSource | null
  }) => {
    const payload = { ...data }
    if ('meal_source' in payload && payload.meal_source === null) {
      ;(payload as Record<string, unknown>).meal_source = 'none'
    }
    return apiClient.patch<MealEntry>(`/meals/${id}`, payload).then((r) => r.data)
  },

  correct: (id: string, correction: string) =>
    apiClient.post<MealEntry>(`/meals/${id}/correct`, { correction }).then((r) => r.data),

  analyzeNutrition: (id: string) =>
    apiClient.post<MealDetail>(`/meals/${id}/analyze-nutrition`).then((r) => r.data),

  getDetail: (id: string) =>
    apiClient.get<MealDetail>(`/meals/${id}/detail`).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/meals/${id}`),
}
