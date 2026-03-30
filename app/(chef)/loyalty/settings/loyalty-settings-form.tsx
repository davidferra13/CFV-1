'use client'

// Loyalty Program Settings Form
// Full configuration UI: earn rates, welcome bonus, large party bonus,
// milestone bonuses (dynamic list), tier thresholds, program toggle.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateLoyaltyConfig,
  type LoyaltyConfig,
  type ProgramMode,
  type EarnMode,
} from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

type Milestone = { events: number; bonus: number }
type GuestMilestone = { guests: number; bonus: number }

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

export function LoyaltySettingsForm({ config, chefId }: { config: LoyaltyConfig; chefId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Program mode & earn mode
  const [programMode, setProgramMode] = useState<ProgramMode>(config.program_mode ?? 'full')
  const [earnMode, setEarnMode] = useState<EarnMode>(config.earn_mode ?? 'per_guest')

  // Program toggle (legacy - mapped from program_mode)
  const isActive = programMode !== 'off'

  // Earn rates
  const [pointsPerGuest, setPointsPerGuest] = useState(config.points_per_guest)
  const [pointsPerDollar, setPointsPerDollar] = useState(config.points_per_dollar ?? 1)
  const [pointsPerEvent, setPointsPerEvent] = useState(config.points_per_event ?? 100)
  const [welcomePoints, setWelcomePoints] = useState(config.welcome_points ?? 25)
  const [referralPoints, setReferralPoints] = useState(config.referral_points ?? 100)
  const [basePointsPerEvent, setBasePointsPerEvent] = useState(config.base_points_per_event ?? 0)

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

  // Guest milestones
  const [guestMilestones, setGuestMilestones] = useState<GuestMilestone[]>(
    [...(config.guest_milestones ?? [])].sort((a, b) => a.guests - b.guests)
  )
  const [newGuestMilestoneGuests, setNewGuestMilestoneGuests] = useState('')
  const [newGuestMilestoneBonus, setNewGuestMilestoneBonus] = useState('')

  // Tier thresholds
  const [silverMin, setSilverMin] = useState(config.tier_silver_min)
  const [goldMin, setGoldMin] = useState(config.tier_gold_min)
  const [platinumMin, setPlatinumMin] = useState(config.tier_platinum_min)

  // Tier perks (one string per tier, newline-separated perks)
  const initPerks = config.tier_perks ?? {}
  const [silverPerks, setSilverPerks] = useState((initPerks.silver || []).join('\n'))
  const [goldPerks, setGoldPerks] = useState((initPerks.gold || []).join('\n'))
  const [platinumPerks, setPlatinumPerks] = useState((initPerks.platinum || []).join('\n'))

  const defaultData = useMemo(
    () => ({
      programMode: config.program_mode ?? 'full',
      earnMode: config.earn_mode ?? 'per_guest',
      pointsPerGuest: config.points_per_guest,
      pointsPerDollar: config.points_per_dollar ?? 1,
      pointsPerEvent: config.points_per_event ?? 100,
      welcomePoints: config.welcome_points ?? 25,
      referralPoints: config.referral_points ?? 100,
      basePointsPerEvent: config.base_points_per_event ?? 0,
      largePartyThreshold: config.bonus_large_party_threshold ?? 10,
      largePartyBonus: config.bonus_large_party_points ?? 50,
      largePartyEnabled: (config.bonus_large_party_points ?? 0) > 0,
      milestones: [...(config.milestone_bonuses ?? [])].sort((a, b) => a.events - b.events),
      guestMilestones: [...(config.guest_milestones ?? [])].sort((a, b) => a.guests - b.guests),
      silverMin: config.tier_silver_min,
      goldMin: config.tier_gold_min,
      platinumMin: config.tier_platinum_min,
      silverPerks: (initPerks.silver || []).join('\n'),
      goldPerks: (initPerks.gold || []).join('\n'),
      platinumPerks: (initPerks.platinum || []).join('\n'),
    }),
    [config, initPerks]
  )

  const currentData = useMemo(
    () => ({
      programMode,
      earnMode,
      pointsPerGuest,
      pointsPerDollar,
      pointsPerEvent,
      welcomePoints,
      referralPoints,
      basePointsPerEvent,
      largePartyThreshold,
      largePartyBonus,
      largePartyEnabled,
      milestones,
      guestMilestones,
      silverMin,
      goldMin,
      platinumMin,
      silverPerks,
      goldPerks,
      platinumPerks,
    }),
    [
      programMode,
      earnMode,
      pointsPerGuest,
      pointsPerDollar,
      pointsPerEvent,
      welcomePoints,
      referralPoints,
      basePointsPerEvent,
      largePartyThreshold,
      largePartyBonus,
      largePartyEnabled,
      milestones,
      guestMilestones,
      silverMin,
      goldMin,
      platinumMin,
      silverPerks,
      goldPerks,
      platinumPerks,
    ]
  )

  const protection = useProtectedForm({
    surfaceId: 'loyalty-settings',
    recordId: 'singleton',
    tenantId: chefId,
    defaultData,
    currentData,
  })

  function applyDraftData(data: Record<string, unknown>) {
    if (typeof data.programMode === 'string') setProgramMode(data.programMode as ProgramMode)
    if (typeof data.earnMode === 'string') setEarnMode(data.earnMode as EarnMode)
    if (typeof data.pointsPerGuest === 'number') setPointsPerGuest(data.pointsPerGuest)
    if (typeof data.pointsPerDollar === 'number') setPointsPerDollar(data.pointsPerDollar)
    if (typeof data.pointsPerEvent === 'number') setPointsPerEvent(data.pointsPerEvent)
    if (typeof data.welcomePoints === 'number') setWelcomePoints(data.welcomePoints)
    if (typeof data.referralPoints === 'number') setReferralPoints(data.referralPoints)
    if (typeof data.basePointsPerEvent === 'number') setBasePointsPerEvent(data.basePointsPerEvent)
    if (typeof data.largePartyThreshold === 'number')
      setLargePartyThreshold(data.largePartyThreshold)
    if (typeof data.largePartyBonus === 'number') setLargePartyBonus(data.largePartyBonus)
    if (typeof data.largePartyEnabled === 'boolean') setLargePartyEnabled(data.largePartyEnabled)
    if (Array.isArray(data.milestones)) setMilestones(data.milestones)
    if (Array.isArray(data.guestMilestones)) setGuestMilestones(data.guestMilestones)
    if (typeof data.silverMin === 'number') setSilverMin(data.silverMin)
    if (typeof data.goldMin === 'number') setGoldMin(data.goldMin)
    if (typeof data.platinumMin === 'number') setPlatinumMin(data.platinumMin)
    if (typeof data.silverPerks === 'string') setSilverPerks(data.silverPerks)
    if (typeof data.goldPerks === 'string') setGoldPerks(data.goldPerks)
    if (typeof data.platinumPerks === 'string') setPlatinumPerks(data.platinumPerks)
  }

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

  function addGuestMilestone() {
    const guests = parseInt(newGuestMilestoneGuests)
    const bonus = parseInt(newGuestMilestoneBonus)
    if (!guests || !bonus || guests <= 0 || bonus <= 0) return
    if (guestMilestones.some((m) => m.guests === guests)) {
      setError(`A guest milestone already exists for ${guests} guests.`)
      return
    }
    setGuestMilestones((prev) => [...prev, { guests, bonus }].sort((a, b) => a.guests - b.guests))
    setNewGuestMilestoneGuests('')
    setNewGuestMilestoneBonus('')
    setError(null)
  }

  function removeGuestMilestone(guests: number) {
    setGuestMilestones((prev) => prev.filter((m) => m.guests !== guests))
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
          program_mode: programMode,
          earn_mode: earnMode,
          points_per_guest: pointsPerGuest,
          points_per_dollar: pointsPerDollar,
          points_per_event: pointsPerEvent,
          welcome_points: welcomePoints,
          referral_points: referralPoints,
          bonus_large_party_threshold: largePartyEnabled ? largePartyThreshold : undefined,
          bonus_large_party_points: largePartyEnabled ? largePartyBonus : 0,
          milestone_bonuses: milestones,
          guest_milestones: guestMilestones,
          base_points_per_event: basePointsPerEvent,
          tier_silver_min: silverMin,
          tier_gold_min: goldMin,
          tier_platinum_min: platinumMin,
          tier_perks: {
            bronze: [],
            silver: silverPerks
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            gold: goldPerks
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            platinum: platinumPerks
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        })
        setSaved(true)
        protection.markCommitted()
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to save settings')
      }
    })
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyDraftData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <div className="space-y-10">
        {/* ── Quick Setup Presets ─────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-1">Quick Setup</h2>
          <p className="text-sm text-stone-500 mb-3">
            Start with a preset, then customize. This fills all fields below but does not save until
            you click Save.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Private Dining',
                desc: 'Intimate dinners (2-8 guests). Rewards loyalty and referrals.',
                apply: () => {
                  setProgramMode('full')
                  setEarnMode('per_guest')
                  setPointsPerGuest(15)
                  setBasePointsPerEvent(25)
                  setWelcomePoints(50)
                  setReferralPoints(150)
                  setMilestones([
                    { events: 5, bonus: 50 },
                    { events: 10, bonus: 100 },
                    { events: 25, bonus: 300 },
                  ])
                  setGuestMilestones([
                    { guests: 25, bonus: 100 },
                    { guests: 50, bonus: 250 },
                  ])
                  setSilverMin(150)
                  setGoldMin(400)
                  setPlatinumMin(800)
                  setLargePartyEnabled(true)
                  setLargePartyThreshold(8)
                  setLargePartyBonus(25)
                },
              },
              {
                label: 'Catering',
                desc: 'Large events (20-200 guests). Flat earn, high guest milestones.',
                apply: () => {
                  setProgramMode('full')
                  setEarnMode('per_event')
                  setPointsPerEvent(100)
                  setBasePointsPerEvent(0)
                  setWelcomePoints(25)
                  setReferralPoints(200)
                  setMilestones([
                    { events: 3, bonus: 75 },
                    { events: 10, bonus: 200 },
                  ])
                  setGuestMilestones([
                    { guests: 100, bonus: 150 },
                    { guests: 500, bonus: 500 },
                  ])
                  setSilverMin(200)
                  setGoldMin(500)
                  setPlatinumMin(1000)
                  setLargePartyEnabled(true)
                  setLargePartyThreshold(50)
                  setLargePartyBonus(50)
                },
              },
              {
                label: 'Balanced',
                desc: 'Mix of event types. Base bonus + per-guest. Fair for all.',
                apply: () => {
                  setProgramMode('full')
                  setEarnMode('per_guest')
                  setPointsPerGuest(10)
                  setBasePointsPerEvent(50)
                  setWelcomePoints(25)
                  setReferralPoints(100)
                  setMilestones([
                    { events: 5, bonus: 50 },
                    { events: 10, bonus: 100 },
                  ])
                  setGuestMilestones([
                    { guests: 20, bonus: 75 },
                    { guests: 50, bonus: 200 },
                  ])
                  setSilverMin(100)
                  setGoldMin(250)
                  setPlatinumMin(500)
                  setLargePartyEnabled(true)
                  setLargePartyThreshold(10)
                  setLargePartyBonus(30)
                },
              },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={preset.apply}
                className="text-left rounded-lg p-4 border border-stone-700 bg-stone-800/50 hover:border-brand-500 hover:bg-brand-500/10 transition-colors"
              >
                <p className="text-sm font-semibold text-stone-200">{preset.label}</p>
                <p className="text-xs text-stone-400 mt-1">{preset.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <hr className="border-stone-700" />

        {/* ── Program Mode ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-1">Program Mode</h2>
          <p className="text-sm text-stone-500 mb-4">
            Choose how your loyalty program works. Existing client data is always preserved.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                key: 'full' as ProgramMode,
                label: 'Full Program',
                desc: 'Points, tiers, and redeemable rewards. The complete experience.',
              },
              {
                key: 'lite' as ProgramMode,
                label: 'Recognition Only',
                desc: 'Tier badges based on visit count. No points or rewards catalog.',
              },
              {
                key: 'off' as ProgramMode,
                label: 'Disabled',
                desc: 'No loyalty program. Hidden from clients.',
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setProgramMode(opt.key)}
                className={`text-left rounded-lg p-4 border transition-colors ${
                  programMode === opt.key
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
                }`}
              >
                <p
                  className={`text-sm font-semibold ${programMode === opt.key ? 'text-brand-500' : 'text-stone-200'}`}
                >
                  {opt.label}
                </p>
                <p className="text-xs text-stone-400 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
          <Badge variant={isActive ? 'success' : 'default'} className="mt-3">
            {programMode === 'full'
              ? 'Active - full points + tiers + rewards'
              : programMode === 'lite'
                ? 'Active - recognition tiers only'
                : 'Disabled - hidden from clients'}
          </Badge>
        </section>

        {programMode !== 'off' && (
          <>
            <hr className="border-stone-700" />

            {/* ── Earn Mode (full only) ────────────────────────────────────── */}
            {programMode === 'full' && (
              <section>
                <h2 className="text-lg font-semibold text-stone-100 mb-1">
                  How Clients Earn Points
                </h2>
                <p className="text-sm text-stone-500 mb-4">
                  Choose how points are calculated when an event is completed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {[
                    {
                      key: 'per_guest' as EarnMode,
                      label: 'Per Guest',
                      desc: 'Points based on guest count. Great for dinners and catering.',
                    },
                    {
                      key: 'per_dollar' as EarnMode,
                      label: 'Per Dollar Spent',
                      desc: 'Points based on event total. Rewards bigger bookings.',
                    },
                    {
                      key: 'per_event' as EarnMode,
                      label: 'Per Event (Flat)',
                      desc: 'Same points every event. Simple and predictable.',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setEarnMode(opt.key)}
                      className={`text-left rounded-lg p-4 border transition-colors ${
                        earnMode === opt.key
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${earnMode === opt.key ? 'text-brand-500' : 'text-stone-200'}`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Earn rate fields - conditional on earn mode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {earnMode === 'per_guest' && (
                    <NumberField
                      label="Points per guest"
                      name="points_per_guest"
                      value={pointsPerGuest}
                      onChange={setPointsPerGuest}
                      min={1}
                      suffix="pts / guest"
                      hint="e.g. 8 guests × 10 pts = 80 points"
                    />
                  )}
                  {earnMode === 'per_dollar' && (
                    <NumberField
                      label="Points per dollar"
                      name="points_per_dollar"
                      value={pointsPerDollar}
                      onChange={setPointsPerDollar}
                      min={0.01}
                      suffix="pts / $1"
                      hint="e.g. $2,000 event × 1 pt/$ = 2,000 points"
                    />
                  )}
                  {earnMode === 'per_event' && (
                    <NumberField
                      label="Points per event"
                      name="points_per_event"
                      value={pointsPerEvent}
                      onChange={setPointsPerEvent}
                      min={1}
                      suffix="pts / event"
                      hint="Flat amount awarded for every completed event"
                    />
                  )}
                  <NumberField
                    label="Base event bonus"
                    name="base_points_per_event"
                    value={basePointsPerEvent}
                    onChange={setBasePointsPerEvent}
                    min={0}
                    suffix="pts / event"
                    hint="Flat bonus added to every completed event on top of the earn mode. Set to 0 to disable. Creates a hybrid earning model."
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
                    hint="Automatically awarded to the referrer when a referred client completes their first event."
                  />
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Full-mode only sections ────────────────────────────────────── */}
        {programMode === 'full' && (
          <>
            <hr className="border-stone-700" />

            {/* ── Large Party Bonus ──────────────────────────────────────── */}
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
                  aria-label="Toggle large party bonus"
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
                    hint="Points added on top of the base earn for that event."
                  />
                </div>
              )}
            </section>

            <hr className="border-stone-700" />

            {/* ── Milestone Bonuses ──────────────────────────────────────── */}
            <section>
              <h2 className="text-lg font-semibold text-stone-100 mb-1">Milestone Bonuses</h2>
              <p className="text-sm text-stone-500 mb-4">
                Award bonus points when a client reaches a specific number of completed dinners.
              </p>

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
                <p className="text-sm text-stone-400 mb-4 italic">
                  No milestones set. Add one below.
                </p>
              )}

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
                  Example: After dinner #10, award +100 pts. Client will be motivated to keep
                  booking!
                </p>
              </div>
            </section>

            <hr className="border-stone-700" />

            {/* ── Guest Milestones ────────────────────────────────────────── */}
            <section>
              <h2 className="text-lg font-semibold text-stone-100 mb-1">Guest Milestones</h2>
              <p className="text-sm text-stone-500 mb-4">
                Award bonus points when a client reaches a cumulative number of guests served across
                all their events.
              </p>

              {guestMilestones.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {guestMilestones.map((m) => (
                    <div
                      key={m.guests}
                      className="flex items-center justify-between px-4 py-3 rounded-lg bg-stone-800 border border-stone-700"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">👥</span>
                        <div>
                          <p className="text-sm font-medium text-stone-100">
                            {m.guests} total guests served
                          </p>
                          <p className="text-xs text-stone-500">+{m.bonus} bonus points</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGuestMilestone(m.guests)}
                        className="text-stone-400 hover:text-red-600 text-sm transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400 mb-4 italic">
                  No guest milestones set. Add one below.
                </p>
              )}

              <div className="p-4 rounded-lg border border-dashed border-stone-600 bg-stone-800">
                <p className="text-sm font-medium text-stone-300 mb-3">Add a guest milestone</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">At total guests</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={newGuestMilestoneGuests}
                      onChange={(e) => setNewGuestMilestoneGuests(e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Bonus points</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 200"
                      value={newGuestMilestoneBonus}
                      onChange={(e) => setNewGuestMilestoneBonus(e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addGuestMilestone}
                    disabled={!newGuestMilestoneGuests || !newGuestMilestoneBonus}
                  >
                    Add Milestone
                  </Button>
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  Example: At 50 total guests served, award +200 pts. Encourages larger parties and
                  repeat bookings!
                </p>
              </div>
            </section>
          </>
        )}

        {/* ── Tier Thresholds (shown for full + lite) ────────────────────── */}
        {programMode !== 'off' && (
          <>
            <hr className="border-stone-700" />

            <section>
              <h2 className="text-lg font-semibold text-stone-100 mb-1">Tier Thresholds</h2>
              <p className="text-sm text-stone-500 mb-5">
                {programMode === 'full'
                  ? 'Lifetime points required to reach each tier. Tiers never go down when a client redeems rewards.'
                  : 'Number of completed events required to reach each tier. Tiers never go down.'}
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
                    <span className="text-sm text-stone-500">
                      {programMode === 'full' ? 'lifetime pts' : 'events'}
                    </span>
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
                    <span className="text-sm text-stone-500">
                      {programMode === 'full' ? 'lifetime pts' : 'events'}
                    </span>
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
                    <span className="text-sm text-stone-500">
                      {programMode === 'full' ? 'lifetime pts' : 'events'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-3">
                {programMode === 'full'
                  ? `Bronze is 0–${silverMin - 1} pts · Silver is ${silverMin}–${goldMin - 1} pts · Gold is ${goldMin}–${platinumMin - 1} pts · Platinum is ${platinumMin}+ pts`
                  : `Bronze is 0–${silverMin - 1} events · Silver is ${silverMin}–${goldMin - 1} events · Gold is ${goldMin}–${platinumMin - 1} events · Platinum is ${platinumMin}+ events`}
              </p>
            </section>

            <hr className="border-stone-700" />

            {/* ── Tier Perks ───────────────────────────────────────────────── */}
            <section>
              <h2 className="text-lg font-semibold text-stone-100 mb-1">Tier Perks</h2>
              <p className="text-sm text-stone-500 mb-5">
                Define what each tier unlocks for your clients. One perk per line. Bronze is always
                &quot;Standard service&quot; (no special perks needed).
              </p>
              <div className="space-y-4">
                {(
                  [
                    {
                      label: 'Silver Perks',
                      value: silverPerks,
                      setter: setSilverPerks,
                      placeholder: 'e.g. Complimentary amuse-bouche at every event',
                    },
                    {
                      label: 'Gold Perks',
                      value: goldPerks,
                      setter: setGoldPerks,
                      placeholder:
                        'e.g. Priority holiday booking\nRecipe card for your favorite dish',
                    },
                    {
                      label: 'Platinum Perks',
                      value: platinumPerks,
                      setter: setPlatinumPerks,
                      placeholder:
                        'e.g. Annual tasting menu experience\nCustom menu consultation\nAll Gold perks included',
                    },
                  ] as const
                ).map((tier) => (
                  <div key={tier.label}>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      {tier.label}
                    </label>
                    <textarea
                      value={tier.value}
                      onChange={(e) => tier.setter(e.target.value)}
                      placeholder={tier.placeholder}
                      rows={3}
                      className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">
                Clients see these perks on their rewards page. Make them tangible: priority access,
                complimentary courses, exclusive experiences.
              </p>
            </section>
          </>
        )}

        <hr className="border-stone-700" />

        {/* ── Save ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} loading={isPending}>
            {isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button variant="ghost" onClick={() => router.push('/loyalty')}>
            Back to Dashboard
          </Button>
          {saved && (
            <span className="text-sm text-emerald-700 font-medium">
              Settings saved successfully.
            </span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </FormShield>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
