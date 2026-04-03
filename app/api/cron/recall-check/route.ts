// FDA Recall Check Cron
// GET /api/cron/recall-check - invoked daily via scheduled cron
// Trigger daily via scheduled cron: { "path": "/api/cron/recall-check", "schedule": "0 9 * * *" }

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { createNotification } from '@/lib/notifications/actions'
import { getActiveRecalls, matchRecallsToIngredients } from '@/lib/safety/recall-actions'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('recall-check', async () => {
      const db = createServerClient({ admin: true })
      let matchCount = 0
      let tenantCount = 0
      const errors: string[] = []
      const recalls = await getActiveRecalls()

      if (recalls.length === 0) {
        return {
          success: true,
          message: 'No active recalls found',
          tenantsChecked: 0,
          matchCount: 0,
          errors,
        }
      }

      const { data: tenants, error: tenantError } = await db.from('chefs').select('id').limit(10000)

      if (tenantError || !tenants) {
        throw new Error('Failed to fetch tenants')
      }

      for (const tenant of tenants) {
        try {
          const { data: ingredients } = await db
            .from('ingredients')
            .select('name')
            .eq('tenant_id', tenant.id)
            .limit(10000)

          if (!ingredients || ingredients.length === 0) continue

          const ingredientNames = ingredients.map((i: { name: string }) => i.name).filter(Boolean)
          const matches = await matchRecallsToIngredients(recalls, ingredientNames)

          if (matches.length === 0) continue

          matchCount += matches.length
          tenantCount++

          const { data: role } = await db
            .from('user_roles')
            .select('auth_user_id')
            .eq('entity_id', tenant.id)
            .eq('role', 'chef')
            .maybeSingle()

          if (!role?.auth_user_id) continue

          for (const recall of matches) {
            try {
              await createNotification({
                tenantId: tenant.id,
                recipientId: role.auth_user_id,
                category: 'protection',
                action: 'recall_alert_matched',
                title: 'FDA Recall Alert',
                body: `${recall.product_description} - ${recall.reason_for_recall}`.slice(0, 200),
                actionUrl: `https://api.fda.gov/food/enforcement.json?search=recall_number:${recall.id}`,
                metadata: {
                  kind: 'fda_recall_match',
                  recall_id: recall.id,
                },
              })
            } catch (notifErr) {
              console.warn(
                '[recall-check] Failed to create notification for tenant',
                tenant.id,
                notifErr
              )
            }
          }
        } catch (tenantErr) {
          errors.push(`Tenant ${tenant.id}: ${String(tenantErr)}`)
        }
      }

      return {
        success: true,
        tenantsChecked: tenantCount,
        matchCount,
        errors,
      }
    })

    return NextResponse.json({
      ...result,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (err) {
    console.error('[recall-check] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error', detail: String(err) }, { status: 500 })
  }
}
