import { Salad, Apple, Cake, Factory, Drumstick, Home, Store, Truck } from 'lucide-react'
import type { NutritionFlags } from '@/types/stats'

interface FlagRow {
  icon: React.ElementType
  label: string
  value: number
  color: string
  bgColor: string
  barColor: string
}

function positiveRows(flags: NutritionFlags): FlagRow[] {
  return [
    {
      icon: Salad,
      label: 'Com verduras',
      value: flags.meals_with_vegetables,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      barColor: 'bg-emerald-500',
    },
    {
      icon: Drumstick,
      label: 'Com proteína',
      value: flags.meals_with_protein,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      barColor: 'bg-red-500',
    },
    {
      icon: Apple,
      label: 'Frutas',
      value: flags.fruit_count,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      barColor: 'bg-orange-500',
    },
  ]
}

function cautionRows(flags: NutritionFlags): FlagRow[] {
  return [
    {
      icon: Cake,
      label: 'Doces',
      value: flags.dessert_count,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-950/30',
      barColor: 'bg-pink-500',
    },
    {
      icon: Factory,
      label: 'Ultraprocessados',
      value: flags.ultra_processed_count,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      barColor: 'bg-amber-500',
    },
  ]
}

function sourceRows(flags: NutritionFlags): FlagRow[] {
  return [
    {
      icon: Home,
      label: 'Caseiras',
      value: flags.homemade_count,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/30',
      barColor: 'bg-sky-500',
    },
    {
      icon: Store,
      label: 'Restaurante',
      value: flags.restaurant_count,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      barColor: 'bg-violet-500',
    },
    {
      icon: Truck,
      label: 'Delivery',
      value: flags.delivery_count,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      barColor: 'bg-teal-500',
    },
  ]
}

function FlagBar({ row, totalMeals }: { row: FlagRow; totalMeals: number }) {
  const Icon = row.icon
  const pct = totalMeals > 0 ? Math.round((row.value / totalMeals) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${row.bgColor}`}>
        <Icon className={`h-4 w-4 ${row.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
            {row.label}
          </span>
          <span className="text-xs tabular-nums text-warm-gray-500 dark:text-warm-gray-400">
            {row.value}/{totalMeals} ({pct}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-warm-gray-100 dark:bg-warm-gray-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${row.barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-gray-400 dark:text-warm-gray-500">
      {children}
    </p>
  )
}

export default function NutritionFlagsCard({
  flags,
  totalMeals,
}: {
  flags: NutritionFlags
  totalMeals: number
}) {
  if (totalMeals === 0) {
    return (
      <p className="py-8 text-center text-sm text-warm-gray-400 dark:text-warm-gray-500">
        Nenhuma refeição no período
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {/* Positive indicators */}
      <div>
        <SectionLabel>Positivos</SectionLabel>
        <div className="space-y-3">
          {positiveRows(flags).map((row) => (
            <FlagBar key={row.label} row={row} totalMeals={totalMeals} />
          ))}
        </div>
      </div>

      {/* Caution indicators */}
      <div>
        <SectionLabel>Atenção</SectionLabel>
        <div className="space-y-3">
          {cautionRows(flags).map((row) => (
            <FlagBar key={row.label} row={row} totalMeals={totalMeals} />
          ))}
        </div>
      </div>

      {/* Source indicators */}
      <div>
        <SectionLabel>Origem</SectionLabel>
        <div className="space-y-3">
          {sourceRows(flags).map((row) => (
            <FlagBar key={row.label} row={row} totalMeals={totalMeals} />
          ))}
        </div>
      </div>
    </div>
  )
}
