import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wine, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { alcoholApi } from '@/api/alcohol'
import { todayYmdBrasilia } from '@/lib/brasilTimezone'

export default function DrinkLogPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const today = todayYmdBrasilia()
  const [date, setDate] = useState(today)
  const [doses, setDoses] = useState(1)
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      alcoholApi.log({
        doses,
        notes: notes.trim() || undefined,
        date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alcohol'] })
      setSuccess(true)
    },
  })

  const reset = () => {
    setDate(today)
    setDoses(1)
    setNotes('')
    setSuccess(false)
    mutation.reset()
  }

  if (success) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <div>
            <p className="text-lg font-semibold text-warm-gray-900 dark:text-warm-gray-50">
              Doses registradas!
            </p>
            <p className="mt-1 text-sm text-warm-gray-500 dark:text-warm-gray-400">
              {doses} dose{doses !== 1 ? 's' : ''} adicionada{doses !== 1 ? 's' : ''} para {date}.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={reset}>
              Registrar mais
            </Button>
            <Button className="flex-1" onClick={() => navigate('/dashboard')}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
          Registrar doses de álcool
        </h1>
        <p className="mt-1 text-sm text-warm-gray-500 dark:text-warm-gray-400">
          Informe quantas doses você consumiu e, se quiser, adicione uma observação.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        {/* Date */}
        <div className="space-y-1.5">
          <label
            htmlFor="drink-date"
            className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300"
          >
            Data
          </label>
          <input
            id="drink-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-warm-gray-900 dark:text-warm-gray-100"
          />
        </div>

        {/* Doses */}
        <div className="space-y-1.5">
          <label
            htmlFor="drink-doses"
            className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300"
          >
            Número de doses
          </label>
          <input
            id="drink-doses"
            type="number"
            min={1}
            value={doses}
            onChange={(e) => setDoses(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-warm-gray-900 dark:text-warm-gray-100"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label
            htmlFor="drink-notes"
            className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300"
          >
            Observações{' '}
            <span className="font-normal text-warm-gray-400">(opcional)</span>
          </label>
          <textarea
            id="drink-notes"
            rows={3}
            placeholder="Ex: cerveja na confraternização, vinho no jantar..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-warm-gray-900 dark:text-warm-gray-100"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-500">
            Erro ao registrar. Tente novamente.
          </p>
        )}

        <Button
          className="w-full gap-2"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Wine className="h-4 w-4" />
          {mutation.isPending ? 'Registrando...' : 'Registrar'}
        </Button>
      </div>
    </div>
  )
}
