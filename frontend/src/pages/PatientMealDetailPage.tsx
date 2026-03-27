import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ptBR } from 'date-fns/locale'
import { formatInBrasilia } from '@/lib/brasilTimezone'
import { ArrowLeft, Utensils, Scale } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { nutritionistCommentsApi } from '@/api/comments'
import { BASE_URL } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MealTypeTag from '@/components/meals/MealTypeTag'
import CommentSection from '@/components/comments/CommentSection'

const PIE_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#3b82f6']

const KEY_NUTRIENTS = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'lipid_g', 'fiber_g']
const NUTRIENT_LABELS: Record<string, string> = {
  energy_kcal: 'Calorias',
  protein_g: 'Proteína',
  carbohydrate_g: 'Carboidratos',
  lipid_g: 'Gorduras',
  fiber_g: 'Fibras',
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const { name, value } = payload[0].payload
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{name}</p>
      <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">{value}%</p>
    </div>
  )
}

export default function PatientMealDetailPage() {
  const { patientId, mealId } = useParams<{ patientId: string; mealId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: meal, isLoading } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'meal-detail', mealId],
    queryFn: () => nutritionistCommentsApi.getPatientMealDetail(patientId!, mealId!),
    enabled: !!patientId && !!mealId,
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['nutritionist', 'patient', patientId, 'meal-comments', mealId],
    queryFn: () => nutritionistCommentsApi.getMealComments(patientId!, mealId!),
    enabled: !!patientId && !!mealId,
  })

  const addComment = useMutation({
    mutationFn: (content: string) =>
      nutritionistCommentsApi.addMealComment(patientId!, mealId!, content),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'meal-comments', mealId],
      }),
  })

  const editComment = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      nutritionistCommentsApi.updateComment(id, content),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'meal-comments', mealId],
      }),
  })

  const deleteComment = useMutation({
    mutationFn: (id: string) => nutritionistCommentsApi.deleteComment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['nutritionist', 'patient', patientId, 'meal-comments', mealId],
      }),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-base text-warm-gray-400 dark:text-warm-gray-500">
        Carregando detalhes...
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-base text-warm-gray-400 dark:text-warm-gray-500">
          Refeição não encontrada.
        </p>
        <Button variant="link" onClick={() => navigate(-1)} className="mt-2">
          Voltar
        </Button>
      </div>
    )
  }

  const imageUrl = meal.image_url
    ? meal.image_url.startsWith('http')
      ? meal.image_url
      : `${BASE_URL}${meal.image_url}`
    : null

  const dateLabel = formatInBrasilia(meal.eaten_at, "EEEE, d 'de' MMMM · HH:mm", {
    locale: ptBR,
  })

  const pieData =
    meal.plate_composition?.map((item, i) => ({
      name: item.label,
      value: item.percentage,
      color: PIE_COLORS[i % PIE_COLORS.length],
    })) ?? []

  const keyNutrients =
    meal.nutrients
      ?.filter((n) => KEY_NUTRIENTS.includes(n.key))
      .sort((a, b) => KEY_NUTRIENTS.indexOf(a.key) - KEY_NUTRIENTS.indexOf(b.key)) ?? []

  const otherNutrients =
    meal.nutrients
      ?.filter((n) => !KEY_NUTRIENTS.includes(n.key))
      .sort((a, b) => a.name.localeCompare(b.name)) ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
          Refeição do paciente
        </h1>
      </div>

      {/* Photo */}
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-2xl bg-warm-gray-100 dark:bg-warm-gray-800">
          <img
            src={imageUrl}
            alt={meal.dish_name}
            className="mx-auto block h-auto max-h-[min(70vh,36rem)] w-auto max-w-full"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-warm-gray-100 dark:bg-warm-gray-800">
          <Utensils className="h-12 w-12 text-warm-gray-300 dark:text-warm-gray-600" />
        </div>
      )}

      {/* Dish name + meta */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading text-xl font-bold capitalize text-warm-gray-900 dark:text-warm-gray-50">
            {meal.dish_name}
          </p>
          <MealTypeTag type={meal.meal_type} />
        </div>
        <p className="mt-1 text-base capitalize text-warm-gray-500 dark:text-warm-gray-400">
          {dateLabel}
        </p>
      </div>

      {/* Key nutrients */}
      {keyNutrients.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {keyNutrients.map((n, i) => (
            <Card
              key={n.key}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <CardContent className="p-4 text-center">
                <p className="font-heading text-xl font-bold text-brand-500">
                  {n.key === 'energy_kcal' ? Math.round(n.per_100g) : n.per_100g.toFixed(1)}
                </p>
                <p className="mt-1 text-sm leading-tight text-warm-gray-600 dark:text-warm-gray-400">
                  {NUTRIENT_LABELS[n.key] || n.name}
                  <span className="block text-xs text-warm-gray-400 dark:text-warm-gray-500">
                    {n.unit}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plate composition pie */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Composição do prato</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                  animationDuration={800}
                  animationEasing="ease-out"
                  animationBegin={200}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
                    {d.name} ({d.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Scale className="h-5 w-5" />
            Ingredientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {meal.ingredients.map((ing, i) => (
            <div
              key={ing.name}
              className={`flex items-center justify-between px-2 py-2 text-base ${
                i % 2 === 0 ? 'bg-warm-gray-50/50 dark:bg-warm-gray-800/30' : ''
              } rounded`}
            >
              <span className="capitalize text-warm-gray-700 dark:text-warm-gray-300">
                {ing.name}
              </span>
              {ing.grams != null && (
                <span className="font-medium text-warm-gray-400 dark:text-warm-gray-500">
                  {ing.grams}g
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Full nutrients table */}
      {otherNutrients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Nutrientes detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {otherNutrients.map((n, i) => (
                <div
                  key={n.key}
                  className={`flex items-center justify-between px-2 py-1.5 text-base ${
                    i % 2 === 0 ? 'bg-warm-gray-50/50 dark:bg-warm-gray-800/30' : ''
                  } rounded`}
                >
                  <span className="text-warm-gray-600 dark:text-warm-gray-400">{n.name}</span>
                  <span className="text-warm-gray-400 dark:text-warm-gray-500">
                    {n.per_100g.toFixed(1)} {n.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient notes */}
      {meal.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Notas do paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-warm-gray-600 dark:text-warm-gray-400">{meal.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Nutritionist comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          <CommentSection
            comments={comments}
            onAdd={(content) => addComment.mutateAsync(content)}
            onEdit={(id, content) => editComment.mutate({ id, content })}
            onDelete={(id) => {
              if (!window.confirm('Excluir este comentário?')) return
              deleteComment.mutate(id)
            }}
            isLoading={addComment.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
