export interface Comment {
  id: string
  content: string
  comment_type: 'meal' | 'week'
  created_at: string
  nutritionist_name: string
  week_start?: string | null
}
