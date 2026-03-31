import { UtensilsCrossed, CalendarCheck, Leaf, FlaskConical, Wine } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { PeriodStats } from '@/types/stats'

interface SummaryCard {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  borderColor: string
  bgTint: string
  iconColor: string
}

function buildCards(stats: PeriodStats): SummaryCard[] {
  const cards: SummaryCard[] = [
    {
      icon: UtensilsCrossed,
      label: 'Total refeições',
      value: stats.total_meals,
      borderColor: 'border-l-brand-400',
      bgTint: 'bg-brand-50/50 dark:bg-brand-950/10',
      iconColor: 'text-brand-500',
    },
    {
      icon: CalendarCheck,
      label: 'Dias registrados',
      value: `${stats.logging_consistency.days_with_meals}/${stats.logging_consistency.total_days}`,
      sub: stats.logging_consistency.gap_days > 0
        ? `${stats.logging_consistency.gap_days} dia${stats.logging_consistency.gap_days > 1 ? 's' : ''} sem registro`
        : undefined,
      borderColor: 'border-l-emerald-400',
      bgTint: 'bg-emerald-50/50 dark:bg-emerald-950/10',
      iconColor: 'text-emerald-500',
    },
    {
      icon: Leaf,
      label: 'Ingredientes únicos',
      value: stats.diet_diversity.unique_ingredients,
      borderColor: 'border-l-green-400',
      bgTint: 'bg-green-50/50 dark:bg-green-950/10',
      iconColor: 'text-green-500',
    },
    {
      icon: FlaskConical,
      label: 'Analisadas',
      value: stats.total_meals > 0
        ? `${Math.round((stats.nutrition_flags.analyzed_count / stats.total_meals) * 100)}%`
        : '—',
      sub: stats.total_meals > 0
        ? `${stats.nutrition_flags.analyzed_count} de ${stats.total_meals}`
        : undefined,
      borderColor: 'border-l-sky-400',
      bgTint: 'bg-sky-50/50 dark:bg-sky-950/10',
      iconColor: 'text-sky-500',
    },
  ]

  if (stats.alcohol_stats.total_doses > 0) {
    cards.push({
      icon: Wine,
      label: 'Doses de álcool',
      value: stats.alcohol_stats.total_doses,
      sub: `${stats.alcohol_stats.days_with_alcohol} dia${stats.alcohol_stats.days_with_alcohol > 1 ? 's' : ''}`,
      borderColor: 'border-l-purple-400',
      bgTint: 'bg-purple-50/50 dark:bg-purple-950/10',
      iconColor: 'text-purple-500',
    })
  }

  return cards
}

export default function StatsSummaryRow({ stats }: { stats: PeriodStats }) {
  const cards = buildCards(stats)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.label}
            className={`border-l-4 ${card.borderColor} ${card.bgTint}`}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-heading text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-50">
                    {card.value}
                  </p>
                  <p className="text-xs font-medium text-warm-gray-500 dark:text-warm-gray-400">
                    {card.label}
                  </p>
                  {card.sub && (
                    <p className="mt-0.5 text-[10px] text-warm-gray-400 dark:text-warm-gray-500">
                      {card.sub}
                    </p>
                  )}
                </div>
                <Icon className={`h-6 w-6 shrink-0 ${card.iconColor} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
