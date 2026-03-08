'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import {
  DEFAULT_LOYALTY_SIMULATOR_REWARDS,
  simulateLoyaltyProgram,
  type LoyaltyProgramConfig,
  type LoyaltyProgramReward,
  type LoyaltySimulationStartingProgress,
  type LoyaltyTier,
} from '@/lib/loyalty/simulator'

type Props = {
  title: string
  subtitle: string
  config: LoyaltyProgramConfig
  rewards: LoyaltyProgramReward[]
  accentColor?: string
  theme?: 'dark' | 'light'
  logoUrl?: string | null
  brandName?: string | null
  initialProgress?: LoyaltySimulationStartingProgress
  initialGuestsPerEvent?: number
  initialPlannedEvents?: number
  initialAverageSpendCents?: number
  showPoweredBy?: boolean
}

type RangeControlProps = {
  label: string
  hint: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  theme: 'dark' | 'light'
}

type ScenarioPreset = {
  id: string
  label: string
  guestsPerEvent: number
  plannedEvents: number
  averageSpendCents?: number
}

const TIER_LABELS: Record<LoyaltyTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

const TIER_PILL_CLASSES: Record<LoyaltyTier, string> = {
  bronze: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  silver: 'bg-slate-400/10 text-slate-200 border-slate-300/20',
  gold: 'bg-yellow-400/15 text-yellow-200 border-yellow-400/30',
  platinum: 'bg-sky-400/15 text-sky-200 border-sky-400/30',
}

function formatPoints(points: number): string {
  return `${points.toLocaleString()} pts`
}

function describeReward(reward: LoyaltyProgramReward): string {
  if (reward.reward_type === 'discount_fixed' && reward.reward_value_cents) {
    return `${reward.name} (${formatCurrency(reward.reward_value_cents)})`
  }

  if (reward.reward_type === 'discount_percent' && reward.reward_percent) {
    return `${reward.name} (${reward.reward_percent}% off)`
  }

  return reward.name
}

function rewardTypeLabel(rewardType: LoyaltyProgramReward['reward_type']): string {
  return rewardType.replace(/_/g, ' ')
}

function tierMetricLabel(programMode: LoyaltyProgramConfig['program_mode']): string {
  return programMode === 'lite' ? 'dinners' : 'lifetime points'
}

function buildScenarioPresets(config: LoyaltyProgramConfig): ScenarioPreset[] {
  const spendPresets =
    config.earn_mode === 'per_dollar'
      ? {
          dateNight: 150000,
          familyTable: 240000,
          celebration: 420000,
          regulars: 175000,
        }
      : {}

  return [
    {
      id: 'date-night',
      label: 'Dinner for two',
      guestsPerEvent: 2,
      plannedEvents: 5,
      averageSpendCents: spendPresets?.dateNight,
    },
    {
      id: 'family-table',
      label: 'Family table',
      guestsPerEvent: 4,
      plannedEvents: 3,
      averageSpendCents: spendPresets?.familyTable,
    },
    {
      id: 'celebration',
      label: 'Celebration',
      guestsPerEvent: Math.max(config.bonus_large_party_threshold ?? 8, 8),
      plannedEvents: 2,
      averageSpendCents: spendPresets?.celebration,
    },
    {
      id: 'regulars',
      label: 'Regulars',
      guestsPerEvent: 2,
      plannedEvents: 12,
      averageSpendCents: spendPresets?.regulars,
    },
  ]
}

function RangeControl({
  label,
  hint,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (nextValue) => String(nextValue),
  theme,
}: RangeControlProps) {
  const trackClass =
    theme === 'light'
      ? 'accent-[var(--sim-accent)] bg-stone-200'
      : 'accent-[var(--sim-accent)] bg-stone-800'

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs opacity-70">{hint}</p>
        </div>
        <div className="rounded-full border border-current/10 px-3 py-1 text-sm font-semibold">
          {formatValue(value)}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`h-2 w-full cursor-pointer rounded-lg ${trackClass}`}
      />
      <div className="flex justify-between text-[11px] opacity-60">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  theme,
}: {
  label: string
  value: string
  detail: string
  theme: 'dark' | 'light'
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        theme === 'light'
          ? 'border-stone-200 bg-white/90'
          : 'border-white/10 bg-white/5 backdrop-blur'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm opacity-75">{detail}</p>
    </div>
  )
}

export function LoyaltyProgramSimulator({
  title,
  subtitle,
  config,
  rewards,
  accentColor = '#e88f47',
  theme = 'dark',
  logoUrl,
  brandName,
  initialProgress,
  initialGuestsPerEvent = 2,
  initialPlannedEvents = 5,
  initialAverageSpendCents = 150000,
  showPoweredBy = false,
}: Props) {
  const [guestsPerEvent, setGuestsPerEvent] = useState(initialGuestsPerEvent)
  const [plannedEvents, setPlannedEvents] = useState(initialPlannedEvents)
  const [averageSpendCents, setAverageSpendCents] = useState(initialAverageSpendCents)
  const [includeWelcomeBonus, setIncludeWelcomeBonus] = useState(true)

  const resolvedRewards = rewards.length > 0 ? rewards : DEFAULT_LOYALTY_SIMULATOR_REWARDS
  const simulation = simulateLoyaltyProgram({
    config,
    rewards: resolvedRewards,
    guestsPerEvent,
    plannedEvents,
    eventTotalCents: averageSpendCents,
    includeWelcomeBonus,
    startingProgress: initialProgress,
  })

  const isLight = theme === 'light'
  const shellClass = isLight
    ? 'bg-stone-50 text-stone-950 border-stone-200'
    : 'bg-[#0f0f12] text-stone-100 border-white/10'
  const mutedTextClass = isLight ? 'text-stone-600' : 'text-stone-400'
  const panelClass = isLight
    ? 'border-stone-200 bg-white'
    : 'border-white/10 bg-white/5 backdrop-blur'
  const softPanelClass = isLight
    ? 'border-stone-200 bg-stone-100/80'
    : 'border-white/10 bg-black/20'
  const timelineRowClass = isLight
    ? 'border-stone-200 bg-white/90'
    : 'border-white/10 bg-white/[0.03]'
  const heroStyle = {
    '--sim-accent': accentColor,
    background: isLight
      ? `linear-gradient(135deg, ${accentColor}18 0%, #ffffff 55%, #f5f5f4 100%)`
      : `linear-gradient(135deg, ${accentColor}2b 0%, rgba(15,15,18,0.96) 42%, rgba(15,15,18,1) 100%)`,
  } as CSSProperties

  const progressMessage =
    (initialProgress?.startingEventsCompleted ?? 0) > 0 ||
    (initialProgress?.startingPointsBalance ?? 0) > 0
      ? config.program_mode === 'lite'
        ? `Starting from ${simulation.startingEventsCompleted} completed dinners.`
        : `Starting from ${formatPoints(simulation.startingPointsBalance)} and ${simulation.startingEventsCompleted} completed dinners.`
      : 'Starting from a new client profile.'

  const basePointsPerEvent =
    config.program_mode === 'full' && simulation.timeline[0] ? simulation.timeline[0].basePoints : 0
  const scenarioPresets = buildScenarioPresets(config)
  const totalBasePoints = simulation.timeline.reduce((sum, entry) => sum + entry.basePoints, 0)
  const totalLargePartyBonusPoints = simulation.timeline.reduce(
    (sum, entry) => sum + entry.largePartyBonusPoints,
    0
  )
  const totalMilestoneBonusPoints = simulation.timeline.reduce(
    (sum, entry) => sum + entry.milestoneBonusPoints,
    0
  )
  const totalBonusPoints = totalLargePartyBonusPoints + totalMilestoneBonusPoints
  const totalLargePartyBonusEvents = simulation.timeline.filter(
    (entry) => entry.largePartyBonusPoints > 0
  ).length
  const activePresetId =
    scenarioPresets.find((preset) => {
      const spendMatches =
        config.earn_mode !== 'per_dollar' || preset.averageSpendCents === averageSpendCents

      return (
        preset.guestsPerEvent === guestsPerEvent &&
        preset.plannedEvents === plannedEvents &&
        spendMatches
      )
    })?.id ?? null
  const totalAddedDetailSegments =
    config.program_mode === 'full'
      ? [
          `${formatPoints(totalBasePoints)} base earn`,
          totalBonusPoints > 0 ? `${formatPoints(totalBonusPoints)} bonuses` : null,
          simulation.welcomeBonusApplied > 0
            ? `${formatPoints(simulation.welcomeBonusApplied)} welcome bonus`
            : null,
        ].filter(Boolean)
      : []
  const bonusPointsDetail =
    totalBonusPoints === 0
      ? 'No plan bonuses are triggered in this scenario.'
      : totalLargePartyBonusPoints > 0 && totalMilestoneBonusPoints > 0
        ? `${formatPoints(totalLargePartyBonusPoints)} from large-party bonuses across ${totalLargePartyBonusEvents} dinner${totalLargePartyBonusEvents === 1 ? '' : 's'} and ${formatPoints(totalMilestoneBonusPoints)} from milestone bonuses.`
        : totalLargePartyBonusPoints > 0
          ? `${formatPoints(totalLargePartyBonusPoints)} from large-party bonuses across ${totalLargePartyBonusEvents} dinner${totalLargePartyBonusEvents === 1 ? '' : 's'}.`
          : `${formatPoints(totalMilestoneBonusPoints)} from milestone bonuses.`
  const perDinnerSnapshot =
    config.program_mode === 'full'
      ? config.earn_mode === 'per_dollar'
        ? `At ${formatCurrency(averageSpendCents)} per dinner, this client earns ${formatPoints(basePointsPerEvent)} before bonuses each time.`
        : config.earn_mode === 'per_event'
          ? `${plannedEvents} dinners gives this client ${formatPoints(basePointsPerEvent)} on each dinner before bonuses, regardless of party size.`
          : `${guestsPerEvent} guests x ${plannedEvents} dinners gives this client ${formatPoints(basePointsPerEvent)} before bonuses on each dinner.`
      : `${plannedEvents} more dinners moves the client through visit-based recognition tiers.`

  return (
    <section
      className={`rounded-[28px] border p-4 sm:p-6 lg:p-8 shadow-2xl ${shellClass}`}
      style={heroStyle}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            {(logoUrl || brandName) && (
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={brandName || 'Chef logo'}
                    className="h-12 w-12 rounded-2xl border border-white/10 object-cover bg-white p-1"
                  />
                ) : null}
                {brandName ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
                      Live loyalty program
                    </p>
                    <p className="text-lg font-semibold">{brandName}</p>
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-60">
                Scenario planner
              </p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
              <p className={`mt-3 max-w-3xl text-sm sm:text-base ${mutedTextClass}`}>{subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className={`rounded-full border px-3 py-1.5 ${softPanelClass}`}>
                {config.program_mode === 'full'
                  ? 'Points + tiers + rewards'
                  : config.program_mode === 'lite'
                    ? 'Recognition tiers only'
                    : 'Program disabled'}
              </span>
              {config.program_mode === 'full' ? (
                <span className={`rounded-full border px-3 py-1.5 ${softPanelClass}`}>
                  Earn mode: {config.earn_mode.replace(/_/g, ' ')}
                </span>
              ) : null}
              <span className={`rounded-full border px-3 py-1.5 ${softPanelClass}`}>
                {progressMessage}
              </span>
            </div>
          </div>

          <div className={`w-full max-w-sm rounded-3xl border p-5 ${panelClass}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
              Assumption summary
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={mutedTextClass}>Guests per dinner</span>
                <span className="font-semibold">{simulation.guestsPerEvent}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedTextClass}>Planned dinners</span>
                <span className="font-semibold">{simulation.plannedEvents}</span>
              </div>
              {config.earn_mode === 'per_dollar' && config.program_mode === 'full' ? (
                <div className="flex items-center justify-between gap-3">
                  <span className={mutedTextClass}>Average dinner spend</span>
                  <span className="font-semibold">
                    {formatCurrency(simulation.eventTotalCents)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className={mutedTextClass}>Guests served in this plan</span>
                <span className="font-semibold">{simulation.totalGuestsAdded}</span>
              </div>
            </div>
          </div>
        </div>

        {config.program_mode === 'off' || !config.is_active ? (
          <div className={`rounded-3xl border p-6 ${panelClass}`}>
            <p className="text-lg font-semibold">This loyalty program is currently turned off.</p>
            <p className={`mt-2 text-sm ${mutedTextClass}`}>
              Once the chef enables loyalty, this simulator will show the exact points, tiers, and
              rewards available to clients.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold">Adjust the scenario</p>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Move the sliders to model what the next stretch of dinners could look like.
                    </p>
                  </div>
                  {config.program_mode === 'full' && config.welcome_points > 0 ? (
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${softPanelClass}`}
                    >
                      <input
                        type="checkbox"
                        checked={includeWelcomeBonus}
                        onChange={(event) => setIncludeWelcomeBonus(event.target.checked)}
                        className="accent-[var(--sim-accent)]"
                      />
                      Include welcome bonus
                    </label>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
                        Quick presets
                      </p>
                      {scenarioPresets.map((preset) => {
                        const isActive = activePresetId === preset.id

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setGuestsPerEvent(preset.guestsPerEvent)
                              setPlannedEvents(preset.plannedEvents)
                              if (
                                config.program_mode === 'full' &&
                                config.earn_mode === 'per_dollar' &&
                                preset.averageSpendCents
                              ) {
                                setAverageSpendCents(preset.averageSpendCents)
                              }
                            }}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${softPanelClass}`}
                            style={
                              isActive
                                ? {
                                    borderColor: accentColor,
                                    color: accentColor,
                                  }
                                : undefined
                            }
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <RangeControl
                    label="Guests per dinner"
                    hint="Set this to 2 for a dinner for two."
                    min={1}
                    max={24}
                    value={guestsPerEvent}
                    onChange={setGuestsPerEvent}
                    theme={theme}
                    formatValue={(value) => `${value} guest${value === 1 ? '' : 's'}`}
                  />
                  <RangeControl
                    label="How many dinners to model"
                    hint="Simulate a short test run or a full year of repeat dinners."
                    min={1}
                    max={24}
                    value={plannedEvents}
                    onChange={setPlannedEvents}
                    theme={theme}
                    formatValue={(value) => `${value} dinner${value === 1 ? '' : 's'}`}
                  />
                  {config.program_mode === 'full' && config.earn_mode === 'per_dollar' ? (
                    <div className="md:col-span-2">
                      <RangeControl
                        label="Average dinner spend"
                        hint="Only used when points are earned from spend."
                        min={25000}
                        max={600000}
                        step={2500}
                        value={averageSpendCents}
                        onChange={setAverageSpendCents}
                        theme={theme}
                        formatValue={(value) => formatCurrency(value)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
                <p className="text-xl font-semibold">What this setup means</p>
                <div className="mt-5 space-y-4 text-sm">
                  <div className={`rounded-2xl border p-4 ${softPanelClass}`}>
                    <p className="font-semibold">Per dinner snapshot</p>
                    <p className={`mt-1 ${mutedTextClass}`}>{perDinnerSnapshot}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${softPanelClass}`}>
                    <p className="font-semibold">Rules in play</p>
                    <ul className={`mt-2 space-y-2 ${mutedTextClass}`}>
                      <li>
                        Tier progression uses {tierMetricLabel(config.program_mode)} and never goes
                        backward after redemptions.
                      </li>
                      {config.program_mode === 'full' &&
                      config.bonus_large_party_threshold !== null &&
                      (config.bonus_large_party_points ?? 0) > 0 ? (
                        <li>
                          Large-party bonus triggers at {config.bonus_large_party_threshold}+
                          guests.
                        </li>
                      ) : null}
                      {config.program_mode === 'full' && config.milestone_bonuses.length > 0 ? (
                        <li>
                          Milestone bonuses fire on dinner{' '}
                          {config.milestone_bonuses.map((milestone) => milestone.events).join(', ')}
                          .
                        </li>
                      ) : null}
                      {config.program_mode === 'full' && config.welcome_points > 0 ? (
                        <li>Welcome bonus applies once when a client first joins.</li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                label={config.program_mode === 'full' ? 'Total added' : 'Total dinners after plan'}
                value={
                  config.program_mode === 'full'
                    ? formatPoints(simulation.totalPointsAdded)
                    : simulation.endingEventsCompleted.toString()
                }
                detail={
                  config.program_mode === 'full'
                    ? `${totalAddedDetailSegments.join(' + ')} added in this plan.`
                    : `${simulation.plannedEvents} new dinners added to the client's history.`
                }
                theme={theme}
              />
              <SummaryCard
                label="Final tier"
                value={TIER_LABELS[simulation.endingTier]}
                detail={
                  simulation.nextTierName
                    ? `${simulation.valueToNextTier.toLocaleString()} more ${tierMetricLabel(config.program_mode)} to reach ${TIER_LABELS[simulation.nextTierName]}.`
                    : 'Top tier reached in this scenario.'
                }
                theme={theme}
              />
              <SummaryCard
                label={config.program_mode === 'full' ? 'Rewards unlocked' : 'Tier jumps'}
                value={
                  config.program_mode === 'full'
                    ? simulation.unlockedRewards.length.toString()
                    : simulation.timeline.filter((entry) => entry.tierChanged).length.toString()
                }
                detail={
                  config.program_mode === 'full'
                    ? simulation.nextReward
                      ? `${simulation.pointsToNextReward?.toLocaleString() ?? 0} pts short of ${simulation.nextReward.name}.`
                      : 'Every active reward in this catalog unlocks in this plan.'
                    : simulation.timeline.some((entry) => entry.tierChanged)
                      ? 'This plan moves the client into a higher recognition tier.'
                      : 'No tier change yet, but the client gets closer.'
                }
                theme={theme}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold">How the plan compounds</p>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Each row shows exactly what happens after a dinner is completed.
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${softPanelClass}`}
                  >
                    {simulation.timeline.length} step{simulation.timeline.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className={`rounded-2xl border p-4 ${softPanelClass}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
                      Base earn
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {config.program_mode === 'full' ? formatPoints(basePointsPerEvent) : '-'}
                    </p>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>Per dinner before bonuses.</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${softPanelClass}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
                      Bonus points
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {config.program_mode === 'full' ? formatPoints(totalBonusPoints) : '-'}
                    </p>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>{bonusPointsDetail}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${softPanelClass}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
                      Ending balance
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {config.program_mode === 'full'
                        ? formatPoints(simulation.endingPointsBalance)
                        : `${simulation.endingEventsCompleted} dinners`}
                    </p>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>
                      After the full scenario plays out.
                    </p>
                  </div>
                </div>

                <div className="mt-6 max-h-[540px] space-y-3 overflow-y-auto pr-1">
                  {simulation.timeline.map((entry) => (
                    <div
                      key={entry.planEventIndex}
                      className={`rounded-2xl border p-4 ${timelineRowClass}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold">
                              Dinner {entry.totalEventsCompleted}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TIER_PILL_CLASSES[entry.tierAfter]}`}
                            >
                              {TIER_LABELS[entry.tierAfter]}
                            </span>
                            {entry.tierChanged ? (
                              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                Tier upgrade
                              </span>
                            ) : null}
                          </div>
                          <p className={`mt-1 text-sm ${mutedTextClass}`}>
                            Plan event {entry.planEventIndex} with {entry.guestsPerEvent} guest
                            {entry.guestsPerEvent === 1 ? '' : 's'}.
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-lg font-semibold">
                            {config.program_mode === 'full'
                              ? `+${entry.totalPointsEarned.toLocaleString()} pts`
                              : `${entry.totalEventsCompleted} total dinners`}
                          </p>
                          <p className={`text-xs ${mutedTextClass}`}>
                            {config.program_mode === 'full'
                              ? `${entry.cumulativePointsBalance.toLocaleString()} pts balance`
                              : `${TIER_LABELS[entry.tierAfter]} tier`}
                          </p>
                        </div>
                      </div>

                      {config.program_mode === 'full' ? (
                        <div className={`mt-3 flex flex-wrap gap-2 text-xs ${mutedTextClass}`}>
                          <span className={`rounded-full border px-2.5 py-1 ${softPanelClass}`}>
                            Base {formatPoints(entry.basePoints)}
                          </span>
                          {entry.largePartyBonusPoints > 0 ? (
                            <span className={`rounded-full border px-2.5 py-1 ${softPanelClass}`}>
                              Large-party bonus {formatPoints(entry.largePartyBonusPoints)}
                            </span>
                          ) : null}
                          {entry.milestoneBonusPoints > 0 ? (
                            <span className={`rounded-full border px-2.5 py-1 ${softPanelClass}`}>
                              Milestone bonus {formatPoints(entry.milestoneBonusPoints)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {entry.unlockedRewards.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {entry.unlockedRewards.map((reward) => (
                            <span
                              key={reward.id}
                              className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                            >
                              Unlocked: {reward.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
                  <p className="text-xl font-semibold">
                    {config.program_mode === 'full'
                      ? 'What this plan unlocks'
                      : 'Recognition outcome'}
                  </p>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>
                    {config.program_mode === 'full'
                      ? 'Rewards are based on the live catalog for this chef.'
                      : 'Lite mode keeps the focus on recognition and relationship status.'}
                  </p>

                  {config.program_mode === 'full' ? (
                    simulation.unlockedRewards.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {simulation.unlockedRewards.map((entry) => (
                          <div
                            key={entry.reward.id}
                            className={`rounded-2xl border p-4 ${softPanelClass}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold">{describeReward(entry.reward)}</p>
                                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                                  {entry.reward.description ||
                                    rewardTypeLabel(entry.reward.reward_type)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {entry.reward.points_required.toLocaleString()} pts
                                </p>
                                <p className={`mt-1 text-xs ${mutedTextClass}`}>
                                  {entry.unlockedBy === 'welcome_bonus'
                                    ? 'Unlocked from the welcome bonus'
                                    : `Unlocked after dinner ${entry.unlockedAtPlanEvent}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`mt-5 rounded-2xl border p-4 ${softPanelClass}`}>
                        <p className="font-semibold">
                          No rewards unlock in this version of the plan.
                        </p>
                        <p className={`mt-1 text-sm ${mutedTextClass}`}>
                          {simulation.nextReward
                            ? `${simulation.pointsToNextReward?.toLocaleString() ?? 0} more points are needed to unlock ${simulation.nextReward.name}.`
                            : 'Add more dinners to see which reward unlocks first.'}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className={`mt-5 rounded-2xl border p-4 ${softPanelClass}`}>
                      <p className="font-semibold">
                        This client finishes at {TIER_LABELS[simulation.endingTier]}.
                      </p>
                      <p className={`mt-1 text-sm ${mutedTextClass}`}>
                        {simulation.nextTierName
                          ? `${simulation.valueToNextTier} more dinners are needed for ${TIER_LABELS[simulation.nextTierName]}.`
                          : 'They are already at the top recognition tier.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
                  <p className="text-xl font-semibold">Tier ladder</p>
                  <div className="mt-5 space-y-3">
                    {(['bronze', 'silver', 'gold', 'platinum'] as LoyaltyTier[]).map((tier) => {
                      const threshold =
                        tier === 'bronze'
                          ? 0
                          : tier === 'silver'
                            ? config.tier_silver_min
                            : tier === 'gold'
                              ? config.tier_gold_min
                              : config.tier_platinum_min

                      return (
                        <div
                          key={tier}
                          className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${softPanelClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${TIER_PILL_CLASSES[tier]}`}
                            >
                              {TIER_LABELS[tier]}
                            </span>
                            <span className={`text-sm ${mutedTextClass}`}>
                              Starts at {threshold.toLocaleString()}{' '}
                              {tierMetricLabel(config.program_mode)}
                            </span>
                          </div>
                          {simulation.endingTier === tier ? (
                            <span className="text-xs font-semibold text-emerald-300">Reached</span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={`rounded-2xl border px-4 py-3 text-xs ${softPanelClass}`}>
          <p>
            {config.program_mode === 'full'
              ? 'Rewards unlock based on current point balance. Tiers are based on lifetime points earned, so redeeming points does not drop a client out of a tier.'
              : 'Recognition tiers are based on completed dinners. This simulator assumes the same guest count for each dinner in the plan.'}
          </p>
          {showPoweredBy ? <p className={`mt-2 ${mutedTextClass}`}>Powered by ChefFlow</p> : null}
        </div>
      </div>
    </section>
  )
}
