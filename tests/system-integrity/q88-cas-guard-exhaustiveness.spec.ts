/**
 * Q88: CAS Guard Exhaustiveness
 *
 * Every state-changing mutation where double-execution causes harm
 * must have a CAS (Compare-And-Swap) guard. Without it:
 *   - A network retry can transition an event twice
 *   - A double-click can record a payment twice
 *   - A race condition can append duplicate ledger entries
 *
 * CAS pattern: .where(eq(table.status, expectedStatus)) on UPDATE
 * Idempotency pattern: ON CONFLICT DO NOTHING on INSERT
 *
 * What we check:
 *   1. Every UPDATE on a status column includes a WHERE clause
 *      that checks the current status (CAS guard)
 *   2. Ledger append operations have idempotency protection
 *   3. FSM transition functions check current state before transitioning
 *
 * Scope: lib/events/, lib/quotes/, lib/ledger/, lib/commerce/,
 *        lib/payments/, lib/invoices/
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q88-cas-guard-exhaustiveness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

const FSM_DIRS = [
  'lib/events',
  'lib/quotes',
  'lib/ledger',
  'lib/commerce',
  'lib/payments',
  'lib/contracts',
]

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}

/** Check if a status update has a CAS guard nearby */
function hasCASGuard(src: string, updateIndex: number): boolean {
  // Look at the surrounding ~500 chars for CAS indicators
  const contextStart = Math.max(0, updateIndex - 200)
  const contextEnd = Math.min(src.length, updateIndex + 500)
  const context = src.slice(contextStart, contextEnd)

  return (
    // Drizzle-style: .where(eq(table.status, currentStatus))
    (context.includes('.eq(') && context.includes('status')) ||
    (context.includes('eq(') && context.includes('status')) ||
    // SQL template literal: WHERE status = $currentStatus
    (context.includes('WHERE') && context.includes('status')) ||
    (context.includes('where') && context.includes('status')) ||
    // Compat shim: .eq('status', expectedStatus)
    context.includes(".eq('status'") ||
    context.includes('.eq("status"') ||
    // Generic CAS comment
    context.includes('CAS') ||
    context.includes('compare-and-swap') ||
    context.includes('optimistic lock') ||
    context.includes('idempoten')
  )
}

test.describe('Q88: CAS guard exhaustiveness', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Status column updates have CAS guards
  // ---------------------------------------------------------------------------
  test('status column updates include a CAS WHERE clause', () => {
    const violations: string[] = []

    for (const dir of FSM_DIRS) {
      const fullDir = resolve(ROOT, dir)
      if (!existsSync(fullDir)) continue

      const files = walkDir(fullDir, ['.ts'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        // Pattern: .update(...).set({ status: ... }) or .set({ status: newStatus })
        // in the Drizzle ORM or compat shim
        const statusUpdatePatterns = [
          // Compat shim: .update({ status: 'newStatus' })
          /\.update\(\s*\{[^}]*status\s*:/g,
          // SQL: SET status =
          /SET\s+status\s*=/gi,
          // Drizzle: .set({ status: ... })
          /\.set\(\s*\{[^}]*status\s*:/g,
        ]

        for (const pattern of statusUpdatePatterns) {
          let match
          while ((match = pattern.exec(src)) !== null) {
            // Skip if in a comment
            const lineStart = src.lastIndexOf('\n', match.index) + 1
            const linePrefix = src.slice(lineStart, match.index).trim()
            if (linePrefix.startsWith('//') || linePrefix.startsWith('*')) continue

            if (!hasCASGuard(src, match.index)) {
              const lineNum = src.slice(0, match.index).split('\n').length
              violations.push(
                `${relPath}:${lineNum} status update without CAS guard: ${match[0].slice(0, 50)}`
              )
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ88 VIOLATIONS - Status updates without CAS guards:\n` +
          violations.map((v) => `  NO CAS: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Status column updates without CAS guards (Compare-And-Swap).\n` +
        `Double-execution can cause invalid state transitions:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Ledger append operations have idempotency protection
  // ---------------------------------------------------------------------------
  test('ledger append operations have idempotency guards', () => {
    const ledgerDir = resolve(ROOT, 'lib/ledger')
    if (!existsSync(ledgerDir)) return

    const files = walkDir(ledgerDir, ['.ts'])
    const violations: string[] = []

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Find insert operations in ledger files
      const insertPatterns = [/\.insert\(/g, /INSERT\s+INTO/gi]

      for (const pattern of insertPatterns) {
        let match
        while ((match = pattern.exec(src)) !== null) {
          const lineStart = src.lastIndexOf('\n', match.index) + 1
          const linePrefix = src.slice(lineStart, match.index).trim()
          if (linePrefix.startsWith('//') || linePrefix.startsWith('*')) continue

          // Look for idempotency protection
          const context = src.slice(
            Math.max(0, match.index - 300),
            Math.min(src.length, match.index + 500)
          )

          const hasIdempotency =
            context.includes('ON CONFLICT') ||
            context.includes('onConflict') ||
            context.includes('idempotency') ||
            context.includes('idempotent') ||
            context.includes('duplicate') ||
            context.includes('existing') ||
            context.includes('upsert') ||
            // Transaction-based protection
            context.includes('transaction') ||
            context.includes('BEGIN') ||
            // Check-before-insert
            context.includes('SELECT') ||
            context.includes('.select(')

          if (!hasIdempotency) {
            const lineNum = src.slice(0, match.index).split('\n').length
            violations.push(`${relPath}:${lineNum} ledger insert without idempotency guard`)
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ88 WARNING - Ledger inserts without idempotency:\n` +
          violations.map((v) => `  NO IDEMPOTENCY: ${v}`).join('\n')
      )
    }

    // Ledger is append-only and immutable. Duplicate entries are catastrophic.
    expect(
      violations,
      `Ledger insert operations without idempotency guards.\n` +
        `A network retry could create duplicate ledger entries:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: FSM transition function checks current state
  // ---------------------------------------------------------------------------
  test('FSM transition functions verify current state before transitioning', () => {
    const transitionFile = resolve(ROOT, 'lib/events/transitions.ts')
    if (!existsSync(transitionFile)) return

    const src = readFileSync(transitionFile, 'utf-8')
    const relPath = relative(ROOT, transitionFile).replace(/\\/g, '/')

    // The transition function should:
    // 1. Accept a current/expected status parameter
    // 2. Validate the transition is allowed
    // 3. Use CAS on the actual update

    const hasStateValidation =
      src.includes('VALID_TRANSITIONS') ||
      src.includes('validTransitions') ||
      src.includes('allowedTransitions') ||
      src.includes('canTransition') ||
      src.includes('isValidTransition')

    expect(
      hasStateValidation,
      `${relPath} does not appear to validate transitions against a state machine map`
    ).toBeTruthy()

    // Check that the update uses CAS
    const hasUpdateWithCAS =
      (src.includes('.update(') || src.includes('UPDATE')) &&
      (src.includes("eq('status'") || (src.includes('eq(') && src.includes('status')))

    expect(
      hasUpdateWithCAS,
      `${relPath} updates status without a CAS guard on the current state`
    ).toBeTruthy()
  })

  // ---------------------------------------------------------------------------
  // Test 4: Payment recording has duplicate protection
  // ---------------------------------------------------------------------------
  test('payment recording functions have duplicate protection', () => {
    const paymentDirs = [resolve(ROOT, 'lib/payments'), resolve(ROOT, 'lib/commerce')]

    const violations: string[] = []

    for (const dir of paymentDirs) {
      if (!existsSync(dir)) continue

      const files = walkDir(dir, ['.ts'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        // Find functions that record payments (exact name match, not prefix)
        const paymentFunctions =
          /export\s+async\s+function\s+(recordPayment|processPayment|capturePayment|createPayment)\b/g
        let match
        while ((match = paymentFunctions.exec(src)) !== null) {
          // Extract full function body using brace counting
          const braceStart = src.indexOf('{', match.index + match[0].length)
          if (braceStart === -1) continue
          let depth = 0
          let i = braceStart
          while (i < src.length) {
            if (src[i] === '{') depth++
            else if (src[i] === '}') {
              depth--
              if (depth === 0) break
            }
            i++
          }
          const funcBody = src.slice(braceStart, i + 1)

          const hasDuplicateProtection =
            funcBody.includes('idempotency') ||
            funcBody.includes('idempotent') ||
            funcBody.includes('ON CONFLICT') ||
            funcBody.includes('onConflict') ||
            funcBody.includes('stripe_payment_intent_id') || // Stripe's own idempotency
            funcBody.includes('payment_intent') ||
            funcBody.includes('23505') || // PostgreSQL unique violation code
            funcBody.includes('duplicate') ||
            funcBody.includes('already')

          if (!hasDuplicateProtection) {
            const lineNum = src.slice(0, match.index).split('\n').length
            violations.push(
              `${relPath}:${lineNum} ${match[1]}() lacks duplicate payment protection`
            )
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ88 VIOLATIONS - Payment functions without duplicate protection:\n` +
          violations.map((v) => `  DOUBLE CHARGE: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Payment recording functions without duplicate/idempotency protection.\n` +
        `A retry could charge the client twice:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })
})
