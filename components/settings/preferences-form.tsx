// Chef Preferences Form — Client Component
// Set once, rarely changed. Home address, stores, timing defaults.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefPreferences } from '@/lib/chef/actions'
import type { ChefPreferences, SpecialtyStore } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PreferencesForm({ preferences }: { preferences: ChefPreferences }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [homeAddress, setHomeAddress] = useState(preferences.home_address ?? '')
  const [homeCity, setHomeCity] = useState(preferences.home_city ?? '')
  const [homeState, setHomeState] = useState(preferences.home_state ?? '')
  const [homeZip, setHomeZip] = useState(preferences.home_zip ?? '')

  const [groceryStore, setGroceryStore] = useState(preferences.default_grocery_store ?? '')
  const [groceryAddress, setGroceryAddress] = useState(preferences.default_grocery_address ?? '')
  const [liquorStore, setLiquorStore] = useState(preferences.default_liquor_store ?? '')
  const [liquorAddress, setLiquorAddress] = useState(preferences.default_liquor_address ?? '')
  const [specialtyStores, setSpecialtyStores] = useState<SpecialtyStore[]>(
    preferences.default_specialty_stores ?? []
  )

  const [bufferMinutes, setBufferMinutes] = useState(preferences.default_buffer_minutes)
  const [prepHours, setPrepHours] = useState(preferences.default_prep_hours)
  const [shoppingMinutes, setShoppingMinutes] = useState(preferences.default_shopping_minutes)
  const [packingMinutes, setPackingMinutes] = useState(preferences.default_packing_minutes)

  const [targetMargin, setTargetMargin] = useState(preferences.target_margin_percent)
  const [shopDayBefore, setShopDayBefore] = useState(preferences.shop_day_before)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateChefPreferences({
          home_address: homeAddress || null,
          home_city: homeCity || null,
          home_state: homeState || null,
          home_zip: homeZip || null,
          default_grocery_store: groceryStore || null,
          default_grocery_address: groceryAddress || null,
          default_liquor_store: liquorStore || null,
          default_liquor_address: liquorAddress || null,
          default_specialty_stores: specialtyStores.filter(s => s.name.trim()),
          default_buffer_minutes: bufferMinutes,
          default_prep_hours: prepHours,
          default_shopping_minutes: shoppingMinutes,
          default_packing_minutes: packingMinutes,
          target_margin_percent: targetMargin,
          shop_day_before: shopDayBefore,
        })
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  const addSpecialtyStore = () => {
    setSpecialtyStores([...specialtyStores, { name: '', address: '', notes: '' }])
  }

  const removeSpecialtyStore = (index: number) => {
    setSpecialtyStores(specialtyStores.filter((_, i) => i !== index))
  }

  const updateSpecialtyStore = (index: number, field: keyof SpecialtyStore, value: string) => {
    const updated = [...specialtyStores]
    updated[index] = { ...updated[index], [field]: value }
    setSpecialtyStores(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Home Address */}
      <Card>
        <CardHeader>
          <CardTitle>Home Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Street Address</label>
            <Input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
              <Input value={homeCity} onChange={e => setHomeCity(e.target.value)} placeholder="City" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">State</label>
              <Input value={homeState} onChange={e => setHomeState(e.target.value)} placeholder="State" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">ZIP</label>
              <Input value={homeZip} onChange={e => setHomeZip(e.target.value)} placeholder="ZIP" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Stores */}
      <Card>
        <CardHeader>
          <CardTitle>Default Stores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Grocery Store</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Store Name</label>
                <Input value={groceryStore} onChange={e => setGroceryStore(e.target.value)} placeholder="Store name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
                <Input value={groceryAddress} onChange={e => setGroceryAddress(e.target.value)} placeholder="Store address" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Liquor Store</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Store Name</label>
                <Input value={liquorStore} onChange={e => setLiquorStore(e.target.value)} placeholder="Store name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
                <Input value={liquorAddress} onChange={e => setLiquorAddress(e.target.value)} placeholder="Store address" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Specialty Stores</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addSpecialtyStore}>
                + Add Store
              </Button>
            </div>
            {specialtyStores.map((store, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                  <Input value={store.name} onChange={e => updateSpecialtyStore(i, 'name', e.target.value)} placeholder="H Mart" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
                  <Input value={store.address} onChange={e => updateSpecialtyStore(i, 'address', e.target.value)} placeholder="789 Oak Ave" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                    <Input value={store.notes} onChange={e => updateSpecialtyStore(i, 'notes', e.target.value)} placeholder="Asian ingredients" />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSpecialtyStore(i)} className="text-red-500 self-end">
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timing Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Timing Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Prep Time (hours)</label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={prepHours}
                onChange={e => setPrepHours(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Shopping (min)</label>
              <Input
                type="number"
                min="15"
                max="240"
                value={shoppingMinutes}
                onChange={e => setShoppingMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Packing (min)</label>
              <Input
                type="number"
                min="10"
                max="120"
                value={packingMinutes}
                onChange={e => setPackingMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Buffer (min)</label>
              <Input
                type="number"
                min="0"
                max="120"
                value={bufferMinutes}
                onChange={e => setBufferMinutes(Number(e.target.value))}
              />
              <p className="text-xs text-stone-500 mt-1">Before arrival at client</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DOP Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Procedures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="shopDayBefore"
              checked={shopDayBefore}
              onChange={e => setShopDayBefore(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="shopDayBefore" className="text-sm text-stone-700">
              Shop the day before events (recommended)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Target Profit Margin (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={targetMargin}
              onChange={e => setTargetMargin(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Preferences saved successfully.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  )
}
