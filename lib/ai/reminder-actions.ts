'use server'

// Proactive Nudges / Reminders — Server Actions
// PRIVACY: Uses client data + events → must stay local.
// Generates reminders from DB queries only — no LLM needed (pure SQL logic).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface RemyNudge {
  id: string
  type:
    | 'follow_up'
    | 'prep_reminder'
    | 'stale_inquiry'
    | 'payment_due'
    | 'review_request'
    | 'birthday'
    | 're_engagement'
    | 'overdue_invoice'
    | 'missing_prep_list'
    | 'missing_grocery_list'
    | 'weather_warning'
    | 'payment_received'
    | 'persistent_alert'
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
  actionLabel?: string
  actionHref?: string
  entityId?: string
  entityType?: 'event' | 'client' | 'inquiry' | 'invoice'
  createdAt: string
  /** Row id from remy_alerts table, if this nudge is persistent */
  persistentAlertId?: string
}

/**
 * Generate proactive nudges based on current business state.
 * Pure DB queries — no LLM, no hallucination risk, instant results.
 */
export async function getProactiveNudges(): Promise<RemyNudge[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!
  const now = new Date()
  const nudges: RemyNudge[] = []

  // 1. Stale inquiries (>48h without response)
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  const { data: staleInquiries } = await supabase
    .from('inquiries')
    .select('id, created_at, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'new')
    .lt('created_at', twoDaysAgo)
    .order('created_at', { ascending: true })
    .limit(5)

  for (const inq of staleInquiries ?? []) {
    const clientName = ((inq as any).client as any)?.full_name ?? 'Someone'
    nudges.push({
      id: `stale-inq-${inq.id}`,
      type: 'stale_inquiry',
      title: 'Inquiry needs attention',
      message: `${clientName}'s inquiry has been waiting ${Math.round((now.getTime() - new Date(inq.created_at).getTime()) / (1000 * 60 * 60))}h. First impressions matter, respond soon.`,
      priority: 'high',
      actionLabel: 'View inquiry',
      actionHref: `/inquiries/${inq.id}`,
      entityId: inq.id,
      entityType: 'inquiry',
      createdAt: now.toISOString(),
    })
  }

  // 2. Upcoming events needing prep (within 3 days, no prep notes)
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid'])
    .gte('event_date', today)
    .lte('event_date', threeDaysOut)
    .order('event_date', { ascending: true })
    .limit(5)

  for (const evt of upcomingEvents ?? []) {
    const clientName = ((evt as any).client as any)?.full_name ?? 'Client'
    const daysUntil = Math.ceil(
      (new Date((evt as any).event_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    nudges.push({
      id: `prep-${evt.id}`,
      type: 'prep_reminder',
      title: `${daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}: ${(evt as any).occasion ?? 'Event'}`,
      message: `${(evt as any).occasion ?? 'Event'} for ${clientName} (${(evt as any).guest_count ?? '?'} guests) is ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}. Time to finalize your prep.`,
      priority: daysUntil <= 1 ? 'high' : 'medium',
      actionLabel: 'View event',
      actionHref: `/events/${evt.id}`,
      entityId: evt.id,
      entityType: 'event',
      createdAt: now.toISOString(),
    })
  }

  // 3. Completed events needing follow-up (completed in last 7 days, no follow-up logged)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentCompleted } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', sevenDaysAgo)
    .order('event_date', { ascending: false })
    .limit(3)

  for (const evt of recentCompleted ?? []) {
    const clientName = ((evt as any).client as any)?.full_name ?? 'Client'
    nudges.push({
      id: `followup-${evt.id}`,
      type: 'follow_up',
      title: `Follow up with ${clientName}`,
      message: `${(evt as any).occasion ?? 'Event'} was recently completed. A quick thank-you note goes a long way.`,
      priority: 'medium',
      actionLabel: 'View event',
      actionHref: `/events/${evt.id}`,
      entityId: evt.id,
      entityType: 'event',
      createdAt: now.toISOString(),
    })
  }

  // 4. Dormant clients (no events in 90+ days)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: allClients } = await supabase
    .from('clients')
    .select('id, full_name, last_event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lt('last_event_date', ninetyDaysAgo)
    .order('last_event_date', { ascending: true })
    .limit(3)

  for (const client of allClients ?? []) {
    nudges.push({
      id: `dormant-${client.id}`,
      type: 're_engagement',
      title: `Re-engage ${(client as any).full_name ?? 'client'}`,
      message: `${(client as any).full_name ?? 'This client'} hasn't booked in a while. A friendly check-in could bring them back.`,
      priority: 'low',
      actionLabel: 'View client',
      actionHref: `/clients/${client.id}`,
      entityId: client.id,
      entityType: 'client',
      createdAt: now.toISOString(),
    })
  }

  // 5. Client anniversaries (first event was 1 year ago this week)
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const oneYearAgoWeekEnd = new Date(oneYearAgo.getTime() + 7 * 24 * 60 * 60 * 1000)
  const { data: anniversaryClients } = await supabase
    .from('events')
    .select('client_id, event_date, client:clients(id, full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', oneYearAgo.toISOString().split('T')[0])
    .lte('event_date', oneYearAgoWeekEnd.toISOString().split('T')[0])
    .limit(5)

  // Only keep the earliest event per client (their actual first event)
  const seenAnniversary = new Set<string>()
  for (const evt of anniversaryClients ?? []) {
    const clientId = (evt as any).client_id
    if (seenAnniversary.has(clientId)) continue
    seenAnniversary.add(clientId)
    const clientName = ((evt as any).client as any)?.full_name ?? 'Client'
    nudges.push({
      id: `anniversary-${clientId}`,
      type: 'follow_up',
      title: `1-year anniversary with ${clientName}`,
      message: `It's been a year since your first event with ${clientName}. A quick note to celebrate the milestone could mean a lot.`,
      priority: 'medium',
      actionLabel: 'View client',
      actionHref: `/clients/${clientId}`,
      entityId: clientId,
      entityType: 'client',
      createdAt: now.toISOString(),
    })
  }

  // 6. Merge persistent alerts from remy_alerts table (generated by cron)
  try {
    const { data: persistentAlerts } = await supabase
      .from('remy_alerts')
      .select('id, alert_type, entity_type, entity_id, title, body, priority, created_at')
      .eq('tenant_id', tenantId)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    const ephemeralIds = new Set(nudges.map((n) => n.entityId).filter(Boolean))
    const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
      urgent: 'high',
      high: 'high',
      normal: 'medium',
      low: 'low',
    }

    const alertTypeToHref: Record<
      string,
      (entityType?: string, entityId?: string) => string | undefined
    > = {
      overdue_invoice: (_t, id) => (id ? `/invoices/${id}` : undefined),
      missing_prep_list: (_t, id) => (id ? `/events/${id}` : undefined),
      missing_grocery_list: (_t, id) => (id ? `/events/${id}` : undefined),
      stale_inquiry: (_t, id) => (id ? `/inquiries/${id}` : undefined),
      client_birthday: (_t, id) => (id ? `/clients/${id}` : undefined),
      weather_warning: (_t, id) => (id ? `/events/${id}` : undefined),
      payment_received: (_t, id) => (id ? `/events/${id}` : undefined),
    }

    for (const alert of persistentAlerts ?? []) {
      // Skip if we already have an ephemeral nudge for the same entity
      if (alert.entity_id && ephemeralIds.has(alert.entity_id)) continue

      const hrefFn = alertTypeToHref[alert.alert_type]
      const actionHref = hrefFn?.(alert.entity_type, alert.entity_id)

      nudges.push({
        id: `alert-${alert.id}`,
        type: (alert.alert_type as RemyNudge['type']) ?? 'persistent_alert',
        title: alert.title,
        message: alert.body,
        priority: priorityMap[alert.priority] ?? 'medium',
        actionLabel: actionHref ? 'View' : undefined,
        actionHref,
        entityId: alert.entity_id ?? undefined,
        entityType: alert.entity_type as RemyNudge['entityType'],
        createdAt: alert.created_at,
        persistentAlertId: alert.id,
      })
    }
  } catch (err) {
    console.error('[nudges] Failed to load persistent alerts (non-fatal):', err)
  }

  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return nudges
}

/**
 * Dismiss a nudge. Persists to remy_alerts if it came from the persistent engine.
 */
export async function dismissNudge(nudgeId: string): Promise<{ success: boolean }> {
  // Persistent alerts: dismiss in the remy_alerts table
  if (nudgeId.startsWith('alert-')) {
    try {
      const user = await requireChef()
      const supabase: any = createServerClient()
      const alertId = nudgeId.replace('alert-', '')
      await supabase
        .from('remy_alerts')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', alertId)
        .eq('tenant_id', user.tenantId!)
    } catch (err) {
      console.error('[dismissNudge] Failed to persist dismissal:', err)
    }
  }
  // Ephemeral nudges: dismissal handled client-side via sessionStorage
  return { success: true }
}
