import { Badge } from '@/components/ui/badge'
import type { MealType } from '@/types/meal'

const labels: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

export default function MealTypeTag({ type }: { type: MealType }) {
  return <Badge variant={type}>{labels[type]}</Badge>
}
