import pino from 'pino'
import { getRequestId } from '@/lib/observability/request-id'
import { sanitizeLogInput } from '@/lib/security/sanitize-log'

/**
 * Structured Logger - ChefFlow V1
 *
 * Uses pino for structured JSON logging with level control.
 * In development: human-readable output to stdout.
 * In production: JSON lines suitable for log aggregation (Axiom, Logtail, Datadog, etc.)
 *
 * Every log entry includes:
 *   - timestamp (ISO 8601)
 *   - level (debug | info | warn | error)
 *   - scope (e.g. "ledger", "events", "auth")
 *   - message (human-readable string)
 *   - requestId (correlation ID, if available)
 *   - context (arbitrary structured data)
 *   - error (Error details, if applicable)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  scope: string
  message: string
  requestId?: string
  tenantId?: string
  userId?: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
  durationMs?: number
}

const isDev = process.env.NODE_ENV !== 'production'

/** Root pino instance, shared across all scoped loggers */
export const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  // In dev, write directly to stdout (no thread-stream worker) to avoid
  // worker crash when .next-dev cache is cleared between recompiles.
  // In production, no transport needed (stdout is collected by process manager).
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

/** Sanitize user-controlled strings before logging */
export function sanitize(input: string): string {
  return sanitizeLogInput(input)
}

function emit(entry: LogEntry): void {
  const { level, message, ...rest } = entry
  switch (level) {
    case 'debug':
      pinoLogger.debug(rest, message)
      break
    case 'info':
      pinoLogger.info(rest, message)
      break
    case 'warn':
      pinoLogger.warn(rest, message)
      break
    case 'error':
      pinoLogger.error(rest, message)
      break
  }
}

export interface LogContext {
  requestId?: string
  tenantId?: string
  userId?: string
}

/**
 * Create a scoped logger. Bind a scope name once; all subsequent calls carry it.
 *
 * @example
 * const log = createLogger('ledger')
 * log.info('Entry appended', { context: { entryId, amountCents } })
 */
export function createLogger(scope: string, defaultCtx: LogContext = {}) {
  function buildEntry(
    level: LogLevel,
    message: string,
    opts: {
      context?: Record<string, unknown>
      error?: unknown
      requestId?: string
      tenantId?: string
      userId?: string
      durationMs?: number
    } = {}
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      requestId: opts.requestId ?? defaultCtx.requestId ?? getRequestId(),
      tenantId: opts.tenantId ?? defaultCtx.tenantId,
      userId: opts.userId ?? defaultCtx.userId,
    }
    if (opts.context) entry.context = opts.context
    if (opts.durationMs != null) entry.durationMs = opts.durationMs
    if (opts.error) {
      const err = opts.error instanceof Error ? opts.error : new Error(String(opts.error))
      entry.error = {
        name: err.name,
        message: err.message,
        stack: isDev ? err.stack : undefined,
      }
    }
    return entry
  }

  return {
    debug(message: string, opts?: Parameters<typeof buildEntry>[2]) {
      emit(buildEntry('debug', message, opts))
    },
    info(message: string, opts?: Parameters<typeof buildEntry>[2]) {
      emit(buildEntry('info', message, opts))
    },
    warn(message: string, opts?: Parameters<typeof buildEntry>[2]) {
      emit(buildEntry('warn', message, opts))
    },
    error(message: string, opts?: Parameters<typeof buildEntry>[2]) {
      emit(buildEntry('error', message, opts))
    },
    /**
     * Time an async operation and log the result with duration.
     * Automatically logs error if the operation throws.
     */
    async timed<T>(
      label: string,
      fn: () => Promise<T>,
      opts?: Omit<Parameters<typeof buildEntry>[2], 'durationMs'>
    ): Promise<T> {
      const start = Date.now()
      try {
        const result = await fn()
        emit(buildEntry('info', label, { ...opts, durationMs: Date.now() - start }))
        return result
      } catch (err) {
        emit(
          buildEntry('error', `${label} failed`, {
            ...opts,
            error: err,
            durationMs: Date.now() - start,
          })
        )
        throw err
      }
    },
    /** Return a child logger with additional default context merged in. */
    withContext(ctx: LogContext) {
      return createLogger(scope, { ...defaultCtx, ...ctx })
    },
  }
}

/** Singleton loggers for common scopes */
export const log = {
  auth: createLogger('auth'),
  events: createLogger('events'),
  ledger: createLogger('ledger'),
  inquiries: createLogger('inquiries'),
  quotes: createLogger('quotes'),
  webhooks: createLogger('webhooks'),
  cron: createLogger('cron'),
  email: createLogger('email'),
  grocery: createLogger('grocery'),
  api: createLogger('api'),
  middleware: createLogger('middleware'),
  ai: createLogger('ai'),
}
