import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MealTypeDonut from './MealTypeDonut'
import MealFrequencyBar from './MealFrequencyBar'
import type { PeriodStats } from '@/types/stats'

export default function StatsPanel({ stats }: { stats: PeriodStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-brand-500">{stats.total_meals}</p>
          <p className="text-sm text-gray-500">refeições registradas</p>

          {stats.top_dishes.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pratos mais frequentes</p>
              <ul className="space-y-1">
                {stats.top_dishes.slice(0, 3).map((d) => (
                  <li key={d.name} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700">{d.name}</span>
                    <span className="font-medium text-gray-900">{d.count}×</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.top_ingredients.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Ingredientes frequentes</p>
              <div className="flex flex-wrap gap-1.5">
                {stats.top_ingredients.slice(0, 8).map((i) => (
                  <span
                    key={i.name}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs capitalize text-gray-600"
                  >
                    {i.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donut */}
      <Card>
        <CardHeader>
          <CardTitle>Por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <MealTypeDonut dist={stats.meal_type_distribution} />
        </CardContent>
      </Card>

      {/* Bar */}
      {stats.meals_per_day.length > 1 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Refeições por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <MealFrequencyBar data={stats.meals_per_day} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
