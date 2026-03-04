const MAX_JSON_CHARS = 8000
const MAX_STRING_LENGTH = 500
const MAX_ARRAY_LENGTH = 25
const MAX_OBJECT_KEYS = 50
const MAX_DEPTH = 4

export function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return null
  if (depth > MAX_DEPTH) return '[truncated-depth]'

  if (typeof value === 'string') {
    if (value.length <= MAX_STRING_LENGTH) return value
    return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated ${value.length - MAX_STRING_LENGTH} chars]`
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS)
    const out: Record<string, unknown> = {}
    for (const [k, v] of entries) {
      out[k] = sanitizeValue(v, depth + 1)
    }
    return out
  }

  return String(value)
}

export function toSafeJsonb(value: unknown): Record<string, unknown> | unknown[] | null {
  if (value == null) return null

  try {
    const sanitized = sanitizeValue(value)
    const text = JSON.stringify(sanitized)
    if (!text) return null

    if (text.length <= MAX_JSON_CHARS) {
      return JSON.parse(text)
    }

    return {
      _truncated: true,
      preview: text.slice(0, MAX_JSON_CHARS),
      originalLength: text.length,
    }
  } catch {
    return { _unserializable: true, type: typeof value }
  }
}

export const remyActionAuditInternals = {
  sanitizeValue,
  toSafeJsonb,
}
