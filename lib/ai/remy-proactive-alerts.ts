'use server'

// Remy - Proactive Alert Engine (Phase 2A)
// Deterministic rule engine that checks business conditions and generates alerts.
// NO LLM - pure database queries and conditional logic.
// Runs on a scheduled cron (every hour) or on-demand.

import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { getCurrentUser } from '@/lib/auth/get-user'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

interface AlertCandidate {
  alertType: string
  entityType?: string
  entityId?: string
  title: string
  body: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

// ─── Alert Rules ─────────────────────────────────────────────────────────────

async function checkMissingPrepList(db: any, tenantId: string): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = []
  const _n1 = new Date()
  const _li = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const in48h = _li(new Date(_n1.getFullYear(), _n1.getMonth(), _n1.getDate() + 2))
  const today = _li(_n1)

  const { data: events, error } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed","draft")')
    .gte('event_date', today)
    .lte('event_date', in48h)
    .eq('prep_list_ready', false)
    .limit(5)

  if (error) throw error

  for (const e of events ?? []) {
    const clientName = e.client?.full_name ?? 'Unknown'
    const daysUntil = Math.ceil(
      (new Date(e.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      alertType: 'missing_prep_list',
      entityType: 'event',
      entityId: e.id,
      title: `${e.occasion ?? 'Event'} needs a prep list`,
      body: `${e.occasion ?? 'Event'} for ${clientName} is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} - no prep list yet.`,
      priority: daysUntil <= 1 ? 'urgent' : 'high',
    })
  }
  return alerts
}

async function checkMissingGroceryList(db: any, tenantId: string): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = []
  const _n2 = new Date()
  const _li2 = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const in24h = _li2(new Date(_n2.getFullYear(), _n2.getMonth(), _n2.getDate() + 1))
  const today = _li2(_n2)

  const { data: events, error } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed","draft")')
    .gte('event_date', today)
    .lte('event_date', in24h)
    .eq('grocery_list_ready', false)
    .limit(5)

  if (error) throw error

  for (const e of events ?? []) {
    const clientName = e.client?.full_name ?? 'Unknown'
    alerts.push({
      alertType: 'missing_grocery_list',
      entityType: 'event',
      entityId: e.id,
      title: `${e.occasion ?? 'Event'} needs a grocery list`,
      body: `${e.occasion ?? 'Event'} for ${clientName} is tomorrow - grocery list not done.`,
      priority: 'urgent',
    })
  }
  return alerts
}

async function checkOverdueInvoices(db: any, tenantId: string): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = []
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invoices, error } = await db
    .from('invoices')
    .select('id, invoice_number, due_date, total_cents, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .lte('due_date', sevenDaysAgo)
    .limit(5)

  if (error) throw error

  for (const inv of invoices ?? []) {
    const clientName = inv.client?.full_name ?? 'Unknown'
    const daysOverdue = Math.floor(
      (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
    )
    const amount = (inv.total_cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })
    alerts.push({
      alertType: 'overdue_invoice',
      entityType: 'invoice',
      entityId: inv.id,
      title: `${clientName} invoice is ${daysOverdue}d overdue`,
      body: `Invoice ${inv.invoice_number ?? ''} for ${amount} from ${clientName} is ${daysOverdue} days overdue.`,
      priority: daysOverdue >= 14 ? 'urgent' : 'high',
    })
  }
  return alerts
}

async function checkStaleInquiries(db: any, tenantId: string): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = []
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: inquiries, error } = await db
    .from('inquiries')
    .select('id, lead_name, event_type, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_chef'])
    .lte('updated_at', twoDaysAgo)
    .limit(5)

  if (error) throw error

  for (const inq of inquiries ?? []) {
    const daysOld = Math.floor(
      (Date.now() - new Date(inq.updated_at ?? inq.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      alertType: 'stale_inquiry',
      entityType: 'inquiry',
      entityId: inq.id,
      title: `Inquiry from ${inq.lead_name ?? 'Unknown'} - ${daysOld}d old`,
      body: `New inquiry${inq.event_type ? ` for ${inq.event_type}` : ''} from ${inq.lead_name ?? 'Unknown'} - ${daysOld} days without a response.`,
      priority: daysOld >= 5 ? 'high' : 'normal',
    })
  }
  return alerts
}

async function checkPaymentReceived(db: any, tenantId: string): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = []
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: payments, error } = await db
    .from('ledger_entries')
    .select('id, amount_cents, created_at, event:events(id, occasion, client:clients(full_name))')
    .eq('tenant_id', tenantId)
    .eq('entry_type', 'payment')
    .gte('created_at', oneHourAgo)
    .limit(5)

  if (error) throw error

  for (const p of payments ?? []) {
    const clientName = p.event?.client?.full_name ?? 'Unknown'
    const occasion = p.event?.occasion ?? 'Event'
    const amount = (p.amount_cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })
    alerts.push({
      alertType: 'payment_received',
      entityType: 'event',
      entityId: p.event?.id,
      title: `${clientName} paid ${amount}`,
      body: `${clientName} paid ${amount} for ${occasion}.`,
      priority: 'normal',
    })
  }
  return alerts
}

async function checkClientBirthdays(db: any, tenantId: string): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = []
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Check clients with birthday in next 7 days (month/day comparison)
  const { data: clients, error } = await db
    .from('clients')
    .select('id, full_name, date_of_birth')
    .eq('tenant_id', tenantId)
    .not('date_of_birth', 'is', null)
    .limit(100)

  if (error) throw error

  for (const c of clients ?? []) {
    if (!c.date_of_birth) continue
    const dob = new Date(c.date_of_birth)
    const birthdayThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
    // Check if birthday is in the next 7 days
    if (birthdayThisYear >= now && birthdayThisYear <= in7Days) {
      const daysUntil = Math.ceil(
        (birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const dayLabel =
        daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
      alerts.push({
        alertType: 'client_birthday',
        entityType: 'client',
        entityId: c.id,
        title: `${c.full_name}'s birthday is ${dayLabel}`,
        body: `${c.full_name}'s birthday is ${dayLabel}. A quick note goes a long way.`,
        priority: daysUntil <= 1 ? 'high' : 'low',
      })
    }
  }
  return alerts
}

async function checkWeatherForEvents(tenantId: string): Promise<AlertCandidate[]> {
  try {
    const { getWeatherAlerts } = await import('@/lib/ai/remy-weather')
    const weatherResult = await getWeatherAlerts(tenantId)

    return weatherResult.alerts.map((w) => {
      const eventLabel = w.occasion ?? 'Event'
      const clientLabel = w.clientName ? ` for ${w.clientName}` : ''
      const dateLabel = new Date(w.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

      return {
        alertType: 'weather_warning',
        entityType: 'event',
        entityId: w.eventId,
        title: `Weather alert: ${eventLabel} on ${dateLabel}`,
        body: `${eventLabel}${clientLabel} @ ${w.location} - ${w.alertMessage} (${w.forecast.weatherDescription}, ${w.forecast.tempLowF}–${w.forecast.tempHighF}°F)`,
        priority:
          w.alertLevel === 'severe'
            ? ('urgent' as const)
            : w.alertLevel === 'warning'
              ? ('high' as const)
              : ('normal' as const),
      }
    })
  } catch (err) {
    await recordSideEffectFailure({
      source: 'remy-proactive-alerts',
      operation: 'check_weather_for_events',
      severity: 'low',
      tenantId,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

// ─── Alert Orchestrator ──────────────────────────────────────────────────────

async function isDuplicate(
  db: any,
  tenantId: string,
  alertType: string,
  entityId?: string
): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let query = db
    .from('remy_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('alert_type', alertType)
    .gte('created_at', oneDayAgo)

  if (entityId) query = query.eq('entity_id', entityId)

  const { count, error } = await query
  if (error) {
    await recordSideEffectFailure({
      source: 'remy-proactive-alerts',
      operation: 'dedupe_lookup',
      severity: 'medium',
      tenantId,
      entityType: 'alert',
      entityId: entityId ?? undefined,
      errorMessage: error.message,
      context: { alertType },
    })
    return false
  }
  return (count ?? 0) > 0
}

async function runRuleSafely(
  tenantId: string,
  operation: string,
  fn: () => Promise<AlertCandidate[]>
): Promise<AlertCandidate[]> {
  try {
    return await fn()
  } catch (err) {
    await recordSideEffectFailure({
      source: 'remy-proactive-alerts',
      operation,
      severity: 'medium',
      tenantId,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

export async function runAlertRules(tenantId: string): Promise<number> {
  // Tenant isolation: verify tenantId matches session when called from user context
  const sessionUser = await getCurrentUser()
  if (sessionUser && tenantId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  const db: any = createServerClient()

  // Run all rules in parallel
  const [
    prepAlerts,
    groceryAlerts,
    overdueAlerts,
    staleAlerts,
    paymentAlerts,
    birthdayAlerts,
    weatherAlerts,
  ] = await Promise.all([
    runRuleSafely(tenantId, 'check_missing_prep_list', () => checkMissingPrepList(db, tenantId)),
    runRuleSafely(tenantId, 'check_missing_grocery_list', () =>
      checkMissingGroceryList(db, tenantId)
    ),
    runRuleSafely(tenantId, 'check_overdue_invoices', () => checkOverdueInvoices(db, tenantId)),
    runRuleSafely(tenantId, 'check_stale_inquiries', () => checkStaleInquiries(db, tenantId)),
    runRuleSafely(tenantId, 'check_payment_received', () => checkPaymentReceived(db, tenantId)),
    runRuleSafely(tenantId, 'check_client_birthdays', () => checkClientBirthdays(db, tenantId)),
    runRuleSafely(tenantId, 'check_weather_for_events', () => checkWeatherForEvents(tenantId)),
  ])

  const allCandidates = [
    ...prepAlerts,
    ...groceryAlerts,
    ...overdueAlerts,
    ...staleAlerts,
    ...paymentAlerts,
    ...birthdayAlerts,
    ...weatherAlerts,
  ]

  let inserted = 0

  for (const alert of allCandidates) {
    // Deduplicate: don't re-alert for same condition within 24h
    const dupe = await isDuplicate(db, tenantId, alert.alertType, alert.entityId)
    if (dupe) continue

    const { error } = await db.from('remy_alerts').insert({
      tenant_id: tenantId,
      alert_type: alert.alertType,
      entity_type: alert.entityType,
      entity_id: alert.entityId,
      title: alert.title,
      body: alert.body,
      priority: alert.priority,
    })

    if (!error) {
      inserted++
      continue
    }

    await recordSideEffectFailure({
      source: 'remy-proactive-alerts',
      operation: 'insert_alert',
      severity: 'medium',
      tenantId,
      entityType: alert.entityType,
      entityId: alert.entityId,
      errorMessage: error.message,
      context: { alertType: alert.alertType, priority: alert.priority },
    })
  }

  return inserted
}

// ─── Alert Actions (for the UI) ──────────────────────────────────────────────

export async function getActiveAlerts(limit = 20) {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_alerts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Array<{
    id: string
    alert_type: string
    entity_type: string | null
    entity_id: string | null
    title: string
    body: string
    priority: string
    created_at: string
  }>
}

export async function dismissAlert(alertId: string) {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw error
}

export async function markAlertActedOn(alertId: string) {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_alerts')
    .update({
      acted_on_at: new Date().toISOString(),
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw error
}

// ─── Admin Batch Runner (cron use only) ─────────────────────────────────────

/**
 * Run alert rules for a specific tenant using the admin client.
 * Safe to call from cron endpoints with no user session.
 */
export async function runAlertRulesAdmin(tenantId: string): Promise<number> {
  const db: any = createAdminClient()

  const [prepAlerts, groceryAlerts, overdueAlerts, staleAlerts, birthdayAlerts, weatherAlerts] =
    await Promise.all([
      runRuleSafely(tenantId, 'check_missing_prep_list', () => checkMissingPrepList(db, tenantId)),
      runRuleSafely(tenantId, 'check_missing_grocery_list', () =>
        checkMissingGroceryList(db, tenantId)
      ),
      runRuleSafely(tenantId, 'check_overdue_invoices', () => checkOverdueInvoices(db, tenantId)),
      runRuleSafely(tenantId, 'check_stale_inquiries', () => checkStaleInquiries(db, tenantId)),
      runRuleSafely(tenantId, 'check_client_birthdays', () => checkClientBirthdays(db, tenantId)),
      runRuleSafely(tenantId, 'check_weather_for_events', () => checkWeatherForEvents(tenantId)),
    ])

  const allCandidates = [
    ...prepAlerts,
    ...groceryAlerts,
    ...overdueAlerts,
    ...staleAlerts,
    ...birthdayAlerts,
    ...weatherAlerts,
  ]

  let inserted = 0
  for (const alert of allCandidates) {
    const dupe = await isDuplicate(db, tenantId, alert.alertType, alert.entityId)
    if (dupe) continue

    const { error } = await db.from('remy_alerts').insert({
      tenant_id: tenantId,
      alert_type: alert.alertType,
      entity_type: alert.entityType,
      entity_id: alert.entityId,
      title: alert.title,
      body: alert.body,
      priority: alert.priority,
    })

    if (!error) inserted++
  }

  return inserted
}
