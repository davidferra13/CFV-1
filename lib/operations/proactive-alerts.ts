// Operations Proactive Alerts
// Deterministic checks for equipment maintenance, dietary accommodations,
// and stale data. No AI, pure database queries and date math.
// Runs on a daily cron via /api/scheduled/operations-check

'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type OpsAlertCandidate = {
  tenantId: string
  alertType: 'equipment_maintenance_due' | 'dietary_accommodation_check' | 'stale_data_digest'
  title: string
  body: string
  link: string
  metadata: Record<string, unknown>
}

// ── Equipment Maintenance (7-day warning) ────────────────────────────────

export async function checkEquipmentMaintenance(): Promise<OpsAlertCandidate[]> {
  const alerts: OpsAlertCandidate[] = []

  // Find equipment with maintenance_interval_days set
  const { data: items, error } = await supabaseAdmin
    .from('equipment_items')
    .select('id, chef_id, name, maintenance_interval_days, last_maintained_at, status')
    .not('maintenance_interval_days', 'is', null)
    .in('status', ['active', 'in_use'])

  if (error || !items) return alerts

  const now = Date.now()
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

  for (const item of items) {
    if (!item.maintenance_interval_days) continue

    const intervalMs = item.maintenance_interval_days * 24 * 60 * 60 * 1000
    const lastMaintained = item.last_maintained_at
      ? new Date(item.last_maintained_at).getTime()
      : null

    // If never maintained and interval is set, it's overdue
    if (!lastMaintained) {
      alerts.push({
        tenantId: item.chef_id,
        alertType: 'equipment_maintenance_due',
        title: `${item.name} needs maintenance`,
        body: `${item.name} has a ${item.maintenance_interval_days}-day maintenance schedule but has never been serviced.`,
        link: '/operations/equipment',
        metadata: {
          equipment_id: item.id,
          equipment_name: item.name,
          interval_days: item.maintenance_interval_days,
          overdue: true,
        },
      })
      continue
    }

    const nextDueAt = lastMaintained + intervalMs
    const daysUntilDue = Math.ceil((nextDueAt - now) / (24 * 60 * 60 * 1000))

    // Alert if due within 7 days or overdue
    if (nextDueAt - now <= SEVEN_DAYS_MS) {
      const overdue = daysUntilDue <= 0
      alerts.push({
        tenantId: item.chef_id,
        alertType: 'equipment_maintenance_due',
        title: overdue
          ? `${item.name} maintenance is overdue`
          : `${item.name} maintenance due in ${daysUntilDue} days`,
        body: overdue
          ? `${item.name} was last serviced ${Math.abs(daysUntilDue)} days ago and is past its ${item.maintenance_interval_days}-day schedule.`
          : `${item.name} is due for maintenance in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} (every ${item.maintenance_interval_days} days).`,
        link: '/operations/equipment',
        metadata: {
          equipment_id: item.id,
          equipment_name: item.name,
          interval_days: item.maintenance_interval_days,
          days_until_due: daysUntilDue,
          overdue,
        },
      })
    }
  }

  return alerts
}

// ── Dietary Accommodation Check (7-day warning) ─────────────────────────

export async function checkDietaryAccommodations(): Promise<OpsAlertCandidate[]> {
  const alerts: OpsAlertCandidate[] = []
  const now = new Date()
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  // Find upcoming events (next 7 days) with dietary restrictions or allergies
  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select(
      'id, tenant_id, occasion, event_date, guest_count, dietary_restrictions, allergies, client:clients(full_name)'
    )
    .gte('event_date', today)
    .lte('event_date', in7d)
    .not('status', 'in', '("cancelled","completed","draft")')
    .or('dietary_restrictions.neq.{},allergies.neq.{}')

  if (error || !events) return alerts

  for (const event of events as any[]) {
    const restrictions = event.dietary_restrictions ?? []
    const allergies = event.allergies ?? []

    // Only alert if there are actual restrictions or allergies to accommodate
    if (restrictions.length === 0 && allergies.length === 0) continue

    const clientName = event.client?.full_name ?? 'Client'
    const daysUntil = Math.ceil(
      (new Date(event.event_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    const dayLabel =
      daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`

    const items: string[] = []
    if (allergies.length > 0) items.push(`allergies: ${allergies.join(', ')}`)
    if (restrictions.length > 0) items.push(`dietary: ${restrictions.join(', ')}`)

    alerts.push({
      tenantId: event.tenant_id,
      alertType: 'dietary_accommodation_check',
      title: `Dietary check: ${event.occasion ?? 'Event'} ${dayLabel}`,
      body: `${clientName}'s event${event.guest_count ? ` (${event.guest_count} guests)` : ''} has ${items.join('; ')}. Confirm your menu accommodates these.`,
      link: `/events/${event.id}`,
      metadata: {
        event_id: event.id,
        event_date: event.event_date,
        allergies,
        dietary_restrictions: restrictions,
        guest_count: event.guest_count,
        days_until: daysUntil,
      },
    })
  }

  return alerts
}

// ── Stale Data Digest (weekly) ──────────────────────────────────────────

export async function checkStaleData(): Promise<OpsAlertCandidate[]> {
  const alerts: OpsAlertCandidate[] = []

  // Get all active tenants (chefs who have logged in within 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activeChefs } = await supabaseAdmin
    .from('chefs')
    .select('id')
    .gte('updated_at', thirtyDaysAgo)

  if (!activeChefs) return alerts

  for (const chef of activeChefs) {
    const issues: string[] = []

    // 1. Clients without email
    const { count: noEmailCount } = await supabaseAdmin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', chef.id)
      .or('email.is.null,email.eq.')

    if ((noEmailCount ?? 0) > 0) {
      issues.push(`${noEmailCount} client${noEmailCount !== 1 ? 's' : ''} missing email`)
    }

    // 2. Events in the past 90 days still in "draft" status (forgotten)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const { count: staleDraftCount } = await supabaseAdmin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', chef.id)
      .eq('status', 'draft')
      .lte('event_date', ninetyDaysAgo)

    if ((staleDraftCount ?? 0) > 0) {
      issues.push(`${staleDraftCount} past event${staleDraftCount !== 1 ? 's' : ''} still in draft`)
    }

    // 3. Inquiries older than 14 days still in "new" status
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { count: staleInquiryCount } = await supabaseAdmin
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', chef.id)
      .eq('status', 'new')
      .lte('created_at', fourteenDaysAgo)

    if ((staleInquiryCount ?? 0) > 0) {
      issues.push(
        `${staleInquiryCount} inquir${staleInquiryCount !== 1 ? 'ies' : 'y'} unanswered 14+ days`
      )
    }

    if (issues.length > 0) {
      alerts.push({
        tenantId: chef.id,
        alertType: 'stale_data_digest',
        title: 'Weekly data cleanup digest',
        body: `Items needing attention: ${issues.join(', ')}.`,
        link: '/dashboard',
        metadata: {
          issues,
          no_email_clients: noEmailCount ?? 0,
          stale_drafts: staleDraftCount ?? 0,
          stale_inquiries: staleInquiryCount ?? 0,
        },
      })
    }
  }

  return alerts
}
