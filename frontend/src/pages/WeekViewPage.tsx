import { useState } from 'react'
import { addDays, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInBrasilia, weekStartMondayBrasilia, ymdInBrasilia } from '@/lib/brasilTimezone'
import { useQuery } from '@tanstack/react-query'
import { useDeleteMeal } from '@/hooks/useDeleteMeal'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { statsApi } from '@/api/stats'
import { Button } from '@/components/ui/button'
import MealCard from '@/components/meals/MealCard'
import StatsPanel from '@/components/stats/StatsPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

  const { data: stats } = useQuery({
    queryKey: ['stats', 'week', startStr],
    queryFn: () => statsApi.week(startStr),
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

      {/* Meals */}
      <Card>
        <CardHeader>
          <CardTitle>Refeições</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meals.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Sem refeições nessa semana.</p>
          ) : (
            meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onClick={() => navigate(`/meals/${meal.id}`)}
                onDelete={() => {
                  if (!window.confirm('Excluir esta refeição?')) return
                  deleteMeal.mutate(meal.id)
                }}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
