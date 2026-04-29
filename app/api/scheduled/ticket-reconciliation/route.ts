import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { runTicketReconciliationAudit } from '@/lib/tickets/reconciliation-actions'

const CRON_NAME = 'ticket-reconciliation'

async function handleTicketReconciliation(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob(CRON_NAME, () => runTicketReconciliationAudit())

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ticket-reconciliation] Cron failed:', message)
    return NextResponse.json({ ok: false, error: 'Ticket reconciliation failed' }, { status: 500 })
  }
}

export { handleTicketReconciliation as GET, handleTicketReconciliation as POST }
