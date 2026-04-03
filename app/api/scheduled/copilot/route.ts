import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { isOpsCopilotEnabled } from '@/lib/features'
import { runCopilotForTenant } from '@/lib/copilot/orchestrator'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleCopilot(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('copilot', async () => {
      if (!isOpsCopilotEnabled()) {
        return { message: 'Ops Copilot is disabled', processed: 0, failed: 0, results: [] }
      }

      const db: any = createServerClient({ admin: true })
      const { data: chefs, error } = await db.from('chefs').select('id').limit(10000)

      if (error) {
        throw new Error('Failed to fetch tenants')
      }

      if (!chefs || chefs.length === 0) {
        return { message: 'No tenants found', processed: 0, failed: 0, results: [] }
      }

      let processed = 0
      let succeeded = 0
      let failed = 0
      const results: Array<{
        tenantId: string
        status: 'success' | 'partial' | 'failed'
        runId: string
        errorCount: number
        durationMs: number
      }> = []

      for (const chef of chefs) {
        processed++
        try {
          const run = await runCopilotForTenant(chef.id)
          if (run.status === 'failed') {
            failed++
          } else {
            succeeded++
          }
          results.push({
            tenantId: chef.id,
            status: run.status,
            runId: run.runId,
            errorCount: run.errors.length,
            durationMs: run.durationMs,
          })
        } catch (_err) {
          failed++
        }
      }

      return {
        processed,
        succeeded,
        failed,
        results,
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }
}

export { handleCopilot as GET, handleCopilot as POST }
