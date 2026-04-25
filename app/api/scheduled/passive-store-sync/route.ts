import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { syncDirtyPassiveStores } from '@/lib/passive-store/sync-state'

const BATCH_SIZE = 25

async function runPassiveStoreSync(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('passive-store-sync', async () =>
      syncDirtyPassiveStores(BATCH_SIZE)
    )

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[passive-store-sync] Cron failed:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return runPassiveStoreSync(request)
}

export async function POST(request: NextRequest) {
  return runPassiveStoreSync(request)
}
