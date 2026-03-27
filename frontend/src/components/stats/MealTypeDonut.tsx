import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { MealTypeDistribution } from '@/types/stats'

const COLORS = {
  breakfast: '#f59e0b',
  lunch: '#10b981',
  dinner: '#6366f1',
  snack: '#ec4899',
}

const LABELS = {
  breakfast: 'Cafe da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const { name, value } = payload[0].payload
  return (
    <div className="rounded-xl border border-warm-gray-200 bg-white px-3 py-2 shadow-lg dark:border-warm-gray-700 dark:bg-warm-gray-800">
      <p className="text-sm font-medium text-warm-gray-900 dark:text-warm-gray-100">{name}</p>
      <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">{value} refeições</p>
    </div>
  )
}

export default function MealTypeDonut({ dist }: { dist: MealTypeDistribution }) {
  const data = Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
      key,
    }))

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Nenhuma refeição no período
      </p>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            paddingAngle={3}
            animationDuration={800}
            animationEasing="ease-out"
            animationBegin={200}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {/* Center label */}
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-warm-gray-900 dark:fill-warm-gray-100"
            fontSize={28}
            fontWeight={700}
            fontFamily="DM Sans, system-ui"
          >
            {total}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-warm-gray-500 dark:fill-warm-gray-400"
            fontSize={11}
          >
            refeições
          </text>
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-warm-gray-600 dark:text-warm-gray-400">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
