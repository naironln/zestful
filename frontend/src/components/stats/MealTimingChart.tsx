import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import type { MealTimingEntry } from '@/types/stats'

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f59e0b',
  lunch: '#10b981',
  dinner: '#6366f1',
  snack: '#ec4899',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{label}h</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
            {p.value} refeições
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MealTimingChart({ data }: { data: MealTimingEntry[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Sem dados no período
      </p>
    )
  }

  // Aggregate by hour (sum all meal types per hour)
  const byHour = new Map<number, { total: number; dominant: string }>()
  for (const entry of data) {
    const existing = byHour.get(entry.hour)
    if (existing) {
      existing.total += entry.count
      // Track dominant meal type for color
      const prevForType = data.find((d) => d.hour === entry.hour && d.meal_type === existing.dominant)
      if (entry.count > (prevForType?.count ?? 0)) {
        existing.dominant = entry.meal_type
      }
    } else {
      byHour.set(entry.hour, { total: entry.count, dominant: entry.meal_type })
    }
  }

  const chartData = Array.from(byHour.entries())
    .map(([hour, { total, dominant }]) => ({ hour: `${hour}`, count: total, color: MEAL_COLORS[dominant] || '#f0a832' }))
    .sort((a, b) => Number(a.hour) - Number(b.hour))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} barSize={20}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--chart-grid, #e8e6e1)"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 11, fill: '#908a7e' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: '#908a7e' }}
          axisLine={false}
          tickLine={false}
          width={20}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(236, 141, 19, 0.06)' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800} animationEasing="ease-out">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
