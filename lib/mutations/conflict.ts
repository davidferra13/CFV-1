import { ConflictError } from '@/lib/errors/app-error'

export const CONFLICT_ERROR_PREFIX = 'CF_CONFLICT::'

export type ConflictErrorPayload = {
  code: 'CONFLICT'
  message: string
  currentUpdatedAt?: string
}

export function createConflictError(message: string, currentUpdatedAt?: string) {
  const payload: ConflictErrorPayload = { code: 'CONFLICT', message, currentUpdatedAt }
  return new ConflictError(`${CONFLICT_ERROR_PREFIX}${JSON.stringify(payload)}`, {
    code: 'CONFLICT_ERROR',
    metadata: { currentUpdatedAt },
  })
}

export function parseConflictError(error: unknown): ConflictErrorPayload | null {
  if (error instanceof ConflictError) {
    const currentUpdatedAt =
      typeof error.metadata?.currentUpdatedAt === 'string'
        ? error.metadata.currentUpdatedAt
        : undefined
    if (!error.message.startsWith(CONFLICT_ERROR_PREFIX)) {
      return {
        code: 'CONFLICT',
        message: error.message,
        currentUpdatedAt,
      }
    }
  }

  const message = error instanceof Error ? error.message : String(error ?? '')
  if (!message.startsWith(CONFLICT_ERROR_PREFIX)) return null

  const raw = message.slice(CONFLICT_ERROR_PREFIX.length)
  try {
    const parsed = JSON.parse(raw) as ConflictErrorPayload
    if (parsed?.code === 'CONFLICT') return parsed
    return null
  } catch {
    return null
  }
}
