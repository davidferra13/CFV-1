// GET /api/cron/morning-briefing
// Generates a morning briefing for each tenant and stores it as a remy_alert.
// Called by scheduled cron daily at 7 AM EST. Deterministic - no LLM.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateMorningBriefing } from '@/lib/ai/remy-morning-briefing'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const supabaseAdmin = createAdminClient()

    const { data: tenants } = await supabaseAdmin.from('tenants').select('id').limit(100)

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: 'No tenants found', briefingsCreated: 0 })
    }

    let created = 0
    const errors: string[] = []

    for (const tenant of tenants) {
      try {
        const briefingText = await generateMorningBriefing(tenant.id)

        // Store as a remy_alert with type morning_briefing
        const { error } = await supabaseAdmin.from('remy_alerts').insert({
          tenant_id: tenant.id,
          alert_type: 'morning_briefing',
          entity_type: null,
          entity_id: null,
          title: 'Morning Briefing',
          body: briefingText,
          priority: 'info',
        })

        if (!error) created++
      } catch (err) {
        errors.push(`${tenant.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      message: `Created ${created} morning briefings for ${tenants.length} tenants`,
      briefingsCreated: created,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[cron/morning-briefing] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
