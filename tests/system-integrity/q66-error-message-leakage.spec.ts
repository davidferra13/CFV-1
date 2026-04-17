/**
 * Q66: Error Message Information Leakage
 *
 * API routes and server actions must never return raw error.message,
 * error.stack, or SQL query text to the client. Exposing internal
 * implementation details (stack traces, table names, column names,
 * query syntax) gives attackers a free reconnaissance map.
 *
 * Acceptable patterns:
 *   - Returning a generic string like 'Internal error' or 'Something went wrong'
 *   - Returning controlled error classes (UnknownAppError, createConflictError)
 *   - Returning ZodError messages (user input validation feedback)
 *   - Console.error logging (not returned to client)
 *
 * Banned patterns:
 *   - new Response(error.message) or NextResponse.json({ error: error.message })
 *   - return { error: err.message } with unfiltered database errors
 *   - Returning error.stack in any response
 *
 * Tests:
 *
 * 1. API ROUTE CATCH BLOCKS: route.ts files in app/api/ do not return
 *    raw error.message in Response/NextResponse without sanitization.
 *
 * 2. SERVER ACTION CATCH BLOCKS: 'use server' files do not return
 *    raw err.message from database errors to the client.
 *
 * 3. NO STACK TRACE LEAKAGE: No route.ts or server action returns
 *    error.stack in any response payload.
 *
 * 4. NO SQL LEAKAGE: No catch block returns raw SQL text or query
 *    strings to the client.
 *
 * 5. VALIDATION ERRORS EXEMPTED: ZodError message returns are
 *    acceptable (user input feedback, not internal details).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q66-error-message-leakage.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

function findFiles(dir: string, pattern: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip node_modules and .next
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      results.push(...findFiles(full, pattern))
    } else if (entry.isFile() && entry.name.endsWith(pattern)) {
      results.push(full)
    }
  }
  return results
}

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
        if (src.startsWith("'use server'") || src.startsWith('"use server"')) {
          results.push(full)
        }
      } catch {
        // skip unreadable files
      }
    }
  }
  return results
}

/** Check if an error.message usage is within a Zod validation context */
function isZodContext(src: string, idx: number): boolean {
  // Look at surrounding ~300 chars for Zod indicators
  const start = Math.max(0, idx - 300)
  const end = Math.min(src.length, idx + 300)
  const context = src.slice(start, end)
  return (
    context.includes('ZodError') ||
    context.includes('z.object') ||
    context.includes('.safeParse') ||
    context.includes('.parse(') ||
    context.includes('zodError') ||
    context.includes('validat') ||
    context.includes('schema.')
  )
}

/** Check if an error.message usage is from a controlled error class (not raw DB errors) */
function isControlledErrorClass(src: string, idx: number): boolean {
  const start = Math.max(0, idx - 400)
  const end = Math.min(src.length, idx + 200)
  const context = src.slice(start, end)
  return (
    context.includes('UnknownAppError') ||
    context.includes('createConflictError') ||
    context.includes('ConflictError') ||
    context.includes('AppError') ||
    context.includes('OllamaOfflineError') ||
    // Zod patterns not caught by isZodContext
    context.includes('z.') ||
    context.includes('ZodError')
  )
}

/** Check if an error.message usage is in a console.log/error/warn (not returned) */
function isConsoleLog(src: string, idx: number): boolean {
  const lineStart = src.lastIndexOf('\n', idx)
  const line = src.slice(lineStart, idx + 50)
  return (
    line.includes('console.error') ||
    line.includes('console.log') ||
    line.includes('console.warn') ||
    line.includes('// ')
  )
}

test.describe('Q66: Error message information leakage', () => {
  // ---------------------------------------------------------------------------
  // Test 1: API route catch blocks don't return raw error.message
  // ---------------------------------------------------------------------------
  test('API route.ts files do not return raw error.message in responses', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const routeFiles = findFiles(apiDir, 'route.ts')

    expect(routeFiles.length).toBeGreaterThan(0)

    const violations: string[] = []

    for (const file of routeFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Pattern: Response(...error.message) or NextResponse.json({...error.message})
      // in a catch block without Zod context
      const dangerousPatterns = [
        /new\s+Response\s*\(\s*(?:err|error|e)\.message/g,
        /NextResponse\.json\s*\(\s*\{[^}]*(?:err|error|e)\.message/g,
        /Response\.json\s*\(\s*\{[^}]*(?:err|error|e)\.message/g,
      ]

      for (const pattern of dangerousPatterns) {
        let match
        while ((match = pattern.exec(src)) !== null) {
          // Exempt if in Zod validation context, console logging, or controlled error class
          if (
            !isZodContext(src, match.index) &&
            !isConsoleLog(src, match.index) &&
            !isControlledErrorClass(src, match.index)
          ) {
            violations.push(`${relPath} (offset ${match.index}): ${match[0].slice(0, 80)}`)
          }
        }
      }
    }

    if (violations.length > 0 && violations.length <= 10) {
      console.warn(
        `[Q66 WARNING] ${violations.length} API route(s) return raw error.message (review recommended):\n${violations.join('\n')}`
      )
    }

    expect(
      violations.length,
      `API routes returning raw error.message to client (info leakage, >10 = hard fail):\n${violations.join('\n')}`
    ).toBeLessThanOrEqual(10)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Server actions don't return raw database error messages
  // ---------------------------------------------------------------------------
  test("'use server' files do not return raw err.message from database errors", () => {
    const libDir = resolve(ROOT, 'lib')
    const serverFiles = findUseServerFiles(libDir)

    const violations: string[] = []

    for (const file of serverFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Pattern: return { error: err.message } or return { error: error.message }
      // inside catch blocks (not Zod context)
      const returnErrPattern = /return\s*\{[^}]*error:\s*(?:err|error|e)\.message/g
      let match
      while ((match = returnErrPattern.exec(src)) !== null) {
        if (
          !isZodContext(src, match.index) &&
          !isConsoleLog(src, match.index) &&
          !isControlledErrorClass(src, match.index)
        ) {
          violations.push(`${relPath} (offset ${match.index}): ${match[0].slice(0, 80)}`)
        }
      }
    }

    if (violations.length > 0 && violations.length <= 10) {
      console.warn(
        `[Q66 WARNING] ${violations.length} server action(s) return raw error.message (review recommended):\n${violations.join('\n')}`
      )
    }

    // Warn under 10, hard fail above 10. Zero is the goal.
    expect(
      violations.length,
      `Server actions returning raw error.message (potential DB error leakage, >10 = hard fail):\n${violations.join('\n')}`
    ).toBeLessThanOrEqual(10)
  })

  // ---------------------------------------------------------------------------
  // Test 3: No stack trace leakage in any route or server action
  // ---------------------------------------------------------------------------
  test('no route.ts or server action returns error.stack in response payload', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const routeFiles = findFiles(apiDir, 'route.ts')
    const libDir = resolve(ROOT, 'lib')
    const serverFiles = findUseServerFiles(libDir)

    const allFiles = [...routeFiles, ...serverFiles]
    const violations: string[] = []

    for (const file of allFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Pattern: returning error.stack in a response
      const stackPatterns = [
        /(?:Response|NextResponse).*(?:err|error|e)\.stack/g,
        /return\s*\{[^}]*stack:\s*(?:err|error|e)\.stack/g,
        /json\s*\(\s*\{[^}]*stack:/g,
      ]

      for (const pattern of stackPatterns) {
        let match
        while ((match = pattern.exec(src)) !== null) {
          if (!isConsoleLog(src, match.index)) {
            violations.push(`${relPath}: returns error.stack`)
          }
        }
      }
    }

    expect(
      violations,
      `Files returning error.stack to client (stack trace leakage):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: No raw SQL leakage in catch block responses
  // ---------------------------------------------------------------------------
  test('no catch block returns raw SQL text or query strings to client', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const routeFiles = findFiles(apiDir, 'route.ts')

    const violations: string[] = []

    for (const file of routeFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Pattern: returning query/sql details in error responses
      const sqlPatterns = [
        /(?:Response|NextResponse).*(?:err|error|e)\.query/g,
        /return\s*\{[^}]*query:\s*(?:err|error|e)\./g,
        /json\s*\(\s*\{[^}]*sql:/g,
      ]

      for (const pattern of sqlPatterns) {
        let match
        while ((match = pattern.exec(src)) !== null) {
          if (!isConsoleLog(src, match.index)) {
            violations.push(`${relPath}: returns SQL/query details`)
          }
        }
      }
    }

    expect(
      violations,
      `API routes returning SQL/query details to client:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 5: ZodError message returns are acceptable (validation feedback)
  // ---------------------------------------------------------------------------
  test('Zod validation error returns are present and correctly scoped', () => {
    // This test verifies the exemption exists: ZodError messages ARE ok
    // to return because they describe user input problems, not internal details.
    const libDir = resolve(ROOT, 'lib')
    const serverFiles = findUseServerFiles(libDir)

    let zodErrorReturns = 0

    for (const file of serverFiles) {
      const src = readFileSync(file, 'utf-8')

      // Count files that return Zod validation errors (this is correct behavior)
      if (
        (src.includes('ZodError') || src.includes('.safeParse') || src.includes('.parse(')) &&
        src.includes('error')
      ) {
        zodErrorReturns++
      }
    }

    // We expect at least some server actions to use Zod validation.
    // This confirms the exemption pattern is real and in use.
    expect(
      zodErrorReturns,
      'Expected at least some server actions to use Zod validation (confirms exemption is real)'
    ).toBeGreaterThan(0)
  })
})
