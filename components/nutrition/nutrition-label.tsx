'use client'

import { useState } from 'react'
import type { NutrientInfo } from '@/lib/nutrition/usda-client'

type NutritionLabelProps = {
  nutrients: NutrientInfo
  servings?: number
  servingSize?: string
  recipeName?: string
}

/**
 * FDA-style Nutrition Facts label.
 * Black-and-white, print-friendly design.
 * Supports per-recipe and per-serving toggle.
 */
export function NutritionLabel({
  nutrients,
  servings = 1,
  servingSize,
  recipeName,
}: NutritionLabelProps) {
  const [showPerServing, setShowPerServing] = useState(true)

  const displayed = showPerServing && servings > 1 ? divideDisplay(nutrients, servings) : nutrients

  // Daily value percentages (based on 2,000 cal diet)
  const dv = {
    fat: Math.round((displayed.fat_g / 78) * 100),
    sodium: Math.round((displayed.sodium_mg / 2300) * 100),
    carbs: Math.round((displayed.carbs_g / 275) * 100),
    fiber: Math.round((displayed.fiber_g / 28) * 100),
    protein: Math.round((displayed.protein_g / 50) * 100),
    sugar: Math.round((displayed.sugar_g / 50) * 100),
  }

  return (
    <div className="w-[280px] border-2 border-black p-2 font-sans bg-white text-black print:border-black">
      {/* Header */}
      <div className="text-[2rem] font-extrabold leading-none">Nutrition Facts</div>

      {recipeName && <div className="text-xs text-gray-600 mt-0.5 truncate">{recipeName}</div>}

      <div className="border-b-[8px] border-black mt-1 mb-1" />

      {/* Servings toggle */}
      {servings > 1 && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold">{servings} servings per recipe</span>
          <button
            onClick={() => setShowPerServing(!showPerServing)}
            className="underline text-gray-600 hover:text-black"
          >
            {showPerServing ? 'Show total' : 'Show per serving'}
          </button>
        </div>
      )}

      {servingSize && (
        <div className="text-xs">
          <span className="font-bold">Serving size</span> {servingSize}
        </div>
      )}

      <div className="border-b-[4px] border-black mt-1" />

      {/* Calories */}
      <div className="flex items-baseline justify-between py-1">
        <div>
          <div className="text-xs font-bold">
            Amount per {showPerServing ? 'serving' : 'recipe'}
          </div>
          <div className="text-[1.75rem] font-extrabold leading-none">Calories</div>
        </div>
        <div className="text-[2rem] font-extrabold leading-none">
          {Math.round(displayed.calories)}
        </div>
      </div>

      <div className="border-b-[4px] border-black" />

      {/* % Daily Value header */}
      <div className="text-right text-xxs font-bold py-0.5">% Daily Value*</div>

      <div className="border-b border-black" />

      {/* Nutrient rows */}
      <NutrientRow label="Total Fat" value={`${displayed.fat_g}g`} dvPercent={dv.fat} bold />
      <NutrientRow label="Sodium" value={`${displayed.sodium_mg}mg`} dvPercent={dv.sodium} bold />
      <NutrientRow
        label="Total Carbohydrate"
        value={`${displayed.carbs_g}g`}
        dvPercent={dv.carbs}
        bold
      />
      <NutrientRow
        label="Dietary Fiber"
        value={`${displayed.fiber_g}g`}
        dvPercent={dv.fiber}
        indent
      />
      <NutrientRow
        label="Total Sugars"
        value={`${displayed.sugar_g}g`}
        dvPercent={dv.sugar}
        indent
      />
      <NutrientRow
        label="Protein"
        value={`${displayed.protein_g}g`}
        dvPercent={dv.protein}
        bold
        last
      />

      <div className="border-b-[8px] border-black mt-0.5" />

      {/* Footer */}
      <p className="text-2xs leading-tight mt-1 text-gray-700">
        * Percent Daily Values are based on a 2,000 calorie diet. Values are estimated from USDA
        FoodData Central and ingredient quantities. Actual values may vary based on preparation
        methods and specific ingredients used.
      </p>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function NutrientRow({
  label,
  value,
  dvPercent,
  bold,
  indent,
  last,
}: {
  label: string
  value: string
  dvPercent?: number
  bold?: boolean
  indent?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-0.5 text-xs ${last ? '' : 'border-b border-gray-300'}`}
    >
      <span className={indent ? 'pl-4' : ''}>
        <span className={bold ? 'font-bold' : ''}>{label}</span> {value}
      </span>
      {dvPercent !== undefined && <span className="font-bold">{dvPercent}%</span>}
    </div>
  )
}

// ============================================
// Helpers
// ============================================

function divideDisplay(nutrients: NutrientInfo, servings: number): NutrientInfo {
  return {
    calories: Math.round(nutrients.calories / servings),
    protein_g: Math.round((nutrients.protein_g / servings) * 10) / 10,
    carbs_g: Math.round((nutrients.carbs_g / servings) * 10) / 10,
    fat_g: Math.round((nutrients.fat_g / servings) * 10) / 10,
    fiber_g: Math.round((nutrients.fiber_g / servings) * 10) / 10,
    sodium_mg: Math.round(nutrients.sodium_mg / servings),
    sugar_g: Math.round((nutrients.sugar_g / servings) * 10) / 10,
  }
}
