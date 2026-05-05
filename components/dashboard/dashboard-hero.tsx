// Dashboard Hero Zone - "Glance zone" for the chef's morning briefing
// Glass card with greeting, 4 key metrics, and optional next-event countdown.
// Server component wrapper; HeroMetricsClient handles client interactivity.

import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Calendar, DollarSign, MessageSquare, Clock } from '@/components/ui/icons'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { DashboardHeartbeat } from '@/components/dashboard/dashboard-heartbeat'

export type HeroData = {
  greeting: string
  timeOfDay: string
  firstName: string
  tenantId: string
  eventsThisWeek: number
  openInquiries: number
  outstandingCents: number
  nextEvent: {
    occasion: string
    clientName: string
    daysUntil: number
    href: string
  } | null
  supportBadge?: string | null
}

function formatCurrency(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function DashboardHero({ data }: { data: HeroData }) {
  const {
    greeting,
    timeOfDay,
    firstName,
    tenantId,
    eventsThisWeek,
    openInquiries,
    outstandingCents,
    nextEvent,
    supportBadge,
  } = data

  return (
    <Card variant="glass" className="relative overflow-hidden">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/20 via-transparent to-stone-950/40 pointer-events-none" />

      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        {/* Greeting row */}
        <div className="flex items-center gap-3 mb-1">
          <p className="text-sm text-stone-400 font-medium">
            Good {timeOfDay}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <DashboardHeartbeat tenantId={tenantId} />
          {supportBadge && (
            <span className="inline-flex items-center rounded-full border border-emerald-800 bg-emerald-950/60 px-2.5 py-1 text-xs font-medium text-emerald-300">
              {supportBadge}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-display text-stone-100 tracking-tight">
          {greeting}
        </h1>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <HeroMetricTile
            icon={Calendar}
            label="Events this week"
            value={String(eventsThisWeek)}
            href="/schedule"
          />
          <HeroMetricTile
            icon={MessageSquare}
            label="Open inquiries"
            value={String(openInquiries)}
            href="/inquiries"
            accent={openInquiries > 0}
          />
          <HeroMetricTile
            icon={DollarSign}
            label="Outstanding"
            value={formatCurrency(outstandingCents)}
            href="/finance/payments"
            accent={outstandingCents > 0}
          />
          {nextEvent ? (
            <Link href={nextEvent.href} className="group">
              <div className="flex items-start gap-3 rounded-xl bg-stone-800/40 border border-stone-700/40 px-4 py-3.5 transition-all group-hover:border-brand-700/40 group-hover:bg-stone-800/60">
                <div className="rounded-lg bg-brand-950/80 p-2 mt-0.5 shrink-0">
                  <Clock className="h-4 w-4 text-brand-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                    Next up
                  </p>
                  <p className="text-lg font-bold text-stone-100 tabular-nums mt-0.5">
                    {nextEvent.daysUntil === 0
                      ? 'Today'
                      : nextEvent.daysUntil === 1
                        ? 'Tomorrow'
                        : `${nextEvent.daysUntil} days`}
                  </p>
                  <p className="text-xs text-stone-400 truncate mt-0.5">
                    {nextEvent.occasion || nextEvent.clientName}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <HeroMetricTile icon={Clock} label="Next event" value="None" href="/events" />
          )}
        </div>
      </div>
    </Card>
  )
}

function HeroMetricTile({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href: string
  accent?: boolean
}) {
  return (
    <Link href={href} className="group">
      <div className="flex items-start gap-3 rounded-xl bg-stone-800/40 border border-stone-700/40 px-4 py-3.5 transition-all group-hover:border-brand-700/40 group-hover:bg-stone-800/60">
        <div className="rounded-lg bg-brand-950/80 p-2 mt-0.5 shrink-0">
          <Icon className="h-4 w-4 text-brand-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            {label}
          </p>
          <p
            className={`text-lg font-bold tabular-nums mt-0.5 ${
              accent ? 'text-amber-300' : 'text-stone-100'
            }`}
          >
            <AnimatedCounter value={value} />
          </p>
        </div>
      </div>
    </Link>
  )
}
