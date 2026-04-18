'use server'

// Payment Reminder Actions
// Surfaces events with outstanding balances so the chef can follow up,
// and can be called by an automation evaluator to fire payment_due_approaching
// and payment_overdue notifications.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getAutomationSettingsForTenant } from '@/lib/automations/settings-internal'
import { differenceInDays } from 'date-fns'

export type OutstandingBalanceEvent = {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string | null
  outstandingBalanceCents: number
  daysUntilEvent: number // negative = past event
  status: string
}

/**
 * Returns all non-terminal events with an outstanding balance for the current chef.
 * Used in the UI and in payment reminder evaluation.
 */
export async function getEventsWithOutstandingBalances(): Promise<OutstandingBalanceEvent[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents, event_status, event_date, occasion, client_name')
    .eq('tenant_id', user.tenantId!)
    .gt('outstanding_balance_cents', 0)
    .not('event_status', 'in', '("completed","cancelled")')
    .order('event_date', { ascending: true })

  if (error || !data) return []

  const now = new Date()

  return data.map((row: any) => ({
    eventId: row.event_id,
    occasion: row.occasion ?? null,
    eventDate: row.event_date,
    clientName: row.client_name ?? null,
    outstandingBalanceCents: row.outstanding_balance_cents,
    daysUntilEvent: differenceInDays(new Date(row.event_date), now),
    status: row.event_status,
  }))
}

/**
 * Checks events against payment reminder thresholds and fires notifications.
 * Designed to be called by the automation cron or evaluator.
 * Does NOT send emails - fires internal notifications only.
 *
 * @param tenantId - Chef's tenant ID (used by admin cron; omit to use current session)
 */
export async function checkAndFirePaymentReminders(tenantId?: string): Promise<{ fired: number }> {
  let resolvedTenantId: string
  let recipientId: string | null = null

  if (tenantId) {
    resolvedTenantId = tenantId
  } else {
    const user = await requireChef()
    resolvedTenantId = user.tenantId!
    recipientId = user.id
  }

  const db: any = createServerClient({ admin: true })

  // Look up chef's user ID if not already known (needed for notification recipient)
  if (!recipientId) {
    const { data: chef } = await db
      .from('chefs')
      .select('user_id')
      .eq('id', resolvedTenantId)
      .single()
    recipientId = (chef as any)?.user_id ?? null
  }

  if (!recipientId) return { fired: 0 }

  const settings = await getAutomationSettingsForTenant(resolvedTenantId)

  if (!settings.payment_reminder_enabled && !settings.payment_overdue_alert_enabled) {
    return { fired: 0 }
  }

  // Fetch outstanding balances for this tenant
  const { data: rows } = await db
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents, event_status, event_date, occasion, client_name')
    .eq('tenant_id', resolvedTenantId)
    .gt('outstanding_balance_cents', 0)
    .not('event_status', 'in', '("completed","cancelled")')

  if (!rows || rows.length === 0) return { fired: 0 }

  const now = new Date()
  let fired = 0

  const { createNotification } = await import('@/lib/notifications/actions')

  for (const row of rows) {
    const daysUntil = differenceInDays(new Date(row.event_date), now)
    const balanceStr = `$${(row.outstanding_balance_cents / 100).toFixed(0)}`
    const eventLabel = row.occasion ?? 'Event'

    // Payment due approaching
    if (
      settings.payment_reminder_enabled &&
      daysUntil >= 0 &&
      daysUntil <= settings.payment_reminder_days_before
    ) {
      try {
        await createNotification({
          tenantId: resolvedTenantId,
          recipientId: recipientId!,
          category: 'payment',
          action: 'payment_due_approaching',
          title: 'Balance due soon',
          body: `${eventLabel} on ${row.event_date} - balance of ${balanceStr} due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
          eventId: row.event_id,
        })
        fired++
      } catch {
        // Non-blocking
      }
    }

    // Payment overdue
    if (
      settings.payment_overdue_alert_enabled &&
      daysUntil < 0 &&
      Math.abs(daysUntil) >= settings.payment_overdue_alert_days_after
    ) {
      try {
        await createNotification({
          tenantId: resolvedTenantId,
          recipientId: recipientId!,
          category: 'payment',
          action: 'payment_overdue',
          title: 'Balance overdue',
          body: `${eventLabel} - balance of ${balanceStr} is ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue.`,
          eventId: row.event_id,
        })
        fired++
      } catch {
        // Non-blocking
      }
    }
  }

  return { fired }
}
