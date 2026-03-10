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
import type { DashboardWorkSurface } from '@/lib/workflow/types'
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
    case 'daily_plan':
      return <DailyPlanContent data={data} />
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
    case 'todays_schedule':
      return <TodaysScheduleContent data={data} />
    case 'dop_tasks':
      return <DopTasksContent data={data} />
    case 'prep_prompts':
      return <PrepPromptsContent data={data} />
    case 'active_shopping_list':
      return <ActiveShoppingListContent data={data} />
    case 'quick_expense':
      return <QuickExpenseContent data={data} />
    case 'dietary_allergy_alerts':
      return <DietaryAllergyContent data={data} />
    case 'food_cost_trend':
      return <FoodCostTrendContent data={data} />
    case 'revenue_goal':
      return <RevenueGoalContent data={data} />
    case 'staff_operations':
      return <StaffOperationsContent data={data} />
    case 'multi_event_days':
      return <MultiEventDaysContent data={data} />
    case 'pipeline_forecast':
      return <PipelineForecastContent data={data} />
    case 'client_birthdays':
      return <ClientBirthdaysContent data={data} />
    case 'dormant_clients_list':
      return <DormantClientsContent data={data} />
    case 'unread_hub_messages':
      return <UnreadHubMessagesContent data={data} />
    case 'overdue_installments':
      return <OverdueInstallmentsContent data={data} />
    case 'loyalty_approaching':
      return <LoyaltyApproachingContent data={data} />
    case 'scheduling_gaps':
      return <SchedulingGapsContent data={data} />
    case 'revenue_comparison':
      return <RevenueComparisonContent data={data} />
    case 'work_surface':
      return <WorkSurfaceContent data={data} />
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
      <p className="text-xs text-stone-500 mb-3">
        {clients.length} haven&apos;t booked in 60+ days
      </p>
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

// -- Today's Schedule --
function TodaysScheduleContent({ data }: { data: unknown }) {
  const events = data as any[]
  if (!Array.isArray(events) || events.length === 0) {
    return <EmptyWidget label="Today's Schedule" message="No events scheduled today" />
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-stone-100">Today&apos;s Schedule</p>
        <span className="text-xs text-stone-500">
          {events.length} event{events.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {events.slice(0, 5).map((e: any) => (
          <Link
            key={e.id}
            href={`/events/${e.id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1.5 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-stone-200 font-medium truncate">{e.occasion || 'Event'}</p>
              <p className="text-stone-500 truncate">
                {e.client?.full_name ?? ''} {e.guest_count ? `· ${e.guest_count} guests` : ''}
              </p>
            </div>
            <span className="text-stone-400 shrink-0 ml-2 font-mono">
              {e.serve_time?.slice(0, 5) || e.arrival_time?.slice(0, 5) || ''}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Daily Plan --
function DailyPlanContent({ data }: { data: unknown }) {
  const stats = data as {
    totalItems?: number
    completedItems?: number
    adminItems?: number
    prepItems?: number
    creativeItems?: number
    relationshipItems?: number
    estimatedMinutes?: number
  } | null

  if (!stats || (stats.totalItems ?? 0) === 0) {
    return <EmptyWidget label="Daily Plan" message="Nothing queued for today" />
  }

  const totalItems = stats.totalItems ?? 0
  const completedItems = stats.completedItems ?? 0
  const remainingItems = Math.max(totalItems - completedItems, 0)
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const estimatedMinutes = stats.estimatedMinutes ?? 0
  const laneCounts = [
    { label: 'Admin', value: stats.adminItems ?? 0 },
    { label: 'Prep', value: stats.prepItems ?? 0 },
    { label: 'Creative', value: stats.creativeItems ?? 0 },
    { label: 'Relationship', value: stats.relationshipItems ?? 0 },
  ].filter((lane) => lane.value > 0)

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">Daily Plan</p>
          <p className="text-xs text-stone-500">
            {remainingItems} remaining of {totalItems}
          </p>
        </div>
        <Link href="/daily" className="text-xs text-brand-400 hover:underline shrink-0">
          Open Daily Ops
        </Link>
      </div>

      <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${Math.min(100, completionPercent)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs mt-2">
        <span className="text-stone-400">{completionPercent}% complete</span>
        <span className="text-stone-500">
          ~
          {estimatedMinutes < 60
            ? `${estimatedMinutes} min`
            : `${Math.round((estimatedMinutes / 60) * 10) / 10}h`}
        </span>
      </div>

      {laneCounts.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {laneCounts.map((lane) => (
            <div key={lane.label} className="rounded-lg bg-stone-800/60 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wide text-stone-500">{lane.label}</p>
              <p className="text-sm font-semibold text-stone-200">{lane.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -- DOP Tasks --
function DopTasksContent({ data }: { data: unknown }) {
  const tasks = data as {
    upcomingEvents?: number
    pendingTasks?: number
    overdue?: number
    dueToday?: number
  }
  if (!tasks || typeof tasks !== 'object') return null
  const overdue = tasks.overdue ?? 0
  const dueToday = tasks.dueToday ?? 0
  const pending = tasks.pendingTasks ?? 0
  const color = overdue > 0 ? 'text-red-400' : dueToday > 0 ? 'text-amber-400' : 'text-emerald-400'
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Tasks</p>
      <p className={`text-2xl font-bold ${color}`}>{pending}</p>
      <p className="text-xs text-stone-500">
        {overdue > 0
          ? `${overdue} overdue`
          : dueToday > 0
            ? `${dueToday} due today`
            : 'All on track'}
        {tasks.upcomingEvents ? ` · ${tasks.upcomingEvents} upcoming events` : ''}
      </p>
    </div>
  )
}

// -- Work Surface --
function WorkSurfaceContent({ data }: { data: unknown }) {
  const surface = data as DashboardWorkSurface | null
  if (!surface || surface.summary.totalActiveEvents === 0) {
    return <EmptyWidget label="Work Surface" message="No active event work right now" />
  }

  const topItems = [...surface.fragile, ...surface.preparable, ...surface.blocked].slice(0, 4)

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">Work Surface</p>
          <p className="text-xs text-stone-500">
            {surface.summary.totalActiveEvents} active event
            {surface.summary.totalActiveEvents === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/dashboard#work-surface"
          className="text-xs text-brand-400 hover:underline shrink-0"
        >
          Open Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <SurfaceMetric label="Ready" value={surface.summary.totalPreparableActions} />
        <SurfaceMetric label="Blocked" value={surface.summary.totalBlockedActions} />
        <SurfaceMetric label="Fragile" value={surface.summary.totalFragileActions} accent />
      </div>

      {topItems.length === 0 ? (
        <p className="text-xs text-stone-500">All active work is optional or already resolved.</p>
      ) : (
        <div className="space-y-1.5">
          {topItems.map((item) => (
            <Link
              key={item.id}
              href={item.actionUrl}
              className="block rounded-lg border border-stone-800 bg-stone-800/50 px-3 py-2 hover:bg-stone-800 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-stone-200 truncate">{item.title}</p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {item.eventOccasion} · {item.actionLabel}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-medium shrink-0 ${
                    item.urgency === 'fragile'
                      ? 'text-amber-400'
                      : item.category === 'blocked'
                        ? 'text-red-400'
                        : 'text-emerald-400'
                  }`}
                >
                  {item.urgency === 'fragile'
                    ? 'Fragile'
                    : item.category === 'blocked'
                      ? 'Blocked'
                      : 'Ready'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SurfaceMetric({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-lg bg-stone-800/60 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`text-sm font-semibold ${accent ? 'text-amber-400' : 'text-stone-200'}`}>
        {value}
      </p>
    </div>
  )
}

// -- Prep Prompts --
function PrepPromptsContent({ data }: { data: unknown }) {
  const events = data as any[]
  if (!Array.isArray(events) || events.length === 0) {
    return <EmptyWidget label="Prep Prompts" message="No upcoming events need prep" />
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-stone-100">Prep This Week</p>
        <span className="text-xs text-stone-500">
          {events.length} event{events.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1.5">
        {events.slice(0, 4).map((e: any) => (
          <Link
            key={e.eventId}
            href={`/events/${e.eventId}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <div className="min-w-0">
              <span className="text-stone-300 truncate">{e.occasion}</span>
              <span className="text-stone-500 ml-1">({e.guestCount} guests)</span>
            </div>
            <span className="text-stone-500 shrink-0 ml-2">{formatShortDate(e.eventDate)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Active Shopping List --
function ActiveShoppingListContent({ data }: { data: unknown }) {
  const lists = data as any[]
  if (!Array.isArray(lists) || lists.length === 0) {
    return <EmptyWidget label="Shopping Lists" message="No active shopping lists" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Active Shopping Lists</p>
      <div className="space-y-1.5">
        {lists.slice(0, 4).map((l: any) => (
          <Link
            key={l.id}
            href={`/shopping/${l.id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{l.name || 'Shopping List'}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Quick Expense --
function QuickExpenseContent({ data }: { data: unknown }) {
  const exp = data as { recentExpenses?: any[]; totalCents?: number; count?: number }
  if (!exp || typeof exp !== 'object') return null
  const total = exp.totalCents ?? 0
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Recent Expenses</p>
      <p className="text-2xl font-bold text-red-400">{formatCurrency(total)}</p>
      <p className="text-xs text-stone-500">{exp.count ?? 0} expenses (last 30 days)</p>
      {(exp.recentExpenses || []).length > 0 && (
        <div className="mt-2 space-y-1">
          {exp.recentExpenses!.slice(0, 3).map((e: any) => (
            <div
              key={e.id}
              className="flex items-center justify-between text-[10px] text-stone-500"
            >
              <span className="truncate">{e.description || e.category || 'Expense'}</span>
              <span className="shrink-0 ml-2">{formatCurrency(Math.abs(e.amount_cents || 0))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -- Dietary / Allergy Alerts --
function DietaryAllergyContent({ data }: { data: unknown }) {
  const alerts = data as any[]
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return <EmptyWidget label="Dietary Alerts" message="No dietary concerns for upcoming events" />
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-stone-100">Dietary Alerts</p>
        <span className="text-xs text-amber-400">{alerts.length} upcoming</span>
      </div>
      <div className="space-y-1.5">
        {alerts.slice(0, 4).map((a: any) => (
          <Link
            key={a.eventId}
            href={`/events/${a.eventId}`}
            className="block text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-stone-300 truncate">{a.clientName}</span>
              <span className="text-stone-500 shrink-0 ml-2">{formatShortDate(a.eventDate)}</span>
            </div>
            <p className="text-[10px] text-amber-500/80 truncate mt-0.5">
              {a.allergies ? `Allergies: ${a.allergies}` : ''}
              {a.allergies && a.dietary ? ' · ' : ''}
              {a.dietary ? a.dietary : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Food Cost Trend --
function FoodCostTrendContent({ data }: { data: unknown }) {
  const trend = data as { avgFoodCostPercent?: number; eventCount?: number }
  if (!trend || typeof trend !== 'object') return null
  const pct = trend.avgFoodCostPercent ?? 0
  const color = pct <= 30 ? 'text-emerald-400' : pct <= 40 ? 'text-amber-400' : 'text-red-400'
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Food Cost</p>
      <p className={`text-2xl font-bold ${color}`}>{pct}%</p>
      <p className="text-xs text-stone-500">
        avg across {trend.eventCount ?? 0} events
        {pct <= 30 ? ' · Healthy range' : pct <= 40 ? ' · Watch closely' : ' · Above target'}
      </p>
    </div>
  )
}

// -- Revenue Goal --
function RevenueGoalContent({ data }: { data: unknown }) {
  const goal = data as { targetCents?: number; realizedCents?: number; progressPercent?: number }
  if (!goal || typeof goal !== 'object') return null
  const target = goal.targetCents ?? 0
  const realized = goal.realizedCents ?? 0
  const pct = goal.progressPercent ?? 0

  if (target === 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-stone-100 mb-1">Revenue Goal</p>
        <p className="text-xs text-stone-500">No monthly goal set</p>
        <Link href="/settings" className="text-xs text-brand-400 hover:underline mt-1 inline-block">
          Set a goal
        </Link>
      </div>
    )
  }

  const color = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-stone-400'
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Revenue Goal</p>
      <p className={`text-2xl font-bold ${color}`}>{pct}%</p>
      <div className="w-full h-1.5 bg-stone-700 rounded-full mt-2 mb-1">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-xs text-stone-500">
        {formatCurrency(realized)} of {formatCurrency(target)}
      </p>
    </div>
  )
}

// -- Staff Operations --
function StaffOperationsContent({ data }: { data: unknown }) {
  const ops = data as { activeStaff?: number; staffList?: any[]; upcomingAssignments?: number }
  if (!ops || typeof ops !== 'object') return null
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Staff</p>
      <p className="text-2xl font-bold text-stone-200">{ops.activeStaff ?? 0}</p>
      <p className="text-xs text-stone-500 mb-2">
        active members · {ops.upcomingAssignments ?? 0} upcoming assignments
      </p>
      {(ops.staffList || []).length > 0 && (
        <div className="space-y-1">
          {ops.staffList!.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between text-[10px]">
              <span className="text-stone-400 truncate">{s.name}</span>
              <span className="text-stone-600 shrink-0 ml-2">{s.role || ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -- Multi-Event Days --
function MultiEventDaysContent({ data }: { data: unknown }) {
  const days = data as any[]
  if (!Array.isArray(days) || days.length === 0) {
    return <EmptyWidget label="Multi-Event Days" message="No overlapping events ahead" />
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-stone-100">Multi-Event Days</p>
        <span className="text-xs text-amber-400">
          {days.length} day{days.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {days.slice(0, 3).map((d: any) => (
          <div key={d.date} className="text-xs">
            <p className="text-stone-300 font-medium">
              {formatShortDate(d.date)} ({d.eventCount} events)
            </p>
            <div className="ml-2 mt-0.5 space-y-0.5">
              {d.events.slice(0, 3).map((e: any) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="block text-stone-500 hover:text-stone-300 truncate"
                >
                  {e.serveTime?.slice(0, 5) || ''} {e.occasion} ({e.guestCount} guests)
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Pipeline Forecast --
function PipelineForecastContent({ data }: { data: unknown }) {
  const pipe = data as {
    proposedCents?: number
    acceptedCents?: number
    totalCents?: number
    count?: number
  }
  if (!pipe || typeof pipe !== 'object') return null
  const total = pipe.totalCents ?? 0
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Pipeline</p>
      <p className="text-2xl font-bold text-brand-400">{formatCurrency(total)}</p>
      <p className="text-xs text-stone-500 mb-2">{pipe.count ?? 0} active events</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-stone-500">Proposed</p>
          <p className="text-stone-300 font-medium">{formatCurrency(pipe.proposedCents ?? 0)}</p>
        </div>
        <div>
          <p className="text-stone-500">Accepted</p>
          <p className="text-stone-300 font-medium">{formatCurrency(pipe.acceptedCents ?? 0)}</p>
        </div>
      </div>
    </div>
  )
}

// -- Client Birthdays --
function ClientBirthdaysContent({ data }: { data: unknown }) {
  const birthdays = data as any[]
  if (!Array.isArray(birthdays) || birthdays.length === 0) {
    return <EmptyWidget label="Client Birthdays" message="No birthdays in the next 30 days" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Upcoming Birthdays</p>
      <div className="space-y-1.5">
        {birthdays.slice(0, 5).map((b: any) => (
          <Link
            key={b.id}
            href={`/clients/${b.id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{b.name}</span>
            <span className="text-stone-500 shrink-0 ml-2">
              {b.daysUntil === 0 ? 'Today!' : b.daysUntil === 1 ? 'Tomorrow' : `in ${b.daysUntil}d`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Dormant Clients --
function DormantClientsContent({ data }: { data: unknown }) {
  const clients = data as any[]
  if (!Array.isArray(clients) || clients.length === 0) {
    return <EmptyWidget label="Dormant Clients" message="No dormant clients" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Dormant Clients</p>
      <p className="text-xs text-stone-500 mb-3">{clients.length} inactive 90+ days</p>
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
              <span className="text-stone-500">
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

// -- Unread Hub Messages --
function UnreadHubMessagesContent({ data }: { data: unknown }) {
  const hub = data as { unreadCount?: number }
  if (!hub || typeof hub !== 'object') return null
  const count = hub.unreadCount ?? 0
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">Hub Messages</p>
      <p className={`text-2xl font-bold ${count > 0 ? 'text-brand-400' : 'text-stone-400'}`}>
        {count}
      </p>
      <p className="text-xs text-stone-500">{count > 0 ? 'unread messages' : 'All caught up'}</p>
    </div>
  )
}

// -- Overdue Installments --
function OverdueInstallmentsContent({ data }: { data: unknown }) {
  const items = data as any[]
  if (!Array.isArray(items) || items.length === 0) {
    return <EmptyWidget label="Overdue Installments" message="No overdue installments" />
  }
  const total = items.reduce((s, i) => s + (i.amount_cents || 0), 0)
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">Overdue Installments</p>
          <p className="text-xs text-stone-500">{items.length} overdue</p>
        </div>
        <span className="text-sm font-bold text-red-400">{formatCurrency(total)}</span>
      </div>
      <div className="space-y-1.5">
        {items.slice(0, 4).map((item: any) => (
          <Link
            key={item.id}
            href={`/events/${item.event?.id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{item.event?.occasion || 'Payment'}</span>
            <span className="text-stone-400 shrink-0 ml-2">
              {formatCurrency(item.amount_cents)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Loyalty Approaching --
function LoyaltyApproachingContent({ data }: { data: unknown }) {
  const clients = data as any[]
  if (!Array.isArray(clients) || clients.length === 0) {
    return <EmptyWidget label="Loyalty Progress" message="No clients close to next tier" />
  }
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-2">Approaching Next Tier</p>
      <div className="space-y-2">
        {clients.slice(0, 4).map((c: any) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="block text-xs hover:bg-stone-800 rounded px-1.5 py-1.5 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-stone-300 truncate">{c.name}</span>
              <span className="text-stone-500 shrink-0 ml-2">
                {c.remaining} pts to {c.nextTier}
              </span>
            </div>
            <div className="w-full h-1 bg-stone-700 rounded-full">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${c.progress}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Scheduling Gaps --
function SchedulingGapsContent({ data }: { data: unknown }) {
  const gaps = data as any[]
  if (!Array.isArray(gaps) || gaps.length === 0) {
    return <EmptyWidget label="Scheduling Gaps" message="All upcoming events have prep time set" />
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-stone-100">Scheduling Gaps</p>
        <span className="text-xs text-amber-400">{gaps.length} missing prep</span>
      </div>
      <div className="space-y-1.5">
        {gaps.slice(0, 4).map((g: any) => (
          <Link
            key={g.eventId}
            href={`/events/${g.eventId}`}
            className="flex items-center justify-between text-xs hover:bg-stone-800 rounded px-1.5 py-1 transition-colors"
          >
            <span className="text-stone-300 truncate">{g.occasion}</span>
            <span className="text-stone-500 shrink-0 ml-2">{formatShortDate(g.eventDate)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// -- Revenue Comparison --
function RevenueComparisonContent({ data }: { data: unknown }) {
  const cmp = data as { thisMonthCents?: number; lastMonthCents?: number; changePercent?: number }
  if (!cmp || typeof cmp !== 'object') return null
  const change = cmp.changePercent ?? 0
  const color = change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-stone-400'
  const arrow = change > 0 ? '+' : ''
  return (
    <div>
      <p className="text-sm font-semibold text-stone-100 mb-1">vs Last Month</p>
      <p className={`text-2xl font-bold ${color}`}>
        {arrow}
        {change}%
      </p>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div>
          <p className="text-stone-500">This month</p>
          <p className="text-stone-300 font-medium">{formatCurrency(cmp.thisMonthCents ?? 0)}</p>
        </div>
        <div>
          <p className="text-stone-500">Last month</p>
          <p className="text-stone-300 font-medium">{formatCurrency(cmp.lastMonthCents ?? 0)}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
    daily_plan: '/daily',
    priority_queue: '/queue',
    dop_tasks: '/daily',
    prep_prompts: '/culinary/prep',
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
    work_surface: '/dashboard#work-surface',
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
    quick_expense: '/finance/expenses',
    staff_operations: '/staff',
    multi_event_days: '/calendar',
    overdue_installments: '/finance',
    loyalty_approaching: '/clients',
    dormant_clients_list: '/clients',
    scheduling_gaps: '/calendar',
    client_birthdays: '/clients',
  }
  return hrefMap[widgetId] ?? null
}
