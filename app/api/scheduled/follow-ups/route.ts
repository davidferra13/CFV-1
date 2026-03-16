// Scheduled Follow-ups Cron Endpoint
// GET /api/scheduled/follow-ups - invoked by Vercel Cron Job (Vercel sends GET)
// POST /api/scheduled/follow-ups - invoked manually or by external schedulers
// Built-in: notifies chefs about overdue inquiry follow-ups.
// Respects chef_automation_settings.follow_up_reminders_enabled per tenant.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAutomationSettingsForTenant } from '@/lib/automations/settings-actions'
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

async function handleFollowUps(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })

  // Find inquiries with overdue follow-ups
  const { data: overdueInquiries, error } = await supabase
    .from('inquiries')
    .select(
      `
      id, tenant_id, status, follow_up_due_at, confirmed_occasion,
      client:clients(id, full_name)
    `
    )
    .eq('status', 'awaiting_client')
    .not('follow_up_due_at', 'is', null)
    .lte('follow_up_due_at', new Date().toISOString())

  if (error) {
    console.error('[Follow-ups Cron] Query failed:', error)
    return NextResponse.json({ error: 'Failed to query overdue follow-ups' }, { status: 500 })
  }

  if (!overdueInquiries || overdueInquiries.length === 0) {
    return NextResponse.json({ message: 'No overdue follow-ups', processed: 0 })
  }

  const { createNotification, getChefAuthUserId, getChefProfile } =
    await import('@/lib/notifications/actions')

  let notified = 0
  let skipped = 0
  let errors = 0

  for (const inquiry of overdueInquiries) {
    try {
      // ── Check chef's opt-in preference ────────────────────────────────
      const tenantSettings = await getAutomationSettingsForTenant(inquiry.tenant_id)

      if (!tenantSettings.follow_up_reminders_enabled) {
        skipped++
        continue
      }

      const chefUserId = await getChefAuthUserId(inquiry.tenant_id)
      if (!chefUserId) continue

      const clientName =
        (inquiry.client as { full_name: string } | null)?.full_name ?? 'Unknown contact'
      const occasion = inquiry.confirmed_occasion || 'inquiry'

      await createNotification({
        tenantId: inquiry.tenant_id,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'follow_up_due',
        title: 'Follow-up due',
        body: `Time to follow up with ${clientName} about their ${occasion}`,
        actionUrl: `/inquiries/${inquiry.id}`,
        inquiryId: inquiry.id,
        clientId: (inquiry.client as { id: string } | null)?.id || undefined,
      })

      // Email the chef about the overdue follow-up (non-blocking)
      try {
        const chefProfile = await getChefProfile(inquiry.tenant_id)
        if (chefProfile) {
          const { sendFollowUpDueChefEmail } = await import('@/lib/email/notifications')
          const daysOverdue = Math.floor(
            (Date.now() - new Date(inquiry.follow_up_due_at!).getTime()) / (1000 * 60 * 60 * 24)
          )
          await sendFollowUpDueChefEmail({
            chefEmail: chefProfile.email,
            chefName: chefProfile.name,
            clientName,
            occasion: inquiry.confirmed_occasion,
            followUpNote: null,
            daysOverdue,
            inquiryId: inquiry.id,
          })
        }
      } catch (emailErr) {
        console.error(
          `[Follow-ups Cron] Email failed for inquiry ${inquiry.id} (non-fatal):`,
          emailErr
        )
      }

      // Reschedule next follow-up using the tenant's configured interval
      const intervalMs = tenantSettings.follow_up_reminder_interval_hours * 60 * 60 * 1000
      await supabase
        .from('inquiries')
        .update({
          follow_up_due_at: new Date(Date.now() + intervalMs).toISOString(),
        })
        .eq('id', inquiry.id)
        .eq('tenant_id', inquiry.tenant_id)

      notified++
    } catch (err) {
      const error = err as Error
      console.error(`[Follow-ups Cron] Failed for inquiry ${inquiry.id}:`, error.message)
      errors++
    }
  }

  const result = { processed: overdueInquiries.length, notified, skipped, errors }
  await recordCronHeartbeat('follow-ups', result)
  return NextResponse.json(result)
}

export { handleFollowUps as GET, handleFollowUps as POST }
