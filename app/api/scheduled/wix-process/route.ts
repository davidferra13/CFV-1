// Scheduled Wix Submission Processor
// POST /api/scheduled/wix-process — processes pending Wix submissions.
// Picks up any submissions that weren't processed inline (async failure, backlog, etc.).
// Secured with CRON_SECRET bearer token (same pattern as follow-ups cron).

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { processWixSubmission } from '@/lib/wix/process'

export async function POST(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })

  // Find pending or failed (retryable) submissions
  const { data: pendingSubmissions, error } = await supabase
    .from('wix_submissions')
    .select('id, wix_submission_id, processing_attempts')
    .in('status', ['pending', 'failed'])
    .lt('processing_attempts', 3)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[Wix Process Cron] Query failed:', error)
    return NextResponse.json(
      { error: 'Failed to query pending submissions' },
      { status: 500 },
    )
  }

  if (!pendingSubmissions || pendingSubmissions.length === 0) {
    return NextResponse.json({ message: 'No pending submissions', processed: 0 })
  }

  let completed = 0
  let failed = 0
  let duplicates = 0

  for (const submission of pendingSubmissions) {
    try {
      const result = await processWixSubmission(submission.id)

      switch (result.status) {
        case 'completed':
          completed++
          break
        case 'duplicate':
          duplicates++
          break
        case 'failed':
          failed++
          break
      }
    } catch (err) {
      const e = err as Error
      console.error(
        `[Wix Process Cron] Failed for submission ${submission.id}:`,
        e.message,
      )
      failed++
    }
  }

  return NextResponse.json({
    processed: pendingSubmissions.length,
    completed,
    duplicates,
    failed,
  })
}
