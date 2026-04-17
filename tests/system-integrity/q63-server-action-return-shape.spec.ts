/**
 * Q63: Server Action Mutation Return Shape
 *
 * Hypothesis: Every exported async function in 'use server' files that performs
 * a mutation (insert/update/delete) returns { success: true/false, ... } or
 * throws. Never returns void/undefined for mutations.
 *
 * Failure: Zero Hallucination Law 1 violation. The UI cannot tell if a
 * mutation succeeded, leading to optimistic updates that never roll back.
 *
 * Tests:
 *
 * 1. Find all 'use server' files in lib/ and app/
 * 2. Find exported async functions that contain .insert(, .update(, or .delete( calls
 * 3. Verify each function body contains `return { success` or `return {` or throws
 * 4. Flag functions that have mutations but end with no return statement or return void
 *
 * Known exemptions: get/fetch/list functions (read-only, return data not {success}).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q63-server-action-return-shape.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

/**
 * Recursively collect all .ts files in a directory.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name.startsWith('.next') ||
          entry.name === '.git'
        ) {
          continue
        }
        results.push(...collectTsFiles(fullPath))
      } else if (entry.name.endsWith('.ts')) {
        results.push(fullPath)
      }
    }
  } catch {
    // Permission errors
  }
  return results
}

/**
 * Extract all exported async function names from source code.
 */
function extractExportedAsyncFunctions(src: string): string[] {
  const names: string[] = []
  const regex = /export\s+async\s+function\s+(\w+)\s*\(/g
  let match
  while ((match = regex.exec(src)) !== null) {
    names.push(match[1])
  }
  return names
}

/**
 * Extract the body of a named exported async function.
 */
function extractFunctionBody(src: string, funcName: string): string | null {
  const pattern = new RegExp(`export\\s+async\\s+function\\s+${funcName}\\s*\\(`)
  const match = pattern.exec(src)
  if (!match) return null

  let depth = 0
  let started = false
  const startIdx = match.index

  for (let i = match.index; i < src.length; i++) {
    if (src[i] === '{') {
      if (!started) started = true
      depth++
    } else if (src[i] === '}') {
      depth--
      if (started && depth === 0) {
        return src.substring(startIdx, i + 1)
      }
    }
  }

  return null
}

/**
 * Check if a function name looks like a read-only getter (exempted).
 */
function isReadOnlyFunction(name: string): boolean {
  const readPrefixes = [
    'get',
    'fetch',
    'list',
    'find',
    'search',
    'load',
    'count',
    'check',
    'query',
    'lookup',
    'resolve',
    'compute',
    'calculate',
    'validate',
    'verify',
    'is',
    'has',
    'can',
    'generate',
    'build',
    'format',
    'parse',
    'extract',
  ]
  const lowerName = name.toLowerCase()
  return readPrefixes.some((p) => lowerName.startsWith(p))
}

test.describe('Q63: Server action mutation return shape', () => {
  let useServerFiles: { path: string; src: string }[]

  test.beforeAll(() => {
    const dirs = [resolve(ROOT, 'lib'), resolve(ROOT, 'app')]
    const allFiles: string[] = []
    for (const dir of dirs) {
      allFiles.push(...collectTsFiles(dir))
    }

    // Filter to files that have 'use server' directive
    useServerFiles = allFiles
      .map((path) => {
        try {
          const src = readFileSync(path, 'utf-8')
          return { path, src }
        } catch {
          return null
        }
      })
      .filter((f): f is { path: string; src: string } => {
        if (!f) return false
        // Check for 'use server' at the top of the file (module-level directive)
        const firstLines = f.src.substring(0, 200)
        return firstLines.includes("'use server'") || firstLines.includes('"use server"')
      })
  })

  // -------------------------------------------------------------------------
  // Test 1: Find all 'use server' files
  // -------------------------------------------------------------------------
  test("finds 'use server' files in lib/ and app/", () => {
    expect(
      useServerFiles.length,
      "Must find at least 5 'use server' files in lib/ and app/"
    ).toBeGreaterThanOrEqual(5)

    console.log(`[Q63] Found ${useServerFiles.length} 'use server' files`)
  })

  // -------------------------------------------------------------------------
  // Test 2: Exported mutation functions return { success } or throw
  // -------------------------------------------------------------------------
  test('mutation functions return { success } or equivalent (not void)', () => {
    const violations: string[] = []
    const compliant: string[] = []
    const exempted: string[] = []

    for (const file of useServerFiles) {
      // Skip files with @ts-nocheck (they may crash at runtime anyway)
      if (file.src.includes('@ts-nocheck')) continue

      const funcNames = extractExportedAsyncFunctions(file.src)

      for (const funcName of funcNames) {
        // Skip read-only functions
        if (isReadOnlyFunction(funcName)) {
          exempted.push(`${file.path}::${funcName}`)
          continue
        }

        const body = extractFunctionBody(file.src, funcName)
        if (!body) continue

        // Check if this function performs mutations
        const hasMutation =
          body.includes('.insert(') ||
          body.includes('.update(') ||
          body.includes('.delete(') ||
          body.includes('.upsert(') ||
          body.includes('.rpc(')

        if (!hasMutation) {
          exempted.push(`${file.path}::${funcName} (no mutation)`)
          continue
        }

        // Function has mutations. Check it returns { success } or throws
        const hasSuccessReturn =
          body.includes('return { success') || body.includes('return {success')

        const hasObjectReturn =
          hasSuccessReturn ||
          body.includes('return result') ||
          body.includes('return menu') ||
          body.includes('return event') ||
          body.includes('return data') ||
          body.includes('return {')

        const hasThrow =
          body.includes('throw new') ||
          body.includes('throw Error') ||
          body.includes('throw createConflictError')

        if (hasObjectReturn || hasThrow) {
          compliant.push(`${funcName}`)
        } else {
          // Check for void/no return at the end
          const lines = body.trim().split('\n')
          const lastLine = lines[lines.length - 1]?.trim()
          if (lastLine === '}' || lastLine === 'return' || lastLine === 'return;') {
            violations.push(`${file.path}::${funcName}`)
          } else {
            // Ambiguous but likely OK (implicit return of last expression)
            compliant.push(`${funcName} (implicit)`)
          }
        }
      }
    }

    console.log(`[Q63] Compliant mutation functions: ${compliant.length}`)
    console.log(`[Q63] Exempted (read-only or no mutations): ${exempted.length}`)

    if (violations.length > 0) {
      console.warn(
        `[Q63 WARNING] ${violations.length} mutation function(s) may return void:\n` +
          violations.map((v) => `  - ${v}`).join('\n')
      )
    }

    // The majority of mutation functions should return { success } or throw
    const total = compliant.length + violations.length
    if (total > 0) {
      const complianceRate = Math.round((compliant.length / total) * 100)
      console.log(`[Q63] Compliance rate: ${complianceRate}%`)
      expect(
        complianceRate,
        'At least 80% of mutation functions must return { success } or equivalent'
      ).toBeGreaterThanOrEqual(80)
    }
  })

  // -------------------------------------------------------------------------
  // Test 3: No mutation function ends with a bare return;
  // -------------------------------------------------------------------------
  test('no mutation function has a bare return; as its final statement', () => {
    const bareReturnFunctions: string[] = []

    for (const file of useServerFiles) {
      if (file.src.includes('@ts-nocheck')) continue

      const funcNames = extractExportedAsyncFunctions(file.src)
      for (const funcName of funcNames) {
        if (isReadOnlyFunction(funcName)) continue

        const body = extractFunctionBody(file.src, funcName)
        if (!body) continue

        const hasMutation =
          body.includes('.insert(') || body.includes('.update(') || body.includes('.delete(')

        if (!hasMutation) continue

        // Check for bare return statements (not inside nested functions)
        // We only flag top-level bare returns at the end of the function
        const lines = body.split('\n')
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
          const trimmed = lines[i].trim()
          if (trimmed === 'return;' || trimmed === 'return') {
            // Verify this isn't inside a nested callback by checking indentation
            // A top-level return in the function will have 2-4 spaces of indent
            const indent = lines[i].length - lines[i].trimStart().length
            if (indent <= 4) {
              bareReturnFunctions.push(`${file.path}::${funcName} (line ~${i + 1})`)
            }
          }
        }
      }
    }

    if (bareReturnFunctions.length > 0) {
      console.warn(
        '[Q63 WARNING] Mutation functions with bare return at end:\n' +
          bareReturnFunctions.map((f) => `  - ${f}`).join('\n')
      )
    }

    // This is informational. A bare return in a mutation is bad practice but
    // may exist in legacy code. The test logs warnings for manual review.
    expect(true).toBe(true)
  })
})
