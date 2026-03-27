import { SlidersHorizontal, X, Salad, Apple, Cake, Factory, Drumstick, Home, Store, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MealType, MealSource } from '@/types/meal'

export type NutritionFlagKey =
  | 'has_vegetables'
  | 'is_fruit'
  | 'is_dessert'
  | 'is_ultra_processed'
  | 'has_protein'

export interface MealFilterState {
  mealTypes: MealType[]
  nutritionFlags: NutritionFlagKey[]
  mealSource: MealSource | null
}

interface MealFiltersProps {
  filters: MealFilterState
  onChange: (filters: MealFilterState) => void
}

const MEAL_TYPE_OPTIONS: { value: MealType; label: string; dot: string; activeBg: string; activeText: string }[] = [
  { value: 'breakfast', label: 'Café da manhã', dot: 'bg-amber-500', activeBg: 'bg-amber-100 dark:bg-amber-900/30', activeText: 'text-amber-800 dark:text-amber-300' },
  { value: 'lunch', label: 'Almoço', dot: 'bg-green-500', activeBg: 'bg-green-100 dark:bg-green-900/30', activeText: 'text-green-800 dark:text-green-300' },
  { value: 'dinner', label: 'Jantar', dot: 'bg-indigo-500', activeBg: 'bg-indigo-100 dark:bg-indigo-900/30', activeText: 'text-indigo-800 dark:text-indigo-300' },
  { value: 'snack', label: 'Lanche', dot: 'bg-pink-500', activeBg: 'bg-pink-100 dark:bg-pink-900/30', activeText: 'text-pink-800 dark:text-pink-300' },
]

const NUTRITION_FLAG_OPTIONS: { key: NutritionFlagKey; label: string; icon: React.ElementType; activeColor: string; activeBg: string }[] = [
  { key: 'has_vegetables', label: 'Verduras', icon: Salad, activeColor: 'text-emerald-700 dark:text-emerald-300', activeBg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' },
  { key: 'is_fruit', label: 'Fruta', icon: Apple, activeColor: 'text-orange-700 dark:text-orange-300', activeBg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800' },
  { key: 'has_protein', label: 'Proteína', icon: Drumstick, activeColor: 'text-red-700 dark:text-red-300', activeBg: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800' },
  { key: 'is_dessert', label: 'Doce', icon: Cake, activeColor: 'text-pink-700 dark:text-pink-300', activeBg: 'bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-800' },
  { key: 'is_ultra_processed', label: 'Ultraprocessado', icon: Factory, activeColor: 'text-amber-700 dark:text-amber-300', activeBg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' },
]

const MEAL_SOURCE_OPTIONS: { value: MealSource; label: string; icon: React.ElementType; activeColor: string; activeBg: string }[] = [
  { value: 'homemade', label: 'Caseiro', icon: Home, activeColor: 'text-sky-700 dark:text-sky-300', activeBg: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800' },
  { value: 'restaurant', label: 'Restaurante', icon: Store, activeColor: 'text-violet-700 dark:text-violet-300', activeBg: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800' },
  { value: 'delivery', label: 'Delivery', icon: Truck, activeColor: 'text-teal-700 dark:text-teal-300', activeBg: 'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800' },
]

const INACTIVE = 'border-warm-gray-200 bg-warm-gray-50 text-warm-gray-500 dark:border-warm-gray-700 dark:bg-warm-gray-800/50 dark:text-warm-gray-400'

export default function MealFilters({ filters, onChange }: MealFiltersProps) {
  const hasActiveFilters = filters.mealTypes.length > 0 || filters.nutritionFlags.length > 0 || filters.mealSource !== null

  function toggleMealType(type: MealType) {
    const next = filters.mealTypes.includes(type)
      ? filters.mealTypes.filter((t) => t !== type)
      : [...filters.mealTypes, type]
    onChange({ ...filters, mealTypes: next })
  }

  function toggleFlag(flag: NutritionFlagKey) {
    const next = filters.nutritionFlags.includes(flag)
      ? filters.nutritionFlags.filter((f) => f !== flag)
      : [...filters.nutritionFlags, flag]
    onChange({ ...filters, nutritionFlags: next })
  }

  function toggleSource(source: MealSource) {
    onChange({ ...filters, mealSource: filters.mealSource === source ? null : source })
  }

  function clearAll() {
    onChange({ mealTypes: [], nutritionFlags: [], mealSource: null })
  }

  return (
    <div className="space-y-3 rounded-xl border border-warm-gray-200 bg-white p-4 dark:border-warm-gray-700 dark:bg-warm-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-warm-gray-600 dark:text-warm-gray-400">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-warm-gray-400 transition-colors hover:text-warm-gray-600 dark:text-warm-gray-500 dark:hover:text-warm-gray-300"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Meal type */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-warm-gray-400 dark:text-warm-gray-500">Tipo de refeição</span>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPE_OPTIONS.map((opt) => {
            const active = filters.mealTypes.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleMealType(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                  active
                    ? `border-transparent ${opt.activeBg} ${opt.activeText}`
                    : INACTIVE,
                )}
              >
                <span className={cn('inline-block h-1.5 w-1.5 rounded-full', active ? opt.dot : 'bg-warm-gray-300 dark:bg-warm-gray-600')} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Nutrition flags */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-warm-gray-400 dark:text-warm-gray-500">Qualidade alimentar</span>
        <div className="flex flex-wrap gap-2">
          {NUTRITION_FLAG_OPTIONS.map((opt) => {
            const active = filters.nutritionFlags.includes(opt.key)
            const Icon = opt.icon
            return (
              <button
                key={opt.key}
                onClick={() => toggleFlag(opt.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                  active ? `${opt.activeBg} ${opt.activeColor}` : INACTIVE,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Meal source */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-warm-gray-400 dark:text-warm-gray-500">Origem da refeição</span>
        <div className="flex flex-wrap gap-2">
          {MEAL_SOURCE_OPTIONS.map((opt) => {
            const active = filters.mealSource === opt.value
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => toggleSource(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                  active ? `${opt.activeBg} ${opt.activeColor}` : INACTIVE,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
