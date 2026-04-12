'use client'

import { useState } from 'react'
import { WebSourcingPanel } from '@/components/pricing/web-sourcing-panel'

interface IngredientSourcingToggleProps {
  ingredientName: string
}

export function IngredientSourcingToggle({ ingredientName }: IngredientSourcingToggleProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-brand-400 hover:text-brand-300 underline"
      >
        {open ? 'Hide' : 'Find price'}
      </button>
      {open && (
        <div className="mt-2">
          <WebSourcingPanel query={ingredientName} label="Where to buy" />
        </div>
      )}
    </div>
  )
}
