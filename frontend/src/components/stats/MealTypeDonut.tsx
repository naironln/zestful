import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { MealTypeDistribution } from '@/types/stats'

const COLORS = {
  breakfast: '#f59e0b',
  lunch: '#10b981',
  dinner: '#6366f1',
  snack: '#ec4899',
}

const LABELS = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

export default function MealTypeDonut({ dist }: { dist: MealTypeDistribution }) {
  const data = Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }))

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Nenhuma refeição no período</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v} refeições`]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
