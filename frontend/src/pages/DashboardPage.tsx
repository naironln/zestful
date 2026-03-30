import { ptBR } from 'date-fns/locale'
import {
  currentHourBrasilia,
  formatInBrasilia,
  todayYmdBrasilia,
} from '@/lib/brasilTimezone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDeleteMeal } from '@/hooks/useDeleteMeal'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Coffee, Sun, Moon, UtensilsCrossed, Salad, Apple, Cake, Factory, Drumstick, Home, UserCheck } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { statsApi, patientApi } from '@/api/stats'
import { getBatchMealComments } from '@/api/comments'
import { alcoholApi } from '@/api/alcohol'
import { useAuthStore } from '@/store/authStore'
import MealCard from '@/components/meals/MealCard'
import AlcoholDayCard from '@/components/alcohol/AlcoholDayCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'
import type { LinkRequest } from '@/types/user'

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

function LinkRequestsBanner() {
  const queryClient = useQueryClient()

  const { data: requests = [] } = useQuery<LinkRequest[]>({
    queryKey: ['patient', 'link-requests'],
    queryFn: patientApi.linkRequests,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' }) =>
      patientApi.respondToRequest(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'link-requests'] })
    },
  })

  if (requests.length === 0) return null

  return (
    <Card className="border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-5 w-5 text-brand-500" />
          Solicitações de vínculo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between rounded-lg border border-brand-100 bg-white p-3 dark:border-brand-900 dark:bg-warm-gray-900"
          >
            <div>
              <p className="font-medium text-warm-gray-900 dark:text-warm-gray-100">
                {req.nutritionist_name}
              </p>
              <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">
                {req.nutritionist_email}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => respondMutation.mutate({ id: req.id, action: 'reject' })}
                disabled={respondMutation.isPending}
              >
                Recusar
              </Button>
              <Button
                size="sm"
                onClick={() => respondMutation.mutate({ id: req.id, action: 'accept' })}
                disabled={respondMutation.isPending}
              >
                Aceitar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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

  const { data: mealCommentsMap = {} } = useQuery({
    queryKey: ['meal-comments-batch', today],
    queryFn: () => getBatchMealComments(today, today),
  })

  const { data: alcoholSummaries = [] } = useQuery({
    queryKey: ['alcohol', today],
    queryFn: () => alcoholApi.list({ start: today, end: today }),
  })

  const deleteAlcohol = useMutation({
    mutationFn: (id: string) => alcoholApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alcohol'] }),
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

      {/* Link requests (patients only) */}
      {user?.role === 'patient' && <LinkRequestsBanner />}

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

      {/* Daily nutrition flags */}
      {stats && stats.total_meals > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { icon: Salad, label: 'Verduras', value: stats.nutrition_flags.meals_with_vegetables, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { icon: Apple, label: 'Frutas', value: stats.nutrition_flags.fruit_count, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
            { icon: Drumstick, label: 'Proteína', value: stats.nutrition_flags.meals_with_protein, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
            { icon: Home, label: 'Caseiro', value: stats.nutrition_flags.homemade_count, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30' },
            { icon: Cake, label: 'Doces', value: stats.nutrition_flags.dessert_count, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/30' },
            { icon: Factory, label: 'Ultra.', value: stats.nutrition_flags.ultra_processed_count, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${item.bg}`}
              >
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="text-xs font-medium text-warm-gray-700 dark:text-warm-gray-300">
                  {item.value} {item.label}
                </span>
              </div>
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
                comments={mealCommentsMap[meal.id]}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alcohol */}
      {alcoholSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Álcool hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alcoholSummaries.map((summary) => (
              <AlcoholDayCard
                key={summary.date}
                summary={summary}
                onDeleteEntry={(id) => {
                  if (!window.confirm('Excluir este registro?')) return
                  deleteAlcohol.mutate(id)
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
