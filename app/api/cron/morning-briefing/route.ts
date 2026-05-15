// GET /api/cron/morning-briefing
// Generates a morning briefing for each tenant and stores it as a remy_alert.
// Called by scheduled cron daily at 7 AM EST. Deterministic - no LLM.

import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('cron-morning-briefing')
import { createAdminClient } from '@/lib/db/admin'
import { generateMorningBriefing } from '@/lib/ai/remy-morning-briefing'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { sendEmail } from '@/lib/email/send'
import { MorningBriefingEmail } from '@/lib/email/templates/morning-briefing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('morning-briefing', async () => {
      const dbAdmin = createAdminClient()
      const { data: tenants } = await dbAdmin.from('tenants').select('id').limit(100)

      if (!tenants || tenants.length === 0) {
        return { message: 'No tenants found', briefingsCreated: 0, errors: [] }
      }

      let created = 0
      const errors: string[] = []

      for (const tenant of tenants) {
        try {
          const briefingText = await generateMorningBriefing(tenant.id)
          const { error } = await dbAdmin.from('remy_alerts').insert({
            tenant_id: tenant.id,
            alert_type: 'morning_briefing',
            entity_type: null,
            entity_id: null,
            title: 'Morning Briefing',
            body: briefingText,
            priority: 'info',
          })

          if (!error) {
            created++
            // Deliver briefing via email too
            try {
              const { data: chef } = await dbAdmin
                .from('chefs')
                .select('email, display_name')
                .eq('id', tenant.id)
                .single()
              if (chef?.email) {
                sendEmail({
                  to: chef.email,
                  subject: 'Your Morning Briefing',
                  react: createElement(MorningBriefingEmail, {
                    chefName: chef.display_name || 'Chef',
                    briefingText: briefingText,
                    briefingUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/dashboard`,
                  }),
                }).catch((emailErr) => {
                  log.error(`Email failed for tenant ${tenant.id}`, { error: emailErr })
                })
              }
            } catch (emailErr) {
              // Non-blocking: alert was still created
              log.error(`Email lookup failed for tenant ${tenant.id}`, { error: emailErr })
            }
          }
        } catch (err) {
          log.error(`Briefing failed for tenant ${tenant.id}`, { error: err })
          errors.push(`${tenant.id}: briefing generation failed`)
        }
      }

      return {
        message: `Created ${created} morning briefings for ${tenants.length} tenants`,
        briefingsCreated: created,
        errors,
      }
    })

    return NextResponse.json({
      ...result,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (err) {
    log.error('Internal error', { error: err })
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
