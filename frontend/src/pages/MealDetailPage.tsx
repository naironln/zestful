import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ptBR } from 'date-fns/locale'
import { formatInBrasilia } from '@/lib/brasilTimezone'
import { ArrowLeft, Utensils, Scale, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { mealsApi } from '@/api/meals'
import { BASE_URL } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MealTypeTag from '@/components/meals/MealTypeTag'

const PIE_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#3b82f6']

const KEY_NUTRIENTS = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'lipid_g', 'fiber_g']
const NUTRIENT_LABELS: Record<string, string> = {
  energy_kcal: 'Calorias',
  protein_g: 'Proteina',
  carbohydrate_g: 'Carboidratos',
  lipid_g: 'Gorduras',
  fiber_g: 'Fibras',
}

export default function MealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')

  const { data: meal, isLoading } = useQuery({
    queryKey: ['meal-detail', mealId],
    queryFn: () => mealsApi.getDetail(mealId!),
    enabled: !!mealId,
  })

  const notesMutation = useMutation({
    mutationFn: (notes: string) => mealsApi.patch(mealId!, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-detail', mealId] })
      setEditingNotes(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => mealsApi.delete(mealId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      navigate('/dashboard')
    },
  })

  const handleDelete = () => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir esta refeição? Esta ação não pode ser desfeita.'
      )
    ) {
      return
    }
    deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-base text-gray-400">
        Carregando detalhes...
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-base text-gray-400">Refeição não encontrada.</p>
        <Button variant="link" onClick={() => navigate('/dashboard')} className="mt-2">
          Voltar ao início
        </Button>
      </div>
    )
  }

  const imageUrl = meal.image_url
    ? meal.image_url.startsWith('http') ? meal.image_url : `${BASE_URL}${meal.image_url}`
    : null

  const dateLabel = formatInBrasilia(
    meal.eaten_at,
    "EEEE, d 'de' MMMM · HH:mm",
    { locale: ptBR }
  )

  const pieData = meal.plate_composition?.map((item, i) => ({
    name: item.label,
    value: item.percentage,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })) ?? []

  const keyNutrients = meal.nutrients
    ?.filter(n => KEY_NUTRIENTS.includes(n.key))
    .sort((a, b) => KEY_NUTRIENTS.indexOf(a.key) - KEY_NUTRIENTS.indexOf(b.key))
    ?? []

  const otherNutrients = meal.nutrients
    ?.filter(n => !KEY_NUTRIENTS.includes(n.key))
    .sort((a, b) => a.name.localeCompare(b.name))
    ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 text-2xl font-bold text-gray-900">Detalhes da refeição</h1>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
          {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
        </Button>
      </div>
      {deleteMutation.isError && (
        <p className="text-sm text-red-600">
          Não foi possível excluir. Tente novamente.
        </p>
      )}

      {/* Photo — intrinsic aspect ratio; capped so very tall photos don’t dominate */}
      {imageUrl ? (
        <div className="flex justify-center rounded-2xl bg-gray-100">
          <img
            src={imageUrl}
            alt={meal.dish_name}
            className="mx-auto block h-auto max-h-[min(70vh,36rem)] w-auto max-w-full rounded-2xl"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-gray-100">
          <Utensils className="h-12 w-12 text-gray-300" />
        </div>
      )}

      {/* Dish name + meta */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xl font-bold capitalize text-gray-900">{meal.dish_name}</p>
          <MealTypeTag type={meal.meal_type} />
        </div>
        <p className="mt-1 text-base capitalize text-gray-500">{dateLabel}</p>
      </div>

      {/* Key nutrients summary */}
      {keyNutrients.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {keyNutrients.map((n) => (
            <Card key={n.key}>
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-brand-500">
                  {n.key === 'energy_kcal' ? Math.round(n.per_100g) : n.per_100g.toFixed(1)}
                </p>
                <p className="mt-1 text-sm leading-tight text-gray-600">
                  {NUTRIENT_LABELS[n.key] || n.name}
                  <span className="block text-xs text-gray-400">{n.unit}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plate composition pie chart */}
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
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v}%`, '']}
                  contentStyle={{ fontSize: '0.875rem' }}
                  labelStyle={{ fontSize: '0.875rem', color: '#374151' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.875rem', paddingTop: 12, color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Ingredients with grams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Scale className="h-5 w-5" />
            Ingredientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meal.ingredients.map((ing) => (
            <div key={ing.name} className="flex items-center justify-between text-base">
              <span className="text-gray-700 capitalize">{ing.name}</span>
              {ing.grams != null && (
                <span className="text-gray-400 font-medium">{ing.grams}g</span>
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
            <div className="space-y-1.5">
              {otherNutrients.map((n) => (
                <div key={n.key} className="flex items-center justify-between text-base">
                  <span className="text-gray-600">{n.name}</span>
                  <span className="text-gray-400">
                    {n.per_100g.toFixed(1)} {n.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Notas</CardTitle>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ex: jantar fora com os amigos..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => notesMutation.mutate(notesValue)}
                  disabled={notesMutation.isPending}
                >
                  {notesMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => { setNotesValue(meal.notes || ''); setEditingNotes(true) }}
              className="min-h-[2.5rem] cursor-pointer rounded-lg p-2 text-base text-gray-500 hover:bg-gray-50"
            >
              {meal.notes || 'Clique para adicionar notas...'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
