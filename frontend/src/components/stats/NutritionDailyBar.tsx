import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { ptBR } from 'date-fns/locale'
import { weekdayShortFromYmd } from '@/lib/brasilTimezone'
import type { DayNutritionFlags } from '@/types/stats'

const SERIES = [
  { key: 'vegetables', label: 'Verduras', color: '#10b981' },
  { key: 'protein', label: 'Proteína', color: '#ef4444' },
  { key: 'fruits', label: 'Frutas', color: '#f97316' },
  { key: 'desserts', label: 'Doces', color: '#ec4899' },
  { key: 'ultra_processed', label: 'Ultra.', color: '#f59e0b' },
] as const

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="mb-1 text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{label}</p>
      {payload.map((p: any) => (
        p.value > 0 && (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.fill }}
            />
            <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
              {p.name}: {p.value}
            </span>
          </div>
        )
      ))}
    </div>
  )
}

function CustomLegend({ payload }: any) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {payload?.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function NutritionDailyBar({ data }: { data: DayNutritionFlags[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Sem dados no período
      </p>
    )
  }

  const chartData = data.map((d) => ({
    date: weekdayShortFromYmd(d.date, ptBR),
    ...Object.fromEntries(SERIES.map((s) => [s.key, d[s.key as keyof DayNutritionFlags]])),
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barGap={1} barSize={14}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--chart-grid, #e8e6e1)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#908a7e' }}
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
          <Legend content={<CustomLegend />} />
          {SERIES.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[3, 3, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={200}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
