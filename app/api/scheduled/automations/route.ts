// Scheduled Automations Cron
// GET /api/scheduled/automations — invoked by Vercel Cron Job (Vercel sends GET)
// POST /api/scheduled/automations — invoked manually or by external schedulers
// Evaluates time-based automation triggers every 15 minutes.
// Respects per-chef chef_automation_settings (enabled flags and thresholds).

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { evaluateAutomations } from '@/lib/automations/engine'
import { getAutomationSettingsForTenant } from '@/lib/automations/settings-actions'
import type { TriggerEvent } from '@/lib/automations/types'

async function handleAutomations(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })
  let evaluated = 0
  let timeTrackingReminders = 0
  const errors: string[] = []

  // ── 1. No-response timeout ──────────────────────────────────────────────
  // Fires for inquiries in awaiting_client with no activity for N days.
  // Each tenant can configure their own threshold (default 3 days).

  try {
    const { data: staleInquiries } = await supabase
      .from('inquiries')
      .select('id, tenant_id, status, channel, confirmed_occasion, last_response_at, client:clients(full_name)')
      .eq('status', 'awaiting_client')
      .not('last_response_at', 'is', null)

    for (const inquiry of staleInquiries || []) {
      try {
        const tenantSettings = await getAutomationSettingsForTenant(inquiry.tenant_id)

        if (!tenantSettings.no_response_alerts_enabled) continue

        const thresholdMs = tenantSettings.no_response_threshold_days * 24 * 60 * 60 * 1000
        const daysSince = Math.floor(
          (Date.now() - new Date(inquiry.last_response_at!).getTime()) / (24 * 60 * 60 * 1000)
        )

        if (Date.now() - new Date(inquiry.last_response_at!).getTime() < thresholdMs) continue

        const clientName = (inquiry.client as { full_name: string } | null)?.full_name || 'Unknown'
        await evaluateAutomations(inquiry.tenant_id, 'no_response_timeout', {
          entityId: inquiry.id,
          entityType: 'inquiry',
          fields: {
            status: inquiry.status,
            channel: inquiry.channel,
            client_name: clientName,
            days_since_last_contact: daysSince,
          },
        })
        evaluated++
      } catch (err) {
        errors.push(`no_response_timeout inquiry ${inquiry.id}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    errors.push(`no_response_timeout: ${(err as Error).message}`)
  }

  // ── 2. Event approaching ────────────────────────────────────────────────
  // Fires for confirmed/paid events within the tenant's configured window.
  // Deduplication in the engine prevents repeat fires within the cooldown window.

  try {
    const now = new Date()
    // Query up to 168h away (max configurable window); per-tenant filtering below
    const in168h = new Date(now.getTime() + 168 * 60 * 60 * 1000).toISOString()

    const { data: approachingEvents } = await supabase
      .from('events')
      .select('id, tenant_id, status, occasion, event_date, client:clients(full_name)')
      .in('status', ['confirmed', 'paid'])
      .gte('event_date', now.toISOString())
      .lte('event_date', in168h)

    for (const event of approachingEvents || []) {
      try {
        const tenantSettings = await getAutomationSettingsForTenant(event.tenant_id)

        if (!tenantSettings.event_approaching_alerts_enabled) continue

        const hoursUntil = Math.floor(
          (new Date(event.event_date!).getTime() - now.getTime()) / (60 * 60 * 1000)
        )

        // Only fire within this tenant's configured window
        if (hoursUntil > tenantSettings.event_approaching_hours) continue

        const clientName = (event.client as { full_name: string } | null)?.full_name || 'Unknown'
        await evaluateAutomations(event.tenant_id, 'event_approaching', {
          entityId: event.id,
          entityType: 'event',
          fields: {
            status: event.status,
            occasion: event.occasion,
            client_name: clientName,
            hours_until_event: hoursUntil,
          },
        })
        evaluated++
      } catch (err) {
        errors.push(`event_approaching event ${event.id}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    errors.push(`event_approaching: ${(err as Error).message}`)
  }

  // ── 3. Overdue follow-ups (custom rules only) ───────────────────────────
  // The built-in follow-up cron (/api/scheduled/follow-ups) handles the default
  // notification. This fires the custom rule engine for chefs with a
  // follow_up_overdue rule. Engine deduplication prevents double-firing.

  try {
    const { data: overdueInquiries } = await supabase
      .from('inquiries')
      .select('id, tenant_id, status, channel, confirmed_occasion, client:clients(full_name)')
      .eq('status', 'awaiting_client')
      .not('follow_up_due_at', 'is', null)
      .lte('follow_up_due_at', new Date().toISOString())

    for (const inquiry of overdueInquiries || []) {
      try {
        const clientName = (inquiry.client as { full_name: string } | null)?.full_name || 'Unknown'
        await evaluateAutomations(inquiry.tenant_id, 'follow_up_overdue', {
          entityId: inquiry.id,
          entityType: 'inquiry',
          fields: {
            status: inquiry.status,
            channel: inquiry.channel,
            occasion: inquiry.confirmed_occasion,
            client_name: clientName,
          },
        })
        evaluated++
      } catch (err) {
        errors.push(`follow_up_overdue inquiry ${inquiry.id}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    errors.push(`follow_up_overdue: ${(err as Error).message}`)
  }

  // ── 4. Time-tracking reminders ─────────────────────────────────────────
  // Gentle chef reminders for running timers and completion gaps.

  try {
    const { runTimeTrackingReminderSweep } = await import('@/lib/events/time-reminders')
    const reminderResult = await runTimeTrackingReminderSweep()
    timeTrackingReminders = reminderResult.runningReminders + reminderResult.completionReminders
    if (reminderResult.errors.length > 0) {
      errors.push(...reminderResult.errors)
    }
  } catch (err) {
    errors.push(`time_tracking_reminders: ${(err as Error).message}`)
  }

  return NextResponse.json({ evaluated, timeTrackingReminders, errors })
}

export { handleAutomations as GET, handleAutomations as POST }
