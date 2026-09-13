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
      className="rounded-2xl bg-[var(--text-primary)] px-5 py-5 text-[var(--text-inverse)] shadow-sm sm:px-6 sm:py-6"
    >
      <p
        id="do-this-now"
        className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300"
      >
        Do this now
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{item.title}</h1>
      {detail ? (
        <p className="mt-2 text-sm text-[var(--text-inverse)] opacity-75">{detail}</p>
      ) : null}
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-inverse)] opacity-85">
        {item.description}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={item.href}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
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
    <section className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-5 text-stone-50">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Priorities unavailable
      </p>
      <h1 className="mt-2 text-xl font-semibold">I could not read what needs you next.</h1>
      <p className="mt-2 text-sm leading-6 text-stone-200">
        Nothing was marked clear. Refresh to try the priority check again.
      </p>
      <a
        href="/dashboard"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--text-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)]"
      >
        Try again
      </a>
    </section>
  )
}

function CaughtUp() {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-stone-50">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Do this now
      </p>
      <h1 className="mt-2 text-xl font-semibold">Nothing needs you right now.</h1>
      <p className="mt-2 text-sm text-stone-700">
        You are caught up. Chef Flow is not adding busywork.
      </p>
    </section>
  )
}

function NextDinner({ state }: { state: LoadState<MobileChefDashboardData> }) {
  if (!state.ok) {
    return (
      <section className="rounded-xl border border-stone-700 bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">
          Next dinner
        </p>
        <p className="mt-2 text-sm text-stone-700">The schedule could not be read.</p>
      </section>
    )
  }

  const event = state.value.upcomingEvents[0]
  if (!event) {
    return (
      <section className="rounded-xl border border-stone-700 bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">
          Next dinner
        </p>
        <p className="mt-2 text-sm font-medium text-stone-50">
          No upcoming dinner is on the books.
        </p>
        <Link href="/events" className="mt-2 inline-block text-sm font-semibold text-brand-700">
          Open events
        </Link>
      </section>
    )
  }

  const time = formatClockTime(event.serveTime)
  const title = event.occasion || event.clientName || 'Dinner'
  const detail = [formatCalendarDate(event.eventDate), time, event.clientName]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="rounded-xl border border-stone-700 bg-white px-4 py-4">
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
          className="shrink-0 text-sm font-semibold text-brand-700"
        >
          Open
        </Link>
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
    ? queueState.value.items.filter((item) => item.id !== primary?.id).slice(0, 2)
    : []
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      data-surface-mode="triage"
      className="mx-auto w-full max-w-3xl space-y-4 px-3 py-3 sm:space-y-5 sm:px-5 sm:py-5"
    >
      <header className="flex items-baseline justify-between gap-4 px-1">
        <p className="text-lg font-semibold text-stone-50">Today</p>
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
