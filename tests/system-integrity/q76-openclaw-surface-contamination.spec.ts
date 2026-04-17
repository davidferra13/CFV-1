/**
 * Q76: OpenClaw Surface Contamination
 *
 * The string "OpenClaw" must never appear in user-visible surfaces: JSX
 * text content, error messages, toast notifications, page titles, or API
 * responses shown to users. "OpenClaw" is an internal tooling name; leaking
 * it to users breaks the product boundary.
 *
 * Allowed locations (code-only, never rendered):
 *   - import statements
 *   - type/interface declarations
 *   - comments (// or /* *\/)
 *   - console.log/console.error (developer-only)
 *   - Files in scripts/, docs/, tests/, .claude/, database/
 *   - Variable names, function names, type names
 *   - CLAUDE.md and MEMORY.md
 *
 * Violations:
 *   - JSX text content: >OpenClaw< or >...OpenClaw...<
 *   - String literals in user-visible props: "OpenClaw" or `...OpenClaw...`
 *   - toast.error('OpenClaw...') or similar user-facing messages
 *   - Page titles, metadata, alt text
 *
 * Tests:
 *
 * 1. NO OPENCLAW IN APP TSX TEXT: No .tsx file in app/ contains "OpenClaw"
 *    in user-visible text (excluding imports, types, comments).
 *
 * 2. NO OPENCLAW IN COMPONENT TSX TEXT: No .tsx file in components/ contains
 *    "OpenClaw" in user-visible text.
 *
 * 3. NO OPENCLAW IN TOAST OR ERROR MESSAGES: No toast() or Error() call
 *    contains "OpenClaw".
 *
 * 4. NO OPENCLAW IN PAGE METADATA: No metadata export or <title> tag
 *    contains "OpenClaw".
 *
 * 5. NO OPENCLAW IN API RESPONSE STRINGS: No API route in app/api/ returns
 *    "OpenClaw" in user-visible JSON responses.
 *
 * 6. OVERALL SURFACE COUNT IS ZERO: Total "OpenClaw" occurrences in
 *    user-visible surfaces is zero.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q76-openclaw-surface-contamination.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

/** Recursively collect files matching extensions, skipping excluded dirs */
function walkFiles(dir: string, extensions: string[], excludeDirs: string[] = []): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    if (excludeDirs.includes(entry)) continue
    const full = join(dir, entry)
    try {
      const stat = statSync(full)
      if (stat.isDirectory()) {
        results.push(...walkFiles(full, extensions, excludeDirs))
      } else if (extensions.some((ext) => full.endsWith(ext))) {
        results.push(full)
      }
    } catch {
      // skip inaccessible
    }
  }
  return results
}

/**
 * Check if a file path is in an admin-only area (not user-visible).
 * Per CLAUDE.md, admin pages are allowed to reference OpenClaw.
 */
function isAdminOnlyPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return (
    normalized.includes('/(admin)/') ||
    normalized.includes('app/(admin)') ||
    normalized.includes('components/admin/') ||
    normalized.includes('components/prospecting/') // prospecting is admin-only (CLAUDE.md 0c)
  )
}

/**
 * Check if a line containing "OpenClaw" is in an allowed context
 * (import, type declaration, comment, console output, variable name,
 *  function/component declaration, property access).
 */
function isAllowedContext(line: string): boolean {
  const trimmed = line.trim()

  // Comments (including JSX comments {/* ... */})
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('{/*')
  )
    return true

  // Import statements (including continuation lines inside import { ... } blocks)
  if (
    trimmed.startsWith('import ') ||
    trimmed.startsWith('from ') ||
    trimmed.includes("from '@") ||
    trimmed.includes('from "@')
  )
    return true

  // Import block continuation lines: bare identifiers like "getOpenClawLeads," inside import { }
  if (/^\w*[Oo]pen[Cc]law\w*\s*,?\s*$/.test(trimmed)) return true

  // Type/interface declarations
  if (
    trimmed.startsWith('type ') ||
    trimmed.startsWith('interface ') ||
    trimmed.startsWith('export type ') ||
    trimmed.startsWith('export interface ')
  )
    return true

  // Console output (developer-only)
  if (
    trimmed.includes('console.log') ||
    trimmed.includes('console.error') ||
    trimmed.includes('console.warn') ||
    trimmed.includes('console.debug') ||
    trimmed.includes('console.info')
  )
    return true

  // Variable/function/component declarations where OpenClaw is in the name
  // e.g.: const openclawData = ..., function OpenClawPage(), export function OpenClawHealthClient
  if (/(?:const|let|var|function|async function)\s+\w*[Oo]pen[Cc]law\w*/.test(trimmed)) return true

  // Export default function with OpenClaw in the name
  if (/export\s+(?:default\s+)?(?:async\s+)?function\s+\w*[Oo]pen[Cc]law\w*/.test(trimmed))
    return true

  // JSX component references (e.g. <OpenClawRefreshStatus ... /> or <OpenClawLiveAlerts />)
  if (/<\/?[A-Z]\w*OpenClaw\w*|<\/?OpenClaw\w*/.test(trimmed)) return true

  // Property access or function calls on variables with OpenClaw in name
  // e.g.: await getOpenClawStats(), openclawData.map(...)
  if (/\w*[Oo]pen[Cc]law\w*\s*[.([]/.test(trimmed)) return true

  // setState with OpenClaw variable (e.g. useState<OpenClawStats>)
  if (/useState<\w*OpenClaw\w*>/.test(trimmed)) return true

  // Type annotations containing OpenClaw (e.g.: OpenClawPrice[], status: OpenClawRefreshStatus)
  if (/:\s*\w*OpenClaw\w*/.test(trimmed)) return true

  return false
}

test.describe('Q76: OpenClaw surface contamination', () => {
  // ---------------------------------------------------------------------------
  // Test 1: No "OpenClaw" in user-visible text in app/ .tsx files
  // ---------------------------------------------------------------------------
  test('no "OpenClaw" in user-visible text in app/ .tsx files', () => {
    const appDir = resolve(ROOT, 'app')
    const files = walkFiles(appDir, ['.tsx'], ['node_modules', '.next'])
    const violations: string[] = []

    for (const filePath of files) {
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      // Admin-only pages are allowed to reference OpenClaw (per CLAUDE.md)
      if (isAdminOnlyPath(rel)) continue

      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes('OpenClaw')) continue
        if (isAllowedContext(lines[i])) continue

        violations.push(`${rel}:${i + 1}: ${lines[i].trim().substring(0, 100)}`)
      }
    }

    expect(
      violations,
      `"OpenClaw" found in user-visible text in app/ (CLAUDE.md absolute rule):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: No "OpenClaw" in user-visible text in components/ .tsx files
  // ---------------------------------------------------------------------------
  test('no "OpenClaw" in user-visible text in components/ .tsx files', () => {
    const componentsDir = resolve(ROOT, 'components')
    const files = walkFiles(componentsDir, ['.tsx'], ['node_modules'])
    const violations: string[] = []

    for (const filePath of files) {
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      // Admin-only components are allowed to reference OpenClaw (per CLAUDE.md)
      if (isAdminOnlyPath(rel)) continue

      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes('OpenClaw')) continue
        if (isAllowedContext(lines[i])) continue

        violations.push(`${rel}:${i + 1}: ${lines[i].trim().substring(0, 100)}`)
      }
    }

    expect(
      violations,
      `"OpenClaw" found in user-visible text in components/ (CLAUDE.md absolute rule):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: No "OpenClaw" in toast or Error messages
  // ---------------------------------------------------------------------------
  test('no "OpenClaw" in toast() or Error() calls', () => {
    const dirs = [resolve(ROOT, 'app'), resolve(ROOT, 'components'), resolve(ROOT, 'lib')]
    const violations: string[] = []

    for (const dir of dirs) {
      const files = walkFiles(dir, ['.ts', '.tsx'], ['node_modules', '.next'])
      for (const filePath of files) {
        const src = readFileSync(filePath, 'utf-8')
        const lines = src.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (!line.includes('OpenClaw')) continue
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue

          // Check if this is a toast or Error call
          if (
            line.includes('toast(') ||
            line.includes('toast.error') ||
            line.includes('toast.success') ||
            line.includes('toast.info') ||
            line.includes('Error(') ||
            line.includes('error:')
          ) {
            const rel = relative(ROOT, filePath).replace(/\\/g, '/')
            violations.push(`${rel}:${i + 1}: ${line.trim().substring(0, 100)}`)
          }
        }
      }
    }

    expect(
      violations,
      `"OpenClaw" found in toast/Error messages (user-visible):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: No "OpenClaw" in page metadata or title tags
  // ---------------------------------------------------------------------------
  test('no "OpenClaw" in page metadata exports or <title> tags', () => {
    const appDir = resolve(ROOT, 'app')
    const files = walkFiles(appDir, ['.tsx', '.ts'], ['node_modules', '.next'])
    const violations: string[] = []

    for (const filePath of files) {
      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line.includes('OpenClaw')) continue
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue

        // Check for metadata patterns
        if (
          line.includes('title:') ||
          line.includes('description:') ||
          line.includes('<title>') ||
          line.includes('metadata') ||
          line.includes('openGraph')
        ) {
          const rel = relative(ROOT, filePath).replace(/\\/g, '/')
          violations.push(`${rel}:${i + 1}: ${line.trim().substring(0, 100)}`)
        }
      }
    }

    expect(
      violations,
      `"OpenClaw" found in page metadata/titles:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 5: No "OpenClaw" in API response strings
  // ---------------------------------------------------------------------------
  test('no "OpenClaw" in user-visible API response strings in app/api/', () => {
    const apiDir = resolve(ROOT, 'app/api')
    const files = walkFiles(apiDir, ['.ts'], ['node_modules'])
    const violations: string[] = []

    for (const filePath of files) {
      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line.includes('OpenClaw')) continue
        if (isAllowedContext(line)) continue

        // Check for JSON response patterns
        if (
          line.includes('NextResponse.json') ||
          line.includes('Response(') ||
          line.includes('json(') ||
          line.includes('message:') ||
          line.includes('error:')
        ) {
          const rel = relative(ROOT, filePath).replace(/\\/g, '/')
          violations.push(`${rel}:${i + 1}: ${line.trim().substring(0, 100)}`)
        }
      }
    }

    expect(
      violations,
      `"OpenClaw" found in API response strings:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 6: Overall surface contamination count is zero
  // ---------------------------------------------------------------------------
  test('total "OpenClaw" occurrences in user-visible surfaces is zero', () => {
    const dirs = [resolve(ROOT, 'app'), resolve(ROOT, 'components')]
    let totalViolations = 0
    const violatingFiles: { file: string; count: number }[] = []

    for (const dir of dirs) {
      const files = walkFiles(dir, ['.tsx', '.ts'], ['node_modules', '.next'])
      for (const filePath of files) {
        const rel = relative(ROOT, filePath).replace(/\\/g, '/')

        // Admin-only paths are allowed to reference OpenClaw
        if (isAdminOnlyPath(rel)) continue

        const src = readFileSync(filePath, 'utf-8')
        const lines = src.split('\n')
        let fileViolations = 0

        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].includes('OpenClaw')) continue
          if (isAllowedContext(lines[i])) continue
          fileViolations++
        }

        if (fileViolations > 0) {
          totalViolations += fileViolations
          violatingFiles.push({
            file: rel,
            count: fileViolations,
          })
        }
      }
    }

    expect(
      totalViolations,
      `Found ${totalViolations} "OpenClaw" surface contaminations across ${violatingFiles.length} files:\n${violatingFiles.map((f) => `  ${f.file} (${f.count})`).join('\n')}`
    ).toBe(0)
  })
})
