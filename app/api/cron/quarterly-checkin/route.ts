import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: chefs } = await supabaseAdmin.from('chefs').select('id').limit(10000)

    if (!chefs || chefs.length === 0) {
      return NextResponse.json({ message: 'No chefs' })
    }

    let due = 0

    for (const chef of chefs) {
      // Find most recent check-in
      const { data: lastCheckin } = await supabaseAdmin
        .from('chef_growth_checkins')
        .select('checkin_date')
        .eq('tenant_id', chef.id)
        .order('checkin_date', { ascending: false })
        .limit(1)
        .single()

      const isDue = !lastCheckin || lastCheckin.checkin_date < ninetyDaysAgo.split('T')[0]

      if (isDue) {
        console.log(`[quarterly-checkin] Chef ${chef.id} is due for quarterly check-in`)
        due++
      }
    }

    return NextResponse.json({ message: `${due} chefs due for quarterly check-in` })
  } catch (err) {
    console.error('[quarterly-checkin] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
