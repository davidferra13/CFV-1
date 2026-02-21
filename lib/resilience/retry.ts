/**
 * Retry with exponential backoff
 * Item #47: Background Job Retry Strategy
 *
 * Provides a standard retry mechanism for:
 * - Outbound webhook delivery
 * - External API calls (Stripe, Resend, MealMe, Kroger)
 * - Cron job steps
 *
 * Uses full-jitter exponential backoff to prevent thundering herd.
 * Transient errors (network, 429, 5xx) are retried; permanent errors (4xx) are not.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first try) */
  maxAttempts?: number
  /** Initial delay in milliseconds */
  baseDelayMs?: number
  /** Maximum delay cap in milliseconds */
  maxDelayMs?: number
  /** Multiplier per retry (default 2 = exponential) */
  factor?: number
  /** If provided, only these error codes/messages trigger retry */
  retryOn?: (error: unknown) => boolean
  /** Called after each failed attempt (for logging) */
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  factor: 2,
  retryOn: isTransientError,
  onRetry: () => {},
}

/**
 * Executes fn with exponential backoff retry on transient failures.
 *
 * @example
 * const result = await withRetry(
 *   () => sendWebhook(url, payload),
 *   { maxAttempts: 5, onRetry: (attempt, err) => log.warn('Retry', { attempt, err }) }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      const isLast = attempt === opts.maxAttempts
      if (isLast || !opts.retryOn(err)) {
        throw err
      }

      const delay = calcBackoff(attempt, opts.baseDelayMs, opts.maxDelayMs, opts.factor)
      opts.onRetry(attempt, err, delay)
      await sleep(delay)
    }
  }

  // Should never reach here (loop always throws on last attempt), but TypeScript needs it
  throw lastError
}

/**
 * Classifies an error as transient (worth retrying) or permanent.
 * Transient: network errors, 429 Too Many Requests, 5xx server errors.
 * Permanent: 4xx client errors (bad request, not found, auth failures).
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false

  // Fetch API errors (network-level)
  if (error instanceof TypeError && error.message.includes('fetch')) return true

  // HTTP status-code based classification
  const status = extractHttpStatus(error)
  if (status !== null) {
    if (status === 429) return true          // Rate limited — always retry
    if (status >= 500 && status < 600) return true  // Server errors
    if (status >= 400 && status < 500) return false // Client errors — permanent
  }

  // Timeout errors
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('econnreset')) {
      return true
    }
  }

  // Default: retry unknown errors
  return true
}

/**
 * Extracts HTTP status code from common error shapes:
 * - { status: number }
 * - { statusCode: number }
 * - { response: { status: number } }
 */
function extractHttpStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const e = error as Record<string, unknown>
  if (typeof e.status === 'number') return e.status
  if (typeof e.statusCode === 'number') return e.statusCode
  if (typeof e.response === 'object' && e.response !== null) {
    const r = e.response as Record<string, unknown>
    if (typeof r.status === 'number') return r.status
  }
  return null
}

/**
 * Calculates backoff delay with full jitter.
 * Full jitter prevents synchronized retry storms when many jobs fail simultaneously.
 */
function calcBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  factor: number
): number {
  const exponential = baseDelayMs * Math.pow(factor, attempt - 1)
  const capped = Math.min(exponential, maxDelayMs)
  // Full jitter: random value in [0, capped]
  return Math.random() * capped
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── DLQ integration helper ──────────────────────────────────────────────────

export interface DLQEntry {
  tenantId: string | null
  jobType: string
  jobId: string
  payload: Record<string, unknown>
  errorMessage: string
  attempts: number
}

/**
 * Pushes a permanently failed job to the dead_letter_queue table.
 * Call this after withRetry() throws and max attempts are exhausted.
 *
 * @example
 * try {
 *   await withRetry(() => sendWebhook(url, payload), { maxAttempts: 5 })
 * } catch (err) {
 *   await pushToDLQ(supabase, {
 *     tenantId: webhook.tenant_id,
 *     jobType: 'webhook_delivery',
 *     jobId: webhook.id,
 *     payload: { url, payload },
 *     errorMessage: String(err),
 *     attempts: 5,
 *   })
 * }
 */
export async function pushToDLQ(
  supabase: { from: (table: string) => unknown },
  entry: DLQEntry
): Promise<void> {
  const client = supabase.from('dead_letter_queue') as {
    insert: (data: unknown) => Promise<{ error: unknown }>
  }
  const { error } = await client.insert({
    tenant_id: entry.tenantId,
    job_type: entry.jobType,
    job_id: entry.jobId,
    payload: entry.payload,
    error_message: entry.errorMessage,
    attempts: entry.attempts,
    first_failed_at: new Date().toISOString(),
    last_failed_at: new Date().toISOString(),
  })
  if (error) {
    console.error('[DLQ] Failed to push to dead_letter_queue:', error)
  }
}
