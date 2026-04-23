import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

test('gmail cron sync iterates mailbox-native records before legacy fallback', () => {
  const source = readSource('app/api/gmail/sync/route.ts')

  assert.match(source, /\.from\('google_mailboxes'\)/)
  assert.match(source, /\.eq\('gmail_connected', true\)/)
  assert.match(source, /\.eq\('is_active', true\)/)
  assert.match(
    source,
    /syncGmailInbox\(mailbox\.chef_id,\s*mailbox\.tenant_id,\s*\{[\s\S]*?mailboxId:\s*mailbox\.id,?[\s\S]*?\}\)/
  )
  assert.match(source, /const legacyFallbacks = .*mailboxChefIds/s)
})

test('historical scan cron iterates mailbox-native scan state before legacy fallback', () => {
  const source = readSource('app/api/scheduled/email-history-scan/route.ts')

  assert.match(source, /\.from\('google_mailboxes'\)/)
  assert.match(source, /\.eq\('historical_scan_enabled', true\)/)
  assert.match(source, /\.eq\('gmail_connected', true\)/)
  assert.match(source, /\.eq\('is_active', true\)/)
  assert.match(
    source,
    /runHistoricalScanBatch\(mailbox\.chef_id,\s*mailbox\.tenant_id,\s*\{[\s\S]*?mailboxId:\s*mailbox\.id,?[\s\S]*?\}\)/
  )
})

test('outbound communication replies request Gmail tokens for the managed mailbox', () => {
  const source = readSource('lib/communication/actions.ts')

  assert.match(source, /getManagedOutboundChannel\(/)
  assert.match(
    source,
    /getGoogleAccessToken\(user\.entityId!,\s*\{\s*mailboxId:\s*managedChannel\.mailboxId \|\| null,\s*\}\)/
  )
})
