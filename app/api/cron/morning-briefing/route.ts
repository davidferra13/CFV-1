// GET /api/cron/morning-briefing
// Generates a morning briefing for each tenant and stores it as a remy_alert.
// Called by Vercel Cron daily at 7 AM EST. Deterministic — no LLM.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateMorningBriefing } from '@/lib/ai/remy-morning-briefing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
