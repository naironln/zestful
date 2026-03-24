export interface User {
  id: string
  email: string
  name: string
  role: 'patient' | 'nutritionist'
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}
