'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateProductAllergens, ALLERGENS, DIETARY_FLAGS } from '@/lib/commerce/allergen-actions'

type Props = {
  productId: string
  productName: string
  initialAllergens: string[]
  initialDietaryFlags: string[]
}

export function AllergenEditor({
  productId,
  productName,
  initialAllergens,
  initialDietaryFlags,
}: Props) {
  const [allergens, setAllergens] = useState<Set<string>>(new Set(initialAllergens))
  const [dietaryFlags, setDietaryFlags] = useState<Set<string>>(new Set(initialDietaryFlags))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleAllergen(id: string) {
    setAllergens((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  function toggleDietary(id: string) {
    setDietaryFlags((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    const prevAllergens = new Set(allergens)
    const prevDietary = new Set(dietaryFlags)

    startTransition(async () => {
      try {
        await updateProductAllergens(productId, Array.from(allergens), Array.from(dietaryFlags))
        setSaved(true)
      } catch (err: any) {
        setAllergens(prevAllergens)
        setDietaryFlags(prevDietary)
        setError(err.message || 'Failed to save allergens')
      }
    })
  }

  return (
    <Card className="border-stone-800 bg-stone-900/50">
      <CardHeader>
        <CardTitle className="text-stone-100">Allergens & Dietary - {productName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Allergens Grid */}
        <div>
          <h3 className="text-sm font-medium text-stone-400 mb-2">Allergens (FDA Big 9)</h3>
          <div className="grid grid-cols-3 gap-2">
            {ALLERGENS.map((a) => (
              <label
                key={a.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  allergens.has(a.id)
                    ? 'border-red-500 bg-red-950/30'
                    : 'border-stone-700 bg-stone-800/50 hover:bg-stone-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allergens.has(a.id)}
                  onChange={() => toggleAllergen(a.id)}
                  className="sr-only"
                />
                <span className="text-base">{a.icon}</span>
                <span
                  className={`text-sm ${
                    allergens.has(a.id) ? 'text-red-300 font-medium' : 'text-stone-300'
                  }`}
                >
                  {a.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Dietary Flags Grid */}
        <div>
          <h3 className="text-sm font-medium text-stone-400 mb-2">Dietary Flags</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIETARY_FLAGS.map((d) => (
              <label
                key={d.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  dietaryFlags.has(d.id)
                    ? 'border-green-500 bg-green-950/30'
                    : 'border-stone-700 bg-stone-800/50 hover:bg-stone-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dietaryFlags.has(d.id)}
                  onChange={() => toggleDietary(d.id)}
                  className="sr-only"
                />
                <span
                  className={`text-sm ${
                    dietaryFlags.has(d.id) ? 'text-green-300 font-medium' : 'text-stone-300'
                  }`}
                >
                  {d.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Saved.</p>}

        <Button onClick={handleSave} disabled={isPending} variant="primary">
          {isPending ? 'Saving...' : 'Save Allergen Info'}
        </Button>
      </CardContent>
    </Card>
  )
}
