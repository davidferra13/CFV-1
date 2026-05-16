// Scheduled: Client Re-Engagement Emails (Q56)
// Creates AI-personalized re-engagement DRAFTS for clients whose last
// completed event was 60-90 days ago. Runs weekly. Window-based dedup:
// clients only enter the 60-90 day window once per dormancy cycle.
//
// AI BOUNDARY: Drafts are queued for chef review, NOT auto-sent.
// Chef is notified via in-app notification with one-tap send/dismiss.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import { generateReengagementDraft } from '@/lib/ai/reengagement-draft'
import { createNotification } from '@/lib/notifications/actions'

async function handleReengagement(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('client-reengagement', async () => {
      const db = createServerClient({ admin: true })

      // Find clients whose last completed event was 60-90 days ago
      // Window ensures each client gets exactly one re-engagement email per dormancy cycle
      const cutoff60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Query clients with last_event_date in the 60-90 day window
      // Exclude: deleted, demo, marketing unsubscribed, automated emails disabled
      const { data: clients } = await db
        .from('clients')
        .select('id, email, full_name, preferred_name, tenant_id, last_event_date')
        .is('deleted_at', null)
        .eq('is_demo', false)
        .eq('marketing_unsubscribed', false)
        .eq('automated_emails_enabled', true)
        .lte('last_event_date', cutoff60)
        .gte('last_event_date', cutoff90)
        .limit(50)

      if (!clients || clients.length === 0) {
        return { drafted: 0, skipped: 0 }
      }

      // Fetch chef display names for personalization
      const tenantIds = [...new Set(clients.map((c: any) => c.tenant_id).filter(Boolean))]
      const { data: chefs } = await db
        .from('chefs')
        .select('id, display_name, business_name')
        .in('id', tenantIds)

      const chefMap = new Map<string, { display_name: string; business_name: string | null }>()
      for (const chef of chefs || []) {
        chefMap.set(chef.id, { display_name: chef.display_name, business_name: chef.business_name })
      }

      let drafted = 0
      let skipped = 0

      for (const client of clients) {
        if (!client.email || !client.tenant_id) {
          skipped++
          continue
        }

        const chef = chefMap.get(client.tenant_id)
        if (!chef) {
          skipped++
          continue
        }

        const clientName = client.preferred_name || client.full_name || 'there'
        const chefName = chef.display_name || chef.business_name || 'your chef'
        const daysSince = Math.floor(
          (Date.now() - new Date(client.last_event_date + 'T00:00:00Z').getTime()) /
            (1000 * 60 * 60 * 24)
        )

        const { data: lastEvents } = await db
          .from('events')
          .select('occasion, guest_count')
          .eq('tenant_id', client.tenant_id)
          .eq('client_id', client.id)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .limit(1)
        const lastEvent = lastEvents?.[0]

        const aiDraft = await generateReengagementDraft({
          clientName,
          chefName,
          daysSinceLastEvent: daysSince,
          lastOccasion: lastEvent?.occasion,
          lastGuestCount: lastEvent?.guest_count,
        })

        const greeting = aiDraft?.greeting || `Hi ${clientName},`
        const bodyText =
          aiDraft?.body ||
          `It has been a while since your last experience with ${chefName}, and we wanted to check in. Whether you are planning a celebration, a quiet dinner, or just craving a memorable meal, ${chefName} would be happy to hear from you.`
        const subject = `${chefName} would love to cook for you again`

        try {
          await db.from('scheduled_messages').insert({
            tenant_id: client.tenant_id,
            client_id: client.id,
            channel: 'email',
            status: 'draft',
            subject,
            body: `${greeting}\n\n${bodyText}\n\nNo pressure at all. Whenever you are ready, your chef is just a message away.`,
            recipient_email: client.email,
            metadata: {
              type: 'reengagement',
              ai_generated: true,
              days_since_last_event: daysSince,
              last_occasion: lastEvent?.occasion || null,
            },
          })

          await createNotification({
            tenantId: client.tenant_id,
            recipientId: client.tenant_id,
            category: 'client',
            action: 'client_reengagement_draft' as any,
            title: `Re-engagement draft ready for ${clientName}`,
            body: `AI drafted a "we miss you" email for ${clientName} (${daysSince} days since last event). Review and send from your message center.`,
            actionUrl: `/clients/${client.id}?tab=messages`,
            clientId: client.id,
            metadata: { origin: 'ai', type: 'reengagement' },
          })

          drafted++
        } catch (err) {
          recordSideEffectFailure({
            source: 'cron',
            operation: 'client-reengagement-draft',
            errorMessage: err instanceof Error ? err.message : String(err),
            severity: 'low',
          })
          skipped++
        }
      }

      return { drafted, skipped }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[client-reengagement] Fatal error:', err)
    return NextResponse.json({ error: 'Reengagement processing failed' }, { status: 500 })
  }
}

export const GET = handleReengagement
export const POST = handleReengagement
