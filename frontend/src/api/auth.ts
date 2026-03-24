import { apiClient } from './client'
import type { TokenResponse } from '@/types/user'

export const authApi = {
  register: (data: { email: string; name: string; password: string; role: string }) =>
    apiClient.post<TokenResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<TokenResponse>('/auth/login', data).then((r) => r.data),
}
