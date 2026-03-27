import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { addDays, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInBrasilia, weekStartMondayBrasilia, ymdInBrasilia } from '@/lib/brasilTimezone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { nutritionistApi } from '@/api/stats'
import { nutritionistCommentsApi } from '@/api/comments'
import { Button } from '@/components/ui/button'
import MealCard from '@/components/meals/MealCard'
import StatsPanel from '@/components/stats/StatsPanel'
import CommentSection from '@/components/comments/CommentSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState(() => weekStartMondayBrasilia())

  const weekEnd = addDays(weekStart, 6)
  const startStr = ymdInBrasilia(weekStart)
  const endStr = ymdInBrasilia(weekEnd)

  const { data: meals = [] } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'meals', startStr],
    queryFn: () => nutritionistApi.patientMeals(patientId!, startStr, endStr),
  })

  const { data: stats } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'stats', 'week', startStr],
    queryFn: () => nutritionistApi.patientStatsWeek(patientId!, startStr),
  })

  const { data: weekComments = [] } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'week-comments', startStr],
    queryFn: () => nutritionistCommentsApi.getWeekComments(patientId!, startStr),
    enabled: !!patientId,
  })

  const addWeekComment = useMutation({
    mutationFn: (content: string) =>
      nutritionistCommentsApi.addWeekComment(patientId!, startStr, content),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'week-comments', startStr],
      }),
  })

  const editWeekComment = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      nutritionistCommentsApi.updateComment(id, content),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'week-comments', startStr],
      }),
  })

  const deleteWeekComment = useMutation({
    mutationFn: (id: string) => nutritionistCommentsApi.deleteComment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'week-comments', startStr],
      }),
  })

  const label = `${formatInBrasilia(weekStart, "d 'de' MMM", { locale: ptBR })} – ${formatInBrasilia(weekEnd, "d 'de' MMM", { locale: ptBR })}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
          Refeições do paciente
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium text-warm-gray-600 dark:text-warm-gray-400">
            {label}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {stats && <StatsPanel stats={stats} />}

      {/* Week comment section */}
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

      <Card>
        <CardHeader>
          <CardTitle>Refeições</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meals.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sem refeições nessa semana"
              description="O paciente ainda não registrou refeições neste período."
            />
          ) : (
            meals.map((meal, i) => (
              <div
                key={meal.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              >
                <MealCard
                  meal={meal}
                  onClick={() =>
                    navigate(`/nutritionist/patients/${patientId}/meals/${meal.id}`)
                  }
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
