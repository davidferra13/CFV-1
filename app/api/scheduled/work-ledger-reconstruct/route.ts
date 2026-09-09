import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'
import { createServerClient } from '@/lib/db/server'
import { reconstructWorkSessions } from '@/lib/work-ledger/repository'
import { previousLocalDayRange } from '@/lib/work-ledger/timezone'

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()
  const db = createServerClient({ admin: true }) as any
  const { data: chefs, error } = await db.from('chefs').select('id, timezone').limit(10000)
  if (error) return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 })

  const results: Array<Record<string, unknown>> = []
  for (const chef of chefs ?? []) {
    try {
      const range = previousLocalDayRange(chef.timezone || 'America/New_York')
      const result = await reconstructWorkSessions(db, chef.id, range.startAt, range.endAt)
      results.push({
        tenant_id: chef.id,
        local_date: range.localDate,
        created: result.created.length,
      })
    } catch (error) {
      results.push({
        tenant_id: chef.id,
        error: error instanceof Error ? error.message : 'Unknown reconstruction error',
      })
    }
  }

  const failed = results.filter((result) => 'error' in result).length
  const response = { processed: results.length, failed, results }
  if (failed === 0) {
    await recordCronHeartbeat('work-ledger-reconstruct', response, Date.now() - startedAt)
  }
  return NextResponse.json(response, { status: failed > 0 ? 207 : 200 })
}
