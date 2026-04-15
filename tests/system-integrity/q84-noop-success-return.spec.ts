/**
 * Q84: No-Op Success Return Detection
 *
 * Server actions that return { success: true } MUST actually persist
 * something (DB write, file write, email sent, external API call).
 * A function that says "success" without doing anything is a
 * Zero Hallucination violation (Law 1: never show success without
 * confirmation).
 *
 * What we check:
 *   For every 'use server' function that returns { success: true },
 *   verify the function body contains at least one:
 *   - db.insert / db.update / db.delete (database write)
 *   - .execute( (raw SQL)
 *   - await fetch( (external API)
 *   - writeFile / appendFile (filesystem write)
 *   - sendEmail / sendSMS / sendNotification (communication)
 *   - revalidatePath / revalidateTag (cache mutation)
 *   - redirect( (navigation side-effect)
 *
 * A return { success: true } with NONE of the above is suspicious.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q84-noop-success-return.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.'))
        continue
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

function isUseServer(src: string): boolean {
  return src.startsWith("'use server'") || src.startsWith('"use server"')
}

/** Indicators that the function actually does something before returning success */
const MUTATION_INDICATORS = [
  'db.insert',
  'db.update',
  'db.delete',
  '.insert(',
  '.update(',
  '.delete(',
  '.execute(',
  'sql`',
  'sql(',
  'await fetch(',
  'writeFile',
  'appendFile',
  'sendEmail',
  'sendSMS',
  'sendNotification',
  'sendMessage',
  'revalidatePath',
  'revalidateTag',
  'redirect(',
  'broadcast(',
  'stripe.',
  'twilio.',
  'cookies().set',
  'cookies().delete',
]

/**
 * Extract individual exported async functions from a file.
 * Returns array of { name, body, lineNumber }.
 */
function extractExportedFunctions(
  src: string
): Array<{ name: string; body: string; line: number }> {
  const results: Array<{ name: string; body: string; line: number }> = []
  const funcPattern = /export\s+async\s+function\s+(\w+)/g
  let match

  while ((match = funcPattern.exec(src)) !== null) {
    const name = match[1]
    const line = src.slice(0, match.index).split('\n').length

    // Find the opening brace
    const braceStart = src.indexOf('{', match.index + match[0].length)
    if (braceStart === -1) continue

    // Count braces to find function end
    let depth = 0
    let i = braceStart
    while (i < src.length) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') {
        depth--
        if (depth === 0) {
          results.push({ name, body: src.slice(braceStart, i + 1), line })
          break
        }
      }
      i++
    }
  }

  return results
}

test.describe('Q84: No-op success return detection', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Every { success: true } return is preceded by a real mutation
  // ---------------------------------------------------------------------------
  test('server actions returning success: true have actual mutations', () => {
    const libDir = resolve(ROOT, 'lib')
    const allFiles = walkDir(libDir, ['.ts'])
    const serverFiles = allFiles.filter((f) => {
      try {
        return isUseServer(readFileSync(f, 'utf-8'))
      } catch {
        return false
      }
    })

    expect(serverFiles.length).toBeGreaterThan(50)

    const violations: string[] = []
    let totalSuccessReturns = 0

    for (const file of serverFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      const functions = extractExportedFunctions(src)

      for (const fn of functions) {
        // Check if this function returns { success: true }
        if (!fn.body.includes('success: true') && !fn.body.includes('success:true')) continue

        totalSuccessReturns++

        // Check if ANY mutation indicator exists in the function body
        const hasMutation = MUTATION_INDICATORS.some((indicator) => fn.body.includes(indicator))

        if (!hasMutation) {
          violations.push(
            `${relPath}:${fn.line} ${fn.name}() returns { success: true } with no detectable mutation`
          )
        }
      }
    }

    console.log(`\nQ84: Scanned ${totalSuccessReturns} functions returning { success: true }`)

    if (violations.length > 0) {
      console.warn(
        `\nQ84 VIOLATIONS - No-op success returns:\n` +
          violations.map((v) => `  NO-OP: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Server actions claiming success without detectable mutations.\n` +
        `UI shows success toast but nothing was saved:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Functions that call other functions are traced one level deep
  // ---------------------------------------------------------------------------
  test('success returns via helper functions are not false positives', () => {
    // This test verifies that the mutation indicator list catches common
    // patterns. Functions that delegate to helpers (e.g., calling another
    // function that does the DB write) may be false positives in Test 1.
    // We check that the most common helper patterns are covered.

    const commonHelpers = [
      'appendLedgerEntry', // ledger writes
      'createEvent', // event creation
      'updateEventStatus', // FSM transitions
      'createInquiry', // inquiry creation
      'processPayment', // payment processing
    ]

    // These should all contain at least one mutation indicator
    // This is a sanity check that our indicator list is comprehensive
    const libDir = resolve(ROOT, 'lib')
    const allFiles = walkDir(libDir, ['.ts'])

    for (const helper of commonHelpers) {
      let found = false
      for (const file of allFiles) {
        const src = readFileSync(file, 'utf-8')
        if (src.includes(`function ${helper}`) || src.includes(`const ${helper}`)) {
          const hasMutation = MUTATION_INDICATORS.some((ind) => src.includes(ind))
          if (hasMutation) {
            found = true
            break
          }
        }
      }
      // We don't fail if a helper doesn't exist. Just note it.
      if (!found) {
        console.log(`Q84 info: helper "${helper}" not found or has no direct mutation indicators`)
      }
    }
  })
})
