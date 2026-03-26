import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, Image as ImageIcon, FlaskConical } from 'lucide-react'
import { mealsApi } from '@/api/meals'
import { BASE_URL } from '@/api/client'
import { Button } from '@/components/ui/button'
import MealTypeTag from '@/components/meals/MealTypeTag'
import type { MealEntry, MealType } from '@/types/meal'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
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

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setOverrideType(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
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

  const nutritionMutation = useMutation({
    mutationFn: () => mealsApi.analyzeNutrition(result!.id),
    onSuccess: (data) => {
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
        <h1 className="text-2xl font-bold text-gray-900">Registrar refeição</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tire ou selecione uma foto — a IA identifica o prato automaticamente.
        </p>
      </div>

      {!result ? (
        <>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer ${
              isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img src={preview} alt="preview" className="max-h-60 rounded-xl object-contain" />
            ) : (
              <>
                <ImageIcon className="mb-3 h-12 w-12 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">
                  {isDragActive ? 'Solte a imagem aqui' : 'Arraste uma foto ou clique para selecionar'}
                </p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, WebP</p>
              </>
            )}
          </div>

          {file && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Observações (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: sem glúten, refeição pós-treino..."
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {mutation.isError && (
                <p className="text-sm text-red-600">Erro ao analisar. Tente novamente.</p>
              )}

              <Button
                className="w-full gap-2"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                <Upload className="h-4 w-4" />
                {mutation.isPending ? 'Analisando com IA...' : 'Analisar e registrar'}
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Result card */
        <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Refeição registrada!</span>
          </div>

          {result.image_url && (
            <img
              src={result.image_url.startsWith('http') ? result.image_url : `${BASE_URL}${result.image_url}`}
              alt={result.dish_name}
              className="w-full rounded-xl object-cover max-h-52"
            />
          )}

          <div>
            <p className="text-lg font-semibold capitalize text-gray-900">{result.dish_name}</p>
            {result.ingredients.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">{result.ingredients.join(', ')}</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">Tipo de refeição identificado:</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => patchMutation.mutate(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    (overrideType ?? result.meal_type) === type
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {MEAL_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {result.confidence !== null && (
            <p className="text-xs text-gray-400">
              Confiança da IA: {Math.round((result.confidence ?? 0) * 100)}%
            </p>
          )}

          <div className="border-t pt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Corrigir identificação</label>
            <textarea
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              rows={2}
              placeholder="Ex: não é creme de abóbora, são ovos mexidos. Não tem açafrão da terra..."
              className="w-full rounded-lg border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {correctionMutation.isError && (
              <p className="text-sm text-red-600">Erro ao corrigir. Tente novamente.</p>
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
            <p className="text-sm text-red-600">Erro ao analisar nutrientes. Tente novamente.</p>
          )}

          <Button
            className="w-full gap-2"
            onClick={() => nutritionMutation.mutate()}
            disabled={nutritionMutation.isPending}
          >
            <FlaskConical className="h-4 w-4" />
            {nutritionMutation.isPending ? 'Estimando porções e nutrientes...' : 'Analisar nutrientes'}
          </Button>

          <Button variant="outline" className="w-full" onClick={reset}>
            Registrar outra refeição
          </Button>
        </div>
      )}
    </div>
  )
}
