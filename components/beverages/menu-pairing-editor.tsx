'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { addPairingToMenu, removePairing } from '@/lib/beverages/actions'
import type { Beverage, MenuBeveragePairing } from '@/lib/beverages/actions'
import { formatCurrency } from '@/lib/utils/currency'

type Props = {
  menuId: string
  pairings: MenuBeveragePairing[]
  beverages: Beverage[]
  dishes: Array<{ name: string; courseNumber: number }>
}

export function MenuPairingEditor({ menuId, pairings, beverages, dishes }: Props) {
  const [isPending, startTransition] = useTransition()
  const [addingForDish, setAddingForDish] = useState<string | null>(null)
  const [selectedBeverageId, setSelectedBeverageId] = useState('')
  const [pairingNote, setPairingNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const beverageOptions = beverages.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.type})`,
  }))

  // Group pairings by dish
  const pairingsByDish = new Map<string, MenuBeveragePairing[]>()
  for (const p of pairings) {
    const existing = pairingsByDish.get(p.dish_name) ?? []
    existing.push(p)
    pairingsByDish.set(p.dish_name, existing)
  }

  // Calculate total beverage cost
  const totalCostCents = pairings.reduce((sum, p) => sum + (p.beverage?.cost_cents ?? 0), 0)
  const totalSellCents = pairings.reduce((sum, p) => {
    const bev = p.beverage
    if (!bev) return sum
    const sell = bev.sell_price_cents ?? Math.round((bev.cost_cents ?? 0) * (bev.markup_percent ?? 200) / 100)
    return sum + sell
  }, 0)

  function handleAdd(dishName: string, courseNumber: number) {
    if (!selectedBeverageId) return
    setError(null)

    startTransition(async () => {
      try {
        await addPairingToMenu(
          menuId,
          dishName,
          selectedBeverageId,
          pairingNote || null,
          courseNumber
        )
        setAddingForDish(null)
        setSelectedBeverageId('')
        setPairingNote('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add pairing')
      }
    })
  }

  function handleRemove(pairingId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removePairing(pairingId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove pairing')
      }
    })
  }

  if (beverages.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-stone-500 text-sm mb-2">No beverages in your library yet.</p>
          <a href="/culinary/beverages" className="text-brand-600 hover:underline text-sm font-medium">
            Add beverages to get started
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">Beverage Pairings</h3>
        {pairings.length > 0 && (
          <div className="text-sm text-stone-500 space-x-3">
            <span>Cost: {formatCurrency(totalCostCents)}</span>
            <span>Sell: {formatCurrency(totalSellCents)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {dishes.length === 0 ? (
        <p className="text-stone-400 text-sm">Add dishes to your menu first, then pair beverages.</p>
      ) : (
        <div className="space-y-3">
          {dishes.map((dish) => {
            const dishPairings = pairingsByDish.get(dish.name) ?? []
            const isAdding = addingForDish === dish.name

            return (
              <Card key={`${dish.courseNumber}-${dish.name}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-stone-400">
                        Course {dish.courseNumber}
                      </span>
                      <span className="font-medium text-stone-800">{dish.name}</span>
                    </div>
                    {!isAdding && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAddingForDish(dish.name)}
                        disabled={isPending}
                      >
                        + Pair
                      </Button>
                    )}
                  </div>

                  {/* Existing pairings for this dish */}
                  {dishPairings.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {dishPairings.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="info">{p.beverage?.type ?? 'beverage'}</Badge>
                            <span className="text-sm font-medium text-stone-700 truncate">
                              {p.beverage?.name ?? 'Unknown'}
                            </span>
                            {p.pairing_note && (
                              <span className="text-xs text-stone-400 truncate hidden sm:inline">
                                {p.pairing_note}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {p.beverage?.sell_price_cents != null && (
                              <span className="text-xs text-stone-500">
                                {formatCurrency(p.beverage.sell_price_cents)}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemove(p.id)}
                              disabled={isPending}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add pairing inline form */}
                  {isAdding && (
                    <div className="border-t border-stone-100 pt-3 mt-2 space-y-3">
                      <Select
                        label="Select Beverage"
                        value={selectedBeverageId}
                        onChange={(e) => setSelectedBeverageId(e.target.value)}
                        options={beverageOptions}
                      />
                      <div>
                        <Input
                          placeholder="Pairing note (e.g. 'The acidity cuts through the richness')"
                          value={pairingNote}
                          onChange={(e) => setPairingNote(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAdd(dish.name, dish.courseNumber)}
                          disabled={isPending || !selectedBeverageId}
                        >
                          {isPending ? 'Adding...' : 'Add Pairing'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingForDish(null)
                            setSelectedBeverageId('')
                            setPairingNote('')
                          }}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
