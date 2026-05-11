// Remy - Output Guardrails & Safety Layer
// No 'use server' - exports pure functions and types.
// Scans Remy's streaming output before it reaches users to prevent
// PII leakage, cross-client data bleed, financial data exposure,
// and internal system reference leaks.

// ---- Types ----

export interface OutputScanResult {
  safe: boolean
  violations: OutputViolation[]
  redactedText?: string
}

export interface OutputViolation {
  type: 'pii_leak' | 'cross_client' | 'financial_data' | 'internal_data'
  severity: 'block' | 'redact' | 'warn'
  detail: string
  position: { start: number; end: number }
}

export interface OutputScanContext {
  surface: 'chef' | 'client' | 'public' | 'circle' | 'landing'
  currentUserEmail?: string
  currentClientName?: string
  otherClientNames?: string[]
}

// ---- PII Pattern Definitions ----

// Email: standard RFC-ish pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// US phone: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, xxx xxx xxxx, +1xxxxxxxxxx
const PHONE_REGEX = /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/g

// SSN: xxx-xx-xxxx (with word boundary to avoid false positives)
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g

// Credit card: 4 groups of 4 digits separated by spaces or dashes
const CC_REGEX = /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/g

// Street address: number + street name (e.g., "123 Main St", "4500 Elm Avenue")
const ADDRESS_REGEX =
  /\b\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Ct|Court|Pl|Place|Way|Cir(?:cle)?|Pkwy|Parkway|Ter(?:race)?|Loop|Run|Path|Pike|Hwy|Highway))\b\.?/gi

// ---- Financial Pattern Definitions ----

// Patterns that indicate internal financial data a client should never see
const FINANCIAL_INTERNAL_PATTERNS = [
  /\bprofit\s+margin\b/gi,
  /\bcost\s+breakdown\b/gi,
  /\brevenue\b/gi,
  /\bfood\s+cost\s*:\s*\$[\d,.]+/gi,
  /\bmargin\s*:\s*\d+(?:\.\d+)?%/gi,
  /\bcost\s*:\s*\$[\d,.]+/gi,
  /\bmarkup\s*:\s*\d+(?:\.\d+)?%/gi,
  /\boverhead\b/gi,
  /\bgross\s+profit\b/gi,
  /\bnet\s+profit\b/gi,
  /\boperating\s+cost\b/gi,
  /\blabor\s+cost\s*:\s*\$[\d,.]+/gi,
]

// ---- Internal Reference Pattern Definitions ----

// Database table names (common Postgres/Drizzle patterns)
const DB_TABLE_REGEX = /\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|JOIN|WHERE)\s+\w+/gi

// Drizzle-style table references
const DRIZZLE_TABLE_REGEX =
  /\b(?:chefs|clients|events|invoices|quotes|recipes|menus|remy_memories|remy_conversations|ledger_entries|event_transitions|quote_state_transitions|hub_groups|hub_guest_profiles|hub_group_members|hub_messages|rag_chunks|chef_settings|staff_members|ingredients|menu_items|recipe_ingredients)\b/g

// API endpoint paths
const API_PATH_REGEX = /\/api\/[a-zA-Z0-9/_-]+/g

// Error stack traces (at FileName:line:col or at Module.method)
const STACK_TRACE_REGEX = /\bat\s+(?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*\s*\([^)]*:\d+:\d+\)/g

// Internal system terms that should never reach end users
const INTERNAL_TERMS_REGEX =
  /\b(?:tenant[_-]?id|drizzle|pgvector|ollama|ECONNREFUSED|NEXT_REDIRECT|unstable_cache|revalidateTag|revalidatePath|server\s+action|middleware\.ts)\b/gi

// ---- Core Scanning Functions ----

function scanPII(text: string, currentUserEmail?: string): OutputViolation[] {
  const violations: OutputViolation[] = []

  // Emails
  let match: RegExpExecArray | null
  const emailRegex = new RegExp(EMAIL_REGEX.source, 'g')
  while ((match = emailRegex.exec(text)) !== null) {
    const foundEmail = match[0].toLowerCase()
    // Allow the current user's own email
    if (currentUserEmail && foundEmail === currentUserEmail.toLowerCase()) {
      continue
    }
    violations.push({
      type: 'pii_leak',
      severity: 'redact',
      detail: `Email address detected: ${match[0]}`,
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  // Phone numbers
  const phoneRegex = new RegExp(PHONE_REGEX.source, 'g')
  while ((match = phoneRegex.exec(text)) !== null) {
    violations.push({
      type: 'pii_leak',
      severity: 'redact',
      detail: `Phone number detected: ${match[0]}`,
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  // SSNs (always block, never just redact)
  const ssnRegex = new RegExp(SSN_REGEX.source, 'g')
  while ((match = ssnRegex.exec(text)) !== null) {
    violations.push({
      type: 'pii_leak',
      severity: 'block',
      detail: 'SSN pattern detected',
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  // Credit cards (always block)
  const ccRegex = new RegExp(CC_REGEX.source, 'g')
  while ((match = ccRegex.exec(text)) !== null) {
    violations.push({
      type: 'pii_leak',
      severity: 'block',
      detail: 'Credit card number pattern detected',
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  // Street addresses
  const addrRegex = new RegExp(ADDRESS_REGEX.source, 'gi')
  while ((match = addrRegex.exec(text)) !== null) {
    violations.push({
      type: 'pii_leak',
      severity: 'redact',
      detail: `Street address detected: ${match[0]}`,
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  return violations
}

function scanCrossClient(
  text: string,
  currentClientName?: string,
  otherClientNames?: string[]
): OutputViolation[] {
  if (!otherClientNames || otherClientNames.length === 0) return []

  const violations: OutputViolation[] = []

  for (const name of otherClientNames) {
    if (!name || name.length < 2) continue
    // Skip if this is the current client name (case-insensitive)
    if (currentClientName && name.toLowerCase() === currentClientName.toLowerCase()) continue

    // Use word-boundary matching to avoid false positives on short names
    // For names shorter than 4 chars, require exact word match
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi')
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      violations.push({
        type: 'cross_client',
        severity: 'block',
        detail: `Another client's name "${name}" appeared in this response`,
        position: { start: match.index, end: match.index + match[0].length },
      })
    }
  }

  return violations
}

function scanFinancialData(text: string): OutputViolation[] {
  const violations: OutputViolation[] = []

  for (const pattern of FINANCIAL_INTERNAL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      violations.push({
        type: 'financial_data',
        severity: 'redact',
        detail: `Internal financial data detected: ${match[0]}`,
        position: { start: match.index, end: match.index + match[0].length },
      })
    }
  }

  return violations
}

function scanInternalReferences(text: string): OutputViolation[] {
  const violations: OutputViolation[] = []
  let match: RegExpExecArray | null

  // SQL statements
  const sqlRegex = new RegExp(DB_TABLE_REGEX.source, 'gi')
  while ((match = sqlRegex.exec(text)) !== null) {
    violations.push({
      type: 'internal_data',
      severity: 'redact',
      detail: `SQL statement detected: ${match[0]}`,
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  // Drizzle table names (only flag when they appear in a technical context)
  const drizzleRegex = new RegExp(DRIZZLE_TABLE_REGEX.source, 'g')
  while ((match = drizzleRegex.exec(text)) !== null) {
    // Only flag if surrounded by technical context (dots, underscores, backticks)
    const before = text[match.index - 1] || ''
    const after = text[match.index + match[0].length] || ''
    if (
      before === '.' ||
      before === '`' ||
      after === '.' ||
      after === '`' ||
      match[0].includes('_')
    ) {
      violations.push({
        type: 'internal_data',
        severity: 'warn',
        detail: `Database table reference detected: ${match[0]}`,
        position: { start: match.index, end: match.index + match[0].length },
      })
    }
  }

  // API paths
  const apiRegex = new RegExp(API_PATH_REGEX.source, 'g')
  while ((match = apiRegex.exec(text)) !== null) {
    violations.push({
      type: 'internal_data',
      severity: 'redact',
      detail: `API endpoint detected: ${match[0]}`,
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  // Stack traces (always block; indicates an unhandled error leak)
  const stackRegex = new RegExp(STACK_TRACE_REGEX.source, 'g')
  while ((match = stackRegex.exec(text)) !== null) {
    violations.push({
      type: 'internal_data',
      severity: 'block',
      detail: 'Error stack trace detected',
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  // Internal system terms
  const termsRegex = new RegExp(INTERNAL_TERMS_REGEX.source, 'gi')
  while ((match = termsRegex.exec(text)) !== null) {
    violations.push({
      type: 'internal_data',
      severity: 'redact',
      detail: `Internal system term detected: ${match[0]}`,
      position: { start: match.index, end: match.index + match[0].length },
    })
  }

  return violations
}

// ---- Main Scanner ----

/**
 * Scans output text for safety violations based on the target surface.
 *
 * - chef: PII only (chef sees their own business data)
 * - client: all 4 layers
 * - public/landing: all 4 layers (strictest)
 * - circle: PII + cross-client + financial
 */
export function scanOutput(text: string, context: OutputScanContext): OutputScanResult {
  const violations: OutputViolation[] = []

  // Layer 1: PII patterns (all surfaces)
  violations.push(...scanPII(text, context.currentUserEmail))

  // Chef surface only gets PII scanning
  if (context.surface === 'chef') {
    return buildResult(text, violations)
  }

  // Layer 2: Cross-client boundary (client, public, landing, circle)
  violations.push(...scanCrossClient(text, context.currentClientName, context.otherClientNames))

  // Layer 3: Financial data guard (client, public, landing, circle)
  violations.push(...scanFinancialData(text))

  // Layer 4: Internal reference guard (client, public, landing only; not circle for chef members)
  if (context.surface !== 'circle') {
    violations.push(...scanInternalReferences(text))
  }

  return buildResult(text, violations)
}

function buildResult(text: string, violations: OutputViolation[]): OutputScanResult {
  if (violations.length === 0) {
    return { safe: true, violations: [] }
  }

  // Log all violations for monitoring
  for (const v of violations) {
    console.warn('[Remy Output Guard]', v.type, v.severity, v.detail)
  }

  // Check for any block-severity violation
  const hasBlock = violations.some((v) => v.severity === 'block')
  if (hasBlock) {
    return { safe: false, violations }
  }

  // Apply redactions (process from end to start to preserve positions)
  const redactViolations = violations
    .filter((v) => v.severity === 'redact')
    .sort((a, b) => b.position.start - a.position.start)

  let redactedText = text
  for (const v of redactViolations) {
    redactedText =
      redactedText.slice(0, v.position.start) + '[redacted]' + redactedText.slice(v.position.end)
  }

  // If only warn-level violations, no text changes needed
  if (redactViolations.length === 0) {
    return { safe: true, violations }
  }

  return { safe: true, violations, redactedText }
}

// ---- Stateful Stream Scanner ----

/**
 * Creates a stateful scanner that buffers tokens and scans at sentence boundaries.
 * Usage:
 *   const scanner = createStreamScanner(context)
 *   for each token:
 *     const result = scanner.feed(token)
 *     if result is not null, handle it
 *   const final = scanner.flush()
 *   if final is not null, handle it
 *
 * Each call to feed/flush returns null (still buffering) or a ScanChunkResult.
 */
export interface ScanChunkResult {
  safe: boolean
  text: string
  violations: OutputViolation[]
}

export function createStreamScanner(context: OutputScanContext) {
  let buffer = ''

  return {
    /**
     * Feed a token into the scanner. Returns a result when a sentence
     * boundary is detected, or null if still accumulating.
     */
    feed(token: string): ScanChunkResult | null {
      buffer += token

      // Look for sentence boundary: ., !, ?, or newline followed by optional whitespace
      const boundaryMatch = buffer.match(/^(.*[.!?\n])\s*(.*)$/s)
      if (!boundaryMatch) return null

      const completeSentence = boundaryMatch[1]
      buffer = boundaryMatch[2] // remainder

      const scan = scanOutput(completeSentence, context)
      if (!scan.safe) {
        // Block: signal caller to terminate
        return {
          safe: false,
          text: 'I need to rephrase that. Let me try again.',
          violations: scan.violations,
        }
      }

      return {
        safe: true,
        text: scan.redactedText ?? completeSentence,
        violations: scan.violations,
      }
    },

    /**
     * Flush any remaining buffered text. Call this after the stream ends.
     */
    flush(): ScanChunkResult | null {
      if (!buffer) return null

      const remaining = buffer
      buffer = ''

      const scan = scanOutput(remaining, context)
      if (!scan.safe) {
        return {
          safe: false,
          text: '[redacted]',
          violations: scan.violations,
        }
      }

      return {
        safe: true,
        text: scan.redactedText ?? remaining,
        violations: scan.violations,
      }
    },
  }
}
