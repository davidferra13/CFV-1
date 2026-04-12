import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8')
}

describe('Dinner Circle invariant', () => {
  it('keeps guest-visible sharing mutations converging into Dinner Circles', () => {
    const content = readRepoFile('lib/sharing/actions.ts')

    assert.match(content, /async function ensureDinnerCircleForEventNonBlocking/)

    const guardedFunctions = [
      'createEventShare',
      'addGuestManually',
      'createViewerInviteForEvent',
      'resolveEventJoinRequest',
      'createViewerInviteFromGuest',
      'createGuestInviteFromGuest',
      'submitRSVP',
    ]

    for (const fn of guardedFunctions) {
      assert.match(
        content,
        new RegExp(`export async function ${fn}[\\s\\S]*?ensureDinnerCircleForEventNonBlocking\\(`),
        `${fn} must ensure a Dinner Circle exists`
      )
    }
  })

  it('keeps event-level Dinner Circle reporting and admin backfill in place', () => {
    const integration = readRepoFile('lib/hub/integration-actions.ts')
    const adminActions = readRepoFile('lib/admin/hub-admin-actions.ts')
    const adminHubPage = readRepoFile('app/(admin)/admin/hub/page.tsx')

    assert.match(integration, /export async function ensureEventDinnerCircle/)
    assert.match(integration, /export async function getGuestVisibleEventsMissingDinnerCircles/)
    assert.match(integration, /\.from\('event_shares'\)/)
    assert.match(integration, /\.from\('hub_groups'\)/)

    assert.match(adminActions, /export async function backfillGuestVisibleDinnerCircles/)
    assert.match(adminActions, /getGuestVisibleEventsMissingDinnerCircles/)
    assert.match(adminActions, /ensureEventDinnerCircle/)

    assert.match(adminHubPage, /Dinner Circle Compliance/)
    assert.match(adminHubPage, /Backfill Missing Dinner Circles/)
    assert.match(adminHubPage, /getGuestVisibleEventsMissingDinnerCircles/)
    assert.match(adminHubPage, /backfillGuestVisibleDinnerCircles/)
  })
})
