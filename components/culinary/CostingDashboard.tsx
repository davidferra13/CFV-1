import React from 'react'

// Placeholder types
export type CostingDashboardProps = {
  menuCostCents?: number
  dishCosts?: { dishId: string; costCents: number }[]
  recipeCosts?: { recipeId: string; costCents: number }[]
  ingredientCosts?: { ingredientId: string; costCents: number }[]
}

const CostingDashboard: React.FC<CostingDashboardProps> = ({
  menuCostCents,
  dishCosts,
  recipeCosts,
  ingredientCosts,
}) => {
  return (
    <div>
      <h2>Costing Dashboard</h2>
      <div>Menu Cost: {menuCostCents ? `$${(menuCostCents / 100).toFixed(2)}` : '—'}</div>
      <h3>Dish Costs</h3>
      <ul>
        {dishCosts?.map((dc) => (
          <li key={dc.dishId}>
            Dish {dc.dishId}: ${(dc.costCents / 100).toFixed(2)}
          </li>
        ))}
      </ul>
      <h3>Recipe Costs</h3>
      <ul>
        {recipeCosts?.map((rc) => (
          <li key={rc.recipeId}>
            Recipe {rc.recipeId}: ${(rc.costCents / 100).toFixed(2)}
          </li>
        ))}
      </ul>
      <h3>Ingredient Costs</h3>
      <ul>
        {ingredientCosts?.map((ic) => (
          <li key={ic.ingredientId}>
            Ingredient {ic.ingredientId}: ${(ic.costCents / 100).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CostingDashboard
