import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MealFrequencyBar from './MealFrequencyBar'
import NutritionFlagsCard from './NutritionFlagsCard'
import NutritionDailyBar from './NutritionDailyBar'
import MealTypeDonut from './MealTypeDonut'
import MealSourceTrend from './MealSourceTrend'
import MealTimingChart from './MealTimingChart'
import MacroChart from './MacroChart'
import AlcoholTrendChart from './AlcoholTrendChart'
import TopItemsList from './TopItemsList'
import StatsSummaryRow from './StatsSummaryRow'
import type { PeriodStats } from '@/types/stats'

const CHART_TABS = [
  { id: 'quality', label: 'Qualidade Nutricional' },
  { id: 'source', label: 'Origem' },
  { id: 'macros', label: 'Macronutrientes' },
  { id: 'alcohol', label: 'Álcool' },
] as const

type ChartTab = (typeof CHART_TABS)[number]['id']

export default function StatsPanel({ stats }: { stats: PeriodStats }) {
  const [activeTab, setActiveTab] = useState<ChartTab>('quality')
  const isMultiDay = stats.meals_per_day.length > 1

  return (
    <div className="space-y-4">
      {/* ROW 1: Summary cards */}
      <StatsSummaryRow stats={stats} />

      {/* ROW 2: Nutrition flags + meal type + top dishes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
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

        <div className="space-y-4">
          {stats.total_meals > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de refeições</CardTitle>
              </CardHeader>
              <CardContent>
                <MealTypeDonut dist={stats.meal_type_distribution} />
              </CardContent>
            </Card>
          )}

          {stats.top_dishes.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <TopItemsList items={stats.top_dishes.slice(0, 5)} label="Pratos mais frequentes" />
              </CardContent>
            </Card>
          )}

          {stats.top_ingredients.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <TopItemsList items={stats.top_ingredients.slice(0, 7)} label="Ingredientes mais frequentes" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ROW 3: Tabbed trend charts (multi-day only) */}
      {isMultiDay && (
        <Card>
          <CardHeader>
            {/* Tab selector */}
            <div className="flex flex-wrap gap-1">
              {CHART_TABS.map((tab) => {
                // Hide alcohol tab if no doses
                if (tab.id === 'alcohol' && stats.alcohol_stats.total_doses === 0) return null
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-brand-500 text-white'
                        : 'text-warm-gray-600 hover:bg-warm-gray-100 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'quality' && (
              <NutritionDailyBar data={stats.nutrition_flags_per_day} />
            )}
            {activeTab === 'source' && (
              <MealSourceTrend data={stats.nutrition_flags_per_day} />
            )}
            {activeTab === 'macros' && (
              <MacroChart data={stats.daily_macros} />
            )}
            {activeTab === 'alcohol' && stats.alcohol_stats.total_doses > 0 && (
              <AlcoholTrendChart data={stats.alcohol_stats.doses_per_day} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ROW 4: Frequency + timing */}
      {isMultiDay && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Refeições por dia</CardTitle>
            </CardHeader>
            <CardContent>
              <MealFrequencyBar data={stats.meals_per_day} />
            </CardContent>
          </Card>

          {stats.meal_timing.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Horário das refeições</CardTitle>
              </CardHeader>
              <CardContent>
                <MealTimingChart data={stats.meal_timing} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
