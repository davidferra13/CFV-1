import Link from 'next/link'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import type { QueueItem } from '@/lib/queue/types'
import {
  getMobileChefDashboardData,
  type MobileChefDashboardData,
} from '@/lib/mobile/mobile-service'

export const metadata: Metadata = { title: 'Today' }

type LoadState<T> = { ok: true; value: T } | { ok: false }

function formatCalendarDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatClockTime(value: string | null): string | null {
  if (!value) return null
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`
}

function contextText(item: QueueItem): string {
  return [item.context.primaryLabel, item.context.secondaryLabel].filter(Boolean).join(' · ')
}

function PrimaryAction({ item }: { item: QueueItem }) {
  const detail = contextText(item)

  return (
    <section
      aria-labelledby="do-this-now"
      className="rounded-2xl border border-stone-700 bg-stone-950 px-5 py-5 text-stone-100 shadow-sm sm:px-6 sm:py-6"
    >
      <p
        id="do-this-now"
        className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400"
      >
        Your next step
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{item.title}</h1>
      {detail ? <p className="mt-2 text-sm text-stone-300 opacity-75">{detail}</p> : null}
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300 opacity-85">
        {item.description}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={item.href}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--action-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--action-fg)] transition-colors hover:bg-[var(--action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          Start
        </Link>
        {item.estimatedMinutes ? (
          <span className="text-sm text-stone-400">About {item.estimatedMinutes} min</span>
        ) : null}
      </div>
    </section>
  )
}

function QueueUnavailable() {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-5 text-amber-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Priorities unavailable
      </p>
      <h1 className="mt-2 text-xl font-semibold">Your priorities could not load.</h1>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Refresh to check your priorities again.
      </p>
      <a
        href="/dashboard"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--action-bg)] px-4 py-2 text-sm font-semibold text-[var(--action-fg)]"
      >
        Try again
      </a>
    </section>
  )
}

function CaughtUp() {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Your next step
      </p>
      <h1 className="mt-2 text-xl font-semibold">You’re all caught up.</h1>
      <p className="mt-2 text-sm text-emerald-800">
        Take a breath. Your next dinner is below when you need it.
      </p>
    </section>
  )
}

function NextDinner({ state }: { state: LoadState<MobileChefDashboardData> }) {
  if (!state.ok) {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">
          Next dinner
        </p>
        <p className="mt-2 text-sm text-stone-400">The schedule could not be read.</p>
      </section>
    )
  }

  const event = state.value.upcomingEvents[0]
  if (!event) {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">
          Next dinner
        </p>
        <p className="mt-2 text-sm font-medium text-stone-50">
          No upcoming dinner is on the books.
        </p>
        <Link href="/events" className="mt-2 inline-block text-sm font-semibold text-brand-400">
          Open events
        </Link>
      </section>
    )
  }

  const time = formatClockTime(event.serveTime)
  const title = event.occasion || event.clientName || 'Dinner'
  const detail = [
    formatCalendarDate(event.eventDate),
    time,
    event.clientName,
    event.guestCount ? `${event.guestCount} guests` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const readinessItems = [
    ['Prep', event.readiness.prep, `/events/${event.id}/prep-plan`],
    ['Groceries', event.readiness.grocery, `/events/${event.id}/grocery-run`],
    ['Timeline', event.readiness.timeline, `/events/${event.id}/schedule`],
    ['Packing', event.readiness.packing, `/events/${event.id}/pack`],
  ] as const
  const readyCount = readinessItems.filter(([, ready]) => ready).length

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">
        Next dinner
      </p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-stone-50">{title}</p>
          <p className="mt-1 text-sm leading-5 text-stone-300">{detail}</p>
        </div>
        <Link
          href={`/events/${event.id}`}
          className="shrink-0 text-sm font-semibold text-brand-400"
        >
          Open
        </Link>
      </div>
      <div className="mt-4 border-t border-stone-800 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Event readiness
          </p>
          <p
            className={`text-xs font-semibold ${
              readyCount === readinessItems.length ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {readyCount}/{readinessItems.length} ready
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {readinessItems.map(([label, ready, href]) => (
            <Link
              key={label}
              href={href}
              aria-label={`${label}: ${ready ? 'ready' : 'needs attention'}`}
              className={`inline-flex min-h-9 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:border-brand-700 hover:text-brand-300 ${
                ready
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-stone-700 bg-stone-950/60 text-stone-300'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">{ready ? '✓' : '○'}</span>
                {label}
              </span>
              <span aria-hidden="true" className="text-stone-500">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function AfterThis({ items }: { items: QueueItem[] }) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="after-this" className="px-1">
      <p
        id="after-this"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300"
      >
        After this
      </p>
      <ul className="mt-2 divide-y divide-stone-700">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex min-h-12 items-center justify-between gap-4 py-3 text-sm hover:text-brand-700"
            >
              <span className="min-w-0">
                <span className="block font-medium text-stone-50">{item.title}</span>
                {contextText(item) ? (
                  <span className="mt-0.5 block truncate text-stone-300">{contextText(item)}</span>
                ) : null}
              </span>
              <span aria-hidden="true" className="text-stone-300">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function ChefDashboard() {
  const user = await requireChef()

  const [queueState, scheduleState] = await Promise.all([
    getPriorityQueue()
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => {
        console.error('[Today] priority queue failed', error)
        return { ok: false as const }
      }),
    getMobileChefDashboardData(user.entityId)
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => {
        console.error('[Today] upcoming dinners failed', error)
        return { ok: false as const }
      }),
  ])

  const primary = queueState.ok ? queueState.value.nextAction : null
  const after = queueState.ok
    ? queueState.value.items
        .filter((item) => item.id !== primary?.id)
        .filter(
          (item, index, items) =>
            items.findIndex(
              (candidate) =>
                candidate.title === item.title && contextText(candidate) === contextText(item)
            ) === index
        )
        .slice(0, 2)
    : []
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      data-surface-mode="triage"
      className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <p className="text-2xl font-semibold tracking-tight text-stone-50">Today</p>
        <p className="text-sm text-stone-300">{today}</p>
      </header>

      {!queueState.ok ? (
        <QueueUnavailable />
      ) : primary ? (
        <PrimaryAction item={primary} />
      ) : (
        <CaughtUp />
      )}

      <NextDinner state={scheduleState} />
      <AfterThis items={after} />
    </div>
  )
}
