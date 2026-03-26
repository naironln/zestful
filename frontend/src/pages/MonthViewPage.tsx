import { useState, useMemo } from 'react'
import { addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  formatInBrasilia,
  monthAnchorBrasilia,
  monthRangeYmdBrasilia,
  yearMonthBrasilia,
} from '@/lib/brasilTimezone'
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
import type { MealEntry } from '@/types/meal'

export default function MonthViewPage() {
  const navigate = useNavigate()
  const deleteMeal = useDeleteMeal()
  const [month, setMonth] = useState(() => monthAnchorBrasilia())

  const { startStr, endStr } = monthRangeYmdBrasilia(month)
  const { year, monthNum } = yearMonthBrasilia(month)

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
    queryKey: ['stats', 'month', year, monthNum],
    queryFn: () => statsApi.month(year, monthNum),
  })

  const label = formatInBrasilia(month, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex-1 capitalize">Mês</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize text-gray-600 min-w-32 text-center">{label}</span>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {stats && <StatsPanel stats={stats} />}

      <Card>
        <CardHeader>
          <CardTitle>Todas as refeições</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meals.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Sem refeições nesse mês.</p>
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
