import Link from 'next/link'

import type {
  ChefLifeDashboardSynthesis,
  ChefLifeSynthesisDomain,
  ChefLifeSynthesisItem,
  ChefLifeSynthesisUrgency,
} from '@/lib/dashboard/chef-life-synthesis'
import { ArrowRight, BellOff, Clock, ExternalLink, ShieldCheck } from '@/components/ui/icons'

const DOMAIN_LABELS: Record<ChefLifeSynthesisDomain, string> = {
  capacity: 'Capacity',
  compliance: 'Compliance',
  event_readiness: 'Event readiness',
  financial_pressure: 'Financial pressure',
  crisis_recovery: 'Crisis recovery',
  vendor_risk: 'Vendor risk',
  household_unknowns: 'Household unknowns',
  strategy_misalignment: 'Strategy fit',
}

const URGENCY_STYLES: Record<
  ChefLifeSynthesisUrgency,
  { label: string; badge: string; border: string; icon: string }
> = {
  critical: {
    label: 'Critical',
    badge: 'border-red-500/50 bg-red-950/40 text-red-200',
    border: 'border-l-red-500',
    icon: 'text-red-300',
  },
  high: {
    label: 'This week',
    badge: 'border-amber-500/50 bg-amber-950/40 text-amber-100',
    border: 'border-l-amber-500',
    icon: 'text-amber-200',
  },
  watch: {
    label: 'Watch',
    badge: 'border-sky-500/40 bg-sky-950/30 text-sky-100',
    border: 'border-l-sky-500',
    icon: 'text-sky-200',
  },
  calm: {
    label: 'Calm',
    badge: 'border-stone-600 bg-stone-900 text-stone-200',
    border: 'border-l-stone-600',
    icon: 'text-stone-300',
  },
}

export function ChefLifeSynthesisRail({ data }: { data: ChefLifeDashboardSynthesis }) {
  return (
    <section className="space-y-3" aria-labelledby="chef-life-synthesis-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Peace of mind
          </p>
          <h2
            id="chef-life-synthesis-heading"
            className="mt-1 text-base font-semibold text-stone-100"
          >
            Chef Life Synthesis
          </h2>
        </div>
        <p className="max-w-full text-xs leading-relaxed text-stone-400 sm:max-w-md">
          {data.summary}
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-100">Nothing needs synthesis.</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                Capacity, compliance, readiness, money, recovery, vendors, households, and strategy
                have no today-or-this-week signal strong enough for this rail.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.items.map((item) => (
            <SynthesisItemCard key={`${item.domain}:${item.href}`} item={item} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px] leading-relaxed text-stone-500">
        <span className="rounded-full border border-stone-800 px-2.5 py-1">
          One item per domain
        </span>
        <span className="rounded-full border border-stone-800 px-2.5 py-1">
          Today and this week only
        </span>
        <span className="rounded-full border border-stone-800 px-2.5 py-1">
          Snooze until tomorrow or next week
        </span>
      </div>
    </section>
  )
}

function SynthesisItemCard({ item }: { item: ChefLifeSynthesisItem }) {
  const styles = URGENCY_STYLES[item.urgency]
  const Icon = item.urgency === 'critical' ? ShieldCheck : Clock

  return (
    <article
      className={`rounded-lg border border-stone-800 bg-stone-950/60 p-3.5 shadow-[var(--shadow-card)] border-l-2 ${styles.border}`}
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
              {DOMAIN_LABELS[item.domain]}
            </span>
            <span className="text-[10px] text-stone-500">
              {item.horizon === 'today' ? 'Today' : 'This week'}
            </span>
          </div>

          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold leading-snug text-stone-100">
              {item.title}
            </h3>
            <p className="mt-1 break-words text-xs leading-relaxed text-stone-400">{item.detail}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Link
              href={item.sourceHref}
              className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded-md border border-stone-800 px-2.5 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-700 hover:text-stone-100"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Source: {item.sourceLabel}</span>
            </Link>
            <Link
              href={item.href}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-950 transition-colors hover:bg-white"
            >
              Open
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] text-stone-500">
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-800 px-2 py-1">
              <Clock className="h-3 w-3" />
              Snooze: {item.controls.snoozeUntil === 'tomorrow' ? 'tomorrow' : 'next week'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-800 px-2 py-1">
              <BellOff className="h-3 w-3" />
              Ignore: until source changes
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ChefLifeSynthesisRailSkeleton() {
  return (
    <section className="space-y-3" aria-label="Chef Life Synthesis loading">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-stone-800" />
          <div className="h-5 w-44 animate-pulse rounded bg-stone-800" />
        </div>
        <div className="hidden h-4 w-56 animate-pulse rounded bg-stone-800 sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-lg border border-stone-800 bg-stone-950/60" />
        <div className="h-40 animate-pulse rounded-lg border border-stone-800 bg-stone-950/60" />
      </div>
    </section>
  )
}
