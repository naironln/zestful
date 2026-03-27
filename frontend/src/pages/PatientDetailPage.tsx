import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { addDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  formatInBrasilia,
  weekStartMondayBrasilia,
  ymdInBrasilia,
  monthAnchorBrasilia,
  monthRangeYmdBrasilia,
  yearMonthBrasilia,
} from '@/lib/brasilTimezone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BarChart2,
  ArrowLeft,
} from 'lucide-react'
import { nutritionistApi } from '@/api/stats'
import { nutritionistCommentsApi } from '@/api/comments'
import { Button } from '@/components/ui/button'
import MealCard from '@/components/meals/MealCard'
import MealFilters, { type MealFilterState } from '@/components/meals/MealFilters'
import StatsPanel from '@/components/stats/StatsPanel'
import CommentSection from '@/components/comments/CommentSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { User } from '@/types/user'
import type { MealEntry } from '@/types/meal'

type ViewTab = 'week' | 'month'

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<ViewTab>('week')
  const [filters, setFilters] = useState<MealFilterState>({ mealTypes: [], nutritionFlags: [], mealSource: null })

  // Week state
  const [weekStart, setWeekStart] = useState(() => weekStartMondayBrasilia())
  const weekEnd = addDays(weekStart, 6)
  const weekStartStr = ymdInBrasilia(weekStart)
  const weekEndStr = ymdInBrasilia(weekEnd)

  // Month state
  const [month, setMonth] = useState(() => monthAnchorBrasilia())
  const { startStr: monthStartStr, endStr: monthEndStr } = monthRangeYmdBrasilia(month)
  const { year, monthNum } = yearMonthBrasilia(month)

  // Patient name from cached patients list
  const { data: patients = [] } = useQuery<User[]>({
    queryKey: ['nutritionist', 'patients'],
    queryFn: nutritionistApi.patients,
    staleTime: Infinity,
  })
  const patient = patients.find((p) => p.id === patientId)

  // ── Week queries ──

  const { data: weekMeals = [] } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'meals', weekStartStr],
    queryFn: () => nutritionistApi.patientMeals(patientId!, weekStartStr, weekEndStr),
    enabled: activeTab === 'week',
  })

  const { data: weekStats } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'stats', 'week', weekStartStr],
    queryFn: () => nutritionistApi.patientStatsWeek(patientId!, weekStartStr),
    enabled: activeTab === 'week',
  })

  const { data: weekComments = [] } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'week-comments', weekStartStr],
    queryFn: () => nutritionistCommentsApi.getWeekComments(patientId!, weekStartStr),
    enabled: !!patientId && activeTab === 'week',
  })

  const { data: weekMealCommentsMap = {} } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'meal-comments-batch', weekStartStr],
    queryFn: () =>
      nutritionistCommentsApi.getBatchMealComments(patientId!, weekStartStr, weekEndStr),
    enabled: !!patientId && activeTab === 'week',
  })

  // ── Month queries ──

  const { data: monthMeals = [] } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'meals-month', monthStartStr, monthEndStr],
    queryFn: () => nutritionistApi.patientMeals(patientId!, monthStartStr, monthEndStr),
    enabled: activeTab === 'month',
  })

  const { data: monthStats } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'stats', 'month', year, monthNum],
    queryFn: () => nutritionistApi.patientStatsMonth(patientId!, year, monthNum),
    enabled: activeTab === 'month',
  })

  const { data: monthMealCommentsMap = {} } = useQuery({
    queryKey: [
      'nutritionist',
      'patient',
      patientId,
      'meal-comments-batch-month',
      monthStartStr,
      monthEndStr,
    ],
    queryFn: () =>
      nutritionistCommentsApi.getBatchMealComments(patientId!, monthStartStr, monthEndStr),
    enabled: !!patientId && activeTab === 'month',
  })

  // ── Client-side filtering ──

  const applyFilters = useMemo(() => {
    return (meals: MealEntry[]) => {
      return meals.filter((meal) => {
        if (filters.mealTypes.length > 0 && !filters.mealTypes.includes(meal.meal_type))
          return false
        if (filters.mealSource && meal.nutrition_flags?.meal_source !== filters.mealSource)
          return false
        for (const flag of filters.nutritionFlags) {
          if (!meal.nutrition_flags?.[flag]) return false
        }
        return true
      })
    }
  }, [filters])

  const filteredWeekMeals = useMemo(() => applyFilters(weekMeals), [applyFilters, weekMeals])
  const filteredMonthMeals = useMemo(() => applyFilters(monthMeals), [applyFilters, monthMeals])

  // ── Week comment mutations ──

  const addWeekComment = useMutation({
    mutationFn: (content: string) =>
      nutritionistCommentsApi.addWeekComment(patientId!, weekStartStr, content),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'week-comments', weekStartStr],
      }),
  })

  const editWeekComment = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      nutritionistCommentsApi.updateComment(id, content),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'week-comments', weekStartStr],
      }),
  })

  const deleteWeekComment = useMutation({
    mutationFn: (id: string) => nutritionistCommentsApi.deleteComment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'week-comments', weekStartStr],
      }),
  })

  // ── Grouped month meals ──

  const groupedMonthMeals = useMemo(() => {
    const map = new Map<string, MealEntry[]>()
    for (const meal of filteredMonthMeals) {
      const key = formatInBrasilia(meal.eaten_at, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(meal)
    }
    return map
  }, [filteredMonthMeals])

  // ── Labels ──

  const weekLabel = `${formatInBrasilia(weekStart, "d 'de' MMM", { locale: ptBR })} – ${formatInBrasilia(weekEnd, "d 'de' MMM", { locale: ptBR })}`
  const monthLabel = formatInBrasilia(month, 'MMMM yyyy', { locale: ptBR })

  const toMealDetail = (mealId: string) =>
    navigate(`/nutritionist/patients/${patientId}/meals/${mealId}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/nutritionist')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
            {patient?.name ?? 'Paciente'}
          </h1>
          {patient?.email && (
            <p className="truncate text-sm text-warm-gray-500 dark:text-warm-gray-400">
              {patient.email}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-warm-gray-200 bg-warm-gray-100 p-1 dark:border-warm-gray-700 dark:bg-warm-gray-800">
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'week'
              ? 'bg-white text-brand-700 shadow-sm dark:bg-warm-gray-900 dark:text-brand-300'
              : 'text-warm-gray-500 hover:text-warm-gray-700 dark:text-warm-gray-400 dark:hover:text-warm-gray-200'
          )}
          onClick={() => setActiveTab('week')}
        >
          <CalendarDays className="h-4 w-4" />
          Semana
        </button>
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'month'
              ? 'bg-white text-brand-700 shadow-sm dark:bg-warm-gray-900 dark:text-brand-300'
              : 'text-warm-gray-500 hover:text-warm-gray-700 dark:text-warm-gray-400 dark:hover:text-warm-gray-200'
          )}
          onClick={() => setActiveTab('month')}
        >
          <BarChart2 className="h-4 w-4" />
          Mês
        </button>
      </div>

      {/* ────── Week view ────── */}
      {activeTab === 'week' && (
        <>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-40 text-center text-sm font-medium text-warm-gray-600 dark:text-warm-gray-400">
              {weekLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {weekStats && <StatsPanel stats={weekStats} />}

          <Card>
            <CardHeader>
              <CardTitle>Feedback semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentSection
                comments={weekComments}
                onAdd={(content) => addWeekComment.mutateAsync(content)}
                onEdit={(id, content) => editWeekComment.mutate({ id, content })}
                onDelete={(id) => {
                  if (!window.confirm('Excluir este comentário?')) return
                  deleteWeekComment.mutate(id)
                }}
                isLoading={addWeekComment.isPending}
              />
            </CardContent>
          </Card>

          <MealFilters filters={filters} onChange={setFilters} />

          <Card>
            <CardHeader>
              <CardTitle>Refeições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredWeekMeals.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Sem refeições nessa semana"
                  description="O paciente ainda não registrou refeições neste período."
                />
              ) : (
                filteredWeekMeals.map((meal, i) => (
                  <div
                    key={meal.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                  >
                    <MealCard
                      meal={meal}
                      onClick={() => toMealDetail(meal.id)}
                      comments={weekMealCommentsMap[meal.id]}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ────── Month view ────── */}
      {activeTab === 'month' && (
        <>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium capitalize text-warm-gray-600 dark:text-warm-gray-400">
              {monthLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {monthStats && <StatsPanel stats={monthStats} />}

          <MealFilters filters={filters} onChange={setFilters} />

          <Card>
            <CardHeader>
              <CardTitle>Todas as refeições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredMonthMeals.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title="Sem refeições nesse mês"
                  description="O paciente ainda não registrou refeições neste período."
                />
              ) : (
                Array.from(groupedMonthMeals.entries()).map(([dateKey, dayMeals]) => {
                  const dayLabel = formatInBrasilia(dateKey, "EEEE - dd/MM/yyyy", {
                    locale: ptBR,
                  })
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
                          style={{
                            animationDelay: `${i * 50}ms`,
                            animationFillMode: 'both',
                          }}
                        >
                          <MealCard
                            meal={meal}
                            onClick={() => toMealDetail(meal.id)}
                            comments={monthMealCommentsMap[meal.id]}
                          />
                        </div>
                      ))}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
