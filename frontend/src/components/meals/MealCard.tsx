import { ptBR } from 'date-fns/locale'
import { formatInBrasilia } from '@/lib/brasilTimezone'
import { Utensils, Trash2 } from 'lucide-react'
import type { MealEntry } from '@/types/meal'
import MealTypeTag from './MealTypeTag'
import { Button } from '@/components/ui/button'
import { BASE_URL } from '@/api/client'

interface MealCardProps {
  meal: MealEntry
  onClick?: () => void
  /** When set, shows a delete control (does not navigate when used). */
  onDelete?: () => void
}

export default function MealCard({ meal, onClick, onDelete }: MealCardProps) {
  const time = formatInBrasilia(meal.eaten_at, 'HH:mm', { locale: ptBR })

  // Build absolute image URL — backend returns relative paths like /media/meals/...
  const imageUrl = meal.image_url
    ? meal.image_url.startsWith('http') ? meal.image_url : `${BASE_URL}${meal.image_url}`
    : null

  return (
    <div
      onClick={onClick}
      className="flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    >
      {/* Photo */}
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={meal.dish_name} className="h-full w-full object-cover" />
        ) : (
          <Utensils className="h-8 w-8 text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 capitalize">{meal.dish_name}</p>
            {meal.ingredients.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                {meal.ingredients.slice(0, 5).join(', ')}
                {meal.ingredients.length > 5 && ` +${meal.ingredients.length - 5}`}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label="Excluir refeição"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap pt-1.5">{time}</span>
          </div>
        </div>
        <div className="mt-2">
          <MealTypeTag type={meal.meal_type} />
        </div>
      </div>
    </div>
  )
}
