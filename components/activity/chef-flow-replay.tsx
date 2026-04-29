import Link from 'next/link'
import { ContextCommandPanel } from '@/components/platform-shell/context-command-panel'
import type { ContextPanelSection } from '@/components/platform-shell/context-panel-types'
import type { ChefFlowReplay, ReplayItem, ReplayPeriod } from '@/lib/activity/replay-model'
import type { ResumeItem } from '@/lib/activity/chef-types'

type ChefFlowReplayViewProps = {
  replay: ChefFlowReplay
  failedSections: string[]
}

export function ChefFlowReplayView({ replay, failedSections }: ChefFlowReplayViewProps) {
  const hasFailures = failedSections.length > 0
  const hasReplayRows = replay.periods.some((period) => period.items.length > 0)
  const commandSections: ContextPanelSection[] = [
    {
      id: 'replay-resume',
      title: 'Resume',
      description:
        replay.resumeCount > 0
          ? 'Open work is available from existing resume suggestions.'
          : 'No in-progress resume suggestions are available.',
      state: replay.resumeCount > 0 ? 'populated' : 'empty',
      metrics: [{ label: 'Resume items', value: replay.resumeCount }],
      actions: [{ label: 'Open resume list', href: '#resume-now' }],
    },
    {
      id: 'replay-activity',
      title: 'Activity',
      description: hasFailures
        ? 'Some activity sections failed to load, so Replay is showing only available sources.'
        : 'Replay is built from chef activity and client portal signals.',
      state: hasFailures ? 'error' : hasReplayRows ? 'populated' : 'empty',
      metrics: [
        { label: 'Chef actions', value: replay.chefActionCount },
        { label: 'Client signals', value: replay.clientSignalCount },
      ],
      actions: [{ label: 'Open activity log', href: '/activity' }],
    },
    {
      id: 'replay-retrace',
      title: 'Retrace',
      description:
        replay.retraceSessionCount > 0
          ? 'Recent navigation sessions are ready for step-by-step retrace.'
          : 'No recent navigation sessions were loaded.',
      state: replay.retraceSessionCount > 0 ? 'populated' : 'empty',
      metrics: [{ label: 'Sessions', value: replay.retraceSessionCount }],
      actions: [{ label: 'Open retrace', href: '/activity?mode=retrace' }],
    },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-xxs font-semibold uppercase tracking-[0.2em] text-brand-400">
            ChefFlow Replay
          </p>
          <h1 className="mt-2 text-2xl font-bold text-stone-100">Replay your work</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-400">
            A source-backed continuity view of what changed, where clients showed up, and what is
            ready to resume.
          </p>
        </div>
        {hasFailures && (
          <div
            role="alert"
            className="rounded-lg border border-amber-700/70 bg-amber-950/30 p-4 text-sm text-amber-100"
          >
            <p className="font-semibold text-amber-50">Replay is partially loaded</p>
            <p className="mt-1 text-amber-100/80">
              Could not load {failedSections.join(', ')}. Available sections remain visible.
            </p>
          </div>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReplayMetric label="Resume items" value={replay.resumeCount} />
        <ReplayMetric label="Chef actions" value={replay.chefActionCount} />
        <ReplayMetric label="Client signals" value={replay.clientSignalCount} />
        <ReplayMetric label="Retrace sessions" value={replay.retraceSessionCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section
            id="resume-now"
            className="scroll-mt-6 rounded-lg border border-stone-800 bg-stone-950/60"
          >
            <div className="border-b border-stone-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-stone-200">Pick up now</h2>
              <p className="mt-1 text-xs text-stone-500">
                These are the strongest resume points from existing operational tables.
              </p>
            </div>
            {replay.resumeItems.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {replay.resumeItems.map((item) => (
                  <ResumeReplayRow key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-sm text-stone-500">
                No resume items are currently available.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-200">Replay by day</h2>
              <p className="mt-1 text-xs text-stone-500">
                Today, yesterday, and earlier this week are grouped from loaded activity rows.
              </p>
            </div>
            {replay.periods.map((period) => (
              <ReplayPeriodSection key={period.id} period={period} />
            ))}
          </section>

          <section className="rounded-lg border border-stone-800 bg-stone-950/60">
            <div className="border-b border-stone-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-stone-200">Retrace sessions</h2>
              <p className="mt-1 text-xs text-stone-500">
                Recent navigation sessions explain where work happened.
              </p>
            </div>
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
              <p className="px-4 py-6 text-sm text-stone-500">
                No retrace sessions are available for this period.
              </p>
            )}
          </section>
        </div>

        <ContextCommandPanel
          family="activity"
          title="Replay command"
          subtitle="Resume points, activity rows, and retrace sessions from existing sources."
          statusChips={[
            {
              label: hasFailures ? 'Partial' : 'Loaded',
              tone: hasFailures ? 'warning' : 'success',
            },
            { label: '7 days', tone: 'info' },
          ]}
          sections={commandSections}
        />
      </div>
    </div>
  )
}

function ReplayMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/60 px-4 py-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-100">{value}</p>
    </div>
  )
}

function ResumeReplayRow({ item }: { item: ResumeItem }) {
  return (
    <Link href={item.href} className="block px-4 py-3 transition-colors hover:bg-stone-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-200">{item.title}</p>
          <p className="mt-1 truncate text-xs text-stone-500">{item.subtitle}</p>
        </div>
        <span className="shrink-0 rounded border border-stone-700 px-2 py-0.5 text-xxs font-medium uppercase text-stone-400">
          {item.type}
        </span>
      </div>
    </Link>
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
        <p className="px-4 py-6 text-sm text-stone-500">No activity rows loaded for this period.</p>
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

function formatReplayTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
