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

export interface LinkRequest {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  nutritionist_id: string
  nutritionist_name: string
  nutritionist_email: string
}

export interface OutboundLinkRequest {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  patient_id: string
  patient_name: string
  patient_email: string
}
