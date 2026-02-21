// FDA Recall Check Cron
// GET /api/cron/recall-check — invoked daily via Vercel Cron
// Trigger daily via Vercel Cron: { "path": "/api/cron/recall-check", "schedule": "0 9 * * *" }
//
// Note: This is a simplified implementation. In production, add proper API key
// authentication for the cron endpoint using CRON_SECRET in the Authorization header.
//
// Fetches active FDA food recalls and matches against recipe ingredients per tenant.
// Creates in-app notifications for matches. Requires no DB table — reads recipes,
// writes notifications.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveRecalls, matchRecallsToIngredients } from '@/lib/safety/recall-actions'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If CRON_SECRET is set, validate it. If not configured, allow (dev environment)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })
  let matchCount = 0
  let tenantCount = 0
  const errors: string[] = []

  try {
    // 1. Fetch active FDA recalls once for all tenants
    const recalls = await getActiveRecalls()

    if (recalls.length === 0) {
      return NextResponse.json({ success: true, message: 'No active recalls found', matchCount: 0 })
    }

    // 2. Get all tenants with active recipe ingredients
    const { data: tenants, error: tenantError } = await supabase.from('chefs').select('id')

    if (tenantError || !tenants) {
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }

    for (const tenant of tenants) {
      try {
        // 3. Get this tenant's ingredient names
        const { data: ingredients } = await supabase
          .from('ingredients')
          .select('name')
          .eq('tenant_id', tenant.id)

        if (!ingredients || ingredients.length === 0) continue

        const ingredientNames = ingredients.map((i: { name: string }) => i.name).filter(Boolean)

        // 4. Match recalls against their ingredients
        const matches = await matchRecallsToIngredients(recalls, ingredientNames)

        if (matches.length === 0) continue

        matchCount += matches.length
        tenantCount++

        // 5. Get chef's auth user ID for notification
        const { data: role } = await supabase
          .from('user_roles')
          .select('auth_user_id')
          .eq('entity_id', tenant.id)
          .eq('role', 'chef')
          .maybeSingle()

        if (!role?.auth_user_id) continue

        // 6. Create notifications for each matching recall (non-blocking per match)
        for (const recall of matches) {
          try {
            await supabase.from('notifications').insert({
              tenant_id: tenant.id,
              recipient_id: role.auth_user_id,
              category: 'protection',
              action: 'recall_alert_matched',
              title: 'FDA Recall Alert',
              body: `${recall.product_description} — ${recall.reason_for_recall}`.slice(0, 200),
              action_url: `https://api.fda.gov/food/enforcement.json?search=recall_number:${recall.id}`,
            })
          } catch (notifErr) {
            console.warn(
              '[recall-check] Failed to insert notification for tenant',
              tenant.id,
              notifErr
            )
          }
        }
      } catch (tenantErr) {
        errors.push(`Tenant ${tenant.id}: ${String(tenantErr)}`)
      }
    }
  } catch (err) {
    console.error('[recall-check] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error', detail: String(err) }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    tenantsChecked: tenantCount,
    matchCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
