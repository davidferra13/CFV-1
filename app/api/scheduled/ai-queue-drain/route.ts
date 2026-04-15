// AI Queue Drain - Cron Heartbeat
// GET /api/scheduled/ai-queue-drain
// Ensures the background AI task worker is running.
// The worker is a singleton poll loop inside the Next.js process.
// startWorker() is idempotent - safe to call every 15 minutes.
// Without this, enqueued tasks accumulate indefinitely if the process restarts.

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleAiQueueDrain(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const result = await runMonitoredCronJob('ai-queue-drain', async () => {
    const { startWorker, getWorkerState } = await import('@/lib/ai/queue/worker')
    const stateBefore = getWorkerState()

    if (!stateBefore.running) {
      startWorker()
      return { started: true, message: 'Worker started' }
    }

    return {
      started: false,
      message: 'Worker already running',
      tasksProcessed: stateBefore.tasksProcessed,
      tasksFailed: stateBefore.tasksFailed,
    }
  })

  return NextResponse.json(result)
}

export const GET = handleAiQueueDrain
export const POST = handleAiQueueDrain
