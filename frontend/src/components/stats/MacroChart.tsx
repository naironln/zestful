import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { ptBR } from 'date-fns/locale'
import { weekdayShortFromYmd } from '@/lib/brasilTimezone'
import type { DailyMacros } from '@/types/stats'

const SERIES = [
  { key: 'protein_g', label: 'Proteína (g)', color: '#ef4444' },
  { key: 'carbohydrate_g', label: 'Carboidratos (g)', color: '#f59e0b' },
  { key: 'lipid_g', label: 'Gorduras (g)', color: '#8b5cf6' },
  { key: 'fiber_g', label: 'Fibras (g)', color: '#10b981' },
] as const

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="mb-1 text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
            {p.name}: {Math.round(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function CustomLegend({ payload }: any) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {payload?.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function MacroChart({ data }: { data: DailyMacros[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Sem dados nutricionais analisados no período
      </p>
    )
  }

  const chartData = data.map((d) => ({
    date: weekdayShortFromYmd(d.date, ptBR),
    protein_g: d.protein_g,
    carbohydrate_g: d.carbohydrate_g,
    lipid_g: d.lipid_g,
    fiber_g: d.fiber_g,
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
          tick={{ fontSize: 12, fill: '#908a7e' }}
          axisLine={false}
          tickLine={false}
          width={30}
          unit="g"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        {SERIES.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="macros"
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.3}
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
