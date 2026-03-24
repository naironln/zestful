import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Utensils } from 'lucide-react'
import type { MealEntry } from '@/types/meal'
import MealTypeTag from './MealTypeTag'

interface MealCardProps {
  meal: MealEntry
  onClick?: () => void
}

export default function MealCard({ meal, onClick }: MealCardProps) {
  const time = format(new Date(meal.eaten_at), 'HH:mm', { locale: ptBR })

  return (
    <div
      onClick={onClick}
      className="flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    >
      {/* Photo */}
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
        {meal.image_url ? (
          <img src={meal.image_url} alt={meal.dish_name} className="h-full w-full object-cover" />
        ) : (
          <Utensils className="h-8 w-8 text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 capitalize">{meal.dish_name}</p>
            {meal.ingredients.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                {meal.ingredients.slice(0, 5).join(', ')}
                {meal.ingredients.length > 5 && ` +${meal.ingredients.length - 5}`}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
        </div>
        <div className="mt-2">
          <MealTypeTag type={meal.meal_type} />
        </div>
      </div>
    </div>
  )
}
