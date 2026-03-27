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
import { ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { statsApi } from '@/api/stats'
import { getBatchMealComments } from '@/api/comments'
import { Button } from '@/components/ui/button'
import MealCard from '@/components/meals/MealCard'
import MealFilters, { type MealFilterState } from '@/components/meals/MealFilters'
import StatsPanel from '@/components/stats/StatsPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'
import type { MealEntry } from '@/types/meal'

export default function MonthViewPage() {
  const navigate = useNavigate()
  const deleteMeal = useDeleteMeal()
  const [month, setMonth] = useState(() => monthAnchorBrasilia())
  const [filters, setFilters] = useState<MealFilterState>({ mealTypes: [], nutritionFlags: [], mealSource: null })

  const { startStr, endStr } = monthRangeYmdBrasilia(month)
  const { year, monthNum } = yearMonthBrasilia(month)

  const filterParams = useMemo(() => {
    const params: Record<string, string | boolean> = {}
    if (filters.mealTypes.length > 0) params.meal_type = filters.mealTypes.join(',')
    for (const flag of filters.nutritionFlags) params[flag] = true
    if (filters.mealSource) params.meal_source = filters.mealSource
    return params
  }, [filters])

  const { data: meals = [] } = useQuery({
    queryKey: ['meals', startStr, endStr, filterParams],
    queryFn: () => mealsApi.list({ start: startStr, end: endStr, ...filterParams }),
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

  const { data: mealCommentsMap = {} } = useQuery({
    queryKey: ['meal-comments-batch', startStr, endStr],
    queryFn: () => getBatchMealComments(startStr, endStr),
  })

  const label = formatInBrasilia(month, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 font-heading text-2xl font-bold capitalize text-warm-gray-900 dark:text-warm-gray-50">
          Mês
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium capitalize text-warm-gray-600 dark:text-warm-gray-400">
            {label}
          </span>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {stats && <StatsPanel stats={stats} />}

      {/* Filters */}
      <MealFilters filters={filters} onChange={setFilters} />

      <Card>
        <CardHeader>
          <CardTitle>Todas as refeições</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meals.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="Sem refeições nesse mês"
              description="As refeições registradas aparecerão aqui."
            />
          ) : (
            Array.from(groupedMeals.entries()).map(([dateKey, dayMeals]) => {
              const dayLabel = formatInBrasilia(dateKey, "EEEE - dd/MM/yyyy", { locale: ptBR })
              const dayLabelCap = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)
              return (
                <div key={dateKey} className="space-y-3">
                  <h3 className="border-t border-warm-gray-200 pt-2 text-sm font-semibold text-warm-gray-500 first:border-t-0 first:pt-0 dark:border-warm-gray-700 dark:text-warm-gray-400">
                    {dayLabelCap}
                  </h3>
                  {dayMeals.map((meal, i) => (
                    <div
                      key={meal.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                    >
                      <MealCard
                        meal={meal}
                        onClick={() => navigate(`/meals/${meal.id}`)}
                        onDelete={() => {
                          if (!window.confirm('Excluir esta refeição?')) return
                          deleteMeal.mutate(meal.id)
                        }}
                        comments={mealCommentsMap[meal.id]}
                      />
                    </div>
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
