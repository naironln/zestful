import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MealFrequencyBar from './MealFrequencyBar'
import NutritionFlagsCard from './NutritionFlagsCard'
import NutritionDailyBar from './NutritionDailyBar'
import type { PeriodStats } from '@/types/stats'

export default function StatsPanel({ stats }: { stats: PeriodStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Nutrition quality progress bars */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Qualidade alimentar</CardTitle>
        </CardHeader>
        <CardContent>
          <NutritionFlagsCard
            flags={stats.nutrition_flags}
            totalMeals={stats.total_meals}
          />
        </CardContent>
      </Card>

      {/* Meals per day */}
      {stats.meals_per_day.length > 1 && (
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Refeições por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <MealFrequencyBar data={stats.meals_per_day} />
          </CardContent>
        </Card>
      )}

      {/* Daily nutrition breakdown */}
      {stats.nutrition_flags_per_day.length > 1 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Qualidade alimentar por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <NutritionDailyBar data={stats.nutrition_flags_per_day} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
