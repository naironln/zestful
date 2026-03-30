import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, Image as ImageIcon, FlaskConical, Loader2 } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { BASE_URL } from '@/api/client'
import { Button } from '@/components/ui/button'
import MealTypeTag from '@/components/meals/MealTypeTag'
import NutritionFlagsBadges from '@/components/meals/NutritionFlagsBadges'
import type { MealEntry, MealType, MealNutritionFlags } from '@/types/meal'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Cafe da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

export default function UploadPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<MealEntry | null>(null)
  const [overrideType, setOverrideType] = useState<MealType | null>(null)
  const [correction, setCorrection] = useState('')

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setOverrideType(null)

    const isHeic = f.type === 'image/heic' || f.type === 'image/heif' ||
      f.name.toLowerCase().endsWith('.heic') || f.name.toLowerCase().endsWith('.heif')

    if (isHeic) {
      try {
        const { default: heic2any } = await import('heic2any')
        const converted = await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.85 })
        const blob = Array.isArray(converted) ? converted[0] : converted
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target?.result as string)
        reader.readAsDataURL(blob)
      } catch {
        setPreview(null)
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData()
      formData.append('file', file!)
      if (notes) formData.append('notes', notes)
      return mealsApi.upload(formData)
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['meals'] })
    },
  })

  const patchMutation = useMutation({
    mutationFn: (type: MealType) => mealsApi.patch(result!.id, { meal_type: type }),
    onSuccess: (data) => {
      setResult(data)
      setOverrideType(data.meal_type)
    },
  })

  const correctionMutation = useMutation({
    mutationFn: () => mealsApi.correct(result!.id, correction),
    onSuccess: (data) => {
      setResult(data)
      setCorrection('')
      queryClient.invalidateQueries({ queryKey: ['meals'] })
    },
  })

  const flagsMutation = useMutation({
    mutationFn: (flags: Partial<MealNutritionFlags>) => mealsApi.patch(result!.id, flags),
    onSuccess: (data) => {
      setResult(data)
    },
  })

  const nutritionMutation = useMutation({
    mutationFn: () => mealsApi.analyzeNutrition(result!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      navigate(`/meals/${result!.id}`)
    },
  })

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setNotes('')
    setOverrideType(null)
    setCorrection('')
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
          Registrar refeição
        </h1>
        <p className="mt-1 text-sm text-warm-gray-500 dark:text-warm-gray-400">
          Tire ou selecione uma foto — a IA identifica o prato automaticamente.
        </p>
      </div>

      {!result ? (
        <>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-300 cursor-pointer ${
              isDragActive
                ? 'border-brand-400 bg-brand-50 animate-pulse-border dark:bg-brand-950/20'
                : 'border-warm-gray-200 hover:border-brand-300 hover:bg-warm-gray-50 dark:border-warm-gray-700 dark:hover:border-brand-600 dark:hover:bg-warm-gray-800/50'
            }`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="max-h-60 rounded-xl object-contain animate-scale-in"
              />
            ) : (
              <>
                <ImageIcon className="mb-3 h-12 w-12 text-warm-gray-300 dark:text-warm-gray-600" />
                <p className="text-sm font-medium text-warm-gray-600 dark:text-warm-gray-400">
                  {isDragActive
                    ? 'Solte a imagem aqui'
                    : 'Arraste uma foto ou clique para selecionar'}
                </p>
                <p className="mt-1 text-xs text-warm-gray-400 dark:text-warm-gray-500">
                  JPG, PNG, WebP, HEIC (iPhone)
                </p>
              </>
            )}
          </div>

          {file && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: sem glúten, refeição pós-treino..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-warm-gray-900 dark:text-warm-gray-100"
                />
              </div>

              {mutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Erro ao analisar. Tente novamente.
                </p>
              )}

              <Button
                className="w-full gap-2"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Analisar e registrar
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Result card */
        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm animate-scale-in">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Refeição registrada!</span>
          </div>

          {result.image_url && (
            <img
              src={
                result.image_url.startsWith('http')
                  ? result.image_url
                  : `${BASE_URL}${result.image_url}`
              }
              alt={result.dish_name}
              className="max-h-52 w-full rounded-xl object-cover"
            />
          )}

          <div>
            <p className="text-lg font-semibold capitalize text-warm-gray-900 dark:text-warm-gray-50">
              {result.dish_name}
            </p>
            {result.ingredients.length > 0 && (
              <p className="mt-1 text-sm text-warm-gray-500 dark:text-warm-gray-400">
                {result.ingredients.join(', ')}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-warm-gray-600 dark:text-warm-gray-400">
              Tipo de refeição identificado:
            </p>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => patchMutation.mutate(type)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    (overrideType ?? result.meal_type) === type
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
                      : 'border-warm-gray-200 text-warm-gray-600 hover:bg-warm-gray-50 dark:border-warm-gray-700 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800'
                  }`}
                >
                  {MEAL_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {result.confidence !== null && (
            <p className="text-xs text-warm-gray-400 dark:text-warm-gray-500">
              Confiança da IA: {Math.round((result.confidence ?? 0) * 100)}%
            </p>
          )}

          {result.nutrition_flags && (
            <div>
              <p className="mb-2 text-sm font-medium text-warm-gray-600 dark:text-warm-gray-400">
                Classificação identificada:
              </p>
              <NutritionFlagsBadges
                flags={result.nutrition_flags}
                editable
                onFlagsChange={(flags) => flagsMutation.mutate(flags)}
              />
            </div>
          )}

          <div className="space-y-2 border-t border-warm-gray-200 pt-4 dark:border-warm-gray-700">
            <label className="block text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
              Corrigir identificação
            </label>
            <textarea
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              rows={2}
              placeholder="Ex: não é creme de abóbora, são ovos mexidos..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-warm-gray-900 dark:text-warm-gray-100"
            />
            {correctionMutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Erro ao corrigir. Tente novamente.
              </p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => correctionMutation.mutate()}
              disabled={!correction.trim() || correctionMutation.isPending}
            >
              {correctionMutation.isPending ? 'Corrigindo...' : 'Corrigir'}
            </Button>
          </div>

          {nutritionMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Erro ao analisar nutrientes. Tente novamente.
            </p>
          )}

          <Button
            className="w-full gap-2"
            onClick={() => nutritionMutation.mutate()}
            disabled={nutritionMutation.isPending}
          >
            {nutritionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Estimando porções e nutrientes...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Analisar nutrientes
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/meals/${result!.id}`)}
            disabled={nutritionMutation.isPending}
          >
            Salvar sem estimativa
          </Button>

          <Button variant="outline" className="w-full" onClick={reset}>
            Registrar outra refeição
          </Button>
        </div>
      )}
    </div>
  )
}
