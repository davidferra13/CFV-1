/**
 * Q82: Optimistic Rollback Completeness
 *
 * Every startTransition / useTransition block that calls a server action
 * MUST have try/catch with state rollback or error feedback on failure.
 * Without this, the UI shows success while the server failed.
 *
 * Surface: 968 startTransition occurrences across 250 .tsx files.
 *
 * What we check:
 *   - Every startTransition(async () => { ... }) that contains an await
 *     (indicating a server call) must have a try/catch or .catch()
 *   - The catch block must contain error feedback (toast, setState, throw)
 *
 * Acceptable:
 *   - startTransition(() => { setState(x) }) with no await (no server call, exempt)
 *   - startTransition with try/catch that calls toast.error or restores previous state
 *   - startTransition wrapping a function that internally handles errors
 *
 * Not acceptable:
 *   - startTransition(async () => { await serverAction(...) }) with no try/catch
 *   - try/catch that catches but does nothing (empty catch)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q82-optimistic-rollback-completeness.spec.ts
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
    // inaccessible
  }
  return results
}

/**
 * Find all startTransition blocks that contain await (server action calls).
 * Returns the character index of each startTransition call.
 */
function findAsyncTransitions(src: string): number[] {
  const indices: number[] = []
  // Match startTransition( or startTransition (
  const transitionStart = /startTransition\s*\(\s*async/g
  let match
  while ((match = transitionStart.exec(src)) !== null) {
    indices.push(match.index)
  }
  return indices
}

/**
 * Extract the block content after startTransition(async () => { ... })
 * Uses brace counting to find the matching close.
 */
function extractTransitionBlock(src: string, startIndex: number): string | null {
  // Find the opening brace of the async arrow function body
  const searchStart = src.indexOf('{', startIndex)
  if (searchStart === -1) return null

  let depth = 0
  let i = searchStart
  while (i < src.length) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return src.slice(searchStart, i + 1)
    }
    i++
  }
  return null
}

/**
 * Check if a transition block has error handling.
 */
function hasErrorHandling(block: string): boolean {
  return (
    block.includes('try') ||
    block.includes('.catch(') ||
    block.includes('catch (') ||
    block.includes('catch(')
  )
}

/**
 * Check if a catch block has actual error feedback (not empty).
 */
function hasErrorFeedback(block: string): boolean {
  // After the catch, look for feedback mechanisms
  return (
    block.includes('toast') ||
    block.includes('Toast') ||
    block.includes('setError') ||
    block.includes('setState') ||
    block.includes('set(') || // zustand-style setter
    block.includes('throw') ||
    block.includes('alert(') ||
    block.includes('console.error') ||
    block.includes('onError') ||
    block.includes('error(') ||
    block.includes('Error(') ||
    // State restoration patterns
    block.includes('previous') ||
    block.includes('rollback') ||
    block.includes('restore') ||
    block.includes('revert') ||
    block.includes('undo')
  )
}

test.describe('Q82: Optimistic rollback completeness', () => {
  // ---------------------------------------------------------------------------
  // Test 1: All async startTransition blocks have try/catch
  // ---------------------------------------------------------------------------
  test('every async startTransition with server calls has error handling', () => {
    const dirsToScan = [resolve(ROOT, 'app'), resolve(ROOT, 'components')]

    let totalTransitions = 0
    const violations: string[] = []

    for (const dir of dirsToScan) {
      const files = walkDir(dir, ['.tsx'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        const asyncTransitions = findAsyncTransitions(src)
        totalTransitions += asyncTransitions.length

        for (const idx of asyncTransitions) {
          const block = extractTransitionBlock(src, idx)
          if (!block) continue

          // Only check blocks that actually await something (have server calls)
          if (!block.includes('await')) continue

          if (!hasErrorHandling(block)) {
            const lineNum = src.slice(0, idx).split('\n').length
            violations.push(
              `${relPath}:${lineNum} startTransition(async) with await but no try/catch`
            )
          }
        }
      }
    }

    expect(totalTransitions).toBeGreaterThan(100) // Sanity: we should find many

    if (violations.length > 0) {
      console.warn(
        `\nQ82 VIOLATIONS - Unguarded optimistic updates (${violations.length}/${totalTransitions}):\n` +
          violations.map((v) => `  NO ROLLBACK: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `startTransition blocks calling server actions without try/catch.\n` +
        `If the server fails, the UI will show fake success:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Catch blocks are not empty (must have actual feedback)
  // ---------------------------------------------------------------------------
  test('catch blocks in startTransition have actual error feedback', () => {
    const dirsToScan = [resolve(ROOT, 'app'), resolve(ROOT, 'components')]

    const emptyCatches: string[] = []

    for (const dir of dirsToScan) {
      const files = walkDir(dir, ['.tsx'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        const asyncTransitions = findAsyncTransitions(src)

        for (const idx of asyncTransitions) {
          const block = extractTransitionBlock(src, idx)
          if (!block || !block.includes('await')) continue

          if (hasErrorHandling(block) && !hasErrorFeedback(block)) {
            const lineNum = src.slice(0, idx).split('\n').length
            emptyCatches.push(
              `${relPath}:${lineNum} has try/catch but catch block has no user feedback`
            )
          }
        }
      }
    }

    if (emptyCatches.length > 0) {
      console.warn(
        `\nQ82 WARNING - Empty catch blocks in optimistic updates:\n` +
          emptyCatches.map((v) => `  EMPTY CATCH: ${v}`).join('\n')
      )
    }

    expect(
      emptyCatches,
      `startTransition catch blocks with no error feedback.\n` +
        `Error is caught but user never learns the action failed:\n` +
        emptyCatches.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Non-async startTransition (client-only) is exempt
  // ---------------------------------------------------------------------------
  test('non-async startTransition (no server call) is counted but exempt', () => {
    const dirsToScan = [resolve(ROOT, 'app'), resolve(ROOT, 'components')]

    let syncTransitions = 0
    let asyncTransitions = 0

    for (const dir of dirsToScan) {
      const files = walkDir(dir, ['.tsx'])
      for (const file of files) {
        const src = readFileSync(file, 'utf-8')

        // Count all startTransition calls
        const allTransitions = (src.match(/startTransition\s*\(/g) || []).length
        const asyncOnes = findAsyncTransitions(src).length
        syncTransitions += allTransitions - asyncOnes
        asyncTransitions += asyncOnes
      }
    }

    // Report the breakdown for visibility
    console.log(
      `\nQ82 transition breakdown: ${asyncTransitions} async (checked), ${syncTransitions} sync (exempt)`
    )

    // Sanity: should have found transitions
    expect(asyncTransitions + syncTransitions).toBeGreaterThan(50)
  })
})
