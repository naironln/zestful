import { useState } from 'react'
import { addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { statsApi } from '@/api/stats'
import { Button } from '@/components/ui/button'
import MealCard from '@/components/meals/MealCard'
import StatsPanel from '@/components/stats/StatsPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { monthAnchorBrasilia, monthRangeYmdBrasilia, formatInBrasilia } from '@/lib/brasilTimezone'

export default function MonthViewPage() {
  const [month, setMonth] = useState(monthAnchorBrasilia())

  const year = month.getFullYear()
  const monthNum = month.getMonth() + 1
  const { startStr, endStr } = monthRangeYmdBrasilia(month)

  const { data: meals = [] } = useQuery({
    queryKey: ['meals', startStr, endStr],
    queryFn: () => mealsApi.list({ start: startStr, end: endStr }),
  })

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
            meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}
