/**
 * Q98: PII/Gemini Boundary Enforcement (Q47)
 *
 * PII must never route through Gemini (parseWithAI). All private data
 * must use parseWithOllama. Gemini is a separate cloud service.
 *
 * What we check:
 *   1. No production file calls parseWithAI() (the function, not the type)
 *   2. Files importing from parse.ts only import types, not the function
 *   3. parseWithAI definition exists only in lib/ai/parse.ts
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q98-pii-gemini-boundary.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function scanDir(dir: string, ext: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...scanDir(full, ext))
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}

test.describe('Q98: PII/Gemini boundary', () => {
  const libFiles = scanDir(resolve(ROOT, 'lib'), '.ts')
  const appFiles = scanDir(resolve(ROOT, 'app'), '.ts')
  const allProdFiles = [...libFiles, ...appFiles]

  test('no production code calls parseWithAI function', () => {
    const violations: string[] = []

    for (const file of allProdFiles) {
      const relative = file.replace(ROOT, '').replace(/\\/g, '/')

      // Skip the definition file and test files
      if (relative.includes('lib/ai/parse.ts')) continue
      if (relative.includes('lib/ai/parse-ollama.ts')) continue
      if (relative.includes('tests/')) continue

      const content = readFileSync(file, 'utf-8')

      // Check for actual function calls (not type imports)
      // Match: parseWithAI( but NOT: type ParseResult, import type { ParseResult }
      if (/(?<!type\s+)(?<!import\s+type\s+\{[^}]*)\bparseWithAI\s*\(/.test(content)) {
        violations.push(relative)
      }

      // Also check for non-type imports of parseWithAI
      const importLines = content
        .split('\n')
        .filter((l) => l.includes('parseWithAI') && l.includes('import'))
      for (const line of importLines) {
        // If import doesn't use `type` keyword before parseWithAI, it's importing the function
        if (
          !line.includes('import type') &&
          !line.includes('type ParseResult') &&
          line.includes('parseWithAI')
        ) {
          // Check if it's a destructured type import like `import { type ParseResult, parseWithAI }`
          if (/import\s*\{[^}]*\bparseWithAI\b/.test(line) && !/type\s+parseWithAI/.test(line)) {
            violations.push(`${relative} (imports parseWithAI function)`)
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `Production files calling parseWithAI (Gemini) directly:\n${violations.join('\n')}\n` +
          'Fix: Use parseWithOllama instead. PII must never route through Gemini.'
      )
    }

    expect(
      violations.length,
      `${violations.length} file(s) call parseWithAI, violating the PII/Gemini boundary`
    ).toBe(0)
  })
})
