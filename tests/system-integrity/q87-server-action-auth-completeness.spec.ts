/**
 * Q87: Server Action Auth Completeness
 *
 * Every exported async function in a 'use server' file must start with
 * an auth guard: requireChef(), requireClient(), requireAdmin(),
 * requireAuth(), or be explicitly documented as intentionally public.
 *
 * A server action without auth is callable by anyone via POST.
 * An unauthenticated user could mutate data, read private records,
 * or trigger billable side effects.
 *
 * Existing Q6 checks a subset. This checks ALL server action files
 * in the entire lib/ directory.
 *
 * Acceptable:
 *   - requireChef() / requireClient() / requireAdmin() / requireAuth()
 *     within the first 10 lines of the function body
 *   - Functions with a // public: <reason> comment documenting why
 *     no auth is needed
 *   - Functions that call another function which does the auth check
 *     (detected by calling a function that starts with "require")
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q87-server-action-auth-completeness.spec.ts
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

const AUTH_GUARDS = [
  'requireChef',
  'requireClient',
  'requireAdmin',
  'requireAuth',
  'requireRole',
  'requireUser',
  'requireSession',
  'requirePermission', // RBAC permission check (includes auth)
  'requirePro', // billing gate (includes auth via requireChef)
  'getServerSession', // Auth.js session check
  'assertPosRoleAccess', // POS authorization (includes auth)
]

/**
 * Extract first N lines of a function body (after the opening brace).
 */
function getFunctionHead(src: string, exportIndex: number, lines: number = 15): string {
  const braceStart = src.indexOf('{', exportIndex)
  if (braceStart === -1) return ''

  let lineCount = 0
  let i = braceStart + 1
  while (i < src.length && lineCount < lines) {
    if (src[i] === '\n') lineCount++
    i++
  }

  return src.slice(braceStart, i)
}

test.describe('Q87: Server action auth completeness', () => {
  // ---------------------------------------------------------------------------
  // Test 1: All exported server actions have auth guards
  // ---------------------------------------------------------------------------
  test('every exported async function in use-server files has an auth guard', () => {
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
    let totalFunctions = 0
    let authProtected = 0
    let publicDocumented = 0

    for (const file of serverFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Find all exported async functions
      const funcPattern = /export\s+async\s+function\s+(\w+)/g
      let match

      while ((match = funcPattern.exec(src)) !== null) {
        totalFunctions++
        const funcName = match[1]
        const funcHead = getFunctionHead(src, match.index)
        const lineNum = src.slice(0, match.index).split('\n').length

        // Check for auth guard
        const hasAuth = AUTH_GUARDS.some((guard) => funcHead.includes(guard))

        if (hasAuth) {
          authProtected++
          continue
        }

        // Check for public documentation
        const contextBefore = src.slice(Math.max(0, match.index - 200), match.index)
        const isPublicDocumented =
          contextBefore.includes('// public:') ||
          contextBefore.includes('// Public:') ||
          contextBefore.includes('/* public') ||
          contextBefore.includes('// no auth') ||
          contextBefore.includes('// unauthenticated') ||
          contextBefore.includes('// anonymous')

        if (isPublicDocumented) {
          publicDocumented++
          continue
        }

        // Check if function delegates to another require* function
        const delegatesAuth = /require\w+\(/.test(funcHead)
        if (delegatesAuth) {
          authProtected++
          continue
        }

        violations.push(
          `${relPath}:${lineNum} ${funcName}() has no auth guard and no // public: comment`
        )
      }
    }

    console.log(`\nQ87: ${totalFunctions} server actions scanned`)
    console.log(`  Auth-protected: ${authProtected}`)
    console.log(`  Documented public: ${publicDocumented}`)
    console.log(`  Missing auth: ${violations.length}`)

    if (violations.length > 0) {
      console.warn(
        `\nQ87 VIOLATIONS - Server actions without auth guards:\n` +
          violations.map((v) => `  UNPROTECTED: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Server actions callable without authentication.\n` +
        `Anyone can invoke these via POST. Add requireChef/Client/Admin or document as // public:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Auth guards appear within the first few lines (not buried)
  // ---------------------------------------------------------------------------
  test('auth guards are called early in the function (within first 10 lines)', () => {
    const libDir = resolve(ROOT, 'lib')
    const allFiles = walkDir(libDir, ['.ts'])
    const serverFiles = allFiles.filter((f) => {
      try {
        return isUseServer(readFileSync(f, 'utf-8'))
      } catch {
        return false
      }
    })

    const lateAuth: string[] = []

    for (const file of serverFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      const funcPattern = /export\s+async\s+function\s+(\w+)/g
      let match

      while ((match = funcPattern.exec(src)) !== null) {
        const funcName = match[1]
        const earlyHead = getFunctionHead(src, match.index, 10)
        const lateHead = getFunctionHead(src, match.index, 30)

        const hasEarlyAuth = AUTH_GUARDS.some((g) => earlyHead.includes(g))
        const hasLateAuth = AUTH_GUARDS.some((g) => lateHead.includes(g))

        if (!hasEarlyAuth && hasLateAuth) {
          const lineNum = src.slice(0, match.index).split('\n').length
          lateAuth.push(
            `${relPath}:${lineNum} ${funcName}() auth guard is >10 lines deep (move it up)`
          )
        }
      }
    }

    if (lateAuth.length > 0) {
      console.warn(
        `\nQ87 WARNING - Auth guards buried too deep in function body:\n` +
          lateAuth.map((v) => `  LATE AUTH: ${v}`).join('\n')
      )
    }

    // This is advisory. Not a hard failure, but worth tracking.
    // Late auth means code executes (including DB queries) before checking
    // if the user is authenticated.
    if (lateAuth.length > 10) {
      expect(
        lateAuth,
        `${lateAuth.length} server actions have auth guards buried >10 lines deep.\n` +
          `Code before the auth check runs for unauthenticated users:\n` +
          lateAuth.join('\n')
      ).toHaveLength(0)
    }
  })
})
