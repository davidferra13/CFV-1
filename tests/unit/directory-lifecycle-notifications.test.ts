import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const actionsSource = readFileSync(resolve('lib/discover/actions.ts'), 'utf8')

test('directory lifecycle flows create non-blocking notifications', () => {
  assert.match(actionsSource, /createNotificationForTenant/)
  assert.match(actionsSource, /notifyDirectoryListingLifecycle\(db, 'directory_listing_claimed'/)
  assert.match(actionsSource, /status === 'verified' \? 'directory_listing_verified'/)
  assert.match(actionsSource, /: 'directory_listing_removed'/)
  assert.match(
    actionsSource,
    /console\.warn\('\[non-blocking\] Directory lifecycle notification failed'/
  )
  assert.match(
    actionsSource,
    /console\.error\('\[non-blocking\] Directory lifecycle notification setup failed'/
  )
})
