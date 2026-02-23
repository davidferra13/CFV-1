/**
 * Remy Input Validation & Sanitization
 *
 * Shared validation for all Remy API routes. Handles:
 * - History array size limits (count + per-message length)
 * - Request body schema validation
 * - Prompt injection sanitization for database fields injected into system prompts
 * - Error message sanitization (no internal details to clients)
 * - SSRF URL validation for web read actions
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max number of history messages accepted from client */
export const MAX_HISTORY_LENGTH = 20

/** Max characters per individual history message */
export const MAX_HISTORY_MESSAGE_LENGTH = 4000

/** Max total characters across all history messages */
export const MAX_HISTORY_TOTAL_LENGTH = 30_000

/** Max characters for the current message (matches guardrails) */
export const MAX_MESSAGE_LENGTH = 2000

/** Max file size (bytes) before FileReader in the browser */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/** Max conversations before auto-pruning in IndexedDB */
export const MAX_CONVERSATIONS = 200

/** Max messages per conversation before pruning oldest */
export const MAX_MESSAGES_PER_CONVERSATION = 500

// ─── History Validation ───────────────────────────────────────────────────────

interface HistoryMessage {
  role: string
  content: string
}

/**
 * Validate and sanitize the history array from a Remy API request body.
 * Returns a safe, truncated history array. Never throws — always returns a usable result.
 */
export function validateHistory(raw: unknown, maxMessages = MAX_HISTORY_LENGTH): HistoryMessage[] {
  if (!Array.isArray(raw)) return []

  const safe: HistoryMessage[] = []
  let totalLength = 0

  // Take only the most recent messages, up to the max
  const recent = raw.slice(-maxMessages)

  for (const entry of recent) {
    // Skip malformed entries
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.role !== 'string' || typeof entry.content !== 'string') continue

    // Validate role is one of the expected values
    const role =
      entry.role === 'user' || entry.role === 'assistant' || entry.role === 'remy'
        ? entry.role
        : 'user'

    // Truncate individual messages that are too long
    const content = entry.content.slice(0, MAX_HISTORY_MESSAGE_LENGTH)

    // Check total budget
    if (totalLength + content.length > MAX_HISTORY_TOTAL_LENGTH) break

    totalLength += content.length
    safe.push({ role, content })
  }

  return safe
}

// ─── Request Body Validation ──────────────────────────────────────────────────

interface ValidatedRemyBody {
  message: string
  history: HistoryMessage[]
  currentPage?: string
  tenantId?: string
}

/**
 * Validate the full request body for any Remy API route.
 * Returns a validated body or null if the body is fundamentally invalid.
 */
export function validateRemyRequestBody(raw: unknown): ValidatedRemyBody | null {
  if (!raw || typeof raw !== 'object') return null

  const body = raw as Record<string, unknown>

  // message is required and must be a string
  if (typeof body.message !== 'string') return null

  const message = body.message.slice(0, MAX_MESSAGE_LENGTH)
  if (message.length === 0) return null

  const history = validateHistory(body.history)
  const currentPage =
    typeof body.currentPage === 'string' ? body.currentPage.slice(0, 500) : undefined
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.slice(0, 100) : undefined

  return { message, history, currentPage, tenantId }
}

// ─── Prompt Injection Sanitization ────────────────────────────────────────────

/**
 * Patterns that look like prompt injection attempts in database fields.
 * These are stripped/neutralized when database content is injected into system prompts.
 */
const INJECTION_PATTERNS = [
  // Direct instruction attempts
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /you\s+are\s+now\s+/gi,
  /new\s+instructions?\s*:/gi,
  /system\s*:\s*/gi,
  /\buser\s*:\s*/gi,
  /\bassistant\s*:\s*/gi,
  // Role-play injection
  /act\s+as\s+(if\s+you\s+are\s+|a\s+|an\s+)?/gi,
  /pretend\s+(you\s+are|to\s+be)\s+/gi,
  /from\s+now\s+on\s*,?\s*you\s+/gi,
  // Prompt extraction
  /reveal\s+(your\s+)?(system\s+)?prompt/gi,
  /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/gi,
  /what\s+(are\s+)?(your\s+)?instructions/gi,
  // Delimiter injection (trying to break out of context)
  /---+\s*\n\s*(system|user|assistant)\s*\n/gi,
  /```\s*(system|instruction|prompt)/gi,
]

/**
 * Sanitize a database field value before including it in a system prompt.
 * Neutralizes potential prompt injection while preserving legitimate content.
 *
 * Use this for ALL user-controlled database fields that get injected into prompts:
 * - client names, notes, special_requests, vibe_notes
 * - event occasions, kitchen_notes, menu_revision_notes
 * - AAR fields, recipe names, etc.
 */
export function sanitizeForPrompt(value: string | null | undefined): string {
  if (!value) return ''

  let sanitized = value

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Neutralize injection patterns by wrapping matched text in brackets
  // This preserves the text for context but breaks the instruction structure
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => `[${match}]`)
  }

  // Collapse excessive newlines (injection delimiter attempts)
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n')

  // Cap length — no single database field should be more than 2000 chars in a prompt
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 2000) + '...'
  }

  return sanitized
}

// ─── Error Message Sanitization ───────────────────────────────────────────────

/**
 * Internal patterns that should NEVER appear in client-facing error messages.
 */
const INTERNAL_PATTERNS = [
  /\/app\//i,
  /\/lib\//i,
  /\/node_modules\//i,
  /at\s+\w+\s+\(/i, // Stack trace lines
  /c:\\users\\/i, // Windows paths
  /\/home\//i, // Linux paths
  /supabase/i,
  /postgresql/i,
  /column\s+["']\w+['"]/i, // Column names
  /table\s+["']\w+['"]/i, // Table names
  /relation\s+["']\w+['"]/i, // Relation names
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /localhost:\d+/i,
  /127\.0\.0\.\d+/i,
  /192\.168\.\d+\.\d+/i,
  /10\.\d+\.\d+\.\d+/i,
]

/**
 * Sanitize an error message before sending it to the client.
 * Replaces internal details with a generic message.
 */
export function sanitizeErrorForClient(
  err: unknown,
  fallback = 'Remy ran into an issue — try again in a moment.'
): string {
  const raw = err instanceof Error ? err.message : String(err)

  // Check if the error contains any internal patterns
  for (const pattern of INTERNAL_PATTERNS) {
    if (pattern.test(raw)) {
      console.error('[remy] Sanitized internal error from client response:', raw)
      return fallback
    }
  }

  // Also cap length — prevent giant error messages
  if (raw.length > 200) {
    return fallback
  }

  return raw
}

// ─── SSRF Protection ──────────────────────────────────────────────────────────

/**
 * Check if a URL is safe to fetch (not an internal/private address).
 * Blocks: localhost, private IPs, link-local, cloud metadata endpoints.
 */
export function isUrlSafeForFetch(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Block non-HTTP protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP/HTTPS URLs are allowed.' }
    }

    // Block localhost variants
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    ) {
      return { safe: false, reason: 'Cannot fetch localhost URLs.' }
    }

    // Block private IP ranges (RFC 1918)
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
    ) {
      return { safe: false, reason: 'Cannot fetch private network addresses.' }
    }

    // Block link-local addresses (169.254.x.x — includes cloud metadata)
    if (hostname.startsWith('169.254.')) {
      return { safe: false, reason: 'Cannot fetch link-local addresses.' }
    }

    // Block known cloud metadata endpoints
    if (hostname === 'metadata.google.internal' || hostname === 'metadata.google.com') {
      return { safe: false, reason: 'Cannot fetch cloud metadata endpoints.' }
    }

    // Block .internal TLD
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return { safe: false, reason: 'Cannot fetch internal network addresses.' }
    }

    return { safe: true }
  } catch {
    return { safe: false, reason: 'Invalid URL format.' }
  }
}
