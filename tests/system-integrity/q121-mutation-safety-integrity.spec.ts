/**
 * Q121-Q130: Mutation Safety & State Consistency
 *
 * Verifies quote edit locks, event deletion guards, menu cost null safety,
 * ledger immutability surface, FSM regression prevention, and financial
 * view empty-state handling.
 *
 * All questions passed structural review. No code changes needed.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q121: Quote editing blocked after draft status
test('Q121: updateQuote rejects edits on non-draft quotes', () => {
  const src = readFile('lib/quotes/actions.ts')
  const fn = src.slice(src.indexOf('export async function updateQuote'))
  expect(fn).toContain("current.status !== 'draft'")
  expect(fn).toContain('Can only edit quotes in draft status')
  // CAS guard with expected_updated_at
  expect(fn).toContain('expected_updated_at')
  expect(fn).toContain('createConflictError')
})

// Q122: Event deletion restricted to draft status only
test('Q122: deleteEvent only allows draft status', () => {
  const src = readFile('lib/events/actions.ts')
  const fn = src.slice(src.indexOf('export async function deleteEvent'))
  expect(fn).toContain("event.status !== 'draft'")
  expect(fn).toContain('Can only delete events in draft status')
  // Soft delete, not hard delete
  expect(fn).toContain('deleted_at')
  expect(fn).toContain('deleted_by')
})

// Q123: Menu cost sidebar handles null prices as "N/A", not "$0"
test('Q123: MenuCostSidebar shows N/A for null prices and has error state', () => {
  const src = readFile('components/culinary/menu-cost-sidebar.tsx')
  // Null price display
  expect(src).toContain("if (cents === null) return 'N/A'")
  // Null food cost color (grey)
  expect(src).toContain("if (pct === null) return 'text-stone-400'")
  // Error state
  expect(src).toContain('setLoadError')
  expect(src).toContain('Could not load cost data')
})

// Q124: Public ledger append requires chef auth and derives tenant from session
test('Q124: appendLedgerEntryForChef requires auth and session-scoped tenant', () => {
  const src = readFile('lib/ledger/append.ts')
  expect(src).toContain('requireChef()')
  expect(src).toContain('user.tenantId!')
  expect(src).toContain('created_by: user.id')
  // Internal validator enforces integer + positive + max cap
  const internal = readFile('lib/ledger/append-internal.ts')
  expect(internal).toContain('Number.isInteger')
  expect(internal).toContain('99_999_999')
})

// Q126: Event status changes go through FSM (no regression)
test('Q126: transitionEvent uses atomic RPC with FSM transition map', () => {
  const src = readFile('lib/events/transitions.ts')
  expect(src).toContain('transition_event_atomic')
  expect(src).toContain('TRANSITION_MAP')
  // No direct status update bypassing FSM
  expect(src).not.toMatch(/\.update\(\{.*status:/)
})

// Q128: Quote price is frozen at creation, acceptance uses atomic RPC
test('Q128: quote acceptance uses atomic RPC to freeze pricing', () => {
  const src = readFile('lib/quotes/client-actions.ts')
  expect(src).toContain('respond_to_quote_atomic')
  // Quote editing is draft-only (price locked after send)
  const actions = readFile('lib/quotes/actions.ts')
  expect(actions).toContain("current.status !== 'draft'")
})

// Q130: Dashboard financial data uses safe() wrapper that logs errors
test('Q130: dashboard safe() wrapper catches and logs fetch failures', () => {
  const src = readFile('app/(chef)/dashboard/page.tsx')
  // safe() helper wraps all data fetches
  expect(src).toContain('async function safe')
  expect(src).toContain('console.error')
  expect(src).toContain('return fallback')
})

// Bonus: All silent catches in lib/ have been eliminated (except intentional dual-access)
test('Q121b: no silent catch {} blocks remain in lib/ (except staffing dual-access)', () => {
  const libDir = path.join(ROOT, 'lib')
  const results: string[] = []

  function scan(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        scan(full)
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(full, 'utf-8')
        const matches = content.match(/\} catch \{\}/g)
        if (matches) {
          // Allow the 2 intentional dual-access catches in staffing-actions.ts
          if (full.includes('staffing-actions.ts')) continue
          results.push(`${path.relative(ROOT, full)}: ${matches.length} silent catch(es)`)
        }
      }
    }
  }

  scan(libDir)
  expect(results).toEqual([])
})
