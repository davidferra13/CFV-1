export type AppErrorCategory =
  | 'validation'
  | 'auth'
  | 'conflict'
  | 'network'
  | 'rate_limit'
  | 'unknown'

export type AppErrorInit = {
  code: string
  category: AppErrorCategory
  retryable: boolean
  traceId?: string
  metadata?: Record<string, unknown>
}

const APP_ERROR_CODE_PREFIX = 'CF_APP_ERROR::'

function sanitizeMessage(message: string | undefined, fallback: string) {
  const raw = (message || fallback).trim()
  if (!raw) return fallback
  return raw.replace(/\s+/g, ' ').slice(0, 500)
}

export class AppError extends Error {
  readonly code: string
  readonly category: AppErrorCategory
  readonly retryable: boolean
  readonly traceId?: string
  readonly metadata?: Record<string, unknown>

  constructor(message: string, init: AppErrorInit) {
    const safeMessage = sanitizeMessage(message, 'Something went wrong.')
    super(safeMessage)
    this.name = this.constructor.name
    this.code = init.code
    this.category = init.category
    this.retryable = init.retryable
    this.traceId = init.traceId
    this.metadata = init.metadata
  }

  toCodeMessage(): string {
    // Keep the user-facing message readable while preserving typed transport.
    return `${APP_ERROR_CODE_PREFIX}${this.code}::${this.message}`
  }
}

export class ValidationError extends AppError {
  constructor(message: string, init: Partial<AppErrorInit> = {}) {
    super(message, {
      code: init.code ?? 'VALIDATION_ERROR',
      category: 'validation',
      retryable: false,
      traceId: init.traceId,
      metadata: init.metadata,
    })
  }
}

export class AuthError extends AppError {
  constructor(message: string, init: Partial<AppErrorInit> = {}) {
    super(message, {
      code: init.code ?? 'AUTH_ERROR',
      category: 'auth',
      retryable: false,
      traceId: init.traceId,
      metadata: init.metadata,
    })
  }
}

export class ConflictError extends AppError {
  constructor(message: string, init: Partial<AppErrorInit> = {}) {
    super(message, {
      code: init.code ?? 'CONFLICT_ERROR',
      category: 'conflict',
      retryable: false,
      traceId: init.traceId,
      metadata: init.metadata,
    })
  }
}

export class NetworkError extends AppError {
  constructor(message: string, init: Partial<AppErrorInit> = {}) {
    super(message, {
      code: init.code ?? 'NETWORK_ERROR',
      category: 'network',
      retryable: true,
      traceId: init.traceId,
      metadata: init.metadata,
    })
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, init: Partial<AppErrorInit> = {}) {
    super(message, {
      code: init.code ?? 'RATE_LIMIT_ERROR',
      category: 'rate_limit',
      retryable: true,
      traceId: init.traceId,
      metadata: init.metadata,
    })
  }
}

export class UnknownAppError extends AppError {
  constructor(message: string, init: Partial<AppErrorInit> = {}) {
    super(message, {
      code: init.code ?? 'UNKNOWN_ERROR',
      category: 'unknown',
      retryable: init.retryable ?? false,
      traceId: init.traceId,
      metadata: init.metadata,
    })

    // Auto-report unknown errors to Sentry (non-blocking, fire-and-forget)
    // This is the single hook that covers all server actions that throw UnknownAppError.
    // Dynamic import avoids circular deps and keeps the module optional.
    try {
      import('../monitoring/sentry-reporter')
        .then(({ reportAppError }) => {
          reportAppError(this, {
            category: 'unknown',
            action: init.metadata?.action as string | undefined,
          })
        })
        .catch(() => {
          // Swallow — module resolution failure is not critical
        })
    } catch {
      // Swallow — reporting must never affect error handling
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

function extractStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const value = error as Record<string, unknown>
  if (typeof value.status === 'number') return value.status
  if (typeof value.statusCode === 'number') return value.statusCode
  if (typeof value.code === 'number') return value.code
  if (value.response && typeof value.response === 'object') {
    const response = value.response as Record<string, unknown>
    if (typeof response.status === 'number') return response.status
  }
  return null
}

function extractTraceId(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const value = error as Record<string, unknown>
  const traceId = value.traceId ?? value.trace_id ?? value.requestId ?? value.request_id
  return typeof traceId === 'string' && traceId.trim().length > 0 ? traceId : undefined
}

function parseCodePrefixedMessage(message: string): { code: string; message: string } | null {
  if (!message.startsWith(APP_ERROR_CODE_PREFIX)) return null
  const payload = message.slice(APP_ERROR_CODE_PREFIX.length)
  const divider = payload.indexOf('::')
  if (divider <= 0) return null
  return {
    code: payload.slice(0, divider),
    message: sanitizeMessage(payload.slice(divider + 2), 'Something went wrong.'),
  }
}

function parseConflictPrefixedMessage(
  message: string
): { message: string; currentUpdatedAt?: string } | null {
  const prefix = 'CF_CONFLICT::'
  if (!message.startsWith(prefix)) return null
  const payload = message.slice(prefix.length)
  try {
    const parsed = JSON.parse(payload) as { message?: string; currentUpdatedAt?: string }
    return {
      message: sanitizeMessage(parsed.message, 'This record changed elsewhere.'),
      currentUpdatedAt:
        typeof parsed.currentUpdatedAt === 'string' ? parsed.currentUpdatedAt : undefined,
    }
  } catch {
    return { message: 'This record changed elsewhere.' }
  }
}

function isLikelyNetworkMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('econnreset') ||
    lower.includes('offline')
  )
}

export function toAppError(
  error: unknown,
  options: {
    fallbackMessage?: string
    defaultCategory?: AppErrorCategory
    retryable?: boolean
  } = {}
): AppError {
  if (isAppError(error)) return error

  const fallbackMessage = options.fallbackMessage ?? 'Something went wrong. Please try again.'
  const traceId = extractTraceId(error)

  if (
    error &&
    typeof error === 'object' &&
    (error as Record<string, unknown>).name === 'ZodError'
  ) {
    return new ValidationError('Some fields are invalid. Please review and try again.', {
      traceId,
      metadata: { source: 'zod' },
    })
  }

  const statusCode = extractStatusCode(error)
  if (statusCode === 401 || statusCode === 403) {
    return new AuthError('Your session may have expired. Please sign in again.', { traceId })
  }
  if (statusCode === 409) {
    return new ConflictError('This record changed elsewhere.', { traceId })
  }
  if (statusCode === 429) {
    return new RateLimitError('Too many requests. Please wait and retry.', { traceId })
  }
  if (statusCode !== null && statusCode >= 500) {
    return new NetworkError('Server temporarily unavailable. Retry in a moment.', { traceId })
  }

  const message =
    error instanceof Error ? sanitizeMessage(error.message, fallbackMessage) : fallbackMessage

  const conflictPrefixed = parseConflictPrefixedMessage(message)
  if (conflictPrefixed) {
    return new ConflictError(conflictPrefixed.message, {
      traceId,
      metadata: { currentUpdatedAt: conflictPrefixed.currentUpdatedAt },
    })
  }

  const coded = parseCodePrefixedMessage(message)
  if (coded) {
    if (coded.code === 'VALIDATION_ERROR') return new ValidationError(coded.message, { traceId })
    if (coded.code === 'AUTH_ERROR') return new AuthError(coded.message, { traceId })
    if (coded.code === 'CONFLICT_ERROR') return new ConflictError(coded.message, { traceId })
    if (coded.code === 'NETWORK_ERROR') return new NetworkError(coded.message, { traceId })
    if (coded.code === 'RATE_LIMIT_ERROR') return new RateLimitError(coded.message, { traceId })
    return new UnknownAppError(coded.message, { traceId })
  }

  if (isLikelyNetworkMessage(message)) {
    return new NetworkError(message, { traceId })
  }

  if (message.toLowerCase().includes('conflict')) {
    return new ConflictError(message, { traceId })
  }

  if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('permission')) {
    return new AuthError(message, { traceId })
  }

  if (options.defaultCategory === 'validation') {
    return new ValidationError(message, { traceId })
  }
  if (options.defaultCategory === 'auth') {
    return new AuthError(message, { traceId })
  }
  if (options.defaultCategory === 'conflict') {
    return new ConflictError(message, { traceId })
  }
  if (options.defaultCategory === 'network') {
    return new NetworkError(message, { traceId })
  }
  if (options.defaultCategory === 'rate_limit') {
    return new RateLimitError(message, { traceId })
  }

  return new UnknownAppError(message || fallbackMessage, {
    traceId,
    retryable: options.retryable ?? false,
  })
}
