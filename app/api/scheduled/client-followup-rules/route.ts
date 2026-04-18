// Scheduled: Client Follow-Up Rules Evaluator
// Evaluates chef-configured follow-up rules (birthday, anniversary, dormancy thresholds)
// and creates notifications/reminders. Runs daily.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleFollowUpRules(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('client-followup-rules', async () => {
      const db = createServerClient({ admin: true })
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const todayMMDD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      // Fetch all enabled rules across all chefs
      const { data: rules, error: rulesError } = await db
        .from('client_followup_rules')
        .select('*')
        .eq('enabled', true)

      if (rulesError || !rules || rules.length === 0) {
        return { evaluated: 0, triggered: 0, errors: [] }
      }

      // Group rules by chef
      const rulesByChef = new Map<string, typeof rules>()
      for (const rule of rules) {
        const chefId = rule.chef_id
        if (!rulesByChef.has(chefId)) rulesByChef.set(chefId, [])
        rulesByChef.get(chefId)!.push(rule)
      }

      let evaluated = 0
      let triggered = 0
      const errors: string[] = []

      for (const [chefId, chefRules] of rulesByChef) {
        try {
          // Fetch active clients for this chef
          const { data: clients } = await db
            .from('clients')
            .select('id, full_name, birthday, anniversary, last_event_date, created_at')
            .eq('tenant_id', chefId)
            .is('deleted_at', null)

          if (!clients || clients.length === 0) continue

          for (const rule of chefRules) {
            for (const client of clients) {
              evaluated++
              let shouldTrigger = false
              let triggerReason = ''

              switch (rule.trigger_type) {
                case 'birthday': {
                  if (!client.birthday) break
                  const bday = new Date(client.birthday)
                  const bdayMMDD = `${String(bday.getMonth() + 1).padStart(2, '0')}-${String(bday.getDate()).padStart(2, '0')}`
                  shouldTrigger = bdayMMDD === todayMMDD
                  triggerReason = `Birthday today for ${client.full_name}`
                  break
                }
                case 'anniversary': {
                  if (!client.anniversary) break
                  const anniv = new Date(client.anniversary)
                  const annivMMDD = `${String(anniv.getMonth() + 1).padStart(2, '0')}-${String(anniv.getDate()).padStart(2, '0')}`
                  shouldTrigger = annivMMDD === todayMMDD
                  triggerReason = `Anniversary today for ${client.full_name}`
                  break
                }
                case 'no_booking_30d':
                case 'no_booking_60d':
                case 'no_booking_90d': {
                  const thresholdDays =
                    rule.trigger_type === 'no_booking_30d'
                      ? 30
                      : rule.trigger_type === 'no_booking_60d'
                        ? 60
                        : 90
                  const lastEvent = client.last_event_date ? new Date(client.last_event_date) : null
                  if (!lastEvent) break
                  const daysSince = Math.floor(
                    (now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60 * 24)
                  )
                  // Trigger on exact threshold day (not before, not repeated after)
                  shouldTrigger = daysSince === thresholdDays
                  triggerReason = `${thresholdDays} days since last booking for ${client.full_name}`
                  break
                }
              }

              if (shouldTrigger) {
                triggered++
                // Create a notification for the chef
                try {
                  const { createNotification } = await import('@/lib/notifications/actions')
                  await createNotification({
                    tenantId: chefId,
                    recipientId: chefId,
                    category: 'client',
                    action: 'followup_rule_triggered',
                    title: triggerReason,
                    body: rule.template_text || triggerReason,
                    actionUrl: `/clients/${client.id}`,
                    clientId: client.id,
                    metadata: {
                      rule_id: rule.id,
                      trigger_type: rule.trigger_type,
                      rule_action: rule.action,
                    },
                  })
                } catch (notifErr) {
                  console.error('[client-followup-rules] Notification failed:', notifErr)
                }
              }
            }
          }
        } catch (chefErr) {
          const msg = chefErr instanceof Error ? chefErr.message : String(chefErr)
          errors.push(`Chef ${chefId}: ${msg}`)
        }
      }

      return { evaluated, triggered, errors }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[client-followup-rules] Unexpected error:', err)
    return NextResponse.json({ error: 'Follow-up rules evaluation failed' }, { status: 500 })
  }
}

export { handleFollowUpRules as GET, handleFollowUpRules as POST }
