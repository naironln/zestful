import type { TopItem } from '@/types/stats'

export default function TopItemsList({ items, label }: { items: TopItem[]; label: string }) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Sem dados no período
      </p>
    )
  }

  const max = items[0].count

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-warm-gray-400 dark:text-warm-gray-500">
        {label}
      </p>
      {items.map((item, i) => {
        const pct = max > 0 ? (item.count / max) * 100 : 0
        return (
          <div key={item.name} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-warm-gray-400 dark:text-warm-gray-500">
              {i + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-warm-gray-700 dark:text-warm-gray-300">
                  {item.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-warm-gray-500 dark:text-warm-gray-400">
                  {item.count}×
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-warm-gray-100 dark:bg-warm-gray-800">
                <div
                  className="h-full rounded-full bg-brand-400 transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
