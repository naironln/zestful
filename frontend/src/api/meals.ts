import { apiClient } from './client'
import type { MealEntry, MealDetail } from '@/types/meal'

export const mealsApi = {
  upload: (formData: FormData) =>
    apiClient.post<MealEntry>('/meals/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  list: (params: { start: string; end: string; meal_type?: string }) =>
    apiClient.get<MealEntry[]>('/meals', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<MealEntry>(`/meals/${id}`).then((r) => r.data),

  patch: (id: string, data: { meal_type?: string; notes?: string }) =>
    apiClient.patch<MealEntry>(`/meals/${id}`, data).then((r) => r.data),

  correct: (id: string, correction: string) =>
    apiClient.post<MealEntry>(`/meals/${id}/correct`, { correction }).then((r) => r.data),

  analyzeNutrition: (id: string) =>
    apiClient.post<MealDetail>(`/meals/${id}/analyze-nutrition`).then((r) => r.data),

  getDetail: (id: string) =>
    apiClient.get<MealDetail>(`/meals/${id}/detail`).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/meals/${id}`),
}
