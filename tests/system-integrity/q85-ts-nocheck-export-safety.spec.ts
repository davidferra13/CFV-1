/**
 * Q85: @ts-nocheck Export Safety
 *
 * Files with // @ts-nocheck suppress all type errors. If such a file
 * exports server actions or functions, those exports will crash at
 * runtime because the types are wrong, column names are outdated,
 * or referenced tables don't exist.
 *
 * CLAUDE.md rule: "@ts-nocheck Files Must Not Export Callable Actions"
 *
 * What we check:
 *   1. No file in lib/, app/, or components/ has both @ts-nocheck
 *      and export async function (server action export).
 *   2. No file in lib/, app/, or components/ has both @ts-nocheck
 *      and export function / export const (any callable export).
 *   3. Files in scripts/, tests/, and types/ are exempt (not production).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q85-ts-nocheck-export-safety.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

const PRODUCTION_DIRS = ['lib', 'app', 'components', 'hooks', 'features']
const EXEMPT_DIRS = ['scripts', 'tests', 'types', 'node_modules', '.next', '__tests__']

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (EXEMPT_DIRS.includes(entry.name) || entry.name.startsWith('.')) continue
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

test.describe('Q85: @ts-nocheck export safety', () => {
  // ---------------------------------------------------------------------------
  // Test 1: No production file has @ts-nocheck with exported server actions
  // ---------------------------------------------------------------------------
  test('no @ts-nocheck file in production dirs exports async functions', () => {
    const violations: string[] = []

    for (const dir of PRODUCTION_DIRS) {
      const fullDir = resolve(ROOT, dir)
      const files = walkDir(fullDir, ['.ts', '.tsx'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')

        // Check for @ts-nocheck (usually in first few lines)
        const hasNoCheck =
          src.includes('// @ts-nocheck') ||
          src.includes('/* @ts-nocheck */') ||
          src.includes('//@ts-nocheck')

        if (!hasNoCheck) continue

        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        // Check for exported async functions (server actions)
        if (/export\s+async\s+function/.test(src)) {
          violations.push(
            `${relPath}: has @ts-nocheck AND exports async functions (will crash at runtime)`
          )
        }
      }
    }

    expect(
      violations,
      `@ts-nocheck files exporting server actions (runtime crash risk):\n` + violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: No production file has @ts-nocheck with any callable exports
  // ---------------------------------------------------------------------------
  test('no @ts-nocheck file in production dirs exports any callable', () => {
    const violations: string[] = []

    for (const dir of PRODUCTION_DIRS) {
      const fullDir = resolve(ROOT, dir)
      const files = walkDir(fullDir, ['.ts', '.tsx'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')

        const hasNoCheck =
          src.includes('// @ts-nocheck') ||
          src.includes('/* @ts-nocheck */') ||
          src.includes('//@ts-nocheck')

        if (!hasNoCheck) continue

        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        // Check for ANY callable export (function, const arrow, class)
        const exportPatterns = [
          /export\s+function\s/,
          /export\s+const\s+\w+\s*=/,
          /export\s+class\s/,
          /export\s+default\s+function/,
        ]

        for (const pattern of exportPatterns) {
          if (pattern.test(src)) {
            violations.push(`${relPath}: has @ts-nocheck AND exports callable code`)
            break // one violation per file is enough
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ85 VIOLATIONS - @ts-nocheck files with callable exports:\n` +
          violations.map((v) => `  CRASH RISK: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `@ts-nocheck files exporting callable code from production dirs.\n` +
        `These will crash at runtime. Fix types and remove @ts-nocheck, or remove exports:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Inventory all @ts-nocheck files (informational)
  // ---------------------------------------------------------------------------
  test('inventory of all @ts-nocheck files in the project', () => {
    const allDirs = [...PRODUCTION_DIRS, 'scripts', 'tests']
    const inventory: { production: string[]; nonProduction: string[] } = {
      production: [],
      nonProduction: [],
    }

    for (const dir of allDirs) {
      const fullDir = resolve(ROOT, dir)
      // Use a broader walk for inventory (include exempt dirs like scripts/tests)
      const files = walkDirAll(fullDir, ['.ts', '.tsx'])

      for (const file of files) {
        try {
          const src = readFileSync(file, 'utf-8')
          const hasNoCheck =
            src.includes('// @ts-nocheck') ||
            src.includes('/* @ts-nocheck */') ||
            src.includes('//@ts-nocheck')

          if (!hasNoCheck) continue

          const relPath = relative(ROOT, file).replace(/\\/g, '/')
          if (PRODUCTION_DIRS.some((d) => relPath.startsWith(d + '/'))) {
            inventory.production.push(relPath)
          } else {
            inventory.nonProduction.push(relPath)
          }
        } catch {
          /* skip */
        }
      }
    }

    console.log(`\nQ85 inventory:`)
    console.log(`  Production @ts-nocheck files: ${inventory.production.length}`)
    inventory.production.forEach((f) => console.log(`    ${f}`))
    console.log(`  Non-production @ts-nocheck files: ${inventory.nonProduction.length}`)

    // Goal: zero production @ts-nocheck files over time
    if (inventory.production.length > 0) {
      console.warn(
        `\n  WARNING: ${inventory.production.length} production files have @ts-nocheck. Plan to fix.`
      )
    }
  })
})

/** Walk including all subdirs (no exemptions) for inventory */
function walkDirAll(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDirAll(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}
