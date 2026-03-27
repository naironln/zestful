import { ptBR } from 'date-fns/locale'
import {
  currentHourBrasilia,
  formatInBrasilia,
  todayYmdBrasilia,
} from '@/lib/brasilTimezone'
import { useQuery } from '@tanstack/react-query'
import { useDeleteMeal } from '@/hooks/useDeleteMeal'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Coffee, Sun, Moon, Cookie, UtensilsCrossed } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { statsApi } from '@/api/stats'
import { useAuthStore } from '@/store/authStore'
import MealCard from '@/components/meals/MealCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'

const STAT_CONFIG = [
  {
    key: 'total',
    label: 'Total hoje',
    icon: UtensilsCrossed,
    borderColor: 'border-l-brand-400',
    bgTint: 'bg-brand-50/50 dark:bg-brand-950/10',
    iconColor: 'text-brand-500',
  },
  {
    key: 'breakfast',
    label: 'Cafe da manhã',
    icon: Coffee,
    borderColor: 'border-l-amber-400',
    bgTint: 'bg-amber-50/50 dark:bg-amber-950/10',
    iconColor: 'text-amber-500',
  },
  {
    key: 'lunch',
    label: 'Almoço',
    icon: Sun,
    borderColor: 'border-l-green-400',
    bgTint: 'bg-green-50/50 dark:bg-green-950/10',
    iconColor: 'text-green-500',
  },
  {
    key: 'dinner',
    label: 'Jantar',
    icon: Moon,
    borderColor: 'border-l-indigo-400',
    bgTint: 'bg-indigo-50/50 dark:bg-indigo-950/10',
    iconColor: 'text-indigo-500',
  },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const deleteMeal = useDeleteMeal()
  const today = todayYmdBrasilia()

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ['meals', today],
    queryFn: () => mealsApi.list({ start: today, end: today }),
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', 'day', today],
    queryFn: () => statsApi.day(today),
  })

  const greeting = () => {
    const h = currentHourBrasilia()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const dateLabel = formatInBrasilia(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  const statValues = stats
    ? [
        stats.total_meals,
        stats.meal_type_distribution.breakfast,
        stats.meal_type_distribution.lunch,
        stats.meal_type_distribution.dinner,
      ]
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
            {greeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="mt-0.5 text-sm capitalize text-warm-gray-500 dark:text-warm-gray-400">
            {dateLabel}
          </p>
        </div>
        <Button asChild>
          <Link to="/upload" className="gap-2">
            <Plus className="h-4 w-4" />
            Registrar
          </Link>
        </Button>
      </div>

      {/* Today's stats */}
      {statValues && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_CONFIG.map((cfg, i) => {
            const Icon = cfg.icon
            return (
              <Card
                key={cfg.key}
                className={`border-l-4 ${cfg.borderColor} ${cfg.bgTint} hover:shadow-md`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading text-3xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
                        {statValues[i]}
                      </p>
                      <p className="text-xs font-medium text-warm-gray-500 dark:text-warm-gray-400">
                        {cfg.label}
                      </p>
                    </div>
                    <Icon className={`h-8 w-8 ${cfg.iconColor} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Meals list */}
      <Card>
        <CardHeader>
          <CardTitle>Refeições de hoje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <p className="text-sm text-warm-gray-400 dark:text-warm-gray-500">Carregando...</p>
          )}
          {!isLoading && meals.length === 0 && (
            <EmptyState
              icon={UtensilsCrossed}
              title="Nenhuma refeição registrada hoje"
              description="Registre sua primeira refeição do dia e acompanhe sua alimentação."
              actionLabel="Registrar refeição"
              onAction={() => navigate('/upload')}
            />
          )}
          {meals.map((meal, i) => (
            <div
              key={meal.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
            >
              <MealCard
                meal={meal}
                onClick={() => navigate(`/meals/${meal.id}`)}
                onDelete={() => {
                  if (!window.confirm('Excluir esta refeição?')) return
                  deleteMeal.mutate(meal.id)
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
