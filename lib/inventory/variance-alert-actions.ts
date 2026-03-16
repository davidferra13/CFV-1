// Cost Variance Alert Server Actions
// Monitors food cost variance (actual vs estimated) and triggers
// notifications when thresholds are exceeded.
// Formula > AI: All calculations are deterministic.

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/actions'
import { calculateFoodCostPercentage } from '@/lib/finance/food-cost-calculator'

// ── Types ────────────────────────────────────────────────────────────────────

export type VarianceAlertSettings = {
  thresholdPct: number
  isEnabled: boolean
  notifyOnEventComplete: boolean
}

export type VarianceCheckResult = {
  eventId: string
  estimatedCostCents: number
  actualCostCents: number
  variancePct: number
  exceededThreshold: boolean
  notificationSent: boolean
}

// ── Settings CRUD ────────────────────────────────────────────────────────────

/**
 * Get the chef's variance alert settings.
 * Returns defaults if no settings exist yet.
 */
export async function getVarianceAlertSettings(): Promise<VarianceAlertSettings> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('variance_alert_settings')
    .select('threshold_pct, is_enabled, notify_on_event_complete')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (!data) {
    return { thresholdPct: 15, isEnabled: true, notifyOnEventComplete: true }
  }

  return {
    thresholdPct: data.threshold_pct,
    isEnabled: data.is_enabled,
    notifyOnEventComplete: data.notify_on_event_complete,
  }
}

/**
 * Update variance alert settings (upsert).
 */
export async function updateVarianceAlertSettings(
  settings: Partial<VarianceAlertSettings>
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: existing } = await supabase
    .from('variance_alert_settings')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  const payload: Record<string, any> = {}
  if (settings.thresholdPct !== undefined) payload.threshold_pct = settings.thresholdPct
  if (settings.isEnabled !== undefined) payload.is_enabled = settings.isEnabled
  if (settings.notifyOnEventComplete !== undefined)
    payload.notify_on_event_complete = settings.notifyOnEventComplete

  if (existing?.id) {
    const { error } = await supabase
      .from('variance_alert_settings')
      .update(payload)
      .eq('id', existing.id)

    if (error) throw new Error(`Failed to update variance settings: ${error.message}`)
  } else {
    const { error } = await supabase.from('variance_alert_settings').insert({
      chef_id: user.tenantId!,
      threshold_pct: settings.thresholdPct ?? 15,
      is_enabled: settings.isEnabled ?? true,
      notify_on_event_complete: settings.notifyOnEventComplete ?? true,
    })

    if (error) throw new Error(`Failed to create variance settings: ${error.message}`)
  }

  revalidatePath('/settings')
}

// ── Variance Check ───────────────────────────────────────────────────────────

/**
 * Check if an event's food cost variance exceeds the chef's threshold.
 * Call this after an event is completed or when grocery spend is finalized.
 *
 * Returns the check result. Sends a notification if threshold is exceeded
 * and alerts are enabled.
 */
export async function checkVarianceAlerts(eventId: string): Promise<VarianceCheckResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get alert settings
  const settings = await getVarianceAlertSettings()

  // Get event financial data
  const { data: event } = await supabase
    .from('events')
    .select('id, title, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // Get estimated food cost from menu
  const { data: menuCost } = await supabase
    .from('menu_cost_summary')
    .select('total_recipe_cost_cents')
    .eq('event_id', eventId)
    .maybeSingle()

  const estimatedCostCents = (menuCost?.total_recipe_cost_cents as number) ?? 0

  // Get actual grocery spend
  const { data: spendEntries } = await supabase
    .from('grocery_spend_entries')
    .select('amount_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  const actualCostCents = (spendEntries || []).reduce(
    (sum: number, entry: any) => sum + (entry.amount_cents || 0),
    0
  )

  // Calculate variance
  let variancePct = 0
  if (estimatedCostCents > 0) {
    variancePct =
      Math.round(((actualCostCents - estimatedCostCents) / estimatedCostCents) * 1000) / 10
  }

  const exceededThreshold = settings.isEnabled && variancePct > settings.thresholdPct
  let notificationSent = false

  // Send notification if threshold exceeded and alerts are enabled
  if (exceededThreshold && settings.notifyOnEventComplete) {
    try {
      const overBy = Math.round(variancePct - settings.thresholdPct)
      await createNotification({
        tenantId: user.tenantId!,
        recipientId: user.id,
        category: 'ops',
        action: 'event_completed',
        title: `Food cost alert: ${event.title}`,
        body: `Actual spend exceeded estimate by ${variancePct}% ($${(actualCostCents / 100).toFixed(2)} vs $${(estimatedCostCents / 100).toFixed(2)}). That's ${overBy}% above your ${settings.thresholdPct}% threshold.`,
        eventId,
        actionUrl: `/events/${eventId}`,
      })
      notificationSent = true
    } catch (err) {
      // Non-blocking: notification failure shouldn't throw
      console.error('[non-blocking] Failed to send variance alert notification', err)
    }
  }

  return {
    eventId,
    estimatedCostCents,
    actualCostCents,
    variancePct,
    exceededThreshold,
    notificationSent,
  }
}
