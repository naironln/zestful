import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { NutritionCalculationTrace, IngredientTrace, NutritionSource, NutrientValue } from '@/types/meal'

const SOURCE_LABELS: Record<NutritionSource, string> = {
  taco: 'Tabela TACO',
  taco_decomposition: 'TACO (decomposto)',
  label: 'Rótulo',
  web_search: 'Busca web',
  llm_estimate: 'Estimativa IA',
}

const MACRO_DISPLAY_ORDER = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'lipid_g', 'fiber_g']

const MACRO_SHORT_NAMES: Record<string, string> = {
  energy_kcal: 'Energia',
  protein_g: 'Proteína',
  carbohydrate_g: 'Carboidrato',
  lipid_g: 'Lipídios',
  fiber_g: 'Fibra',
}

const SOURCE_COLORS: Record<NutritionSource, string> = {
  taco: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  taco_decomposition: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  label: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  web_search: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  llm_estimate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function confidenceColor(confidence: number | null): string {
  if (confidence == null) return 'text-warm-gray-400'
  if (confidence >= 0.7) return 'text-emerald-600 dark:text-emerald-400'
  if (confidence >= 0.4) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

function confidenceLabel(confidence: number | null): string {
  if (confidence == null) return '—'
  return `${Math.round(confidence * 100)}%`
}

function sortedNutrients(nutrients: NutrientValue[]): NutrientValue[] {
  return [...nutrients].sort((a, b) => {
    const ia = MACRO_DISPLAY_ORDER.indexOf(a.key)
    const ib = MACRO_DISPLAY_ORDER.indexOf(b.key)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
}

function IngredientTraceRow({ trace }: { trace: IngredientTrace }) {
  const [expanded, setExpanded] = useState(false)
  const hasAdjustments = trace.adjustments.length > 0

  return (
    <div className="border-b border-warm-gray-100 last:border-b-0 dark:border-warm-gray-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2 py-2.5 text-left transition-colors hover:bg-warm-gray-50/50 dark:hover:bg-warm-gray-800/30"
      >
        <span className="flex-1 text-sm font-medium capitalize text-warm-gray-700 dark:text-warm-gray-300">
          {trace.ingredient}
        </span>

        {trace.estimated_grams != null && (
          <span className="shrink-0 text-xs text-warm-gray-400 dark:text-warm-gray-500">
            {trace.estimated_grams}g
          </span>
        )}

        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SOURCE_COLORS[trace.source]}`}
        >
          {SOURCE_LABELS[trace.source]}
        </span>

        {hasAdjustments && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        )}

        <span className={`shrink-0 text-xs font-medium ${confidenceColor(trace.taco_confidence)}`}>
          {confidenceLabel(trace.taco_confidence)}
        </span>

        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-warm-gray-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-warm-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 px-3 pb-3 pt-0.5">
          {trace.taco_food_name && (
            <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">
              <span className="font-medium">TACO:</span> {trace.taco_food_name}
            </p>
          )}

          {trace.reasoning && (
            <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">
              <span className="font-medium">Raciocínio:</span> {trace.reasoning}
            </p>
          )}

          {trace.nutrients_from_source.length > 0 && trace.estimated_grams != null && (
            <div className="rounded-lg border border-warm-gray-100 dark:border-warm-gray-700/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-warm-gray-100 text-warm-gray-400 dark:border-warm-gray-700/50 dark:text-warm-gray-500">
                    <th className="px-2 py-1 text-left font-medium">Nutriente</th>
                    <th className="px-2 py-1 text-right font-medium">Cálculo</th>
                    <th className="px-2 py-1 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNutrients(trace.nutrients_from_source).map((nv) => {
                    const total = nv.per_100g * trace.estimated_grams! / 100
                    return (
                      <tr key={nv.key} className="border-b border-warm-gray-50 last:border-b-0 dark:border-warm-gray-800/30">
                        <td className="px-2 py-1 text-warm-gray-600 dark:text-warm-gray-400">
                          {MACRO_SHORT_NAMES[nv.key] ?? nv.name}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-warm-gray-500 dark:text-warm-gray-400">
                          {trace.estimated_grams}g &times; {nv.per_100g.toFixed(1)}{nv.unit}/100g
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums font-medium text-warm-gray-700 dark:text-warm-gray-300">
                          {total.toFixed(1)} {nv.unit}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {trace.adjustments.map((adj, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 dark:bg-amber-900/20"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-medium">{adj.field}:</span>{' '}
                {adj.original_value.toFixed(1)} &rarr; {adj.adjusted_value.toFixed(1)}
                {' — '}{adj.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NutritionTraceCard({
  trace,
}: {
  trace: NutritionCalculationTrace
}) {
  const [open, setOpen] = useState(false)

  if (!trace.ingredient_traces.length) return null

  const totalAdjustments = trace.ingredient_traces.reduce(
    (sum, t) => sum + t.adjustments.length,
    0,
  )

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Info className="h-5 w-5" />
          <span className="flex-1">Como calculamos</span>

          <span
            className={`text-sm font-medium ${confidenceColor(trace.overall_confidence)}`}
          >
            {confidenceLabel(trace.overall_confidence)}
          </span>

          {totalAdjustments > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              {totalAdjustments} ajuste{totalAdjustments > 1 ? 's' : ''}
            </span>
          )}

          {open ? (
            <ChevronUp className="h-4 w-4 text-warm-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-warm-gray-400" />
          )}
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="pt-0">
          {trace.sources_used.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {trace.sources_used.map((src) => (
                <span
                  key={src}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    SOURCE_COLORS[src as NutritionSource] ||
                    'bg-warm-gray-100 text-warm-gray-600 dark:bg-warm-gray-800 dark:text-warm-gray-400'
                  }`}
                >
                  {SOURCE_LABELS[src as NutritionSource] || src}
                </span>
              ))}
            </div>
          )}

          <div className="divide-y divide-warm-gray-100 rounded-lg border border-warm-gray-100 dark:divide-warm-gray-800 dark:border-warm-gray-800">
            {trace.ingredient_traces.map((t) => (
              <IngredientTraceRow key={t.ingredient} trace={t} />
            ))}
          </div>

          {trace.reconciliation_notes.length > 0 && (
            <div className="mt-3 space-y-1">
              {trace.reconciliation_notes.map((note, i) => (
                <p
                  key={i}
                  className="text-xs text-warm-gray-500 dark:text-warm-gray-400"
                >
                  {note}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
