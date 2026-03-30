export interface AlcoholEntry {
  id: string
  doses: number
  notes: string | null
  consumed_at: string
  logged_at: string
}

export interface AlcoholDaySummary {
  date: string // "yyyy-MM-dd"
  total_doses: number
  entries: AlcoholEntry[]
}
