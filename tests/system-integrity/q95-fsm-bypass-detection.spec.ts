/**
 * Q95: Event FSM Bypass Detection (Q8)
 *
 * Verifies no code directly updates events.status outside of transitions.ts.
 * Any direct status update bypasses the FSM, audit log, and CAS race detection.
 *
 * What we check:
 *   1. No .from('events').update() call sets `status` outside transitions.ts
 *   2. The v2 events API Zod schema does not include `status` field
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q95-fsm-bypass-detection.spec.ts
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

test.describe('Q95: Event FSM bypass detection', () => {
  // Scan both lib/ and app/ for direct event status updates
  const libFiles = scanDir(resolve(ROOT, 'lib'), '.ts')
  const appFiles = scanDir(resolve(ROOT, 'app'), '.ts')
  const allFiles = [...libFiles, ...appFiles]

  // The ONLY file allowed to update events.status
  const ALLOWED_FILE = 'lib/events/transitions.ts'
  // Also allowed: test files
  const TEST_DIRS = ['tests/', 'test/']

  test('no direct events.status updates outside transitions.ts', () => {
    const violations: string[] = []

    for (const file of allFiles) {
      const relative = file.replace(ROOT, '').replace(/\\/g, '/')
      if (relative.includes(ALLOWED_FILE)) continue
      if (TEST_DIRS.some((t) => relative.includes(t))) continue

      const content = readFileSync(file, 'utf-8')

      // Only check files that reference the events table
      if (!content.includes("'events'") && !content.includes('"events"')) continue

      // Pattern: .from('events').update({ status: ... })
      // Must detect multi-line patterns but only match .update() (not .insert())
      const lines = content.split('\n')
      let inEventsChain = false
      let chainHasUpdate = false
      let eventsChainStart = 0

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Detect .from('events') or .from("events") - the actual events table
        if (/\.from\s*\(\s*['"]events['"]\s*\)/.test(line)) {
          inEventsChain = true
          chainHasUpdate = false
          eventsChainStart = i
        }

        if (inEventsChain) {
          // Mark if chain includes .update (not .insert)
          if (/\.update\s*\(/.test(line)) {
            chainHasUpdate = true
          }

          // Only flag if this is an UPDATE chain (not INSERT) that sets status
          if (chainHasUpdate && /\bstatus\s*:/.test(line)) {
            // Exclude non-event-FSM status fields
            if (
              !/menu_approval_status|account_status|upload_status|resolution_status|subscription_status/.test(
                line
              )
            ) {
              violations.push(`${relative}:${i + 1}: ${line.trim()}`)
            }
          }

          // Reset after 8 lines, or if we see ANY new query chain start
          // (includes helper functions like collab(db).update which are different tables)
          if (
            i - eventsChainStart > 8 ||
            (i > eventsChainStart && /(?:\.from\s*\(|await\s+\w+\(db\))/.test(line))
          ) {
            inEventsChain = false
            chainHasUpdate = false
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `Direct events.status UPDATE bypassing FSM:\n${violations.join('\n')}\n` +
          'Fix: Use transitionEvent() from lib/events/transitions.ts instead.'
      )
    }

    expect(
      violations.length,
      `${violations.length} file(s) update events.status directly, bypassing the FSM`
    ).toBe(0)
  })

  test('v2 events API schema does not allow status field', () => {
    const apiFile = resolve(ROOT, 'app/api/v2/events/[id]/route.ts')
    let content: string
    try {
      content = readFileSync(apiFile, 'utf-8')
    } catch {
      test.skip()
      return
    }

    // The UpdateEventBody schema should use .strict() and NOT include status
    expect(content).toContain('.strict()')
    expect(content).not.toMatch(/status\s*:\s*z\./)
  })
})
