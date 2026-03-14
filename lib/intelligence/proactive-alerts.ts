'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProactiveAlert {
  id: string
  severity: 'critical' | 'warning' | 'info' | 'opportunity'
  icon: string // emoji
  title: string
  detail: string
  action: string
  link: string | null // route to navigate to
  category: string
}

export interface ProactiveAlertsResult {
  alerts: ProactiveAlert[]
  totalCount: number
  criticalCount: number
  opportunityCount: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

/**
 * Lightweight alert scanner — runs fast deterministic checks on core tables.
 * Unlike BusinessHealthSummary (which runs 13 engines), this does direct
 * targeted queries for the most actionable items only.
 */
export async function getProactiveAlerts(): Promise<ProactiveAlertsResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()
  const alerts: ProactiveAlert[] = []
  const now = new Date()

  // Run all checks in parallel
  const [overduePayments, unansweredInquiries, upcomingEvents, staleClients, unpaidEvents] =
    await Promise.all([
      // 1. Overdue payments
      supabase
        .from('invoices')
        .select('id, due_date, total_cents, client:clients(full_name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .lt('due_date', now.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5)
        .then((r: any) => r.data || [])
        .catch(() => []),

      // 2. Unanswered inquiries (>48h old, not converted)
      supabase
        .from('inquiries')
        .select('id, client_name, event_type, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'new')
        .lt('created_at', new Date(now.getTime() - 48 * 3600000).toISOString())
        .order('created_at', { ascending: true })
        .limit(5)
        .then((r: any) => r.data || [])
        .catch(() => []),

      // 3. Events in next 7 days missing key info
      supabase
        .from('events')
        .select('id, title, event_date, guest_count, menu_id, location_text')
        .eq('tenant_id', tenantId)
        .in('status', ['confirmed', 'accepted', 'paid'])
        .gte('event_date', now.toISOString().split('T')[0])
        .lte('event_date', new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(10)
        .then((r: any) => r.data || [])
        .catch(() => []),

      // 4. Clients with no event in 90+ days (top 5 by revenue)
      supabase
        .from('clients')
        .select('id, full_name')
        .eq('tenant_id', tenantId)
        .lt('last_event_date', new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0])
        .not('last_event_date', 'is', null)
        .order('lifetime_revenue_cents', { ascending: false })
        .limit(5)
        .then((r: any) => r.data || [])
        .catch(() => []),

      // 5. Completed events with no payment
      supabase
        .from('events')
        .select('id, title, event_date, quoted_price_cents, client:clients(full_name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .eq('payment_collected', false)
        .gt('quoted_price_cents', 0)
        .order('event_date', { ascending: false })
        .limit(5)
        .then((r: any) => r.data || [])
        .catch(() => []),
    ])

  // ─── Process Results ───

  // Overdue payments
  for (const inv of overduePayments) {
    const daysPast = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000)
    const clientName = inv.client?.full_name || 'Unknown'
    alerts.push({
      id: `overdue-${inv.id}`,
      severity: daysPast > 14 ? 'critical' : 'warning',
      icon: '💰',
      title: `$${Math.round(inv.total_cents / 100)} overdue from ${clientName}`,
      detail: `${daysPast} days past due`,
      action: 'Send payment reminder',
      link: `/events/${inv.id}`,
      category: 'Payments',
    })
  }

  // Unanswered inquiries
  for (const inq of unansweredInquiries) {
    const hoursOld = Math.floor((now.getTime() - new Date(inq.created_at).getTime()) / 3600000)
    alerts.push({
      id: `inquiry-${inq.id}`,
      severity: hoursOld > 72 ? 'critical' : 'warning',
      icon: '📩',
      title: `Unanswered inquiry from ${inq.client_name || 'Unknown'}`,
      detail: `${Math.floor(hoursOld / 24)} days waiting — ${inq.event_type || 'event'}`,
      action: 'Respond now',
      link: `/inquiries/${inq.id}`,
      category: 'Pipeline',
    })
  }

  // Upcoming events missing info
  for (const ev of upcomingEvents) {
    const missing: string[] = []
    if (!ev.menu_id) missing.push('menu')
    if (!ev.guest_count) missing.push('guest count')
    if (!ev.location_text) missing.push('location')

    if (missing.length > 0) {
      const daysUntil = Math.floor((new Date(ev.event_date).getTime() - now.getTime()) / 86400000)
      alerts.push({
        id: `prep-${ev.id}`,
        severity: daysUntil <= 2 ? 'critical' : 'warning',
        icon: '📋',
        title: `${ev.title || 'Event'} in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — missing ${missing.join(', ')}`,
        detail: `Event on ${ev.event_date}`,
        action: `Add ${missing[0]}`,
        link: `/events/${ev.id}`,
        category: 'Preparation',
      })
    }
  }

  // Stale clients
  if (staleClients.length > 0) {
    alerts.push({
      id: 'stale-clients',
      severity: 'opportunity',
      icon: '🔄',
      title: `${staleClients.length} client${staleClients.length > 1 ? 's' : ''} haven't booked in 90+ days`,
      detail: staleClients.map((c: any) => c.full_name).join(', '),
      action: 'Send re-engagement outreach',
      link: '/clients',
      category: 'Retention',
    })
  }

  // Unpaid completed events
  for (const ev of unpaidEvents) {
    const clientName = ev.client?.full_name || 'Unknown'
    alerts.push({
      id: `unpaid-${ev.id}`,
      severity: 'warning',
      icon: '⚠️',
      title: `$${Math.round(ev.quoted_price_cents / 100)} unpaid — ${ev.title || clientName}`,
      detail: `Completed on ${ev.event_date}`,
      action: 'Send invoice',
      link: `/events/${ev.id}`,
      category: 'Payments',
    })
  }

  // Sort: critical → warning → opportunity → info
  const severityOrder = { critical: 0, warning: 1, opportunity: 2, info: 3 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    alerts: alerts.slice(0, 20),
    totalCount: alerts.length,
    criticalCount: alerts.filter((a) => a.severity === 'critical').length,
    opportunityCount: alerts.filter((a) => a.severity === 'opportunity').length,
  }
}
