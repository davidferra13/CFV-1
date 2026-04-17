/**
 * Q61: Price Resolution Chain Completeness
 *
 * Hypothesis: resolvePrice() in lib/pricing/resolve-price.ts always returns
 * a result object with either a numeric price (cents) or an explicit null
 * indicator for "no price available". Never returns undefined, NaN, or
 * throws without catch.
 *
 * Failure: Ingredient costs silently become NaN, corrupting menu costing
 * and financial displays.
 *
 * Tests:
 *
 * 1. resolvePrice function exists and is exported
 * 2. Function returns ResolvedPrice type (not bare number)
 * 3. Every return statement in resolvePrice returns an object (not undefined)
 * 4. The 10-tier chain has a terminal fallback returning null explicitly
 * 5. No bare `return;` (void return) exists in the function
 * 6. The batch resolution function calls resolvePrice or mirrors the chain
 *
 * Approach: Read lib/pricing/resolve-price.ts fully, extract function bodies
 * using line-range parsing (not brace-counting, which breaks on SQL template
 * literals), and check all return paths.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q61-price-resolution-completeness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const RESOLVE_PRICE = resolve(ROOT, 'lib/pricing/resolve-price.ts')

/**
 * Extract the lines belonging to a named exported async function.
 *
 * Uses line-range extraction: finds the line containing the function
 * declaration and takes everything up to (but not including) the next
 * top-level `export` statement. This avoids brace-counting, which
 * breaks on SQL template literals containing `${...}`.
 */
function extractFunctionLines(src: string, funcName: string): string | null {
  const lines = src.split('\n')
  const pattern = new RegExp(`export\\s+async\\s+function\\s+${funcName}\\s*\\(`)
  let startLine = -1

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      startLine = i
      break
    }
  }
  if (startLine === -1) return null

  // Find the next top-level export (or end of file)
  let endLine = lines.length
  for (let i = startLine + 1; i < lines.length; i++) {
    if (/^export\s/.test(lines[i])) {
      endLine = i
      break
    }
  }

  return lines.slice(startLine, endLine).join('\n')
}

test.describe('Q61: Price resolution chain completeness', () => {
  let src: string

  test.beforeAll(() => {
    expect(existsSync(RESOLVE_PRICE), 'lib/pricing/resolve-price.ts must exist').toBe(true)
    src = readFileSync(RESOLVE_PRICE, 'utf-8')
  })

  // -------------------------------------------------------------------------
  // Test 1: resolvePrice function exists and is exported
  // -------------------------------------------------------------------------
  test('resolvePrice is exported as an async function', () => {
    expect(
      /export\s+async\s+function\s+resolvePrice\s*\(/.test(src),
      'resolvePrice must be an exported async function in resolve-price.ts'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Function returns ResolvedPrice type (object with cents field)
  // -------------------------------------------------------------------------
  test('resolvePrice return type includes ResolvedPrice with cents field', () => {
    // Verify the ResolvedPrice interface exists with cents field
    expect(
      src.includes('cents: number | null'),
      'ResolvedPrice interface must declare cents as number | null (explicit about missing data)'
    ).toBe(true)

    // Verify the return type annotation references ResolvedPrice
    expect(
      src.includes('Promise<ResolvedPrice>'),
      'resolvePrice must declare Promise<ResolvedPrice> return type'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Every return statement in resolvePrice returns an object
  // -------------------------------------------------------------------------
  test('every return in resolvePrice returns an object (no bare returns)', () => {
    const body = extractFunctionLines(src, 'resolvePrice')
    expect(body, 'resolvePrice function body must be extractable').toBeTruthy()

    // Find all return statements in the function
    const returnStatements = body!.match(/\breturn\b[^;]*/g) || []

    expect(
      returnStatements.length,
      'resolvePrice must have at least one return statement'
    ).toBeGreaterThan(0)

    for (const stmt of returnStatements) {
      const trimmed = stmt.replace(/^return\s*/, '').trim()

      // Must not be a bare "return" (void return)
      expect(
        trimmed.length > 0,
        `Found bare 'return;' (void return) in resolvePrice. Every path must return a ResolvedPrice object. Statement: "${stmt}"`
      ).toBe(true)

      // Must not return undefined literally
      expect(
        trimmed !== 'undefined',
        `Found 'return undefined' in resolvePrice. Must return a ResolvedPrice object. Statement: "${stmt}"`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 4: Terminal fallback returns null cents explicitly (Tier 10: NONE)
  // -------------------------------------------------------------------------
  test('the final fallback tier returns a ResolvedPrice with cents: null', () => {
    const body = extractFunctionLines(src, 'resolvePrice')
    expect(body, 'resolvePrice function body must be extractable').toBeTruthy()

    // The noPrice sentinel should have cents: null
    expect(
      src.includes('cents: null'),
      'resolve-price.ts must have a sentinel value with cents: null for the "no price" case'
    ).toBe(true)

    // The function must return the noPrice sentinel
    expect(
      body!.includes('return noPrice'),
      'resolvePrice must have a terminal fallback that returns the noPrice sentinel'
    ).toBe(true)

    // Verify noPrice is defined with source: 'none' and cents: null
    expect(
      src.includes("source: 'none'") && src.includes('cents: null'),
      "The noPrice sentinel must have source: 'none' and cents: null"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: No void return exists in the function
  // -------------------------------------------------------------------------
  test('no bare return; statements exist in resolvePrice', () => {
    const body = extractFunctionLines(src, 'resolvePrice')
    expect(body, 'resolvePrice function body must be extractable').toBeTruthy()

    // Look for "return;" or "return\n" patterns (void returns)
    // Must exclude "return withDecay", "return noPrice", "return {" etc.
    const lines = body!.split('\n')
    const voidReturns = lines.filter((line) => {
      const trimmed = line.trim()
      return trimmed === 'return;' || trimmed === 'return'
    })

    expect(
      voidReturns.length,
      `Found ${voidReturns.length} bare return statement(s) in resolvePrice. ` +
        'Every code path must return a ResolvedPrice object (with cents: null for no data).'
    ).toBe(0)
  })

  // -------------------------------------------------------------------------
  // Test 6: Batch resolution function exists and mirrors the chain
  // -------------------------------------------------------------------------
  test('resolvePricesBatch exists and produces the same ResolvedPrice type', () => {
    expect(
      /export\s+async\s+function\s+resolvePricesBatch\s*\(/.test(src),
      'resolvePricesBatch must be an exported async function'
    ).toBe(true)

    // The batch function should return a Map of ResolvedPrice
    expect(
      src.includes('Map<string, ResolvedPrice>'),
      'resolvePricesBatch must return Map<string, ResolvedPrice> to match single-resolve type'
    ).toBe(true)

    // The batch function should handle the "no price" case with a sentinel
    const batchBody = extractFunctionLines(src, 'resolvePricesBatch')
    expect(batchBody, 'resolvePricesBatch function body must be extractable').toBeTruthy()

    // It should set a noPrice default for ingredients without any match
    const hasNoPriceFallback =
      batchBody!.includes('noPrice') ||
      batchBody!.includes("source: 'none'") ||
      batchBody!.includes('cents: null')

    expect(
      hasNoPriceFallback,
      'resolvePricesBatch must handle ingredients with no price data (return cents: null, not skip them)'
    ).toBe(true)
  })
})
