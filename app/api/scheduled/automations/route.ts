// Scheduled Automations Cron
// POST /api/scheduled/automations — evaluates time-based automation triggers.
// Handles: follow_up_overdue, no_response_timeout, quote_expiring, event_approaching
// Runs every 15 minutes. Secured with CRON_SECRET.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { evaluateAutomations } from '@/lib/automations/engine'
import type { TriggerEvent } from '@/lib/automations/types'

export async function POST(request: NextRequest) {
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
  const errors: string[] = []

  // 1. Check for overdue follow-ups
  try {
    const { data: overdueInquiries } = await supabase
      .from('inquiries')
      .select('id, tenant_id, status, channel, confirmed_occasion, client:clients(full_name)')
      .eq('status', 'awaiting_client')
      .not('follow_up_due_at', 'is', null)
      .lte('follow_up_due_at', new Date().toISOString())

    for (const inquiry of overdueInquiries || []) {
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
    }
  } catch (err) {
    errors.push(`follow_up_overdue: ${(err as Error).message}`)
  }

  // 2. Check for no-response timeouts (inquiries awaiting client for >3 days)
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: staleInquiries } = await supabase
      .from('inquiries')
      .select('id, tenant_id, status, channel, confirmed_occasion, last_response_at, client:clients(full_name)')
      .eq('status', 'awaiting_client')
      .lte('last_response_at', threeDaysAgo)

    for (const inquiry of staleInquiries || []) {
      const clientName = (inquiry.client as { full_name: string } | null)?.full_name || 'Unknown'
      const daysSince = Math.floor(
        (Date.now() - new Date(inquiry.last_response_at!).getTime()) / (24 * 60 * 60 * 1000)
      )
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
    }
  } catch (err) {
    errors.push(`no_response_timeout: ${(err as Error).message}`)
  }

  // 3. Check for events approaching (within 48 hours)
  try {
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    const { data: approachingEvents } = await supabase
      .from('events')
      .select('id, tenant_id, status, occasion, event_date, client:clients(full_name)')
      .in('status', ['confirmed', 'paid'])
      .gte('event_date', now.toISOString())
      .lte('event_date', in48h)

    for (const event of approachingEvents || []) {
      const clientName = (event.client as { full_name: string } | null)?.full_name || 'Unknown'
      const hoursUntil = Math.floor(
        (new Date(event.event_date!).getTime() - now.getTime()) / (60 * 60 * 1000)
      )
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
    }
  } catch (err) {
    errors.push(`event_approaching: ${(err as Error).message}`)
  }

  return NextResponse.json({ evaluated, errors })
}
