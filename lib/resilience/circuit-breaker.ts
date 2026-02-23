/**
 * Circuit Breaker Pattern
 * Item #49: Circuit Breaker
 *
 * Prevents cascading failures when an external service (Stripe, Resend,
 * MealMe, Kroger, Gemini) is consistently failing.
 *
 * States:
 *   CLOSED   — Normal operation. Requests pass through.
 *   OPEN     — Circuit is tripped. Fast-fail without calling the service.
 *   HALF_OPEN — Trial mode. One request allowed through to test recovery.
 *
 * This is an in-memory implementation. State resets on cold start (serverless).
 * For persistent state across instances, wire to Redis (Upstash).
 *
 * Usage:
 *   const breaker = getCircuitBreaker('stripe')
 *   const result = await breaker.execute(() => stripe.charges.create(...))
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold?: number
  /** Milliseconds to wait before transitioning OPEN → HALF_OPEN */
  resetTimeoutMs?: number
  /** Milliseconds for a single request to time out */
  requestTimeoutMs?: number
  /** Called when circuit state changes */
  onStateChange?: (service: string, from: CircuitState, to: CircuitState) => void
}

interface CircuitBreakerState {
  state: CircuitState
  failures: number
  openedAt: number | null
  lastFailureAt: number | null
}

// Global in-memory store (per serverless instance)
const circuitStore = new Map<string, CircuitBreakerState>()

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeoutMs: 60_000, // 1 minute
  requestTimeoutMs: 10_000, // 10 seconds
  onStateChange: () => {},
}

/**
 * Returns (or creates) a circuit breaker for the given service name.
 * Call once at module level — the breaker is shared across requests.
 */
export function getCircuitBreaker(serviceName: string, options: CircuitBreakerOptions = {}) {
  const opts: Required<CircuitBreakerOptions> = { ...DEFAULT_OPTIONS, ...options }

  if (!circuitStore.has(serviceName)) {
    circuitStore.set(serviceName, {
      state: 'CLOSED',
      failures: 0,
      openedAt: null,
      lastFailureAt: null,
    })
  }

  return {
    /**
     * Executes fn through the circuit breaker.
     * Throws CircuitOpenError if circuit is OPEN.
     * Throws the original error if fn fails and circuit opens.
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      const cb = circuitStore.get(serviceName)!
      const now = Date.now()

      // ── OPEN state: check if reset timeout has elapsed ──────────────────
      if (cb.state === 'OPEN') {
        const elapsed = now - (cb.openedAt ?? now)
        if (elapsed >= opts.resetTimeoutMs) {
          transition(serviceName, 'HALF_OPEN', opts)
        } else {
          throw new CircuitOpenError(serviceName, opts.resetTimeoutMs - elapsed)
        }
      }

      // ── Execute the function (with timeout) ────────────────────────────
      try {
        const result = await Promise.race([fn(), timeout(opts.requestTimeoutMs, serviceName)])

        // Success: reset failure count
        if (cb.state === 'HALF_OPEN') {
          transition(serviceName, 'CLOSED', opts)
        }
        cb.failures = 0

        return result
      } catch (err) {
        if (err instanceof CircuitOpenError) throw err

        // Record failure
        cb.failures += 1
        cb.lastFailureAt = Date.now()

        // Trip the circuit if threshold exceeded
        if (cb.state === 'CLOSED' && cb.failures >= opts.failureThreshold) {
          transition(serviceName, 'OPEN', opts)
        } else if (cb.state === 'HALF_OPEN') {
          // Trial request failed — back to OPEN
          transition(serviceName, 'OPEN', opts)
        }

        throw err
      }
    },

    /** Returns the current circuit state */
    getState(): CircuitState {
      return circuitStore.get(serviceName)?.state ?? 'CLOSED'
    },

    /** Returns the failure count */
    getFailures(): number {
      return circuitStore.get(serviceName)?.failures ?? 0
    },

    /** Manually resets the circuit to CLOSED (e.g., after operator intervention) */
    reset(): void {
      circuitStore.set(serviceName, {
        state: 'CLOSED',
        failures: 0,
        openedAt: null,
        lastFailureAt: null,
      })
    },
  }
}

function transition(
  serviceName: string,
  to: CircuitState,
  opts: Required<CircuitBreakerOptions>
): void {
  const cb = circuitStore.get(serviceName)!
  const from = cb.state
  cb.state = to
  if (to === 'OPEN') {
    cb.openedAt = Date.now()
  } else if (to === 'CLOSED') {
    cb.failures = 0
    cb.openedAt = null
  }
  opts.onStateChange(serviceName, from, to)

  // Write incident report for state changes
  try {
    const { reportCircuitBreakerChange } = require('../incidents/reporter')
    reportCircuitBreakerChange({
      service: serviceName,
      from,
      to,
      failures: cb.failures,
    })
  } catch {
    // Incident reporting must never crash the circuit breaker
  }
}

function timeout(ms: number, serviceName: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`[CircuitBreaker] ${serviceName} timed out after ${ms}ms`)),
      ms
    )
  )
}

export class CircuitOpenError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly retryAfterMs: number
  ) {
    super(
      `Circuit breaker OPEN for "${serviceName}". ` +
        `Service is unavailable. Retry after ~${Math.ceil(retryAfterMs / 1000)}s.`
    )
    this.name = 'CircuitOpenError'
  }
}

// ─── Pre-configured breakers for known external services ─────────────────────

/**
 * Pre-built circuit breakers for all external services.
 * Import what you need:
 *
 * @example
 * import { breakers } from '@/lib/resilience/circuit-breaker'
 * const result = await breakers.stripe.execute(() => stripe.charges.create(...))
 */
export const breakers = {
  stripe: getCircuitBreaker('stripe', { failureThreshold: 3, resetTimeoutMs: 30_000 }),
  resend: getCircuitBreaker('resend', { failureThreshold: 5, resetTimeoutMs: 60_000 }),
  gemini: getCircuitBreaker('gemini', { failureThreshold: 5, resetTimeoutMs: 60_000 }),
  mealme: getCircuitBreaker('mealme', { failureThreshold: 5, resetTimeoutMs: 120_000 }),
  kroger: getCircuitBreaker('kroger', { failureThreshold: 5, resetTimeoutMs: 120_000 }),
  spoonacular: getCircuitBreaker('spoonacular', { failureThreshold: 5, resetTimeoutMs: 120_000 }),
  googleMaps: getCircuitBreaker('google-maps', { failureThreshold: 5, resetTimeoutMs: 60_000 }),
  supabase: getCircuitBreaker('supabase', { failureThreshold: 10, resetTimeoutMs: 10_000 }),
}

// ─── Health snapshot for /api/health endpoint ─────────────────────────────────

export function getCircuitBreakerHealth(): Record<
  string,
  { state: CircuitState; failures: number }
> {
  const snapshot: Record<string, { state: CircuitState; failures: number }> = {}
  for (const [name, state] of circuitStore) {
    snapshot[name] = { state: state.state, failures: state.failures }
  }
  return snapshot
}
