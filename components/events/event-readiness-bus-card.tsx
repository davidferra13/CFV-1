import Link from 'next/link'

import type {
  EventReadinessBus,
  EventReadinessCard,
  EventReadinessState,
} from '@/lib/events/event-readiness-bus'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from '@/components/ui/icons'

const STATE_STYLES: Record<
  EventReadinessState,
  { badge: string; border: string; icon: string; label: string }
> = {
  blocked: {
    badge: 'border-red-500/50 bg-red-950/40 text-red-100',
    border: 'border-l-red-500',
    icon: 'text-red-300',
    label: 'Blocked',
  },
  unknown: {
    badge: 'border-sky-500/50 bg-sky-950/40 text-sky-100',
    border: 'border-l-sky-500',
    icon: 'text-sky-300',
    label: 'Unknown',
  },
  warning: {
    badge: 'border-amber-500/50 bg-amber-950/40 text-amber-100',
    border: 'border-l-amber-500',
    icon: 'text-amber-300',
    label: 'Warning',
  },
  clear: {
    badge: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100',
    border: 'border-l-emerald-500',
    icon: 'text-emerald-300',
    label: 'Clear',
  },
}

export function EventReadinessBusCard({ bus }: { bus: EventReadinessBus | null }) {
  if (!bus) return null

  return (
    <section
      className="rounded-lg border border-stone-800 bg-stone-950/60 p-4"
      aria-labelledby="event-readiness-bus-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Readiness bus
          </p>
          <h2
            id="event-readiness-bus-heading"
            className="mt-1 break-words text-base font-semibold text-stone-100"
          >
            Event Readiness
          </h2>
          <p className="mt-1 break-words text-sm leading-relaxed text-stone-400">{bus.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CountPill label="Blockers" value={bus.counts.blocked} tone="text-red-200" />
          <CountPill label="Unknowns" value={bus.counts.unknown} tone="text-sky-200" />
          <CountPill label="Warnings" value={bus.counts.warning} tone="text-amber-200" />
          <CountPill label="Clear" value={bus.counts.clear} tone="text-emerald-200" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {bus.topCards.map((card) => (
          <ReadinessProgramCard key={card.program} card={card} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <IntegrationLink link={bus.integration.event} />
        <IntegrationLink link={bus.integration.dashboard} />
        <IntegrationLink link={bus.integration.rail} />
      </div>
    </section>
  )
}

function CountPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-[5rem] rounded-md border border-stone-800 bg-stone-900/60 px-2.5 py-2">
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p>
    </div>
  )
}

function ReadinessProgramCard({ card }: { card: EventReadinessCard }) {
  const styles = STATE_STYLES[card.state]
  const Icon =
    card.state === 'blocked' ? ShieldAlert : card.state === 'clear' ? CheckCircle2 : AlertTriangle

  return (
    <article
      className={`min-w-0 rounded-lg border border-stone-800 border-l-2 bg-stone-900/50 p-3.5 ${styles.border}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}
            >
              {styles.label}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              {card.programLabel}
            </span>
          </div>

          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold leading-snug text-stone-100">
              {card.title}
            </h3>
            <p className="mt-1 break-words text-xs leading-relaxed text-stone-400">{card.detail}</p>
          </div>

          <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-stone-500">Owner</dt>
              <dd className="break-words text-stone-300">{card.owner}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-stone-500">Due</dt>
              <dd className="break-words text-stone-300">
                {card.dueAt?.slice(0, 10) ?? 'No date'}
              </dd>
            </div>
          </dl>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Link
              href={card.sourceProof.href}
              className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded-md border border-stone-800 px-2.5 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-700 hover:text-stone-100"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Proof: {card.sourceProof.label}</span>
            </Link>
            <Link
              href={card.action.href}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-950 transition-colors hover:bg-white"
            >
              {card.action.label}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function IntegrationLink({ link }: { link: { label: string; href: string } }) {
  return (
    <Link
      href={link.href}
      className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-md border border-stone-800 px-3 py-2 text-xs font-semibold text-stone-300 transition-colors hover:border-stone-700 hover:text-stone-100"
    >
      <span className="truncate">{link.label}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
    </Link>
  )
}
