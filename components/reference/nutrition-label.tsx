import type { NutritionEntry, MacroSummary } from '@/lib/reference/types'
import { NUTRITION_DISCLAIMER } from '@/lib/reference/types'

/** FDA-style nutrition label for a single ingredient */
export function NutritionLabel({ entry }: { entry: NutritionEntry }) {
  return (
    <div className="border-2 border-stone-400 rounded-lg p-4 max-w-xs bg-stone-900 font-mono">
      <h3 className="text-lg font-black text-stone-100 border-b-8 border-stone-400 pb-1">
        Nutrition Facts
      </h3>
      <p className="text-xs text-stone-400 border-b border-stone-600 py-1">
        Serving size {entry.servingLabel}
      </p>

      <div className="border-b-4 border-stone-400 py-1">
        <div className="flex justify-between">
          <span className="text-sm font-bold text-stone-100">Calories</span>
          <span className="text-2xl font-black text-stone-100">{entry.calories}</span>
        </div>
      </div>

      <div className="text-xs text-stone-400 border-b border-stone-700 py-0.5 text-right">
        % Daily Value*
      </div>

      <NutritionRow label="Total Fat" value={`${entry.fat}g`} bold dv={dvPercent(entry.fat, 78)} />
      {entry.saturatedFat != null && (
        <NutritionRow
          label="Saturated Fat"
          value={`${entry.saturatedFat}g`}
          indent
          dv={dvPercent(entry.saturatedFat, 20)}
        />
      )}
      {entry.cholesterol != null && (
        <NutritionRow
          label="Cholesterol"
          value={`${entry.cholesterol}mg`}
          bold
          dv={dvPercent(entry.cholesterol, 300)}
        />
      )}
      {entry.sodium != null && (
        <NutritionRow
          label="Sodium"
          value={`${entry.sodium}mg`}
          bold
          dv={dvPercent(entry.sodium, 2300)}
        />
      )}
      <NutritionRow
        label="Total Carbohydrate"
        value={`${entry.carbohydrates}g`}
        bold
        dv={dvPercent(entry.carbohydrates, 275)}
      />
      {entry.fiber != null && (
        <NutritionRow
          label="Dietary Fiber"
          value={`${entry.fiber}g`}
          indent
          dv={dvPercent(entry.fiber, 28)}
        />
      )}
      {entry.sugar != null && (
        <NutritionRow label="Total Sugars" value={`${entry.sugar}g`} indent />
      )}
      <NutritionRow
        label="Protein"
        value={`${entry.protein}g`}
        bold
        dv={dvPercent(entry.protein, 50)}
        last
      />

      <p className="text-[10px] text-stone-500 mt-2 leading-tight">
        * Percent Daily Values are based on a 2,000 calorie diet.
      </p>

      <p className="text-[10px] text-stone-600 mt-2 leading-tight border-t border-stone-700 pt-2">
        Source: {entry.source}
      </p>

      <p className="text-[10px] text-stone-600 mt-1 leading-tight italic">{NUTRITION_DISCLAIMER}</p>
    </div>
  )
}

/** Compact macro summary (for recipe totals) */
export function MacroSummaryRow({ macros, label }: { macros: MacroSummary; label?: string }) {
  return (
    <div className="flex items-center gap-4 text-xs">
      {label && <span className="text-stone-400 font-medium">{label}</span>}
      <span className="text-stone-200">
        <span className="font-medium">{macros.calories}</span> cal
      </span>
      <span className="text-stone-400">
        P: <span className="text-stone-200">{macros.protein}g</span>
      </span>
      <span className="text-stone-400">
        F: <span className="text-stone-200">{macros.fat}g</span>
      </span>
      <span className="text-stone-400">
        C: <span className="text-stone-200">{macros.carbohydrates}g</span>
      </span>
      {macros.fiber != null && (
        <span className="text-stone-400">
          Fiber: <span className="text-stone-200">{macros.fiber}g</span>
        </span>
      )}
    </div>
  )
}

function NutritionRow({
  label,
  value,
  bold,
  indent,
  dv,
  last,
}: {
  label: string
  value: string
  bold?: boolean
  indent?: boolean
  dv?: number
  last?: boolean
}) {
  return (
    <div
      className={`flex justify-between py-0.5 text-xs ${last ? 'border-b-4 border-stone-400' : 'border-b border-stone-700'}`}
    >
      <span
        className={`${indent ? 'pl-4' : ''} ${bold ? 'font-bold text-stone-100' : 'text-stone-300'}`}
      >
        {label} <span className="font-normal text-stone-300">{value}</span>
      </span>
      {dv != null && <span className="font-bold text-stone-100">{dv}%</span>}
    </div>
  )
}

function dvPercent(value: number, dailyValue: number): number {
  return Math.round((value / dailyValue) * 100)
}
