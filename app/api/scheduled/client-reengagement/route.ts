// Scheduled: Client Re-Engagement Emails (Q56)
// Sends "we'd love to cook for you again" email to clients whose last
// completed event was 60-90 days ago. Runs weekly. Window-based dedup:
// clients only enter the 60-90 day window once per dormancy cycle.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

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
        return { sent: 0, skipped: 0 }
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

      const { sendEmail } = await import('@/lib/email/send')
      const { createElement, Fragment } = await import('react')
      const { Text } = await import('@react-email/components')
      const { BaseLayout } = await import('@/lib/email/templates/base-layout')

      let sent = 0
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

        try {
          await sendEmail({
            to: client.email,
            subject: `${chefName} would love to cook for you again`,
            react: createElement(BaseLayout, {
              preview: `It has been a while since your last dinner with ${chefName}`,
              children: createElement(
                Fragment,
                null,
                createElement(
                  Text,
                  { style: { fontSize: 15, color: '#374151', marginBottom: 16 } },
                  `Hi ${clientName},`
                ),
                createElement(
                  Text,
                  { style: { fontSize: 15, color: '#374151', marginBottom: 16 } },
                  `It has been a while since your last experience with ${chefName}, and we wanted to check in. Whether you are planning a celebration, a quiet dinner, or just craving a memorable meal, ${chefName} would be happy to hear from you.`
                ),
                createElement(
                  Text,
                  { style: { fontSize: 15, color: '#374151', marginBottom: 24 } },
                  'No pressure at all. Whenever you are ready, your chef is just a message away.'
                ),
                createElement(
                  'table',
                  { style: { width: '100%', marginBottom: 24 } },
                  createElement(
                    'tbody',
                    null,
                    createElement(
                      'tr',
                      null,
                      createElement(
                        'td',
                        { align: 'center' },
                        createElement(
                          'a',
                          {
                            href: `${APP_URL}/my-events`,
                            style: {
                              display: 'inline-block',
                              backgroundColor: '#e88f47',
                              color: '#18181b',
                              fontSize: 15,
                              fontWeight: 600,
                              padding: '12px 24px',
                              borderRadius: 8,
                              textDecoration: 'none',
                            },
                          },
                          'Plan Your Next Event'
                        )
                      )
                    )
                  )
                ),
                createElement(
                  Text,
                  { style: { fontSize: 12, color: '#9ca3af' } },
                  'You are receiving this because you previously booked through ChefFlow. To stop these emails, update your preferences in your client portal.'
                )
              ),
            }),
          })
          sent++
        } catch (err) {
          recordSideEffectFailure({
            source: 'cron',
            operation: 'client-reengagement-email',
            errorMessage: err instanceof Error ? err.message : String(err),
            severity: 'low',
          })
          skipped++
        }
      }

      return { sent, skipped }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[client-reengagement] Fatal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const GET = handleReengagement
export const POST = handleReengagement
