import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const dbAdmin = createAdminClient()

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('momentum-snapshot', async () => {
      const _msn = new Date()
      const today = `${_msn.getFullYear()}-${String(_msn.getMonth() + 1).padStart(2, '0')}-${String(_msn.getDate()).padStart(2, '0')}`
      const _ms90 = new Date(_msn.getFullYear(), _msn.getMonth(), _msn.getDate() - 90)
      const ninetyDaysAgo = `${_ms90.getFullYear()}-${String(_ms90.getMonth() + 1).padStart(2, '0')}-${String(_ms90.getDate()).padStart(2, '0')}`
      const _ms365 = new Date(_msn.getFullYear() - 1, _msn.getMonth(), _msn.getDate())
      const oneYearAgo = `${_ms365.getFullYear()}-${String(_ms365.getMonth() + 1).padStart(2, '0')}-${String(_ms365.getDate()).padStart(2, '0')}`

      const { data: chefs } = await dbAdmin.from('chefs').select('id').limit(10000)
      if (!chefs || chefs.length === 0) {
        return { message: 'No chefs', computed: 0 }
      }

      let computed = 0

      for (const chef of chefs) {
        const { data: existing } = await dbAdmin
          .from('chef_momentum_snapshots')
          .select('id')
          .eq('tenant_id', chef.id)
          .eq('snapshot_date', today)
          .limit(1)

        if (existing && existing.length > 0) continue

        const { count: newClients } = await dbAdmin
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', chef.id)
          .gte('created_at', ninetyDaysAgo)

        const { count: creativeProjects } = await dbAdmin
          .from('chef_creative_projects')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', chef.id)
          .gte('created_at', ninetyDaysAgo)

        const { count: educationEntries } = await dbAdmin
          .from('chef_education_log')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', chef.id)
          .gte('entry_date', oneYearAgo)

        const signals = (newClients ?? 0) + (creativeProjects ?? 0) + (educationEntries ?? 0)
        const direction = signals >= 5 ? 'growing' : signals >= 2 ? 'maintaining' : 'stagnating'

        await dbAdmin.from('chef_momentum_snapshots').insert({
          tenant_id: chef.id,
          snapshot_date: today,
          new_clients_90d: newClients ?? 0,
          creative_projects_90d: creativeProjects ?? 0,
          education_entries_12m: educationEntries ?? 0,
          new_dishes_90d: 0,
          new_cuisines_90d: 0,
          momentum_direction: direction,
        })
        computed++
      }

      return { message: `Computed ${computed} momentum snapshots`, computed }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[momentum-snapshot] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
