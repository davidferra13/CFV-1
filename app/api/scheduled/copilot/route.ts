import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isOpsCopilotEnabled } from '@/lib/features'
import { runCopilotForTenant } from '@/lib/copilot/orchestrator'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

async function handleCopilot(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  if (!isOpsCopilotEnabled()) {
    return NextResponse.json({ message: 'Ops Copilot is disabled', processed: 0 })
  }

  const supabase: any = createServerClient({ admin: true })
  const { data: chefs, error } = await supabase.from('chefs').select('id').limit(10000)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }

  if (!chefs || chefs.length === 0) {
    return NextResponse.json({ message: 'No tenants found', processed: 0 })
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

  return NextResponse.json({
    processed,
    succeeded,
    failed,
    results,
  })
}

export { handleCopilot as GET, handleCopilot as POST }
