import { apiClient } from './client'
import type { Comment, MealCommentsMap } from '@/types/comment'
import type { MealDetail } from '@/types/meal'

/** Patient: read comments on their own meal */
export const getMealComments = (mealId: string) =>
  apiClient.get<Comment[]>(`/meals/${mealId}/comments`).then((r) => r.data)

/** Patient: read nutritionist week comments for their own week */
export const getWeekComments = (weekStart: string) =>
  apiClient
    .get<Comment[]>('/meals/comments/week', { params: { week_start: weekStart } })
    .then((r) => r.data)

/** Patient: batch-fetch all meal comments for a date range */
export const getBatchMealComments = (start: string, end: string) =>
  apiClient
    .get<MealCommentsMap>('/meals/comments/meals', { params: { start, end } })
    .then((r) => r.data.comments_by_meal)

export const nutritionistCommentsApi = {
  getBatchMealComments: (patientId: string, start: string, end: string) =>
    apiClient
      .get<MealCommentsMap>(`/nutritionist/patients/${patientId}/comments/meals`, {
        params: { start, end },
      })
      .then((r) => r.data.comments_by_meal),

  getMealComments: (patientId: string, mealId: string) =>
    apiClient
      .get<Comment[]>(`/nutritionist/patients/${patientId}/meals/${mealId}/comments`)
      .then((r) => r.data),

  addMealComment: (patientId: string, mealId: string, content: string) =>
    apiClient
      .post<Comment>(`/nutritionist/patients/${patientId}/meals/${mealId}/comments`, { content })
      .then((r) => r.data),

  getWeekComments: (patientId: string, weekStart: string) =>
    apiClient
      .get<Comment[]>(`/nutritionist/patients/${patientId}/comments/week`, {
        params: { week_start: weekStart },
      })
      .then((r) => r.data),

  addWeekComment: (patientId: string, weekStart: string, content: string) =>
    apiClient
      .post<Comment>(`/nutritionist/patients/${patientId}/comments/week`, { week_start: weekStart, content })
      .then((r) => r.data),

  updateComment: (commentId: string, content: string) =>
    apiClient
      .patch<Comment>(`/nutritionist/comments/${commentId}`, { content })
      .then((r) => r.data),

  deleteComment: (commentId: string) =>
    apiClient.delete(`/nutritionist/comments/${commentId}`),

  getPatientMealDetail: (patientId: string, mealId: string) =>
    apiClient
      .get<MealDetail>(`/nutritionist/patients/${patientId}/meals/${mealId}/detail`)
      .then((r) => r.data),
}
