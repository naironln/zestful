import { apiClient } from './client'
import type { PeriodStats } from '@/types/stats'
import type { MealEntry } from '@/types/meal'

export const statsApi = {
  day: (date: string) =>
    apiClient.get<PeriodStats>('/stats/day', { params: { date } }).then((r) => r.data),

  week: (weekStart: string) =>
    apiClient.get<PeriodStats>('/stats/week', { params: { week_start: weekStart } }).then((r) => r.data),

  month: (year: number, month: number) =>
    apiClient.get<PeriodStats>('/stats/month', { params: { year, month } }).then((r) => r.data),
}

export const nutritionistApi = {
  patients: () =>
    apiClient.get('/nutritionist/patients').then((r) => r.data),

  patientMeals: (patientId: string, start: string, end: string) =>
    apiClient.get<MealEntry[]>(`/nutritionist/patients/${patientId}/meals`, {
      params: { start, end },
    }).then((r) => r.data),

  patientStatsWeek: (patientId: string, weekStart: string) =>
    apiClient.get<PeriodStats>(`/nutritionist/patients/${patientId}/stats/week`, {
      params: { week_start: weekStart },
    }).then((r) => r.data),

  patientStatsMonth: (patientId: string, year: number, month: number) =>
    apiClient.get<PeriodStats>(`/nutritionist/patients/${patientId}/stats/month`, {
      params: { year, month },
    }).then((r) => r.data),

  linkPatient: (patientId: string) =>
    apiClient.post(`/nutritionist/patients/${patientId}/link`),
}
