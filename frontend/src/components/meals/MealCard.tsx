import { ptBR } from 'date-fns/locale'
import { formatInBrasilia } from '@/lib/brasilTimezone'
import { formatDistanceToNow } from 'date-fns'
import { Utensils, Trash2, MessageSquare } from 'lucide-react'
import type { MealEntry } from '@/types/meal'
import type { Comment } from '@/types/comment'
import MealTypeTag from './MealTypeTag'
import { Button } from '@/components/ui/button'
import { BASE_URL } from '@/api/client'

interface MealCardProps {
  meal: MealEntry
  onClick?: () => void
  onDelete?: () => void
  comments?: Comment[]
}

const placeholderGradients: Record<string, string> = {
  breakfast: 'from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-950/20',
  lunch: 'from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-950/20',
  dinner: 'from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-950/20',
  snack: 'from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-950/20',
}

export default function MealCard({ meal, onClick, onDelete, comments }: MealCardProps) {
  const time = formatInBrasilia(meal.eaten_at, 'HH:mm', { locale: ptBR })

  const imageUrl = meal.image_url
    ? meal.image_url.startsWith('http')
      ? meal.image_url
      : `${BASE_URL}${meal.image_url}`
    : null

  const gradient = placeholderGradients[meal.meal_type] || placeholderGradients.lunch

  const hasComments = comments && comments.length > 0

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        onClick={onClick}
        className="flex gap-4 p-4 cursor-pointer"
      >
        {/* Photo */}
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={meal.dish_name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
            >
              <Utensils className="h-7 w-7 text-warm-gray-400 dark:text-warm-gray-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold capitalize text-warm-gray-900 dark:text-warm-gray-50">
                {meal.dish_name}
              </p>
              {meal.ingredients.length > 0 && (
                <p className="mt-0.5 text-xs text-warm-gray-500 line-clamp-1 dark:text-warm-gray-400">
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
                  className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  aria-label="Excluir refeição"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <span className="whitespace-nowrap pt-1.5 text-xs text-warm-gray-400 dark:text-warm-gray-500">
                {time}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <MealTypeTag type={meal.meal_type} />
            {hasComments && (
              <span className="flex items-center gap-1 text-xs text-sage-600 dark:text-sage-400">
                <MessageSquare className="h-3 w-3" />
                {comments.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inline nutritionist comments */}
      {hasComments && (
        <div className="border-t border-sage-200/60 bg-sage-50/50 px-4 py-2.5 dark:border-sage-800/30 dark:bg-sage-900/10">
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sage-500 dark:text-sage-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium text-sage-700 dark:text-sage-300">
                      {c.nutritionist_name}
                    </span>
                    <span className="text-[10px] text-warm-gray-400 dark:text-warm-gray-500">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-warm-gray-600 line-clamp-2 dark:text-warm-gray-400">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
