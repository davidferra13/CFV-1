// Chef Preferences Form - Client Component
// Set once, rarely changed. Home base, stores, timing defaults.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefPreferences } from '@/lib/chef/actions'
import type { ChefPreferences, DefaultStore, RevenueGoalCustom } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StoreAutocomplete } from '@/components/ui/store-autocomplete'
import { detectMyLocation } from '@/lib/geo/geo-actions'
import { trackAction } from '@/lib/ai/remy-activity-tracker'

function createCustomGoal(): RevenueGoalCustom {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `goal-${Date.now()}`,
    label: '',
    target_cents: 0,
    period_start: '',
    period_end: '',
    enabled: true,
  }
}

export function PreferencesForm({ preferences }: { preferences: ChefPreferences }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [homeCity, setHomeCity] = useState(preferences.home_city ?? '')
  const [homeState, setHomeState] = useState(preferences.home_state ?? '')
  const [homeZip, setHomeZip] = useState(preferences.home_zip ?? '')
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [stores, setStores] = useState<DefaultStore[]>(preferences.default_stores ?? [])

  const [bufferMinutes, setBufferMinutes] = useState(preferences.default_buffer_minutes)
  const [prepHours, setPrepHours] = useState(preferences.default_prep_hours)
  const [shoppingMinutes, setShoppingMinutes] = useState(preferences.default_shopping_minutes)
  const [packingMinutes, setPackingMinutes] = useState(preferences.default_packing_minutes)

  const [targetMargin, setTargetMargin] = useState(preferences.target_margin_percent)
  const [shopDayBefore, setShopDayBefore] = useState(preferences.shop_day_before)
  const [revenueGoalProgramEnabled, setRevenueGoalProgramEnabled] = useState(
    preferences.revenue_goal_program_enabled
  )
  const [targetMonthlyRevenueDollars, setTargetMonthlyRevenueDollars] = useState(
    Math.round((preferences.target_monthly_revenue_cents ?? 0) / 100)
  )
  const [targetAnnualRevenueDollars, setTargetAnnualRevenueDollars] = useState(
    preferences.target_annual_revenue_cents == null
      ? ''
      : String(Math.round(preferences.target_annual_revenue_cents / 100))
  )
  const [revenueGoalNudgeLevel, setRevenueGoalNudgeLevel] = useState<
    'gentle' | 'standard' | 'aggressive'
  >(preferences.revenue_goal_nudge_level)
  const [customGoals, setCustomGoals] = useState<RevenueGoalCustom[]>(
    preferences.revenue_goal_custom ?? []
  )

  const handleDetectLocation = async () => {
    setDetectingLocation(true)
    setDetectError(null)
    try {
      const location = await detectMyLocation()
      if (!location) {
        setDetectError('Could not detect location. You may be on a local network or VPN.')
        return
      }
      setHomeCity(location.city)
      setHomeState(location.regionName)
      setHomeZip(location.zip)
    } catch {
      setDetectError('Location detection failed. Please enter manually.')
    } finally {
      setDetectingLocation(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateChefPreferences({
          home_address: null,
          home_city: homeCity || null,
          home_state: homeState || null,
          home_zip: homeZip || null,
          default_stores: stores
            .map((store) => ({
              name: store.name.trim(),
              address: (store.address || '').trim(),
              place_id: store.place_id ?? null,
            }))
            .filter((store) => store.name),
          default_buffer_minutes: bufferMinutes,
          default_prep_hours: prepHours,
          default_shopping_minutes: shoppingMinutes,
          default_packing_minutes: packingMinutes,
          target_margin_percent: targetMargin,
          target_monthly_revenue_cents: Math.max(0, Math.round(targetMonthlyRevenueDollars * 100)),
          target_annual_revenue_cents:
            targetAnnualRevenueDollars.trim() === ''
              ? null
              : Math.max(0, Math.round(Number(targetAnnualRevenueDollars) * 100)),
          revenue_goal_program_enabled: revenueGoalProgramEnabled,
          revenue_goal_nudge_level: revenueGoalNudgeLevel,
          revenue_goal_custom: customGoals
            .map((goal) => ({
              ...goal,
              label: goal.label.trim(),
              target_cents: Math.max(0, Math.round(goal.target_cents)),
            }))
            .filter((goal) => goal.label && goal.period_start && goal.period_end),
          shop_day_before: shopDayBefore,
        })
        trackAction(
          'Updated preferences',
          `Target margin: ${targetMargin}%, revenue goal: ${revenueGoalProgramEnabled ? 'on' : 'off'}`
        )
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  const addStore = () => {
    setStores([...stores, { name: '', address: '', place_id: null }])
  }

  const removeStore = (index: number) => {
    setStores(stores.filter((_, i) => i !== index))
  }

  const updateStore = (index: number, patch: Partial<DefaultStore>) => {
    const updated = [...stores]
    updated[index] = { ...updated[index], ...patch }
    setStores(updated)
  }

  const addCustomGoal = () => {
    setCustomGoals((prev) => [...prev, createCustomGoal()])
  }

  const removeCustomGoal = (goalId: string) => {
    setCustomGoals((prev) => prev.filter((goal) => goal.id !== goalId))
  }

  const updateCustomGoal = (goalId: string, patch: Partial<RevenueGoalCustom>) => {
    setCustomGoals((prev) =>
      prev.map((goal) => (goal.id === goalId ? { ...goal, ...patch } : goal))
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Home Base</CardTitle>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
            >
              {detectingLocation ? 'Detecting...' : 'Detect My Location'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {detectError && (
            <p className="text-xs text-amber-600 bg-amber-950 border border-amber-800 rounded px-2 py-1">
              {detectError}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">City</label>
              <Input
                value={homeCity}
                onChange={(e) => setHomeCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">State</label>
              <Input
                value={homeState}
                onChange={(e) => setHomeState(e.target.value)}
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">ZIP</label>
              <Input
                value={homeZip}
                onChange={(e) => setHomeZip(e.target.value)}
                placeholder="ZIP"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Default Stores</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={addStore}>
              + Add Store
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-stone-500">
            Search stores by name and select from Google results to auto-fill address.
          </p>

          {stores.length === 0 && (
            <p className="text-sm text-stone-500 border border-dashed border-stone-600 rounded-md p-3">
              No default stores yet. Add at least one store to speed up route planning.
            </p>
          )}

          {stores.map((store, index) => (
            <div key={index} className="rounded-lg border border-stone-700 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Store</label>
                  <StoreAutocomplete
                    value={store.name}
                    onChange={(value) => updateStore(index, { name: value })}
                    onPlaceSelect={(data) => {
                      updateStore(index, {
                        name: data.name,
                        address: data.address,
                        place_id: data.place_id,
                      })
                    }}
                    placeholder="Search store"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Address</label>
                  <Input
                    value={store.address || ''}
                    onChange={(e) => updateStore(index, { address: e.target.value })}
                    placeholder="Store address"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStore(index)}
                  className="text-red-500"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timing Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Prep Time (hours)
              </label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={prepHours}
                onChange={(e) => setPrepHours(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Shopping (min)
              </label>
              <Input
                type="number"
                min="15"
                max="240"
                value={shoppingMinutes}
                onChange={(e) => setShoppingMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Packing (min)</label>
              <Input
                type="number"
                min="10"
                max="120"
                value={packingMinutes}
                onChange={(e) => setPackingMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Buffer (min)</label>
              <Input
                type="number"
                min="0"
                max="120"
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
              />
              <p className="text-xs text-stone-500 mt-1">Before arrival at client</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              onChange={(e) => setShopDayBefore(e.target.checked)}
              className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="shopDayBefore" className="text-sm text-stone-300">
              Shop the day before events (recommended)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Target Profit Margin (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={targetMargin}
              onChange={(e) => setTargetMargin(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Goals Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="revenueGoalProgramEnabled"
              checked={revenueGoalProgramEnabled}
              onChange={(e) => setRevenueGoalProgramEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="revenueGoalProgramEnabled" className="text-sm text-stone-300">
              Enable goal-driven revenue coaching and nudges
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Monthly Revenue Goal ($)
              </label>
              <Input
                type="number"
                min="0"
                disabled={!revenueGoalProgramEnabled}
                value={targetMonthlyRevenueDollars}
                onChange={(e) => setTargetMonthlyRevenueDollars(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Annual Revenue Goal ($)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="Optional"
                disabled={!revenueGoalProgramEnabled}
                value={targetAnnualRevenueDollars}
                onChange={(e) => setTargetAnnualRevenueDollars(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Nudge Intensity
              </label>
              <select
                disabled={!revenueGoalProgramEnabled}
                value={revenueGoalNudgeLevel}
                onChange={(e) =>
                  setRevenueGoalNudgeLevel(e.target.value as 'gentle' | 'standard' | 'aggressive')
                }
                className="w-full px-3 py-2 border border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-stone-800"
              >
                <option value="gentle">Gentle</option>
                <option value="standard">Standard</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-300">Custom Goals</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addCustomGoal}
                disabled={!revenueGoalProgramEnabled}
              >
                + Add Goal
              </Button>
            </div>

            {customGoals.length === 0 && (
              <p className="text-sm text-stone-500 border border-dashed border-stone-600 rounded-md p-3">
                No custom goals yet. Add seasonal or campaign goals if needed.
              </p>
            )}

            {customGoals.map((goal) => (
              <div key={goal.id} className="rounded-lg border border-stone-700 p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Goal Label
                    </label>
                    <Input
                      disabled={!revenueGoalProgramEnabled}
                      value={goal.label}
                      onChange={(e) => updateCustomGoal(goal.id, { label: e.target.value })}
                      placeholder="Q2 push, holiday season, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">Start</label>
                    <Input
                      type="date"
                      disabled={!revenueGoalProgramEnabled}
                      value={goal.period_start}
                      onChange={(e) => updateCustomGoal(goal.id, { period_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">End</label>
                    <Input
                      type="date"
                      disabled={!revenueGoalProgramEnabled}
                      value={goal.period_end}
                      onChange={(e) => updateCustomGoal(goal.id, { period_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="w-full max-w-xs">
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Target ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      disabled={!revenueGoalProgramEnabled}
                      value={Math.round(goal.target_cents / 100)}
                      onChange={(e) =>
                        updateCustomGoal(goal.id, { target_cents: Number(e.target.value) * 100 })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-stone-300">
                      <input
                        type="checkbox"
                        disabled={!revenueGoalProgramEnabled}
                        checked={goal.enabled}
                        onChange={(e) => updateCustomGoal(goal.id, { enabled: e.target.checked })}
                        className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
                      />
                      Enabled
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!revenueGoalProgramEnabled}
                      onClick={() => removeCustomGoal(goal.id)}
                      className="text-red-500"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-950 border border-green-200 rounded-lg p-4">
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
