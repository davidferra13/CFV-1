import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const supabaseAdmin = createAdminClient()

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const today = new Date().toISOString().split('T')[0]
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: chefs } = await supabaseAdmin.from('chefs').select('id').limit(10000)
    if (!chefs || chefs.length === 0) {
      return NextResponse.json({ message: 'No chefs' })
    }

    let computed = 0

    for (const chef of chefs) {
      // Check if snapshot already exists for today
      const { data: existing } = await supabaseAdmin
        .from('chef_momentum_snapshots')
        .select('id')
        .eq('tenant_id', chef.id)
        .eq('snapshot_date', today)
        .limit(1)

      if (existing && existing.length > 0) continue

      // Count new clients in 90 days
      const { count: newClients } = await supabaseAdmin
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', chef.id)
        .gte('created_at', ninetyDaysAgo)

      // Count creative projects in 90 days
      const { count: creativeProjects } = await supabaseAdmin
        .from('chef_creative_projects')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', chef.id)
        .gte('created_at', ninetyDaysAgo)

      // Count education entries in 12 months
      const { count: educationEntries } = await supabaseAdmin
        .from('chef_education_log')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', chef.id)
        .gte('entry_date', oneYearAgo)

      // Determine direction based on signals
      const signals = (newClients ?? 0) + (creativeProjects ?? 0) + (educationEntries ?? 0)
      const direction = signals >= 5 ? 'growing' : signals >= 2 ? 'maintaining' : 'stagnating'

      await supabaseAdmin.from('chef_momentum_snapshots').insert({
        tenant_id: chef.id,
        snapshot_date: today,
        new_clients_90d: newClients ?? 0,
        creative_projects_90d: creativeProjects ?? 0,
        education_entries_12m: educationEntries ?? 0,
        new_dishes_90d: 0, // Would need menu/recipe analysis
        new_cuisines_90d: 0,
        momentum_direction: direction,
      })
      computed++
    }

    return NextResponse.json({ message: `Computed ${computed} momentum snapshots` })
  } catch (err) {
    console.error('[momentum-snapshot] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
