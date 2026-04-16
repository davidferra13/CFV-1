// Scheduled: Client-Facing Inquiry Follow-Up Emails (Q19)
// Sends "still reviewing" email to clients when their inquiry has been
// pending (status = new or awaiting_chef) for 48+ hours without a response.
// Prevents silent ghosting. Runs via cron.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

async function handleClientFollowup(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('inquiry-client-followup', async () => {
      const db = createServerClient({ admin: true })

      const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

      // Find inquiries that are still in "new" or "awaiting_chef" after 48 hours
      // and haven't had a client follow-up email sent yet
      const { data: staleInquiries, error } = await db
        .from('inquiries')
        .select(
          `id, tenant_id, client_email, client_name, confirmed_occasion,
          confirmed_event_date, created_at, metadata,
          chef:chefs!inner(business_name, display_name)`
        )
        .in('status', ['new', 'awaiting_chef'])
        .lte('created_at', cutoff48h)
        .is('deleted_at' as any, null)
        .limit(200)

      if (error) {
        console.error('[inquiry-client-followup] Query failed:', error)
        throw new Error('Failed to query stale inquiries')
      }

      if (!staleInquiries || staleInquiries.length === 0) {
        return { message: 'No stale inquiries', processed: 0, sent: 0, skipped: 0, errors: 0 }
      }

      const { sendEmail } = await import('@/lib/email/send')
      const { createElement, Fragment } = await import('react')
      const { Text } = await import('@react-email/components')
      const { BaseLayout } = await import('@/lib/email/templates/base-layout')

      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
      let sent = 0
      let skipped = 0
      let errors = 0

      for (const inquiry of staleInquiries) {
        try {
          // Skip if no client email
          if (!inquiry.client_email) {
            skipped++
            continue
          }

          // Skip if we already sent a follow-up (check metadata flag)
          const meta = (inquiry.metadata as Record<string, unknown>) || {}
          if (meta.client_followup_48h_sent) {
            skipped++
            continue
          }

          const chefName =
            (inquiry.chef as any)?.business_name ||
            (inquiry.chef as any)?.display_name ||
            'your chef'

          await sendEmail({
            to: inquiry.client_email,
            subject: `${chefName} is reviewing your inquiry`,
            react: createElement(BaseLayout, {
              preview: `${chefName} is still reviewing your inquiry`,
              children: createElement(
                Fragment,
                null,
                createElement(
                  Text,
                  { style: { fontSize: 15, color: '#374151', marginBottom: 16 } },
                  `Hi ${inquiry.client_name || 'there'},`
                ),
                createElement(
                  Text,
                  { style: { fontSize: 15, color: '#374151', marginBottom: 16 } },
                  `${chefName} is still reviewing your ${inquiry.confirmed_occasion || 'event'} inquiry. Private chefs often need a day or two to check availability and plan your experience.`
                ),
                createElement(
                  Text,
                  { style: { fontSize: 15, color: '#374151', marginBottom: 16 } },
                  'You will receive an email as soon as they respond with a quote or update.'
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
                            href: `${APP_URL}/my-bookings`,
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
                          'Check Inquiry Status'
                        )
                      )
                    )
                  )
                ),
                createElement(
                  Text,
                  { style: { fontSize: 13, color: '#6b7280' } },
                  'If you have questions in the meantime, you can message your chef directly from your inquiry page.'
                )
              ),
            }),
          })

          // Mark as sent in metadata to prevent duplicates
          await db
            .from('inquiries')
            .update({
              metadata: {
                ...meta,
                client_followup_48h_sent: true,
                client_followup_48h_at: new Date().toISOString(),
              },
            })
            .eq('id', inquiry.id)
            .eq('tenant_id', inquiry.tenant_id)

          sent++
        } catch (err) {
          console.error(`[inquiry-client-followup] Failed for inquiry ${inquiry.id}:`, err)
          await recordSideEffectFailure({
            source: 'inquiry-client-followup',
            operation: 'send_client_followup_email',
            severity: 'medium',
            tenantId: inquiry.tenant_id,
            entityType: 'inquiry',
            entityId: inquiry.id,
            errorMessage: err instanceof Error ? err.message : String(err),
          })
          errors++
        }
      }

      return { processed: staleInquiries.length, sent, skipped, errors }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[inquiry-client-followup] Cron failed:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export { handleClientFollowup as GET, handleClientFollowup as POST }
