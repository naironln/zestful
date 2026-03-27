import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ptBR } from 'date-fns/locale'
import { weekdayShortFromYmd } from '@/lib/brasilTimezone'
import type { DayCount } from '@/types/stats'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{label}</p>
      <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">
        {payload[0].value} refeições
      </p>
    </div>
  )
}

export default function MealFrequencyBar({ data }: { data: DayCount[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Sem dados no período
      </p>
    )
  }

  const chartData = data.map((d) => ({
    date: weekdayShortFromYmd(d.date, ptBR),
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} barSize={28}>
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
          width={24}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(236, 141, 19, 0.08)' }} />
        <Bar
          dataKey="count"
          radius={[6, 6, 0, 0]}
          fill="url(#barGradient)"
          animationDuration={800}
          animationEasing="ease-out"
          animationBegin={200}
        />
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0a832" />
            <stop offset="100%" stopColor="#ec8d13" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  )
}
