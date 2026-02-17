// Seasonal Palette Form — Client Component
// Full edit form: sensory anchor, micro-windows, context profiles, pantry, energy, proven wins.
// Follows PreferencesForm pattern: useState per field, useTransition, Card sections.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSeasonalPalette } from '@/lib/seasonal/actions'
import type { SeasonalPalette, MicroWindow, ContextProfile, ProvenWin } from '@/lib/seasonal/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type RecipeOption = { id: string; name: string }

export function SeasonalPaletteForm({
  palette,
  recipes = [],
}: {
  palette: SeasonalPalette
  recipes?: RecipeOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Season Identity
  const [seasonName, setSeasonName] = useState(palette.season_name)
  const [startMonthDay, setStartMonthDay] = useState(palette.start_month_day)
  const [endMonthDay, setEndMonthDay] = useState(palette.end_month_day)
  const [isActive, setIsActive] = useState(palette.is_active)

  // Sensory Anchor
  const [sensoryAnchor, setSensoryAnchor] = useState(palette.sensory_anchor ?? '')

  // Micro-Windows
  const [microWindows, setMicroWindows] = useState<MicroWindow[]>(
    palette.micro_windows.length > 0 ? palette.micro_windows : []
  )

  // Context Profiles
  const [contextProfiles, setContextProfiles] = useState<ContextProfile[]>(
    palette.context_profiles.length > 0 ? palette.context_profiles : []
  )

  // Additional fields
  const [pantryAndPreserve, setPantryAndPreserve] = useState(palette.pantry_and_preserve ?? '')
  const [chefEnergyReality, setChefEnergyReality] = useState(palette.chef_energy_reality ?? '')

  // Proven Wins
  const [provenWins, setProvenWins] = useState<ProvenWin[]>(
    palette.proven_wins.length > 0 ? palette.proven_wins : []
  )

  // ============================================
  // DYNAMIC ARRAY HELPERS
  // ============================================

  // Micro-Windows
  const addMicroWindow = () => {
    setMicroWindows([...microWindows, {
      name: '', ingredient: '', start_date: '', end_date: '', urgency: 'normal', notes: '',
    }])
  }
  const removeMicroWindow = (index: number) => {
    setMicroWindows(microWindows.filter((_, i) => i !== index))
  }
  const updateMicroWindow = (index: number, field: keyof MicroWindow, value: string) => {
    const updated = [...microWindows]
    updated[index] = { ...updated[index], [field]: value }
    setMicroWindows(updated)
  }

  // Context Profiles
  const addContextProfile = () => {
    setContextProfiles([...contextProfiles, {
      name: '', kitchen_reality: '', menu_guardrails: '', notes: '',
    }])
  }
  const removeContextProfile = (index: number) => {
    setContextProfiles(contextProfiles.filter((_, i) => i !== index))
  }
  const updateContextProfile = (index: number, field: keyof ContextProfile, value: string) => {
    const updated = [...contextProfiles]
    updated[index] = { ...updated[index], [field]: value }
    setContextProfiles(updated)
  }

  // Proven Wins
  const addProvenWin = () => {
    setProvenWins([...provenWins, { dish_name: '', notes: '', recipe_id: null }])
  }
  const removeProvenWin = (index: number) => {
    setProvenWins(provenWins.filter((_, i) => i !== index))
  }
  const updateProvenWin = (index: number, field: keyof ProvenWin, value: string | null) => {
    const updated = [...provenWins]
    updated[index] = { ...updated[index], [field]: value } as ProvenWin
    setProvenWins(updated)
  }

  // ============================================
  // SUBMIT
  // ============================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!seasonName.trim()) {
      setError('Season name is required')
      return
    }
    if (!/^\d{2}-\d{2}$/.test(startMonthDay) || !/^\d{2}-\d{2}$/.test(endMonthDay)) {
      setError('Date range must be in MM-DD format (e.g., 03-01)')
      return
    }

    startTransition(async () => {
      try {
        await updateSeasonalPalette(palette.id, {
          season_name: seasonName.trim(),
          start_month_day: startMonthDay,
          end_month_day: endMonthDay,
          is_active: isActive,
          sensory_anchor: sensoryAnchor.trim() || null,
          micro_windows: microWindows.filter(w => w.name.trim() && w.ingredient.trim()),
          context_profiles: contextProfiles.filter(cp => cp.name.trim() && cp.kitchen_reality.trim()),
          pantry_and_preserve: pantryAndPreserve.trim() || null,
          chef_energy_reality: chefEnergyReality.trim() || null,
          proven_wins: provenWins.filter(pw => pw.dish_name.trim()),
        })
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Season Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Season Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Season Name</label>
            <Input
              value={seasonName}
              onChange={e => setSeasonName(e.target.value)}
              placeholder="Winter"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Start Date (MM-DD)</label>
              <Input
                value={startMonthDay}
                onChange={e => setStartMonthDay(e.target.value)}
                placeholder="12-01"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">End Date (MM-DD)</label>
              <Input
                value={endMonthDay}
                onChange={e => setEndMonthDay(e.target.value)}
                placeholder="02-28"
                maxLength={5}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-stone-700">
              Set as active season (deactivates other seasons)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Sensory Anchor */}
      <Card>
        <CardHeader>
          <CardTitle>Sensory Anchor</CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            Your creative thesis for this season. This appears at the top of your Recipe Bible and Schedule sidebar.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={sensoryAnchor}
            onChange={e => setSensoryAnchor(e.target.value)}
            placeholder='e.g., "Early Spring Thaw: Cold ground, bright green shoots, bitter flavors, heavy reliance on preserved citrus."'
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Section 3: Micro-Windows */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Micro-Windows</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Define fleeting ingredient windows. High-urgency items get highlighted when their window is ending.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addMicroWindow}>
              + Add Window
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {microWindows.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">
              No micro-windows defined yet. Add one to track ingredient availability.
            </p>
          )}
          {microWindows.map((window, i) => (
            <div key={i} className="border border-stone-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                  Window {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMicroWindow(i)}
                  className="text-red-500 -mt-1"
                >
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                  <Input
                    value={window.name}
                    onChange={e => updateMicroWindow(i, 'name', e.target.value)}
                    placeholder="Ramps Season"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Ingredient</label>
                  <Input
                    value={window.ingredient}
                    onChange={e => updateMicroWindow(i, 'ingredient', e.target.value)}
                    placeholder="wild ramps"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Start (MM-DD)</label>
                  <Input
                    value={window.start_date}
                    onChange={e => updateMicroWindow(i, 'start_date', e.target.value)}
                    placeholder="04-01"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">End (MM-DD)</label>
                  <Input
                    value={window.end_date}
                    onChange={e => updateMicroWindow(i, 'end_date', e.target.value)}
                    placeholder="04-21"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Urgency</label>
                  <select
                    value={window.urgency}
                    onChange={e => updateMicroWindow(i, 'urgency', e.target.value)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                <Input
                  value={window.notes}
                  onChange={e => updateMicroWindow(i, 'notes', e.target.value)}
                  placeholder="Peak at mid-April, sourced from local forager"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 4: Context Profiles */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Context Profiles</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Operational scenarios and their kitchen reality. These serve as guardrails when writing menus.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addContextProfile}>
              + Add Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {contextProfiles.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">
              No context profiles defined yet. Add one to set operational guardrails.
            </p>
          )}
          {contextProfiles.map((profile, i) => (
            <div key={i} className="border border-stone-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                  Profile {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContextProfile(i)}
                  className="text-red-500 -mt-1"
                >
                  Remove
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Context Name</label>
                <Input
                  value={profile.name}
                  onChange={e => updateContextProfile(i, 'name', e.target.value)}
                  placeholder='e.g., "Heatwave / High Summer"'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Kitchen Reality</label>
                <Textarea
                  value={profile.kitchen_reality}
                  onChange={e => updateContextProfile(i, 'kitchen_reality', e.target.value)}
                  placeholder="No ovens during service. Raw preparations. Heavy ice usage."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Menu Guardrails</label>
                <Textarea
                  value={profile.menu_guardrails}
                  onChange={e => updateContextProfile(i, 'menu_guardrails', e.target.value)}
                  placeholder="Cold plates, ceviche, salads. No braised proteins."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                <Input
                  value={profile.notes}
                  onChange={e => updateContextProfile(i, 'notes', e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 5: Pantry & Preserve */}
      <Card>
        <CardHeader>
          <CardTitle>Pantry & Preserve</CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            What did you save from last season that needs to be used?
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={pantryAndPreserve}
            onChange={e => setPantryAndPreserve(e.target.value)}
            placeholder='e.g., "Fermented chilies from Summer. Canned tomatoes (20 jars). Preserved lemons (12)."'
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Section 6: Chef Energy Reality */}
      <Card>
        <CardHeader>
          <CardTitle>Chef Energy Reality</CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            A check on the team&apos;s stamina. Be honest about capacity.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={chefEnergyReality}
            onChange={e => setChefEnergyReality(e.target.value)}
            placeholder='e.g., "Team is burned out post-December rush. Keep January menus simple. No multi-course tasting menus until mid-February."'
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Section 7: Proven Wins */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Proven Wins</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Break-glass-in-case-of-emergency dishes that always work this season.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addProvenWin}>
              + Add Dish
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {provenWins.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">
              No proven wins yet. Add your reliable go-to dishes for this season.
            </p>
          )}
          {provenWins.map((win, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Dish Name</label>
                  <Input
                    value={win.dish_name}
                    onChange={e => updateProvenWin(i, 'dish_name', e.target.value)}
                    placeholder="Wild mushroom risotto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                  <Input
                    value={win.notes}
                    onChange={e => updateProvenWin(i, 'notes', e.target.value)}
                    placeholder="Always a crowd pleaser"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Link to Recipe</label>
                  <select
                    value={win.recipe_id || ''}
                    onChange={e => updateProvenWin(i, 'recipe_id', e.target.value || null)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">No recipe linked</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeProvenWin(i)}
                className="text-red-500 mt-6"
              >
                Remove
              </Button>
            </div>
          ))}
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
          <p className="text-sm text-green-700">Seasonal palette saved successfully.</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push('/settings/repertoire')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Palette'}
        </Button>
      </div>
    </form>
  )
}
