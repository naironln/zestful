import { Salad, Apple, Cake, Factory, Drumstick, Home, Store, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MealNutritionFlags, MealSource } from '@/types/meal'

interface BoolFlagDef {
  key: keyof Omit<MealNutritionFlags, 'meal_source'>
  label: string
  negativeLabel: string
  icon: React.ElementType
  activeColor: string
  activeBg: string
  inactiveColor: string
  inactiveBg: string
}

interface SourceDef {
  value: MealSource
  label: string
  icon: React.ElementType
  activeColor: string
  activeBg: string
}

const BOOL_FLAGS: BoolFlagDef[] = [
  {
    key: 'has_vegetables',
    label: 'Verduras',
    negativeLabel: 'Sem verduras',
    icon: Salad,
    activeColor: 'text-emerald-700 dark:text-emerald-300',
    activeBg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
    inactiveColor: 'text-warm-gray-400 dark:text-warm-gray-500',
    inactiveBg: 'bg-warm-gray-50 border-warm-gray-200 dark:bg-warm-gray-800/50 dark:border-warm-gray-700',
  },
  {
    key: 'is_fruit',
    label: 'Fruta',
    negativeLabel: '',
    icon: Apple,
    activeColor: 'text-orange-700 dark:text-orange-300',
    activeBg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800',
    inactiveColor: 'text-warm-gray-400 dark:text-warm-gray-500',
    inactiveBg: '',
  },
  {
    key: 'has_protein',
    label: 'Proteína',
    negativeLabel: 'Sem proteína',
    icon: Drumstick,
    activeColor: 'text-red-700 dark:text-red-300',
    activeBg: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800',
    inactiveColor: 'text-warm-gray-400 dark:text-warm-gray-500',
    inactiveBg: 'bg-warm-gray-50 border-warm-gray-200 dark:bg-warm-gray-800/50 dark:border-warm-gray-700',
  },
  {
    key: 'is_dessert',
    label: 'Doce',
    negativeLabel: '',
    icon: Cake,
    activeColor: 'text-pink-700 dark:text-pink-300',
    activeBg: 'bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-800',
    inactiveColor: 'text-warm-gray-400 dark:text-warm-gray-500',
    inactiveBg: '',
  },
  {
    key: 'is_ultra_processed',
    label: 'Ultraprocessado',
    negativeLabel: '',
    icon: Factory,
    activeColor: 'text-amber-700 dark:text-amber-300',
    activeBg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
    inactiveColor: 'text-warm-gray-400 dark:text-warm-gray-500',
    inactiveBg: '',
  },
]

const MEAL_SOURCES: SourceDef[] = [
  {
    value: 'homemade',
    label: 'Caseiro',
    icon: Home,
    activeColor: 'text-sky-700 dark:text-sky-300',
    activeBg: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800',
  },
  {
    value: 'restaurant',
    label: 'Restaurante',
    icon: Store,
    activeColor: 'text-violet-700 dark:text-violet-300',
    activeBg: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800',
  },
  {
    value: 'delivery',
    label: 'Delivery',
    icon: Truck,
    activeColor: 'text-teal-700 dark:text-teal-300',
    activeBg: 'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800',
  },
]

const INACTIVE = 'border-warm-gray-200 bg-warm-gray-50 text-warm-gray-400 dark:border-warm-gray-700 dark:bg-warm-gray-800/50 dark:text-warm-gray-500'

interface NutritionFlagsBadgesProps {
  flags: MealNutritionFlags
  editable?: boolean
  onFlagsChange?: (flags: MealNutritionFlags) => void
}

export default function NutritionFlagsBadges({ flags, editable = false, onFlagsChange }: NutritionFlagsBadgesProps) {
  function toggleBool(key: keyof Omit<MealNutritionFlags, 'meal_source'>) {
    if (!editable || !onFlagsChange) return
    onFlagsChange({ ...flags, [key]: !flags[key] })
  }

  function setSource(value: MealSource) {
    if (!editable || !onFlagsChange) return
    onFlagsChange({ ...flags, meal_source: flags.meal_source === value ? null : value })
  }

  return (
    <div className="space-y-2">
      {/* Boolean flags */}
      <div className="flex flex-wrap gap-2">
        {BOOL_FLAGS.map((def) => {
          const active = flags[def.key]

          if (!editable && !active && !def.negativeLabel) return null

          const Icon = def.icon
          const label = active ? def.label : (editable ? def.label : def.negativeLabel)
          const color = active ? def.activeColor : def.inactiveColor
          const bg = active ? def.activeBg : (editable ? INACTIVE : def.inactiveBg)

          return (
            <button
              key={def.key}
              type="button"
              disabled={!editable}
              onClick={() => toggleBool(def.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                bg,
                color,
                editable && 'cursor-pointer hover:opacity-80',
                !editable && 'cursor-default',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      {/* Meal source (mutually exclusive) */}
      <div className="flex flex-wrap gap-2">
        {MEAL_SOURCES.map((src) => {
          const active = flags.meal_source === src.value
          const Icon = src.icon

          if (!editable && !active) return null

          return (
            <button
              key={src.value}
              type="button"
              disabled={!editable}
              onClick={() => setSource(src.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                active ? `${src.activeBg} ${src.activeColor}` : INACTIVE,
                editable && 'cursor-pointer hover:opacity-80',
                !editable && 'cursor-default',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {src.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
