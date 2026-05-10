// Recurring Auto-Generate Cron
// GET /api/scheduled/recurring-auto-generate
// Runs daily: scans all active recurring schedules with auto_generate=true
// and creates draft events when the lead time threshold is reached.

import { NextResponse, type NextRequest } from 'next/server'
import { processRecurringAutoGeneration } from '@/lib/scheduling/recurring-auto-generate'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleRecurringAutoGenerate(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('recurring-auto-generate', async () => {
      const { generated, errors } = await processRecurringAutoGeneration()

      if (errors.length > 0) {
        console.warn('[recurring-auto-generate] Partial errors:', errors)
      }

      if (generated.length > 0) {
        console.log(
          `[recurring-auto-generate] Created ${generated.length} draft event(s):`,
          generated.map((g) => `${g.clientName} on ${g.eventDate}`).join(', ')
        )
      }

      return {
        generated: generated.length,
        errors: errors.length,
        details: generated.map((g) => ({
          client: g.clientName,
          date: g.eventDate,
          eventId: g.eventId,
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[recurring-auto-generate] Fatal error:', error)
    return NextResponse.json({ error: 'Recurring auto-generate failed' }, { status: 500 })
  }
}

export const GET = handleRecurringAutoGenerate
export const POST = handleRecurringAutoGenerate
