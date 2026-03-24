import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { statsApi } from '@/api/stats'
import { useAuthStore } from '@/store/authStore'
import MealCard from '@/components/meals/MealCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const today = format(new Date(), 'yyyy-MM-dd')

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ['meals', today],
    queryFn: () => mealsApi.list({ start: today, end: today }),
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', 'day', today],
    queryFn: () => statsApi.day(today),
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="mt-0.5 text-sm capitalize text-gray-500">{dateLabel}</p>
        </div>
        <Button asChild>
          <Link to="/upload" className="gap-2">
            <Plus className="h-4 w-4" />
            Registrar
          </Link>
        </Button>
      </div>

      {/* Today's stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total hoje', value: stats.total_meals },
            { label: 'Café da manhã', value: stats.meal_type_distribution.breakfast },
            { label: 'Almoço', value: stats.meal_type_distribution.lunch },
            { label: 'Jantar', value: stats.meal_type_distribution.dinner },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-brand-500">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Meals list */}
      <Card>
        <CardHeader>
          <CardTitle>Refeições de hoje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-gray-400">Carregando...</p>}
          {!isLoading && meals.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">Nenhuma refeição registrada hoje.</p>
              <Button variant="link" asChild className="mt-2">
                <Link to="/upload">Registrar primeira refeição</Link>
              </Button>
            </div>
          )}
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
