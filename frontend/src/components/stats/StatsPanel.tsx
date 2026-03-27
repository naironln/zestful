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
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950/30">
              <span className="font-heading text-4xl font-bold text-brand-500">
                {stats.total_meals}
              </span>
            </div>
            <p className="text-sm text-warm-gray-500 dark:text-warm-gray-400">
              refeições registradas
            </p>
          </div>

          {stats.top_dishes.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warm-gray-400 dark:text-warm-gray-500">
                Pratos mais frequentes
              </p>
              <ul className="space-y-1.5">
                {stats.top_dishes.slice(0, 3).map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2.5 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 capitalize text-warm-gray-700 dark:text-warm-gray-300">
                      {d.name}
                    </span>
                    <span className="font-medium text-warm-gray-900 dark:text-warm-gray-100">
                      {d.count}x
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.top_ingredients.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warm-gray-400 dark:text-warm-gray-500">
                Ingredientes frequentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stats.top_ingredients.slice(0, 8).map((ing) => (
                  <span
                    key={ing.name}
                    className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs capitalize text-sage-700 dark:bg-sage-900/30 dark:text-sage-300"
                  >
                    {ing.name}
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
