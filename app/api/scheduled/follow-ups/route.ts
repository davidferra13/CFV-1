// Scheduled Follow-ups Cron Endpoint
// GET /api/scheduled/follow-ups - invoked by scheduled cron Job (self-hosted sends GET)
// POST /api/scheduled/follow-ups - invoked manually or by external schedulers
// Built-in: notifies chefs about overdue inquiry follow-ups.
// Respects chef_automation_settings.follow_up_reminders_enabled per tenant.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { getAutomationSettingsForTenant } from '@/lib/automations/settings-internal'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { generateFollowUpSuggestion } from '@/lib/ai/follow-up-draft'

async function handleFollowUps(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('follow-ups', async () => {
      const db = createServerClient({ admin: true })

      const { data: overdueInquiries, error } = await db
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
        .limit(200)

      if (error) {
        console.error('[Follow-ups Cron] Query failed:', error)
        throw new Error('Failed to query overdue follow-ups')
      }

      if (!overdueInquiries || overdueInquiries.length === 0) {
        return {
          message: 'No overdue follow-ups',
          processed: 0,
          notified: 0,
          skipped: 0,
          errors: 0,
        }
      }

      const { createNotification, getChefAuthUserId, getChefProfile } =
        await import('@/lib/notifications/actions')

      let notified = 0
      let skipped = 0
      let errors = 0

      for (const inquiry of overdueInquiries) {
        try {
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
          const daysOverdue = Math.floor(
            (Date.now() - new Date(inquiry.follow_up_due_at!).getTime()) / (1000 * 60 * 60 * 24)
          )

          // AI: generate contextual follow-up suggestion (non-blocking)
          const aiSuggestion = await generateFollowUpSuggestion({
            clientName,
            occasion: inquiry.confirmed_occasion,
            daysOverdue,
          })

          const notifBody = aiSuggestion?.suggestion
            ? `${aiSuggestion.suggestion}`
            : `Time to follow up with ${clientName} about their ${occasion}`

          await createNotification({
            tenantId: inquiry.tenant_id,
            recipientId: chefUserId,
            category: 'inquiry',
            action: 'follow_up_due',
            title: 'Follow-up due',
            body: notifBody,
            actionUrl: `/inquiries/${inquiry.id}`,
            inquiryId: inquiry.id,
            clientId: (inquiry.client as { id: string } | null)?.id || undefined,
          })

          try {
            const chefProfile = await getChefProfile(inquiry.tenant_id)
            if (chefProfile) {
              const { sendFollowUpDueChefEmail } = await import('@/lib/email/notifications')
              await sendFollowUpDueChefEmail({
                chefEmail: chefProfile.email,
                chefName: chefProfile.name,
                clientName,
                occasion: inquiry.confirmed_occasion,
                followUpNote: aiSuggestion?.suggestion || null,
                daysOverdue,
                inquiryId: inquiry.id,
              })
            }
          } catch (emailErr) {
            console.error(
              `[Follow-ups Cron] Email failed for inquiry ${inquiry.id} (non-fatal):`,
              emailErr
            )
            await recordSideEffectFailure({
              source: 'follow-ups-cron',
              operation: 'send_follow_up_due_email',
              severity: 'medium',
              tenantId: inquiry.tenant_id,
              entityType: 'inquiry',
              entityId: inquiry.id,
              errorMessage: emailErr instanceof Error ? emailErr.message : String(emailErr),
            })
          }

          const intervalMs = tenantSettings.follow_up_reminder_interval_hours * 60 * 60 * 1000
          const nextFollowUpDueAt = new Date(Date.now() + intervalMs).toISOString()
          const { error: rescheduleError } = await db
            .from('inquiries')
            .update({
              follow_up_due_at: nextFollowUpDueAt,
            })
            .eq('id', inquiry.id)
            .eq('tenant_id', inquiry.tenant_id)

          if (rescheduleError) {
            await recordSideEffectFailure({
              source: 'follow-ups-cron',
              operation: 'reschedule_follow_up',
              severity: 'high',
              tenantId: inquiry.tenant_id,
              entityType: 'inquiry',
              entityId: inquiry.id,
              errorMessage: rescheduleError.message,
              context: { nextFollowUpDueAt },
            })
            throw new Error(`Failed to reschedule follow-up: ${rescheduleError.message}`)
          }

          notified++
        } catch (err) {
          const error = err as Error
          console.error(`[Follow-ups Cron] Failed for inquiry ${inquiry.id}:`, error.message)
          await recordSideEffectFailure({
            source: 'follow-ups-cron',
            operation: 'process_follow_up',
            severity: 'high',
            tenantId: inquiry.tenant_id,
            entityType: 'inquiry',
            entityId: inquiry.id,
            errorMessage: error.message,
          })
          errors++
        }
      }

      return { processed: overdueInquiries.length, notified, skipped, errors }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[follow-ups] Cron failed:', error)
    return NextResponse.json({ error: 'Failed to query overdue follow-ups' }, { status: 500 })
  }
}

export { handleFollowUps as GET, handleFollowUps as POST }
