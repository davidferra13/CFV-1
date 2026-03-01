// Call Reminder Cron Endpoint
// GET /api/scheduled/call-reminders — invoked by Vercel Cron (every 30 min)
// POST /api/scheduled/call-reminders — manual invocation
//
// Sends chef reminder emails for calls happening in the next 24h or next 1h.
// Tracks sent reminders with reminder_24h_sent_at and reminder_1h_sent_at
// so each reminder fires at most once per call.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { CallType } from '@/lib/calls/actions'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

async function handleCallReminders(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const now = new Date()

  // ── 24-hour window ────────────────────────────────────────────────────────
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString()
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString()

  const { data: calls24h, error: err24 } = await supabase
    .from('scheduled_calls')
    .select(
      `
      id, tenant_id, call_type, title, scheduled_at, duration_minutes, timezone,
      contact_name, contact_company, reminder_24h_sent_at,
      client:clients(id, full_name, email)
    `
    )
    .in('status', ['scheduled', 'confirmed'])
    .gte('scheduled_at', window24hStart)
    .lte('scheduled_at', window24hEnd)
    .is('reminder_24h_sent_at', null)

  // ── 1-hour window ────────────────────────────────────────────────────────
  const window1hStart = new Date(now.getTime() + 45 * 60 * 1000).toISOString()
  const window1hEnd = new Date(now.getTime() + 75 * 60 * 1000).toISOString()

  const { data: calls1h, error: err1 } = await supabase
    .from('scheduled_calls')
    .select(
      `
      id, tenant_id, call_type, title, scheduled_at, duration_minutes, timezone,
      contact_name, contact_company, reminder_1h_sent_at,
      client:clients(id, full_name, email)
    `
    )
    .in('status', ['scheduled', 'confirmed'])
    .gte('scheduled_at', window1hStart)
    .lte('scheduled_at', window1hEnd)
    .is('reminder_1h_sent_at', null)

  if (err24) {
    console.error('[CallReminders] 24h query failed:', err24)
    return NextResponse.json({ error: 'Query failed (24h)' }, { status: 500 })
  }
  if (err1) {
    console.error('[CallReminders] 1h query failed:', err1)
    return NextResponse.json({ error: 'Query failed (1h)' }, { status: 500 })
  }

  const { sendEmail } = await import('@/lib/email/send')
  const { CallReminderEmail } = await import('@/lib/email/templates/call-reminder')

  let sent = 0
  let errors = 0

  // Helper: find the chef's auth email for a tenant
  async function getChefEmail(
    tenantId: string
  ): Promise<{ email: string; displayName: string } | null> {
    const { data } = await supabase
      .from('user_roles')
      .select('auth_user_id')
      .eq('entity_id', tenantId)
      .eq('role', 'chef')
      .single()

    if (!data) return null

    const { data: userData } = await supabase.auth.admin.getUserById(data.auth_user_id)
    if (!userData?.user?.email) return null

    // Get chef display name
    const { data: chef } = await supabase
      .from('chefs')
      .select('display_name')
      .eq('id', tenantId)
      .single()

    return {
      email: userData.user.email,
      displayName: (chef as any)?.display_name ?? 'Chef',
    }
  }

  // ── Send 24h reminders ───────────────────────────────────────────────────
  for (const call of calls24h ?? []) {
    try {
      const chef = await getChefEmail(call.tenant_id)
      if (!chef) continue

      await sendEmail({
        to: chef.email,
        subject: `Reminder: call tomorrow with ${(call.client as any)?.full_name ?? call.contact_name ?? call.contact_company ?? 'your contact'}`,
        react: CallReminderEmail({
          recipientName: chef.displayName,
          chefName: chef.displayName,
          callType: call.call_type as CallType,
          scheduledAt: call.scheduled_at,
          durationMinutes: call.duration_minutes,
          title: call.title ?? null,
          isChefReminder: true,
          hoursUntil: 24,
        }),
      })

      await supabase
        .from('scheduled_calls')
        .update({ reminder_24h_sent_at: new Date().toISOString() })
        .eq('id', call.id)
        .eq('tenant_id', call.tenant_id)

      sent++
    } catch (err) {
      console.error(`[CallReminders] 24h reminder failed for call ${call.id}:`, err)
      errors++
    }
  }

  // ── Send 1h reminders ────────────────────────────────────────────────────
  for (const call of calls1h ?? []) {
    try {
      const chef = await getChefEmail(call.tenant_id)
      if (!chef) continue

      await sendEmail({
        to: chef.email,
        subject: `Your call starts in 1 hour`,
        react: CallReminderEmail({
          recipientName: chef.displayName,
          chefName: chef.displayName,
          callType: call.call_type as CallType,
          scheduledAt: call.scheduled_at,
          durationMinutes: call.duration_minutes,
          title: call.title ?? null,
          isChefReminder: true,
          hoursUntil: 1,
        }),
      })

      await supabase
        .from('scheduled_calls')
        .update({ reminder_1h_sent_at: new Date().toISOString() })
        .eq('id', call.id)
        .eq('tenant_id', call.tenant_id)

      sent++
    } catch (err) {
      console.error(`[CallReminders] 1h reminder failed for call ${call.id}:`, err)
      errors++
    }
  }

  return NextResponse.json({
    processed_24h: (calls24h ?? []).length,
    processed_1h: (calls1h ?? []).length,
    sent,
    errors,
  })
}

export { handleCallReminders as GET, handleCallReminders as POST }
