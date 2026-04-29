'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ContextCommandPanel } from '@/components/platform-shell/context-command-panel'
import type { ContextPanelSection } from '@/components/platform-shell/context-panel-types'
import type {
  ChefFlowReplay,
  ReplayActionCategory,
  ReplayActionItem,
  ReplayChangeGroup,
  ReplayComebackSignal,
  ReplayDailyStart,
  ReplayItem,
  ReplayPeriod,
  ReplayResumeCard,
} from '@/lib/activity/replay-model'

type ChefFlowReplayViewProps = {
  replay: ChefFlowReplay
  failedSections: string[]
}

type ReplayFilter =
  | 'needs-action'
  | 'client'
  | 'money'
  | 'prep'
  | 'quotes'
  | 'messages'
  | 'history'
  | 'hidden'

type ReplayItemState = {
  status: 'handled' | 'snoozed'
  updatedAt: string
  snoozedUntil?: string
}

const REPLAY_STATE_STORAGE_KEY = 'cf:replay:item-state:v1'

const FILTERS: Array<{ id: ReplayFilter; label: string }> = [
  { id: 'needs-action', label: 'Needs action' },
  { id: 'client', label: 'Client activity' },
  { id: 'money', label: 'Money' },
  { id: 'prep', label: 'Prep' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'messages', label: 'Messages' },
  { id: 'history', label: 'Full history' },
  { id: 'hidden', label: 'Handled' },
]

export function ChefFlowReplayView({ replay, failedSections }: ChefFlowReplayViewProps) {
  const hasFailures = failedSections.length > 0
  const hasReplayRows = replay.periods.some((period) => period.items.length > 0)
  const [activeFilter, setActiveFilter] = useState<ReplayFilter>('needs-action')
  const [itemStates, setItemStates] = useState<Record<string, ReplayItemState>>({})

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REPLAY_STATE_STORAGE_KEY)
      if (!raw) return
      setItemStates(JSON.parse(raw) as Record<string, ReplayItemState>)
    } catch {
      setItemStates({})
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(REPLAY_STATE_STORAGE_KEY, JSON.stringify(itemStates))
    } catch {
      // Local catch-up state is intentionally non-blocking.
    }
  }, [itemStates])

  const now = useMemo(() => new Date(), [])
  const filteredActions = replay.actionDigest.filter((item) =>
    activeFilter === 'hidden'
      ? isHiddenByLocalState(item.id, itemStates, now)
      : !isHiddenByLocalState(item.id, itemStates, now) && actionMatchesFilter(item, activeFilter)
  )
  const hiddenCount = replay.actionDigest.filter((item) =>
    isHiddenByLocalState(item.id, itemStates, now)
  ).length
  const filteredPeriods = replay.periods.map((period) => ({
    ...period,
    items: period.items.filter((item) => replayItemMatchesFilter(item, activeFilter)),
  }))

  function markHandled(id: string) {
    setItemStates((current) => ({
      ...current,
      [id]: { status: 'handled', updatedAt: new Date().toISOString() },
    }))
  }

  function snoozeUntilTomorrow(id: string) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(8, 0, 0, 0)
    setItemStates((current) => ({
      ...current,
      [id]: {
        status: 'snoozed',
        updatedAt: new Date().toISOString(),
        snoozedUntil: tomorrow.toISOString(),
      },
    }))
  }

  function clearLocalState(id: string) {
    setItemStates((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const commandSections: ContextPanelSection[] = [
    {
      id: 'replay-top-priority',
      title: 'Top priority',
      description:
        replay.actionDigest[0]?.reason ??
        'No source-backed action items were loaded for this period.',
      state: replay.actionDigest.length > 0 ? 'populated' : 'empty',
      metrics: [{ label: 'Open loops', value: replay.dailyStart.openLoopCount }],
      actions: replay.actionDigest[0]?.href
        ? [{ label: replay.actionDigest[0].primaryActionLabel, href: replay.actionDigest[0].href }]
        : undefined,
    },
    {
      id: 'replay-client-signals',
      title: 'Client signals',
      description:
        replay.comebackSignals.length > 0
          ? 'Client comeback rows are separated from passive history.'
          : 'No high-intent client comeback signals are loaded.',
      state: replay.comebackSignals.length > 0 ? 'populated' : 'empty',
      metrics: [{ label: 'Signals', value: replay.comebackSignals.length }],
    },
    {
      id: 'replay-local-workflow',
      title: 'Handled state',
      description:
        hiddenCount > 0
          ? 'Handled and snoozed items are saved in this browser.'
          : 'Use Mark handled or Snooze to reduce repeat noise in this browser.',
      state: hiddenCount > 0 ? 'populated' : 'empty',
      metrics: [{ label: 'Hidden', value: hiddenCount }],
    },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-xxs font-semibold uppercase tracking-[0.2em] text-brand-400">
            ChefFlow Catch Up
          </p>
          <h1 className="mt-2 text-2xl font-bold text-stone-100">Start from what needs action</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-400">
            Source-backed catch-up for what changed, which clients came back, and where to resume.
          </p>
        </div>
        {hasFailures && (
          <div
            role="alert"
            className="rounded-lg border border-amber-700/70 bg-amber-950/30 p-4 text-sm text-amber-100"
          >
            <p className="font-semibold text-amber-50">Catch Up is partially loaded</p>
            <p className="mt-1 text-amber-100/80">
              Could not load {failedSections.join(', ')}. Available sections remain visible.
            </p>
          </div>
        )}
      </header>

      <DailyStartCard dailyStart={replay.dailyStart} />

      <ReplayFilterBar
        activeFilter={activeFilter}
        hiddenCount={hiddenCount}
        onFilterChange={setActiveFilter}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-stone-800 bg-stone-950/60">
            <SectionHeader
              title={activeFilter === 'hidden' ? 'Handled and snoozed' : 'Action digest'}
              description={
                activeFilter === 'hidden'
                  ? 'These items are hidden only in this browser.'
                  : 'Ranked work items, not a passive activity feed.'
              }
            />
            {filteredActions.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {filteredActions.map((item) => (
                  <ActionDigestRow
                    key={item.id}
                    item={item}
                    localState={itemStates[item.id] ?? null}
                    onHandled={() => markHandled(item.id)}
                    onSnooze={() => snoozeUntilTomorrow(item.id)}
                    onRestore={() => clearLocalState(item.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptySection
                text={
                  activeFilter === 'hidden'
                    ? 'No handled or snoozed action items in this browser.'
                    : 'No action items match this filter.'
                }
              />
            )}
          </section>

          <section className="rounded-lg border border-stone-800 bg-stone-950/60">
            <SectionHeader
              title="Since you left"
              description={
                replay.sinceYouLeft.anchorAt
                  ? replay.sinceYouLeft.anchorLabel
                  : 'A previous session was not loaded, so no since-you-left window is shown.'
              }
            />
            {replay.sinceYouLeft.items.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {replay.sinceYouLeft.items.map((item) => (
                  <ReplayRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptySection text="No source-backed changes were loaded after the previous session." />
            )}
          </section>

          <section className="rounded-lg border border-stone-800 bg-stone-950/60">
            <SectionHeader
              title="Clients came back"
              description="High-intent portal behavior is separated from ordinary history."
            />
            {replay.comebackSignals.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {replay.comebackSignals.map((signal) => (
                  <ClientSignalRow key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <EmptySection text="No high-intent client comeback signals were loaded." />
            )}
          </section>

          <section
            id="resume-now"
            className="scroll-mt-6 rounded-lg border border-stone-800 bg-stone-950/60"
          >
            <SectionHeader
              title="Resume work"
              description="Richer resume cards with why it matters and the next useful action."
            />
            {replay.resumeCards.length > 0 ? (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {replay.resumeCards.map((item) => (
                  <ResumeReplayCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            ) : (
              <EmptySection text="No resume items are currently available." />
            )}
          </section>

          <section className="rounded-lg border border-stone-800 bg-stone-950/60">
            <SectionHeader
              title="Change explainers"
              description="Repeated edits are grouped into records that may need review."
            />
            {replay.changeGroups.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {replay.changeGroups.map((group) => (
                  <ChangeGroupRow key={group.id} group={group} />
                ))}
              </div>
            ) : (
              <EmptySection text="No repeated-change groups were found in loaded activity." />
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-200">Full history</h2>
              <p className="mt-1 text-xs text-stone-500">
                Still available, but below the action-first sections.
              </p>
            </div>
            {filteredPeriods.map((period) => (
              <ReplayPeriodSection key={period.id} period={period} />
            ))}
          </section>

          <section className="rounded-lg border border-stone-800 bg-stone-950/60">
            <SectionHeader
              title="Retrace sessions"
              description="Recent navigation sessions explain where work happened."
            />
            {replay.retraceSessions.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {replay.retraceSessions.map((session) => (
                  <div key={session.session_id} className="px-4 py-3">
                    <p className="text-sm font-medium text-stone-200">{session.summary}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {session.page_count} page view{session.page_count === 1 ? '' : 's'} over{' '}
                      {session.duration_minutes} minute
                      {session.duration_minutes === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection text="No retrace sessions are available for this period." />
            )}
          </section>
        </div>

        <ContextCommandPanel
          family="activity"
          title="Catch Up command"
          subtitle="Top priority, client signals, and local handled state."
          statusChips={[
            {
              label: hasFailures ? 'Partial' : 'Loaded',
              tone: hasFailures ? 'warning' : 'success',
            },
            { label: `${hiddenCount} hidden`, tone: hiddenCount > 0 ? 'info' : 'default' },
          ]}
          sections={commandSections}
        />
      </div>

      {!hasReplayRows && !hasFailures && (
        <p className="text-center text-sm text-stone-500">
          No source-backed catch-up activity was loaded for this period.
        </p>
      )}
    </div>
  )
}

function DailyStartCard({ dailyStart }: { dailyStart: ReplayDailyStart }) {
  const toneClass = {
    quiet: 'border-stone-800 bg-stone-950/60',
    client: 'border-brand-700/70 bg-brand-950/30',
    prep: 'border-amber-700/70 bg-amber-950/25',
    money: 'border-emerald-700/70 bg-emerald-950/25',
    busy: 'border-stone-700 bg-stone-900/80',
  }[dailyStart.tone]

  return (
    <section className={`rounded-lg border p-5 ${toneClass}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xxs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Daily start
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-100">{dailyStart.title}</h2>
          <p className="mt-2 text-sm text-stone-400">{dailyStart.summary}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4 md:min-w-[28rem]">
          <MetricPill label="Open loops" value={dailyStart.openLoopCount} />
          <MetricPill label="Clients" value={dailyStart.clientSignalCount} />
          <MetricPill label="Money" value={dailyStart.moneySignalCount} />
          <MetricPill label="Prep" value={dailyStart.prepSignalCount} />
        </div>
      </div>
    </section>
  )
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-800 bg-stone-950/50 px-3 py-2">
      <p className="text-xxs uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-100">{value}</p>
    </div>
  )
}

function ReplayFilterBar({
  activeFilter,
  hiddenCount,
  onFilterChange,
}: {
  activeFilter: ReplayFilter
  hiddenCount: number
  onFilterChange: (filter: ReplayFilter) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-lg border border-stone-800 bg-stone-950/60 p-2">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onFilterChange(filter.id)}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === filter.id
              ? 'bg-stone-100 text-stone-950'
              : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
          }`}
        >
          {filter.label}
          {filter.id === 'hidden' && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
        </button>
      ))}
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-stone-800 px-4 py-3">
      <h2 className="text-sm font-semibold text-stone-200">{title}</h2>
      <p className="mt-1 text-xs text-stone-500">{description}</p>
    </div>
  )
}

function EmptySection({ text }: { text: string }) {
  return <p className="px-4 py-6 text-sm text-stone-500">{text}</p>
}

function ActionDigestRow({
  item,
  localState,
  onHandled,
  onSnooze,
  onRestore,
}: {
  item: ReplayActionItem
  localState: ReplayItemState | null
  onHandled: () => void
  onSnooze: () => void
  onRestore: () => void
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={item.priority} />
            <span className="rounded bg-stone-900 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-stone-500">
              {formatCategory(item.category)}
            </span>
            {localState && (
              <span className="rounded bg-stone-800 px-2 py-0.5 text-xxs font-medium text-stone-400">
                {localState.status === 'handled'
                  ? 'Handled in this browser'
                  : `Snoozed until ${formatReplayTime(localState.snoozedUntil ?? '')}`}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-100">{item.title}</p>
            <p className="mt-1 text-sm text-stone-400">{item.reason}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {item.href && (
            <Link
              href={item.href}
              className="rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-950 transition-colors hover:bg-white"
            >
              {item.primaryActionLabel}
            </Link>
          )}
          {item.secondaryHref && item.secondaryActionLabel && (
            <Link
              href={item.secondaryHref}
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-900"
            >
              {item.secondaryActionLabel}
            </Link>
          )}
          {localState ? (
            <button
              type="button"
              onClick={onRestore}
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-900"
            >
              Restore
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onHandled}
                className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-900"
              >
                Mark handled
              </button>
              <button
                type="button"
                onClick={onSnooze}
                className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-900"
              >
                Snooze
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: ReplayActionItem['priority'] }) {
  const className =
    priority === 'high'
      ? 'bg-red-950 text-red-300'
      : priority === 'medium'
        ? 'bg-amber-950 text-amber-300'
        : 'bg-stone-800 text-stone-400'

  return (
    <span className={`rounded px-2 py-0.5 text-xxs font-semibold uppercase ${className}`}>
      {priority}
    </span>
  )
}

function ClientSignalRow({ signal }: { signal: ReplayComebackSignal }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-brand-950 px-2 py-0.5 text-xxs font-semibold uppercase text-brand-300">
            {signal.intent}
          </span>
          <time dateTime={signal.createdAt} className="text-xs text-stone-500">
            {formatReplayTime(signal.createdAt)}
          </time>
        </div>
        <p className="mt-2 text-sm font-medium text-stone-200">{signal.title}</p>
        {signal.detail && <p className="mt-1 truncate text-xs text-stone-500">{signal.detail}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {signal.href && (
          <Link
            href={signal.href}
            className="rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-950 transition-colors hover:bg-white"
          >
            Open
          </Link>
        )}
        {signal.communicationHref && (
          <Link
            href={signal.communicationHref}
            className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-900"
          >
            Communication
          </Link>
        )}
      </div>
    </div>
  )
}

function ResumeReplayCard({ item }: { item: ReplayResumeCard }) {
  return (
    <Link
      href={item.href}
      className="block rounded-lg border border-stone-800 bg-stone-900/60 p-4 transition-colors hover:border-stone-700 hover:bg-stone-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-100">{item.title}</p>
          <p className="mt-1 truncate text-xs text-stone-500">{item.subtitle}</p>
        </div>
        <span className="shrink-0 rounded border border-stone-700 px-2 py-0.5 text-xxs font-medium uppercase text-stone-400">
          {item.type}
        </span>
      </div>
      <p className="mt-3 text-xs text-stone-400">{item.whyNow}</p>
      <p className="mt-2 text-xs font-medium text-brand-300">{item.nextAction}</p>
    </Link>
  )
}

function ChangeGroupRow({ group }: { group: ReplayChangeGroup }) {
  const content = (
    <div className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-stone-900 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-200">{group.title}</p>
        <p className="mt-1 truncate text-xs text-stone-500">{group.detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-400">
          {group.count} changes
        </span>
        <time dateTime={group.lastChangedAt} className="text-xs text-stone-500">
          {formatReplayTime(group.lastChangedAt)}
        </time>
      </div>
    </div>
  )

  return group.href ? (
    <Link href={group.href} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}

function ReplayPeriodSection({ period }: { period: ReplayPeriod }) {
  const total = period.chefActionCount + period.clientSignalCount

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/60">
      <div className="flex items-center justify-between gap-4 border-b border-stone-800 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">{period.label}</h3>
          <p className="mt-1 text-xs text-stone-500">
            {period.chefActionCount} chef action{period.chefActionCount === 1 ? '' : 's'} and{' '}
            {period.clientSignalCount} client signal{period.clientSignalCount === 1 ? '' : 's'}
          </p>
        </div>
        <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-400">
          {total}
        </span>
      </div>
      {period.items.length > 0 ? (
        <div className="divide-y divide-stone-800">
          {period.items.map((item) => (
            <ReplayRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptySection text="No activity rows loaded for this filter." />
      )}
    </section>
  )
}

function ReplayRow({ item }: { item: ReplayItem }) {
  const content = (
    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-stone-900">
      <span
        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xxs font-semibold ${
          item.source === 'client'
            ? 'bg-brand-950 text-brand-300'
            : 'bg-emerald-950 text-emerald-300'
        }`}
      >
        {item.source === 'client' ? 'Client' : item.domainLabel}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-200">{item.label}</p>
        {item.detail && <p className="mt-1 truncate text-xs text-stone-500">{item.detail}</p>}
      </div>
      <time dateTime={item.createdAt} className="shrink-0 text-xs text-stone-500">
        {formatReplayTime(item.createdAt)}
      </time>
    </div>
  )

  return item.href ? (
    <Link href={item.href} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}

function actionMatchesFilter(item: ReplayActionItem, filter: ReplayFilter): boolean {
  if (filter === 'needs-action') return true
  if (filter === 'client') return item.category === 'client-signal'
  if (filter === 'money') return item.category === 'money'
  if (filter === 'prep') return item.category === 'prep'
  if (filter === 'quotes') return item.category === 'quote'
  if (filter === 'messages') return item.category === 'message'
  if (filter === 'history') return item.category === 'history'
  return true
}

function replayItemMatchesFilter(item: ReplayItem, filter: ReplayFilter): boolean {
  if (filter === 'hidden') return false
  if (filter === 'needs-action') return true
  if (filter === 'client') return item.source === 'client'
  if (filter === 'money') return item.domain === 'financial' || item.actionKey.includes('payment')
  if (filter === 'prep') return item.domain === 'event' || item.domain === 'menu'
  if (filter === 'quotes') return item.domain === 'quote' || item.actionKey.includes('quote')
  if (filter === 'messages')
    return item.domain === 'communication' || item.actionKey.includes('chat')
  if (filter === 'history') return true
  return true
}

function isHiddenByLocalState(
  id: string,
  states: Record<string, ReplayItemState>,
  now: Date
): boolean {
  const state = states[id]
  if (!state) return false
  if (state.status === 'handled') return true
  if (!state.snoozedUntil) return false
  return new Date(state.snoozedUntil).getTime() > now.getTime()
}

function formatCategory(category: ReplayActionCategory): string {
  return category.replace(/-/g, ' ')
}

function formatReplayTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
