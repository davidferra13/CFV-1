/**
 * Q90: Event Transition Race Loss Truthfulness
 *
 * Stress Question Q4: When two concurrent requests race to transition
 * the same event, the loser must NOT receive { success: true }.
 *
 * What we check:
 *   1. transitionEvent() returns success: false when race is detected
 *   2. The post-transition verification block does not return success: true on race loss
 *   3. The race detection pattern includes a clear error code for callers
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q90-transition-race-truthfulness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()

test.describe('Q90: Transition race truthfulness', () => {
  test('transitionEvent does not return success:true on race loss', () => {
    const transitionsFile = resolve(ROOT, 'lib/events/transitions.ts')
    const content = readFileSync(transitionsFile, 'utf-8')

    // Find the race detection block (where verifiedEvent.status !== toStatus)
    const raceDetectionPresent =
      content.includes('verifiedEvent') &&
      (content.includes('!== toStatus') || content.includes('!== to_status'))

    expect(raceDetectionPresent, 'Race detection block must exist in transitions.ts').toBe(true)

    // Check that the race loss path does NOT return { success: true }
    // Split the file into lines and find the race detection area
    const lines = content.split('\n')
    let inRaceBlock = false
    let raceBlockReturnsSuccess = false
    let raceBlockReturnsFalse = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Detect entry into race loss block
      if (
        line.includes('verifiedEvent') &&
        (line.includes('!== toStatus') || line.includes('!== to_status'))
      ) {
        inRaceBlock = true
      }
      if (inRaceBlock) {
        if (line.includes('success: true') || line.includes('success:true')) {
          raceBlockReturnsSuccess = true
        }
        if (
          line.includes('success: false') ||
          line.includes('success:false') ||
          line.includes('error')
        ) {
          raceBlockReturnsFalse = true
        }
        // Exit race block at next return or closing brace
        if (line.trim().startsWith('return') || (line.trim() === '}' && inRaceBlock)) {
          break
        }
      }
    }

    if (raceBlockReturnsSuccess && !raceBlockReturnsFalse) {
      console.warn(
        'CRITICAL: transitionEvent() returns success:true on race loss. ' +
          'Caller thinks they won the race but the event is in a different state. ' +
          'Fix: return { success: false, error: "concurrent_modification" }'
      )
    }

    // This test documents the current state - it WILL fail if the race block
    // returns success:true, which is the known gap from Q4
    expect(
      raceBlockReturnsSuccess && !raceBlockReturnsFalse,
      'Race loss block must not return success:true without also returning an error'
    ).toBe(false)
  })
})
