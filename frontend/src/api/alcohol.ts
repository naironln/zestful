import { apiClient } from './client'
import type { AlcoholEntry, AlcoholDaySummary } from '@/types/alcohol'

export const alcoholApi = {
  log: (data: { doses: number; notes?: string; date?: string }) =>
    apiClient.post<AlcoholEntry>('/alcohol', data).then((r) => r.data),

  list: (params: { start: string; end: string }) =>
    apiClient.get<AlcoholDaySummary[]>('/alcohol', { params }).then((r) => r.data),

  delete: (entryId: string) => apiClient.delete(`/alcohol/${entryId}`),
}

export const nutritionistAlcoholApi = {
  patientAlcohol: (patientId: string, start: string, end: string) =>
    apiClient
      .get<AlcoholDaySummary[]>(`/nutritionist/patients/${patientId}/alcohol`, {
        params: { start, end },
      })
      .then((r) => r.data),
}
