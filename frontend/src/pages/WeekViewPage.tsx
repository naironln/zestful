import { useState, useMemo } from 'react'
import { addDays, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInBrasilia, weekStartMondayBrasilia, ymdInBrasilia } from '@/lib/brasilTimezone'
import { useQuery } from '@tanstack/react-query'
import { useDeleteMeal } from '@/hooks/useDeleteMeal'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { statsApi } from '@/api/stats'
import { getWeekComments } from '@/api/comments'
import { Button } from '@/components/ui/button'
import MealCard from '@/components/meals/MealCard'
import StatsPanel from '@/components/stats/StatsPanel'
import CommentSection from '@/components/comments/CommentSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MealEntry } from '@/types/meal'

export default function WeekViewPage() {
  const navigate = useNavigate()
  const deleteMeal = useDeleteMeal()
  const [weekStart, setWeekStart] = useState(() => weekStartMondayBrasilia())
  const weekEnd = addDays(weekStart, 6)

  const startStr = ymdInBrasilia(weekStart)
  const endStr = ymdInBrasilia(weekEnd)

  const { data: meals = [] } = useQuery({
    queryKey: ['meals', startStr, endStr],
    queryFn: () => mealsApi.list({ start: startStr, end: endStr }),
  })

  const groupedMeals = useMemo(() => {
    const map = new Map<string, MealEntry[]>()
    for (const meal of meals) {
      const key = formatInBrasilia(meal.eaten_at, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(meal)
    }
    return map
  }, [meals])

  const { data: stats } = useQuery({
    queryKey: ['stats', 'week', startStr],
    queryFn: () => statsApi.week(startStr),
  })

  const { data: weekComments = [] } = useQuery({
    queryKey: ['week-comments', startStr],
    queryFn: () => getWeekComments(startStr),
  })

  const label = `${formatInBrasilia(weekStart, "d 'de' MMM", { locale: ptBR })} – ${formatInBrasilia(weekEnd, "d 'de' MMM", { locale: ptBR })}`

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Semana</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-600 min-w-40 text-center">{label}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && <StatsPanel stats={stats} />}

      {/* Nutritionist week feedback (read-only for patient) */}
      {weekComments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback da nutricionista</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentSection comments={weekComments} />
          </CardContent>
        </Card>
      )}

      {/* Meals */}
      <Card>
        <CardHeader>
          <CardTitle>Refeições</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meals.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Sem refeições nessa semana.</p>
          ) : (
            Array.from(groupedMeals.entries()).map(([dateKey, dayMeals]) => {
              const dayLabel = formatInBrasilia(dateKey, "EEEE - dd/MM/yyyy", { locale: ptBR })
              const dayLabelCap = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)
              return (
                <div key={dateKey} className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 pt-2 border-t first:border-t-0 first:pt-0">
                    {dayLabelCap}
                  </h3>
                  {dayMeals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onClick={() => navigate(`/meals/${meal.id}`)}
                      onDelete={() => {
                        if (!window.confirm('Excluir esta refeição?')) return
                        deleteMeal.mutate(meal.id)
                      }}
                    />
                  ))}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
