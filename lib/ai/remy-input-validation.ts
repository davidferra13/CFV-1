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
export const MAX_MESSAGE_LENGTH = 8000

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
 * Returns a safe, truncated history array. Never throws - always returns a usable result.
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
    let content = entry.content.slice(0, MAX_HISTORY_MESSAGE_LENGTH)

    // Sanitize history entries against prompt injection (same as current message)
    // A poisoned earlier message could manipulate the LLM when replayed in context
    content = content.normalize('NFC')
    content = content.replace(/[\0\u200B\u200C\u200D\uFEFF\u00AD]/g, '')

    // Strip injection patterns from history content (prevents poisoned IndexedDB replay)
    content = stripInjectionPatterns(content)

    // Redact history entries containing harmful content (prevents poisoned replay)
    // User messages with slurs, threats, or harmful instructions get replaced so the
    // LLM never sees them in context, even if the client-side IndexedDB was tampered with.
    if (role === 'user') {
      const harmfulCheck = checkHarmfulContentBlockRaw(content)
      if (harmfulCheck) {
        content = '[message removed by safety filter]'
      }
    }

    // Check total budget
    if (totalLength + content.length > MAX_HISTORY_TOTAL_LENGTH) break

    totalLength += content.length
    safe.push({ role, content })
  }

  return safe
}

// ─── Request Body Validation ──────────────────────────────────────────────────

interface RecentPageEntry {
  path: string
  label: string
  at: string
}

interface RecentActionEntry {
  action: string
  entity: string
  at: string
}

interface RecentErrorEntry {
  message: string
  context: string
  at: string
}

interface ValidatedRemyBody {
  message: string
  history: HistoryMessage[]
  currentPage?: string
  tenantId?: string
  recentPages?: RecentPageEntry[]
  recentActions?: RecentActionEntry[]
  recentErrors?: RecentErrorEntry[]
  sessionMinutes?: number
  activeForm?: string
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

  // Hard reject oversized messages instead of truncating them.
  // This keeps request semantics explicit and lets clients/tests verify the limit.
  if (body.message.length > MAX_MESSAGE_LENGTH) return null

  const message = body.message
  if (message.length === 0) return null

  const history = validateHistory(body.history)
  const currentPage =
    typeof body.currentPage === 'string' ? body.currentPage.slice(0, 500) : undefined
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.slice(0, 100) : undefined

  // Validate navigation trail (max 10 entries)
  const recentPages = validateRecentPages(body.recentPages)

  // Validate recent actions (max 10 entries)
  const recentActions = validateRecentActions(body.recentActions)

  // Validate recent errors (max 5 entries)
  const recentErrors = validateRecentErrors(body.recentErrors)

  // Session duration (capped at 24 hours)
  const sessionMinutes =
    typeof body.sessionMinutes === 'number' && body.sessionMinutes >= 0
      ? Math.min(Math.round(body.sessionMinutes), 1440)
      : undefined

  // Active form (what the chef is currently working on)
  const activeForm = typeof body.activeForm === 'string' ? body.activeForm.slice(0, 200) : undefined

  return {
    message,
    history,
    currentPage,
    tenantId,
    recentPages,
    recentActions,
    recentErrors,
    sessionMinutes,
    activeForm,
  }
}

function validateRecentPages(raw: unknown): RecentPageEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const safe: RecentPageEntry[] = []
  for (const entry of raw.slice(-10)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.path !== 'string' || typeof entry.label !== 'string') continue
    safe.push({
      path: entry.path.slice(0, 200),
      label: entry.label.slice(0, 100),
      at: typeof entry.at === 'string' ? entry.at.slice(0, 30) : '',
    })
  }
  return safe.length > 0 ? safe : undefined
}

function validateRecentActions(raw: unknown): RecentActionEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const safe: RecentActionEntry[] = []
  for (const entry of raw.slice(-10)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.action !== 'string' || typeof entry.entity !== 'string') continue
    safe.push({
      action: entry.action.slice(0, 100),
      entity: entry.entity.slice(0, 200),
      at: typeof entry.at === 'string' ? entry.at.slice(0, 30) : '',
    })
  }
  return safe.length > 0 ? safe : undefined
}

function validateRecentErrors(raw: unknown): RecentErrorEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const safe: RecentErrorEntry[] = []
  for (const entry of raw.slice(-5)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.message !== 'string' || typeof entry.context !== 'string') continue
    safe.push({
      message: entry.message.slice(0, 200),
      context: entry.context.slice(0, 100),
      at: typeof entry.at === 'string' ? entry.at.slice(0, 30) : '',
    })
  }
  return safe.length > 0 ? safe : undefined
}

// ─── Recipe Generation Block (HARD RULE - AI NEVER GENERATES RECIPES) ────────

// Patterns imported from the unified registry
import {
  RECIPE_GENERATION_PATTERNS as _RECIPE_GEN,
  RECIPE_SEARCH_PATTERNS as _RECIPE_SEARCH,
  HARMFUL_CONTENT_PATTERNS as _HARMFUL,
  SELF_HARM_PATTERNS as _SELF_HARM,
  OUT_OF_SCOPE_PATTERNS as _OUT_OF_SCOPE,
  DANGEROUS_ACTION_PATTERNS as _DANGEROUS,
  REFUSAL_MESSAGES,
} from './remy-pattern-registry'

/** The refusal message when recipe generation is detected */
export const RECIPE_GENERATION_REFUSAL = REFUSAL_MESSAGES.recipe_generation

/**
 * Check if a message is asking AI to generate a recipe.
 * Returns the refusal message if blocked, or null if the message is fine.
 */
export function checkRecipeGenerationBlock(message: string): string | null {
  // Allow recipe SEARCH queries - these are read-only lookups, not generation
  for (const { pattern } of _RECIPE_SEARCH) {
    if (pattern.test(message)) {
      return null
    }
  }

  for (const { pattern } of _RECIPE_GEN) {
    if (pattern.test(message)) {
      return RECIPE_GENERATION_REFUSAL
    }
  }
  return null
}

// ─── Harmful Content Block (Safety) ──────────────────────────────────────────
// All patterns sourced from remy-pattern-registry.ts

/**
 * Internal raw check: does content match harmful patterns?
 * Used by validateHistory to redact poisoned history entries.
 */
function checkHarmfulContentBlockRaw(content: string): boolean {
  const lower = content.toLowerCase()
  for (const { pattern } of _HARMFUL) {
    if (pattern.test(lower)) return true
  }
  return false
}

/** Compassionate refusal for self-harm (resources, not dismissal) */
export const SELF_HARM_REFUSAL = REFUSAL_MESSAGES.self_harm

/** Standard refusal for harmful content */
export const HARMFUL_CONTENT_REFUSAL = REFUSAL_MESSAGES.harmful_content

/**
 * Check if a message requests harmful, violent, or illegal content.
 * Self-harm gets a compassionate response with resources.
 * Returns the refusal message if blocked, or null if the message is safe.
 */
export function checkHarmfulContentBlock(message: string): string | null {
  const normalized = normalizeForGuardCheck(message)

  // Self-harm check first (compassionate response, not a rebuke)
  for (const { pattern } of _SELF_HARM) {
    if (pattern.test(normalized)) {
      return SELF_HARM_REFUSAL
    }
  }

  for (const { pattern } of _HARMFUL) {
    if (pattern.test(normalized)) {
      return HARMFUL_CONTENT_REFUSAL
    }
  }
  return null
}

// ─── Guard Check Normalization ───────────────────────────────────────────────

/**
 * Normalize a message string before running it against guard-check regex patterns.
 * This defeats common evasion techniques: leetspeak, spaced-out characters,
 * dotted/hyphenated single chars, and zero-width Unicode tricks.
 *
 * FOR GUARD CHECKS ONLY. Never use this for display, storage, or forwarding
 * to the LLM. The original message text must be preserved for those purposes.
 */
export function normalizeForGuardCheck(message: string): string {
  let s = message

  // 1. Lowercase
  s = s.toLowerCase()

  // 2. Strip zero-width characters (defense-in-depth, also done elsewhere)
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u180E]/g, '')

  // 3. Normalize common Unicode homoglyphs to ASCII equivalents
  //    Cyrillic, Greek, and other lookalikes that bypass Latin regex
  const homoglyphs: Record<string, string> = {
    '\u0430': 'a', // Cyrillic a
    '\u0435': 'e', // Cyrillic ie
    '\u043E': 'o', // Cyrillic o
    '\u0440': 'p', // Cyrillic er
    '\u0441': 'c', // Cyrillic es
    '\u0443': 'y', // Cyrillic u
    '\u0445': 'x', // Cyrillic ha
    '\u0456': 'i', // Cyrillic i (Ukrainian)
    '\u0458': 'j', // Cyrillic je
    '\u04BB': 'h', // Cyrillic shha
    '\u0391': 'a', // Greek Alpha
    '\u0392': 'b', // Greek Beta
    '\u0395': 'e', // Greek Epsilon
    '\u039A': 'k', // Greek Kappa
    '\u039C': 'm', // Greek Mu
    '\u039D': 'n', // Greek Nu
    '\u039F': 'o', // Greek Omicron
    '\u03A1': 'p', // Greek Rho
    '\u03A4': 't', // Greek Tau
    '\u03B1': 'a', // Greek alpha
    '\u03B5': 'e', // Greek epsilon
    '\u03BF': 'o', // Greek omicron
    '\u03C1': 'p', // Greek rho
  }
  s = s.replace(/./g, (ch) => homoglyphs[ch] ?? ch)

  // 4. Replace common leetspeak substitutions
  s = s
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')

  // 5. Remove dots and hyphens between single characters
  //    "b.o.m.b" -> "bomb", "b-o-m-b" -> "bomb"
  s = s.replace(/\b(\w)([\.\-]\w)+\b/g, (match) => match.replace(/[\.\-]/g, ''))

  // 6. Collapse spaces between single characters
  //    "b o m b" -> "bomb", "k i l l" -> "kill"
  s = s.replace(/\b(\w) (\w) (\w)( \w)*\b/g, (match) => match.replace(/ /g, ''))

  return s
}

// ─── Out-of-Scope Guardrails (Non-Business Requests) ────────────────────────
// All patterns sourced from remy-pattern-registry.ts

/** The refusal message for out-of-scope requests */
export const OUT_OF_SCOPE_REFUSAL = REFUSAL_MESSAGES.out_of_scope

/**
 * Check if a message is requesting something outside Remy's scope.
 * Returns the refusal message if blocked, or null if the message is fine.
 */
export function checkOutOfScopeBlock(message: string): string | null {
  const normalized = normalizeForGuardCheck(message)
  for (const { pattern } of _OUT_OF_SCOPE) {
    if (pattern.test(normalized)) {
      return OUT_OF_SCOPE_REFUSAL
    }
  }
  return null
}

// ─── Dangerous/Protected Action Blocking ──────────────────────────────────────
// All patterns sourced from remy-pattern-registry.ts

/** Refusal for dangerous/protected actions */
export const DANGEROUS_ACTION_REFUSAL = REFUSAL_MESSAGES.dangerous_actions

/**
 * Check if a message is requesting a dangerous or protected action.
 * Returns the refusal message if blocked, or null if the message is safe.
 */
export function checkDangerousActionBlock(message: string): string | null {
  const normalized = normalizeForGuardCheck(message)
  for (const { pattern } of _DANGEROUS) {
    if (pattern.test(normalized)) {
      return DANGEROUS_ACTION_REFUSAL
    }
  }
  return null
}

// ─── Prompt Injection Sanitization ────────────────────────────────────────────

// Shared patterns - single source of truth for both guardrails and sanitization
import { PROMPT_INJECTION_REGEXPS } from './remy-injection-patterns'

/**
 * Strip injection patterns, collapse excessive newlines, and collapse whitespace padding.
 * Shared by sanitizeForPrompt (DB fields) and validateHistory (replayed messages).
 * Does NOT normalize Unicode, strip zero-width chars, or cap length (callers handle those).
 */
function stripInjectionPatterns(text: string): string {
  let result = text

  // Strip injection patterns entirely (not bracket-wrapped, fully removed).
  // The LLM cannot follow instructions it never sees.
  for (const pattern of PROMPT_INJECTION_REGEXPS) {
    result = result.replace(pattern, '')
  }

  // Collapse excessive newlines (injection delimiter attempts)
  result = result.replace(/\n{4,}/g, '\n\n\n')

  // Collapse runs of whitespace on a single line (padding attacks)
  result = result.replace(/[ \t]{20,}/g, ' ')

  return result
}

/**
 * Sanitize a database field value before including it in a system prompt.
 * Strips injection patterns entirely and applies structural hardening.
 *
 * Use this for ALL user-controlled database fields that get injected into prompts:
 * - client names, notes, special_requests, vibe_notes
 * - event occasions, kitchen_notes, menu_revision_notes
 * - AAR fields, recipe names, etc.
 */
export function sanitizeForPrompt(value: string | null | undefined): string {
  if (!value) return ''

  let sanitized = value

  // Unicode-normalize to NFC to prevent homoglyph bypass attacks
  // (e.g., Cyrillic 'а' instead of Latin 'a' to evade regex patterns)
  sanitized = sanitized.normalize('NFC')

  // Remove null bytes, zero-width characters, and directional overrides
  // that can evade pattern matching or flip visible text order
  sanitized = sanitized.replace(
    /[\0\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
    ''
  )

  // Strip injection patterns, collapse newlines and whitespace
  sanitized = stripInjectionPatterns(sanitized)

  // Cap length - no single database field should be more than 2000 chars in a prompt
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 2000) + '...'
  }

  return sanitized.trim()
}

/**
 * Wrap a sanitized DB field value in structural fencing for the system prompt.
 * The fence tells the LLM explicitly that content inside is user-provided data,
 * not instructions it should follow. Use this around every DB value injected
 * into system prompts, AFTER calling sanitizeForPrompt().
 *
 * @param label - a short descriptor like "special_requests" or "kitchen_notes"
 * @param value - already-sanitized value (pass through sanitizeForPrompt first)
 */
export function fenceForPrompt(label: string, value: string): string {
  if (!value) return ''
  return `<user-data field="${label}">${value}</user-data>`
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
  /db/i,
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
  fallback = 'Remy ran into an issue - try again in a moment.'
): string {
  const raw = err instanceof Error ? err.message : String(err)

  // Check if the error contains any internal patterns
  for (const pattern of INTERNAL_PATTERNS) {
    if (pattern.test(raw)) {
      console.error('[remy] Sanitized internal error from client response:', raw)
      return fallback
    }
  }

  // Also cap length - prevent giant error messages
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

    // Block link-local addresses (169.254.x.x - includes cloud metadata)
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
