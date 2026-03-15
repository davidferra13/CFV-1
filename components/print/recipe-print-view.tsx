'use client'

import { PrintLayout } from './print-layout'

interface RecipeIngredient {
  quantity: number
  unit: string
  is_optional: boolean
  preparation_notes: string | null
  sort_order: number
  ingredients: {
    name: string
    category: string
    allergen_flags: string[]
    dietary_tags: string[]
  } | null
}

interface Recipe {
  name: string
  description: string | null
  method: string
  method_detailed: string | null
  dietary_tags: string[]
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  total_time_minutes: number | null
  yield_quantity: number | null
  yield_unit: string | null
  yield_description: string | null
  notes: string | null
  category: string
}

interface RecipePrintViewProps {
  recipe: Recipe
  ingredients: RecipeIngredient[]
}

export function RecipePrintView({ recipe, ingredients }: RecipePrintViewProps) {
  // Parse method into steps (split by newlines, numbered lines, or periods for long blocks)
  const methodText = recipe.method_detailed || recipe.method
  const steps = methodText
    .split(/\n+/)
    .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(s => s.length > 0)

  // Collect all allergens from ingredients
  const allAllergens = new Set<string>()
  for (const ing of ingredients) {
    if (ing.ingredients?.allergen_flags) {
      for (const flag of ing.ingredients.allergen_flags) {
        allAllergens.add(flag)
      }
    }
  }

  return (
    <PrintLayout title={recipe.name}>
      {/* Dietary tags and allergens bar */}
      {(recipe.dietary_tags.length > 0 || allAllergens.size > 0) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        >
          {recipe.dietary_tags.map(tag => (
            <span
              key={tag}
              style={{
                padding: '4px 10px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {tag}
            </span>
          ))}
          {Array.from(allAllergens).map(allergen => (
            <span
              key={allergen}
              style={{
                padding: '4px 10px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                borderRadius: '4px',
                border: '1px solid #fecaca',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ALLERGEN: {allergen}
            </span>
          ))}
        </div>
      )}

      {/* Meta row: servings, times */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '24px',
          fontSize: '15px',
          color: '#374151',
        }}
      >
        {recipe.yield_quantity && (
          <span>
            <strong>Yield:</strong> {recipe.yield_quantity} {recipe.yield_unit || 'servings'}
            {recipe.yield_description ? ` (${recipe.yield_description})` : ''}
          </span>
        )}
        {recipe.prep_time_minutes && (
          <span><strong>Prep:</strong> {recipe.prep_time_minutes} min</span>
        )}
        {recipe.cook_time_minutes && (
          <span><strong>Cook:</strong> {recipe.cook_time_minutes} min</span>
        )}
        {recipe.total_time_minutes && (
          <span><strong>Total:</strong> {recipe.total_time_minutes} min</span>
        )}
      </div>

      {recipe.description && (
        <p style={{ fontSize: '15px', color: '#4b5563', marginBottom: '24px', fontStyle: 'italic' }}>
          {recipe.description}
        </p>
      )}

      {/* Two-column layout: ingredients left, instructions right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Ingredients column */}
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid #111',
            }}
          >
            Ingredients
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ingredients.map((ing, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '6px 0',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '15px',
                  opacity: ing.is_optional ? 0.7 : 1,
                }}
              >
                {/* Large checkbox */}
                <span
                  style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    minWidth: '20px',
                    border: '2px solid #374151',
                    borderRadius: '3px',
                    marginTop: '2px',
                  }}
                />
                <span>
                  <strong>{ing.quantity} {ing.unit}</strong>{' '}
                  {ing.ingredients?.name || 'Unknown'}
                  {ing.is_optional && <span style={{ fontSize: '12px', color: '#6b7280' }}> (optional)</span>}
                  {ing.preparation_notes && (
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>, {ing.preparation_notes}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions column */}
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid #111',
            }}
          >
            Instructions
          </h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, counterReset: 'step' }}>
            {steps.map((step, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '16px',
                  fontSize: '15px',
                  lineHeight: '1.6',
                }}
              >
                {/* Step number */}
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#111',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ paddingTop: '4px' }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Notes */}
      {recipe.notes && (
        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Notes</h3>
          <p style={{ fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>{recipe.notes}</p>
        </div>
      )}
    </PrintLayout>
  )
}
