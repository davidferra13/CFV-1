'use client'

// Loyalty Program Settings Form
// Full configuration UI: earn rates, welcome bonus, large party bonus,
// milestone bonuses (dynamic list), tier thresholds, program toggle.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateLoyaltyConfig, type LoyaltyConfig } from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Milestone = { events: number; bonus: number }

function NumberField({
  label,
  name,
  value,
  onChange,
  min = 0,
  hint,
  suffix,
}: {
  label: string
  name: string
  value: number
  onChange: (v: number) => void
  min?: number
  hint?: string
  suffix?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          name={name}
          type="number"
          min={min}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-36"
        />
        {suffix && <span className="text-sm text-stone-500">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-stone-500 mt-1">{hint}</p>}
    </div>
  )
}

export function LoyaltySettingsForm({ config }: { config: LoyaltyConfig }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Program toggle
  const [isActive, setIsActive] = useState(config.is_active)

  // Earn rates
  const [pointsPerGuest, setPointsPerGuest] = useState(config.points_per_guest)
  const [welcomePoints, setWelcomePoints] = useState(config.welcome_points ?? 25)
  const [referralPoints, setReferralPoints] = useState(config.referral_points ?? 100)

  // Large party bonus
  const [largePartyThreshold, setLargePartyThreshold] = useState(
    config.bonus_large_party_threshold ?? 10
  )
  const [largePartyBonus, setLargePartyBonus] = useState(config.bonus_large_party_points ?? 50)
  const [largePartyEnabled, setLargePartyEnabled] = useState(
    (config.bonus_large_party_points ?? 0) > 0
  )

  // Milestones
  const [milestones, setMilestones] = useState<Milestone[]>(
    [...(config.milestone_bonuses ?? [])].sort((a, b) => a.events - b.events)
  )
  const [newMilestoneEvents, setNewMilestoneEvents] = useState('')
  const [newMilestoneBonus, setNewMilestoneBonus] = useState('')

  // Tier thresholds
  const [silverMin, setSilverMin] = useState(config.tier_silver_min)
  const [goldMin, setGoldMin] = useState(config.tier_gold_min)
  const [platinumMin, setPlatinumMin] = useState(config.tier_platinum_min)

  function addMilestone() {
    const events = parseInt(newMilestoneEvents)
    const bonus = parseInt(newMilestoneBonus)
    if (!events || !bonus || events <= 0 || bonus <= 0) return
    if (milestones.some((m) => m.events === events)) {
      setError(`A milestone already exists for the ${events}th event.`)
      return
    }
    setMilestones((prev) => [...prev, { events, bonus }].sort((a, b) => a.events - b.events))
    setNewMilestoneEvents('')
    setNewMilestoneBonus('')
    setError(null)
  }

  function removeMilestone(events: number) {
    setMilestones((prev) => prev.filter((m) => m.events !== events))
  }

  function handleSave() {
    setError(null)
    setSaved(false)

    // Validate tier ordering
    if (silverMin >= goldMin) {
      setError('Silver threshold must be less than Gold threshold.')
      return
    }
    if (goldMin >= platinumMin) {
      setError('Gold threshold must be less than Platinum threshold.')
      return
    }

    startTransition(async () => {
      try {
        await updateLoyaltyConfig({
          is_active: isActive,
          points_per_guest: pointsPerGuest,
          welcome_points: welcomePoints,
          referral_points: referralPoints,
          bonus_large_party_threshold: largePartyEnabled ? largePartyThreshold : undefined,
          bonus_large_party_points: largePartyEnabled ? largePartyBonus : 0,
          milestone_bonuses: milestones,
          tier_silver_min: silverMin,
          tier_gold_min: goldMin,
          tier_platinum_min: platinumMin,
        })
        setSaved(true)
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to save settings')
      }
    })
  }

  return (
    <div className="space-y-10">
      {/* ── Program Toggle ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Program Status</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              When paused, no new points are awarded. Existing balances and pending deliveries are
              preserved.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
              isActive ? 'bg-emerald-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-stone-900 shadow transition-transform ${
                isActive ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <Badge variant={isActive ? 'success' : 'default'} className="mt-2">
          {isActive ? 'Active — points are being awarded' : 'Paused — no new points awarded'}
        </Badge>
      </section>

      <hr className="border-stone-700" />

      {/* ── Earn Rates ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-1">Earn Rates</h2>
        <p className="text-sm text-stone-500 mb-5">
          How many points clients earn from different activities. All automatic.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <NumberField
            label="Points per guest"
            name="points_per_guest"
            value={pointsPerGuest}
            onChange={setPointsPerGuest}
            min={1}
            suffix="pts / guest"
            hint="Awarded automatically when a completed event is marked done."
          />
          <NumberField
            label="Welcome bonus"
            name="welcome_points"
            value={welcomePoints}
            onChange={setWelcomePoints}
            min={0}
            suffix="pts"
            hint="One-time bonus when an invited client creates their account. Set to 0 to disable."
          />
          <NumberField
            label="Referral bonus"
            name="referral_points"
            value={referralPoints}
            onChange={setReferralPoints}
            min={0}
            suffix="pts"
            hint="Reference value for manual referral awards — not applied automatically."
          />
        </div>
      </section>

      <hr className="border-stone-700" />

      {/* ── Large Party Bonus ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Large Party Bonus</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Extra points when a client hosts a bigger group.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLargePartyEnabled((v) => !v)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
              largePartyEnabled ? 'bg-emerald-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-stone-900 shadow transition-transform ${
                largePartyEnabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {largePartyEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            <NumberField
              label="Minimum guests"
              name="large_party_threshold"
              value={largePartyThreshold}
              onChange={setLargePartyThreshold}
              min={2}
              suffix="guests"
              hint="Bonus triggers when guest count is at or above this number."
            />
            <NumberField
              label="Bonus points"
              name="large_party_bonus"
              value={largePartyBonus}
              onChange={setLargePartyBonus}
              min={1}
              suffix="pts"
              hint="Points added on top of the base per-guest earn for that event."
            />
          </div>
        )}
      </section>

      <hr className="border-stone-700" />

      {/* ── Milestone Bonuses ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-1">Milestone Bonuses</h2>
        <p className="text-sm text-stone-500 mb-4">
          Award bonus points when a client reaches a specific number of completed dinners. A client
          on their 9th dinner will be excited to book the 10th to unlock the milestone.
        </p>

        {/* Existing milestones */}
        {milestones.length > 0 ? (
          <div className="space-y-2 mb-4">
            {milestones.map((m) => (
              <div
                key={m.events}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-stone-800 border border-stone-700"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏆</span>
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      {ordinal(m.events)} dinner completed
                    </p>
                    <p className="text-xs text-stone-500">+{m.bonus} bonus points</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(m.events)}
                  className="text-stone-400 hover:text-red-600 text-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 mb-4 italic">No milestones set. Add one below.</p>
        )}

        {/* Add new milestone */}
        <div className="p-4 rounded-lg border border-dashed border-stone-600 bg-stone-800">
          <p className="text-sm font-medium text-stone-300 mb-3">Add a milestone</p>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-stone-500 mb-1">After dinner #</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 10"
                value={newMilestoneEvents}
                onChange={(e) => setNewMilestoneEvents(e.target.value)}
                className="w-28"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Bonus points</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 100"
                value={newMilestoneBonus}
                onChange={(e) => setNewMilestoneBonus(e.target.value)}
                className="w-28"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addMilestone}
              disabled={!newMilestoneEvents || !newMilestoneBonus}
            >
              Add Milestone
            </Button>
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Example: After dinner #10, award +100 pts. Client will be motivated to keep booking!
          </p>
        </div>
      </section>

      <hr className="border-stone-700" />

      {/* ── Tier Thresholds ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-1">Tier Thresholds</h2>
        <p className="text-sm text-stone-500 mb-5">
          Lifetime points required to reach each tier. Tiers are based on total points ever earned —
          they never go down when a client redeems rewards.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-stone-400"></span>
                Silver minimum
              </span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={silverMin}
                onChange={(e) => setSilverMin(parseInt(e.target.value) || 1)}
                className="w-28"
              />
              <span className="text-sm text-stone-500">lifetime pts</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-400"></span>
                Gold minimum
              </span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={goldMin}
                onChange={(e) => setGoldMin(parseInt(e.target.value) || 1)}
                className="w-28"
              />
              <span className="text-sm text-stone-500">lifetime pts</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-purple-400"></span>
                Platinum minimum
              </span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={platinumMin}
                onChange={(e) => setPlatinumMin(parseInt(e.target.value) || 1)}
                className="w-28"
              />
              <span className="text-sm text-stone-500">lifetime pts</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-3">
          Bronze is 0–{silverMin - 1} pts · Silver is {silverMin}–{goldMin - 1} pts · Gold is{' '}
          {goldMin}–{platinumMin - 1} pts · Platinum is {platinumMin}+ pts
        </p>
      </section>

      <hr className="border-stone-700" />

      {/* ── Save ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/loyalty')}>
          Back to Dashboard
        </Button>
        {saved && (
          <span className="text-sm text-emerald-700 font-medium">Settings saved successfully.</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
