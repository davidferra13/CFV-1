import React from 'react'

// Placeholder types
export type Ingredient = {
  id: string
  name: string
  category: string
  defaultUnit: string
  isStaple?: boolean
  averagePriceCents?: number
  lastPriceCents?: number
  lastPriceDate?: string
}

export type IngredientManagerProps = {
  ingredients: Ingredient[]
  onUpdateIngredient: (ingredient: Ingredient) => void
}

const IngredientManager: React.FC<IngredientManagerProps> = ({
  ingredients,
  onUpdateIngredient,
}) => {
  return (
    <div>
      <h2>Ingredient Management</h2>
      <ul>
        {ingredients.map((ingredient) => (
          <li key={ingredient.id}>
            <strong>{ingredient.name}</strong> ({ingredient.category})
            <div>Unit: {ingredient.defaultUnit}</div>
            <div>Staple: {ingredient.isStaple ? 'Yes' : 'No'}</div>
            <div>
              Avg Price:{' '}
              {ingredient.averagePriceCents
                ? `$${(ingredient.averagePriceCents / 100).toFixed(2)}`
                : '—'}
            </div>
            <div>
              Last Price:{' '}
              {ingredient.lastPriceCents ? `$${(ingredient.lastPriceCents / 100).toFixed(2)}` : '—'}{' '}
              ({ingredient.lastPriceDate || '—'})
            </div>
            <button onClick={() => onUpdateIngredient(ingredient)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default IngredientManager
