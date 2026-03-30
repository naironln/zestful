import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DayDoses {
  day: string
  doses: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{label}</p>
      <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">
        {payload[0].value} dose{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export default function AlcoholWeekChart({ data }: { data: DayDoses[] }) {
  const allZero = data.every((d) => d.doses === 0)

  if (allZero) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Nenhuma dose registrada nesta semana
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--chart-grid, #e8e6e1)"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="day"
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(147, 51, 234, 0.08)' }} />
        <Bar
          dataKey="doses"
          radius={[6, 6, 0, 0]}
          fill="url(#alcoholGradient)"
          animationDuration={800}
          animationEasing="ease-out"
          animationBegin={200}
        />
        <defs>
          <linearGradient id="alcoholGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  )
}
