'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DASHBOARD_WIDGET_LABELS,
  DASHBOARD_WIDGET_META,
  getWidgetIcon,
  getWidgetCategoryStyle,
  type DashboardWidgetId,
} from '@/lib/scheduling/types'
import { formatCurrency } from '@/lib/utils/currency'
import { rebookClient } from '@/lib/clients/rebook-actions'

interface Props {
  widgetId: string
  data: unknown
}

// Renders a widget card based on its ID and loaded data.
// For widgets that have data loaders, renders a rich card.
// For others, renders a styled placeholder with the widget name.
export function WidgetRenderer({ widgetId, data }: Props) {
  const label = DASHBOARD_WIDGET_LABELS[widgetId as DashboardWidgetId] || widgetId
  const icon = getWidgetIcon(widgetId)
  const style = getWidgetCategoryStyle(widgetId)

  // Try to render a data-driven widget
  const content = renderWidgetContent(widgetId, data)

  if (content) {
    return (
      <div
        className="rounded-2xl border bg-stone-900/80 p-4 h-full"
        style={{ borderColor: `${style.border}30` }}
      >
        {content}
      </div>
    )
  }

  // Fallback: styled card with widget name + link hint
  const meta = DASHBOARD_WIDGET_META[widgetId as DashboardWidgetId]
  const href = getWidgetHref(widgetId)

  const inner = (
    <div
      className="rounded-2xl border bg-stone-900/80 p-4 h-full flex flex-col items-start gap-2"
      style={{ borderColor: `${style.border}30`, background: style.bg }}
    >
      <span className="text-2xl">{icon}</span>
      <p className="text-sm font-semibold text-stone-200">{label}</p>
      <p className="text-xs text-stone-500">Tap to open</p>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    )
  }

  return inner
}

// ============================================
// WIDGET CONTENT RENDERERS
// ============================================

function renderWidgetContent(widgetId: string, data: unknown): React.ReactNode {
  switch (widgetId) {
    case 'payments_due':
      return <PaymentsDueContent data={data} />
    case 'expiring_quotes':
      return <ExpiringQuotesContent data={data} />
    case 'business_snapshot':
      return <BusinessSnapshotContent data={data} />
    case 'stuck_events':
      return <StuckEventsContent data={data} />
    case 'cooling_alerts':
      return <CoolingAlertsContent data={data} />
    case 'response_time':
      return <ResponseTimeContent data={data} />
    case 'pending_followups':
      return <PendingFollowupsContent data={data} />
    case 'invoice_pulse':
      return <InvoicePulseContent data={data} />
    default:
      return null
  }
}

// -- Payments Due --
function PaymentsDueContent({ data }: { data: unknown }) {
  const payments = data as any[]
  if (!Array.isArray(payments) || payments.length === 0) {
    return <EmptyWidget label="Payments Due" message="No outstanding payments" />
  }
  const total = payments.reduce((s, p) => s + (p.outstandingCents || 0), 0)
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">Payments Due</p>
          <p className="text-xs text-stone-500">{payments.length} outstanding</p>
        </div>
        <span className="text-sm font-bold text-amber-400">{formatCurrency(total)}</span>
      </div>
      <div className="space-y-1.5">
        {payments.slice(0, 4).map((p: any) => (
          <Link
            key={p.eventId}
            href={`/events/${p.eventId}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{p.occasion}</span>
            <span className="text-stone-400 shrink-0 ml-2">
              {formatCurrency(p.outstandingCents)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Expiring Quotes --
function ExpiringQuotesContent({ data }: { data: unknown }) {
  const quotes = data as any[]
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return <EmptyWidget label="Expiring Quotes" message="No quotes expiring soon" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Expiring Quotes</p>
      <p className="text-xs text-stone-500 mb-3">{quotes.length} expiring within 7 days</p>
      <div className="space-y-1.5">
        {quotes.slice(0, 4).map((q: any) => (
          <Link
            key={q.id}
            href={`/events/${q.event?.id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{q.event?.occasion || 'Quote'}</span>
            <span className="text-stone-400 shrink-0 ml-2">{formatCurrency(q.total_cents)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Business Snapshot --
function BusinessSnapshotContent({ data }: { data: unknown }) {
  const snap = data as { revenueCents?: number; expenseCents?: number; eventCount?: number }
  if (!snap || typeof snap !== 'object') return null
  const revenue = snap.revenueCents ?? 0
  const expenses = snap.expenseCents ?? 0
  const profit = revenue - expenses

  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-3">This Month</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-stone-500">Revenue</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Expenses</p>
          <p className="text-lg font-bold text-red-400">{formatCurrency(expenses)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Profit</p>
          <p className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(profit)}
          </p>
        </div>
      </div>
      <p className="text-xs text-stone-500 mt-2">{snap.eventCount ?? 0} events this month</p>
    </div>
  )
}

// -- Stuck Events --
function StuckEventsContent({ data }: { data: unknown }) {
  const events = data as any[]
  if (!Array.isArray(events) || events.length === 0) {
    return <EmptyWidget label="Stuck Events" message="No events stuck in pipeline" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Stuck Events</p>
      <p className="text-xs text-stone-500 mb-3">{events.length} need attention</p>
      <div className="space-y-1.5">
        {events.slice(0, 4).map((e: any) => (
          <Link
            key={e.id}
            href={`/events/${e.id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{e.occasion || 'Untitled'}</span>
            <span className="text-xs text-stone-500 shrink-0 ml-2">{e.status}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Cooling Alerts --
function CoolingAlertsContent({ data }: { data: unknown }) {
  const clients = data as any[]
  if (!Array.isArray(clients) || clients.length === 0) {
    return <EmptyWidget label="Cooling Clients" message="All client relationships are warm" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Cooling Clients</p>
      <p className="text-xs text-stone-500 mb-3">{clients.length} haven&apos;t booked in 60+ days</p>
      <div className="space-y-1.5">
        {clients.slice(0, 4).map((c: any) => (
          <div
            key={c.id}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <Link href={`/clients/${c.id}`} className="text-stone-300 truncate flex-1">
              {c.full_name}
            </Link>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs text-stone-500">
                Last: {c.last_event_date?.slice(0, 10) || 'N/A'}
              </span>
              <DashboardRebookButton clientId={c.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardRebookButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRebook() {
    startTransition(async () => {
      try {
        const result = await rebookClient(clientId)
        if (result.success && result.eventId) {
          router.push(`/events/${result.eventId}/edit`)
        } else {
          router.push(`/events/new?client_id=${clientId}`)
        }
      } catch {
        router.push(`/events/new?client_id=${clientId}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleRebook}
      disabled={isPending}
      className="text-[10px] font-medium text-brand-600 hover:text-brand-400 disabled:opacity-50"
    >
      {isPending ? '...' : 'Rebook'}
    </button>
  )
}

// -- Response Time --
function ResponseTimeContent({ data }: { data: unknown }) {
  const rt = data as { avgHours?: number; count?: number }
  if (!rt || typeof rt !== 'object') return null
  const hours = rt.avgHours ?? 0
  const color = hours <= 2 ? 'text-emerald-400' : hours <= 8 ? 'text-amber-400' : 'text-red-400'
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Response Time</p>
      <p className={`text-2xl font-bold ${color}`}>{hours}h</p>
      <p className="text-xs text-stone-500">avg across {rt.count ?? 0} inquiries</p>
    </div>
  )
}

// -- Pending Follow-ups --
function PendingFollowupsContent({ data }: { data: unknown }) {
  const items = data as any[]
  if (!Array.isArray(items) || items.length === 0) {
    return <EmptyWidget label="Pending Follow-ups" message="All caught up on follow-ups" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Pending Follow-ups</p>
      <p className="text-xs text-stone-500 mb-3">{items.length} overdue</p>
      <div className="space-y-1.5">
        {items.slice(0, 4).map((item: any) => (
          <Link
            key={item.id}
            href={`/inquiries/${item.id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{item.client_name || 'Unknown'}</span>
            <span className="text-xs text-stone-500 shrink-0 ml-2">{item.occasion || ''}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Invoice Pulse --
function InvoicePulseContent({ data }: { data: unknown }) {
  const pulse = data as { collectionRate?: number; totalInvoices?: number }
  if (!pulse || typeof pulse !== 'object') return null
  const rate = pulse.collectionRate ?? 0
  const color = rate >= 90 ? 'text-emerald-400' : rate >= 70 ? 'text-amber-400' : 'text-red-400'
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Invoice Collection</p>
      <p className={`text-2xl font-bold ${color}`}>{rate}%</p>
      <p className="text-xs text-stone-500">{pulse.totalInvoices ?? 0} total invoices</p>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function EmptyWidget({ label, message }: { label: string; message: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">{label}</p>
      <p className="text-xs text-stone-500">{message}</p>
    </div>
  )
}

// Maps widget IDs to their detail page hrefs
function getWidgetHref(widgetId: string): string | null {
  const hrefMap: Record<string, string> = {
    todays_schedule: '/calendar',
    week_strip: '/calendar',
    daily_plan: '/daily-plan',
    priority_queue: '/queue',
    dop_tasks: '/daily-plan',
    prep_prompts: '/daily-plan',
    payments_due: '/finance',
    expiring_quotes: '/events',
    business_snapshot: '/finance/reporting',
    revenue_comparison: '/finance/reporting',
    revenue_goal: '/finance/reporting',
    invoice_pulse: '/finance',
    stuck_events: '/events',
    pending_followups: '/inquiries',
    cooling_alerts: '/clients',
    response_time: '/inquiries',
    business_health: '/analytics',
    work_surface: '/daily-plan',
    onboarding_checklist: '/settings',
    live_inbox: '/messages',
    unread_hub_messages: '/hub',
    dietary_allergy_alerts: '/clients',
    client_birthdays: '/clients',
    food_cost_trend: '/finance/reporting',
    pipeline_forecast: '/finance/reporting',
    shopping_window: '/shopping',
    active_shopping_list: '/shopping',
    todo_list: '/tasks',
  }
  return hrefMap[widgetId] ?? null
}
