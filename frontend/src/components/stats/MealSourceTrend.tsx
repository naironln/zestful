import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { ptBR } from 'date-fns/locale'
import { weekdayShortFromYmd } from '@/lib/brasilTimezone'
import type { DayNutritionFlags } from '@/types/stats'

const SERIES = [
  { key: 'homemade', label: 'Caseiro', color: '#0ea5e9' },
  { key: 'restaurant', label: 'Restaurante', color: '#8b5cf6' },
  { key: 'delivery', label: 'Delivery', color: '#14b8a6' },
] as const

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="mb-1 text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{label}</p>
      {payload.map((p: any) => (
        p.value > 0 && (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke }} />
            <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
              {p.name}: {p.value}
            </span>
          </div>
        )
      ))}
    </div>
  )
}

export default function MealSourceTrend({ data }: { data: DayNutritionFlags[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Sem dados no período
      </p>
    )
  }

  const chartData = data.map((d) => ({
    date: weekdayShortFromYmd(d.date, ptBR),
    homemade: d.homemade,
    restaurant: d.restaurant,
    delivery: d.delivery,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData}>
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
        <Tooltip content={<CustomTooltip />} />
        {SERIES.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="source"
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.4}
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
