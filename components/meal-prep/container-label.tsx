'use client'

import type { ContainerLabel } from '@/lib/meal-prep/label-actions'

interface ContainerLabelCardProps {
  label: ContainerLabel
}

export function ContainerLabelCard({ label }: ContainerLabelCardProps) {
  const hasNutrition = label.calories != null || label.protein != null ||
    label.carbs != null || label.fat != null

  return (
    <div className="container-label border border-stone-300 rounded-lg p-4 bg-white break-inside-avoid"
      style={{ width: '4in', minHeight: '2in', maxWidth: '100%' }}
    >
      {/* Dish name */}
      <h3 className="text-lg font-bold text-stone-900 leading-tight mb-2 border-b border-stone-200 pb-1">
        {label.dishName}
      </h3>

      {/* Dates row */}
      <div className="flex justify-between text-xs text-stone-200 mb-2">
        <div>
          <span className="font-semibold">Prepared:</span> {label.preparedDate}
        </div>
        <div>
          <span className="font-semibold text-red-200">Use by:</span>{' '}
          <span className="text-red-200 font-medium">{label.useByDate}</span>
        </div>
      </div>

      {/* Reheating instructions */}
      {label.reheatingInstructions && (
        <div className="text-xs text-stone-200 mb-2">
          <span className="font-semibold">Reheating:</span>{' '}
          {label.reheatingInstructions}
        </div>
      )}

      {/* Allergens */}
      {label.allergens.length > 0 && (
        <div className="text-xs mb-2 flex items-start gap-1">
          <span className="text-amber-600 font-bold flex-shrink-0">
            &#9888;
          </span>
          <span className="text-amber-200 font-medium">
            Contains: {label.allergens.join(', ')}
          </span>
        </div>
      )}

      {/* Nutrition (optional) */}
      {hasNutrition && (
        <div className="text-xs text-stone-600 mb-2 flex gap-3 border-t border-stone-100 pt-1">
          {label.calories != null && (
            <span><span className="font-semibold">{label.calories}</span> cal</span>
          )}
          {label.protein != null && (
            <span><span className="font-semibold">{label.protein}g</span> protein</span>
          )}
          {label.carbs != null && (
            <span><span className="font-semibold">{label.carbs}g</span> carbs</span>
          )}
          {label.fat != null && (
            <span><span className="font-semibold">{label.fat}g</span> fat</span>
          )}
        </div>
      )}

      {/* Footer: chef + client + serving count */}
      <div className="flex justify-between items-end text-xs text-stone-500 border-t border-stone-200 pt-1 mt-auto">
        <div>
          {label.clientName && (
            <span className="block text-stone-600">For: {label.clientName}</span>
          )}
          <span className="text-stone-400">{label.chefName}</span>
        </div>
        {label.totalServings > 1 && (
          <span className="text-stone-400">
            {label.servingNumber}/{label.totalServings}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Label Grid (for printing) ──────────────────────────────────────────────

interface LabelGridProps {
  labels: ContainerLabel[]
}

export function LabelGrid({ labels }: LabelGridProps) {
  if (labels.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        No labels to display. Add dishes above to generate labels.
      </div>
    )
  }

  return (
    <div className="label-grid grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
      {labels.map((label, i) => (
        <ContainerLabelCard key={`${label.dishName}-${i}`} label={label} />
      ))}
    </div>
  )
}
