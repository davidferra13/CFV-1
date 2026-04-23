import type { DateConflictResult } from './actions'

type ConflictCheckFn = (
  date: string,
  excludeEventId?: string
) => Promise<DateConflictResult>

type ConflictCheckOptions = {
  check: ConflictCheckFn
  date: string
  excludeEventId?: string
  timeoutMs?: number
}

/**
 * Conflict checks are advisory for draft creation. If the lookup errors or stalls,
 * the chef should still be able to advance and save a truthful draft shell.
 */
export async function getDateConflictResultWithTimeout({
  check,
  date,
  excludeEventId,
  timeoutMs = 4000,
}: ConflictCheckOptions): Promise<DateConflictResult | null> {
  const timeout = new Promise<null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    void timer
  })

  try {
    return await Promise.race([check(date, excludeEventId), timeout])
  } catch {
    return null
  }
}
