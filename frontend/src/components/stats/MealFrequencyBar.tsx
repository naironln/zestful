import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ptBR } from 'date-fns/locale'
import { weekdayShortFromYmd } from '@/lib/brasilTimezone'
import type { DayCount } from '@/types/stats'

export default function MealFrequencyBar({ data }: { data: DayCount[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Sem dados no período</p>
  }

  const chartData = data.map((d) => ({
    date: weekdayShortFromYmd(d.date, ptBR),
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} barSize={28}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={24} />
        <Tooltip formatter={(v) => [`${v} refeições`]} cursor={{ fill: '#fef9ee' }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill="#f0a832" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
