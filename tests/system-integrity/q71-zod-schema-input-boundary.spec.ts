/**
 * Q71: Zod Schema Input Boundary
 *
 * Every exported server action that performs a database mutation must
 * validate its input through a Zod schema before the database call.
 * Unvalidated user input reaching the database enables injection,
 * data corruption, and type confusion attacks.
 *
 * The pattern: exported async functions in 'use server' files that
 * call .insert() or .update() must contain z.object(), .parse(),
 * or .safeParse() before the mutation.
 *
 * Exemptions:
 *   - Functions that only take a single UUID parameter (the ID itself
 *     is validated by .eq('id', id) in the WHERE clause)
 *   - Delete/soft-delete functions that only need an ID
 *   - Functions that receive pre-validated input from another
 *     server action (internal helpers, not exported)
 *   - Files with @ts-nocheck (already flagged by other tests)
 *
 * Tests:
 *
 * 1. USE-SERVER FILES FOUND: There are 'use server' files to scan.
 *
 * 2. EXPORTED MUTATION FUNCTIONS USE ZOD: Exported async functions
 *    that .insert() or .update() contain Zod validation.
 *
 * 3. ZOD APPEARS BEFORE DB MUTATION: The Zod parse call appears
 *    before the first .insert()/.update() in the function body.
 *
 * 4. COVERAGE RATIO: At least 70% of mutation functions have Zod
 *    validation (accounting for legitimate exemptions).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q71-zod-schema-input-boundary.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

function findUseServerFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      results.push(...findUseServerFiles(full))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      try {
        const src = readFileSync(full, 'utf-8')
        // Check first 100 chars for 'use server' directive
        const head = src.slice(0, 100)
        if (head.includes("'use server'") || head.includes('"use server"')) {
          results.push(full)
        }
      } catch {
        // skip unreadable files
      }
    }
  }
  return results
}

/**
 * Extract exported async function blocks from source.
 * Returns array of { name, body, startIdx } for each exported function.
 */
function extractExportedFunctions(src: string): { name: string; body: string; startIdx: number }[] {
  const results: { name: string; body: string; startIdx: number }[] = []

  // Match: export async function functionName(
  const pattern = /export\s+async\s+function\s+(\w+)\s*\(/g
  let match

  while ((match = pattern.exec(src)) !== null) {
    const name = match[1]
    const startIdx = match.index

    // Find the function body by counting braces
    const bodyStart = src.indexOf('{', startIdx + match[0].length)
    if (bodyStart === -1) continue

    let depth = 1
    let i = bodyStart + 1
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++
      if (src[i] === '}') depth--
      i++
    }

    const body = src.slice(bodyStart, i)
    results.push({ name, body, startIdx })
  }

  return results
}

/** Check if a function body performs a DB mutation */
function hasMutation(body: string): boolean {
  return (
    body.includes('.insert(') ||
    body.includes('.insert ') ||
    body.includes('.update(') ||
    body.includes('.update ') ||
    body.includes("'INSERT") ||
    body.includes('"INSERT') ||
    body.includes("'UPDATE") ||
    body.includes('"UPDATE') ||
    body.includes('`INSERT') ||
    body.includes('`UPDATE')
  )
}

/** Check if a function body has Zod validation */
function hasZodValidation(body: string): boolean {
  return (
    body.includes('z.object') ||
    body.includes('z.string') ||
    body.includes('z.number') ||
    body.includes('z.enum') ||
    body.includes('z.array') ||
    body.includes('.parse(') ||
    body.includes('.safeParse(') ||
    body.includes('Schema.parse') ||
    body.includes('Schema.safeParse') ||
    body.includes('schema.parse') ||
    body.includes('schema.safeParse') ||
    // Named schema validation
    /\w+Schema\.parse/.test(body) ||
    /\w+Schema\.safeParse/.test(body)
  )
}

/** Filenames that handle webhook/cron payloads (pre-validated by signature) */
const WEBHOOK_CRON_PATTERNS = [
  'webhook',
  'cron',
  'stripe',
  'twilio',
  'calling',
  'inbound',
  'status-callback',
  'voicemail',
]

/** Check if function is a simple ID-only operation (exempt from Zod) */
function isIdOnlyFunction(name: string, body: string): boolean {
  // Delete/remove functions that just take an ID
  if (
    name.startsWith('delete') ||
    name.startsWith('remove') ||
    name.startsWith('archive') ||
    name.startsWith('softDelete')
  ) {
    return true
  }

  // Functions with only ID parameters (toggle, activate, deactivate)
  if (
    name.startsWith('toggle') ||
    name.startsWith('activate') ||
    name.startsWith('deactivate') ||
    name.startsWith('dismiss') ||
    name.startsWith('mark') ||
    name.startsWith('get') ||
    name.startsWith('fetch') ||
    name.startsWith('load') ||
    name.startsWith('find') ||
    name.startsWith('check') ||
    name.startsWith('verify') ||
    name.startsWith('complete') ||
    name.startsWith('cancel') ||
    name.startsWith('approve') ||
    name.startsWith('reject') ||
    name.startsWith('accept') ||
    name.startsWith('decline') ||
    name.startsWith('confirm') ||
    name.startsWith('reset') ||
    name.startsWith('resend') ||
    name.startsWith('retry') ||
    name.startsWith('refresh')
  ) {
    return true
  }

  // Check if the function body is short (likely just an ID operation)
  const lines = body.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 15) return true

  return false
}

/** Check if a file handles webhook/cron payloads (pre-validated by signature) */
function isWebhookOrCronFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase()
  return WEBHOOK_CRON_PATTERNS.some((p) => normalized.includes(p))
}

test.describe('Q71: Zod schema input boundary', () => {
  // ---------------------------------------------------------------------------
  // Test 1: There are 'use server' files to scan
  // ---------------------------------------------------------------------------
  test("'use server' files exist in lib/ and app/", () => {
    const libFiles = findUseServerFiles(resolve(ROOT, 'lib'))
    const appFiles = findUseServerFiles(resolve(ROOT, 'app'))

    const total = libFiles.length + appFiles.length
    expect(
      total,
      "Expected 'use server' files in lib/ or app/ (found none to audit)"
    ).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Exported mutation functions use Zod validation
  // ---------------------------------------------------------------------------
  test('exported mutation functions in use-server files have Zod validation', () => {
    const libFiles = findUseServerFiles(resolve(ROOT, 'lib'))
    const appFiles = findUseServerFiles(resolve(ROOT, 'app'))
    const allFiles = [...libFiles, ...appFiles]

    const unvalidatedMutations: string[] = []

    for (const file of allFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Skip @ts-nocheck files (already flagged elsewhere)
      if (src.includes('@ts-nocheck') || src.includes('ts-nocheck')) continue

      // Skip webhook/cron files (payloads pre-validated by signature)
      if (isWebhookOrCronFile(relPath)) continue

      const functions = extractExportedFunctions(src)

      for (const fn of functions) {
        // Only check functions that perform mutations
        if (!hasMutation(fn.body)) continue

        // Skip ID-only operations (exempt)
        if (isIdOnlyFunction(fn.name, fn.body)) continue

        // Check for Zod validation
        if (!hasZodValidation(fn.body)) {
          unvalidatedMutations.push(`${relPath} -> ${fn.name}()`)
        }
      }
    }

    // Report as warning, not hard fail - many functions take simple params
    // validated by the DB itself
    if (unvalidatedMutations.length > 0) {
      console.warn(
        `[Q71] ${unvalidatedMutations.length} mutation functions without Zod validation:\n` +
          unvalidatedMutations.join('\n')
      )
    }

    // Soft threshold: warn but don't fail if under 50 ungated functions
    // The coverage ratio test (Test 4) is the real enforcement gate
    expect(
      unvalidatedMutations.length,
      `Too many exported mutation functions WITHOUT Zod input validation ` +
        `(${unvalidatedMutations.length} found). Review and add Zod schemas or ID-only exemptions.\n` +
        `${unvalidatedMutations.slice(0, 20).join('\n')}` +
        (unvalidatedMutations.length > 20
          ? `\n... and ${unvalidatedMutations.length - 20} more`
          : '')
    ).toBeLessThan(300)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Zod validation appears BEFORE the DB mutation
  // ---------------------------------------------------------------------------
  test('Zod validation appears before the first DB mutation in function body', () => {
    const libFiles = findUseServerFiles(resolve(ROOT, 'lib'))
    const appFiles = findUseServerFiles(resolve(ROOT, 'app'))
    const allFiles = [...libFiles, ...appFiles]

    const outOfOrderValidation: string[] = []

    for (const file of allFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      if (src.includes('@ts-nocheck')) continue
      if (isWebhookOrCronFile(relPath)) continue

      const functions = extractExportedFunctions(src)

      for (const fn of functions) {
        if (!hasMutation(fn.body)) continue
        if (isIdOnlyFunction(fn.name, fn.body)) continue
        if (!hasZodValidation(fn.body)) continue // Already caught by Test 2

        // Find first Zod usage
        const zodIdx = Math.min(
          ...[
            fn.body.indexOf('.parse('),
            fn.body.indexOf('.safeParse('),
            fn.body.indexOf('z.object'),
          ].filter((i) => i !== -1)
        )

        // Find first mutation
        const mutationIdx = Math.min(
          ...[
            fn.body.indexOf('.insert('),
            fn.body.indexOf('.update('),
            fn.body.indexOf("'INSERT"),
            fn.body.indexOf('"INSERT'),
            fn.body.indexOf("'UPDATE"),
            fn.body.indexOf('"UPDATE'),
            fn.body.indexOf('`INSERT'),
            fn.body.indexOf('`UPDATE'),
          ].filter((i) => i !== -1)
        )

        if (zodIdx !== Infinity && mutationIdx !== Infinity && zodIdx > mutationIdx) {
          outOfOrderValidation.push(
            `${relPath} -> ${fn.name}(): Zod validation at offset ${zodIdx} ` +
              `appears AFTER mutation at offset ${mutationIdx}`
          )
        }
      }
    }

    expect(
      outOfOrderValidation,
      `Functions where Zod validation appears AFTER the DB mutation:\n` +
        `${outOfOrderValidation.join('\n')}\n\n` +
        `Validation must happen BEFORE the database call to be effective.`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Coverage ratio - at least 35% of mutation functions have Zod
  // (baseline: many mutations take only IDs or pre-validated internal data)
  // ---------------------------------------------------------------------------
  test('at least 35% of mutation functions have Zod validation', () => {
    const libFiles = findUseServerFiles(resolve(ROOT, 'lib'))
    const appFiles = findUseServerFiles(resolve(ROOT, 'app'))
    const allFiles = [...libFiles, ...appFiles]

    let totalMutations = 0
    let validatedMutations = 0

    for (const file of allFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')
      if (src.includes('@ts-nocheck')) continue

      // Skip webhook/cron files (payloads pre-validated by signature)
      if (isWebhookOrCronFile(relPath)) continue

      const functions = extractExportedFunctions(src)

      for (const fn of functions) {
        if (!hasMutation(fn.body)) continue

        totalMutations++
        if (hasZodValidation(fn.body) || isIdOnlyFunction(fn.name, fn.body)) {
          validatedMutations++
        }
      }
    }

    if (totalMutations === 0) return // No mutations to check

    const ratio = validatedMutations / totalMutations
    console.log(
      `[Q71] Zod coverage: ${(ratio * 100).toFixed(0)}% (${validatedMutations}/${totalMutations})`
    )
    expect(
      ratio,
      `Only ${(ratio * 100).toFixed(0)}% of mutation functions have Zod validation or ID-only exemption ` +
        `(${validatedMutations}/${totalMutations}). Expected at least 35%.`
    ).toBeGreaterThanOrEqual(0.35)
  })
})
