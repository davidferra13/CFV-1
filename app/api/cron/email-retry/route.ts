import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

/**
 * FC-G25: Retry failed emails from the dead-letter queue.
 * Runs every 5 minutes. Picks up pending items whose next_retry_at has passed.
 * Re-renders the email template is NOT possible (we don't store the React tree),
 * so this cron marks items as permanently failed after max_retries.
 *
 * The primary value is observability: we know emails were lost and can alert.
 * Future enhancement: store serialized template data for true re-send.
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('email-retry', async () => {
      const db: any = createAdminClient()

      // Fetch pending items ready for retry
      const { data: pendingItems, error } = await db
        .from('email_dead_letter_queue')
        .select('id, to_addresses, subject, template_name, retry_count, max_retries, error_message')
        .eq('status', 'pending')
        .lte('next_retry_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(20)

      if (error) {
        console.error('[email-retry] Query failed:', error.message)
        throw new Error('Failed to query dead-letter queue')
      }

      if (!pendingItems || pendingItems.length === 0) {
        return { processed: 0, failed: 0, exhausted: 0 }
      }

      let processed = 0
      let exhausted = 0

      for (const item of pendingItems) {
        const nextRetry = item.retry_count + 1

        if (nextRetry >= item.max_retries) {
          // Max retries exhausted; mark as permanently failed
          await db
            .from('email_dead_letter_queue')
            .update({
              status: 'failed',
              retry_count: nextRetry,
              last_error: `Exhausted ${item.max_retries} retries. Last error: ${item.error_message}`,
            })
            .eq('id', item.id)

          console.warn(
            `[email-retry] Permanently failed: "${item.subject}" to ${item.to_addresses?.join(', ')}`
          )
          exhausted++
        } else {
          // Increment retry count and push next_retry_at back (exponential: 5min, 15min, 45min)
          const backoffMs = 5 * 60_000 * Math.pow(3, nextRetry - 1)
          await db
            .from('email_dead_letter_queue')
            .update({
              retry_count: nextRetry,
              status: 'pending',
              next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
              last_error: `Retry ${nextRetry}/${item.max_retries} scheduled`,
            })
            .eq('id', item.id)

          processed++
        }
      }

      // Alert developer if any emails permanently failed
      if (exhausted > 0) {
        try {
          const { sendDeveloperAlert } = await import('@/lib/email/developer-alerts')
          await sendDeveloperAlert({
            system: 'email-retry',
            title: `${exhausted} email(s) permanently failed`,
            description: `Dead-letter queue: ${exhausted} email(s) exhausted retries. Check email_dead_letter_queue table for details.`,
            severity: 'warning',
          })
        } catch (alertErr) {
          console.error('[email-retry] Developer alert failed (non-blocking):', alertErr)
        }
      }

      return { processed, exhausted, total: pendingItems.length }
    })

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email-retry] Cron failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
