/**
 * Signal Deduplication Registry for CIL
 *
 * In-memory TTL map preventing duplicate signal dispatch.
 * Process restart = fresh state (acceptable for dedup).
 * Never blocks dispatch on failure - if dedup errors, signal proceeds.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1 hour
const MAX_PER_TYPE_PER_HOUR = 3

// ─── State ───────────────────────────────────────────────────────────────────

interface DedupEntry {
  dispatchedAt: number
}

interface ThrottleEntry {
  timestamps: number[]
}

/** Primary dedup map: composite key -> dispatch timestamp */
const dedupMap = new Map<string, DedupEntry>()

/** Per-tenant per-signal-type throttle: "tenantId:signalType" -> timestamps[] */
const throttleMap = new Map<string, ThrottleEntry>()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function evictStale(now: number, ttl: number): void {
  for (const [key, entry] of dedupMap) {
    if (now - entry.dispatchedAt > ttl) {
      dedupMap.delete(key)
    }
  }
}

function evictStaleThrottles(now: number): void {
  for (const [key, entry] of throttleMap) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < DEFAULT_TTL_MS)
    if (entry.timestamps.length === 0) {
      throttleMap.delete(key)
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build a composite dedup key.
 * Convention: tenantId + signalType + entityId
 */
export function buildDedupKey(tenantId: string, signalType: string, entityId: string): string {
  return `${tenantId}:${signalType}:${entityId}`
}

/**
 * Check whether a signal should be dispatched.
 * Returns true if the signal has NOT been dispatched within the TTL window
 * AND the per-tenant throttle has not been exceeded.
 *
 * On any internal error, returns true (fail-open).
 */
export function shouldDispatch(
  key: string,
  opts?: { ttlMs?: number; tenantId?: string; signalType?: string }
): boolean {
  try {
    const now = Date.now()
    const ttl = opts?.ttlMs ?? DEFAULT_TTL_MS

    // Lazy eviction
    evictStale(now, ttl)
    evictStaleThrottles(now)

    // Dedup check: was this exact signal dispatched recently?
    const existing = dedupMap.get(key)
    if (existing && now - existing.dispatchedAt < ttl) {
      return false
    }

    // Throttle check: per-tenant per-signal-type limit
    if (opts?.tenantId && opts?.signalType) {
      const throttleKey = `${opts.tenantId}:${opts.signalType}`
      const entry = throttleMap.get(throttleKey)
      if (entry) {
        const recentCount = entry.timestamps.filter((t) => now - t < DEFAULT_TTL_MS).length
        if (recentCount >= MAX_PER_TYPE_PER_HOUR) {
          return false
        }
      }
    }

    return true
  } catch {
    // Fail-open: dedup errors must never block dispatch
    return true
  }
}

/**
 * Mark a signal as dispatched. Records timestamp for dedup and throttle.
 *
 * On any internal error, silently returns (fail-open).
 */
export function markDispatched(
  key: string,
  opts?: { tenantId?: string; signalType?: string }
): void {
  try {
    const now = Date.now()

    // Record in dedup map
    dedupMap.set(key, { dispatchedAt: now })

    // Record in throttle map
    if (opts?.tenantId && opts?.signalType) {
      const throttleKey = `${opts.tenantId}:${opts.signalType}`
      const entry = throttleMap.get(throttleKey)
      if (entry) {
        entry.timestamps.push(now)
      } else {
        throttleMap.set(throttleKey, { timestamps: [now] })
      }
    }
  } catch {
    // Fail-open: never break dispatch
  }
}

/**
 * Get current registry size (for diagnostics).
 */
export function getDedupStats(): { dedupSize: number; throttleSize: number } {
  return { dedupSize: dedupMap.size, throttleSize: throttleMap.size }
}
