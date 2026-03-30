import { Wine, Trash2 } from 'lucide-react'
import { formatInBrasilia } from '@/lib/brasilTimezone'
import type { AlcoholDaySummary } from '@/types/alcohol'

interface AlcoholDayCardProps {
  summary: AlcoholDaySummary
  onDeleteEntry?: (id: string) => void
}

export default function AlcoholDayCard({ summary, onDeleteEntry }: AlcoholDayCardProps) {
  const { total_doses, entries } = summary
  const multiple = entries.length > 1

  return (
    <div className="overflow-hidden rounded-xl border border-l-4 border-l-amber-400 bg-amber-50/30 shadow-sm dark:bg-amber-950/10">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Wine className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="font-medium text-warm-gray-900 dark:text-warm-gray-100">
            {total_doses} dose{total_doses !== 1 ? 's' : ''} de álcool
            {multiple && (
              <span className="ml-1.5 text-sm font-normal text-warm-gray-500 dark:text-warm-gray-400">
                ({entries.length} registros)
              </span>
            )}
          </span>
        </div>
        {!multiple && onDeleteEntry && (
          <button
            onClick={() => onDeleteEntry(entries[0].id)}
            className="shrink-0 rounded p-1 text-warm-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
            aria-label="Excluir registro"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Single entry notes */}
      {!multiple && entries[0]?.notes && (
        <div className="border-t border-amber-100 px-4 pb-3 pt-2 dark:border-amber-900/30">
          <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400">{entries[0].notes}</p>
          <p className="mt-0.5 text-xs text-warm-gray-400 dark:text-warm-gray-500">
            {formatInBrasilia(entries[0].consumed_at, 'HH:mm')}
          </p>
        </div>
      )}

      {/* Single entry time (no notes) */}
      {!multiple && !entries[0]?.notes && (
        <div className="border-t border-amber-100 px-4 pb-3 pt-2 dark:border-amber-900/30">
          <p className="text-xs text-warm-gray-400 dark:text-warm-gray-500">
            {formatInBrasilia(entries[0].consumed_at, 'HH:mm')}
          </p>
        </div>
      )}

      {/* Multiple entries list */}
      {multiple && (
        <ul className="divide-y divide-amber-100 border-t border-amber-100 dark:divide-amber-900/30 dark:border-amber-900/30">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <div className="min-w-0">
                <span className="text-xs text-warm-gray-500 dark:text-warm-gray-400">
                  {formatInBrasilia(entry.consumed_at, 'HH:mm')}
                </span>
                <span className="mx-1.5 text-xs text-warm-gray-300 dark:text-warm-gray-600">·</span>
                <span className="text-sm text-warm-gray-700 dark:text-warm-gray-300">
                  {entry.doses} dose{entry.doses !== 1 ? 's' : ''}
                </span>
                {entry.notes && (
                  <>
                    <span className="mx-1.5 text-xs text-warm-gray-300 dark:text-warm-gray-600">·</span>
                    <span className="text-sm text-warm-gray-500 dark:text-warm-gray-400 italic">
                      {entry.notes}
                    </span>
                  </>
                )}
              </div>
              {onDeleteEntry && (
                <button
                  onClick={() => onDeleteEntry(entry.id)}
                  className="shrink-0 rounded p-1 text-warm-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  aria-label="Excluir registro"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
