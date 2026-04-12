import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

test('background token retrieval can skip request-scoped session checks', () => {
  const authSource = readSource('lib/google/auth.ts')
  const historicalScanSource = readSource('lib/gmail/historical-scan.ts')
  const syncSource = readSource('lib/gmail/sync.ts')

  assert.match(authSource, /options\?:\s*\{\s*skipSessionCheck\?: boolean\s*\}/)
  assert.match(authSource, /if\s*\(!options\?\.skipSessionCheck\)/)
  assert.doesNotMatch(
    authSource,
    /import\s+\{\s*requireChef\s*\}\s+from\s+'@\/lib\/auth\/get-user'/
  )
  assert.match(
    historicalScanSource,
    /getGoogleAccessToken\(chefId,\s*\{\s*skipSessionCheck:\s*true\s*\}\)/
  )
  assert.match(syncSource, /getGoogleAccessToken\(chefId,\s*\{\s*skipSessionCheck:\s*true\s*\}\)/)
})

test('historical scan marks itself in progress before listing Gmail pages', () => {
  const source = readSource('lib/gmail/historical-scan.ts')

  const inProgressIndex = source.indexOf("historical_scan_status: 'in_progress'")
  const listMessagesIndex = source.indexOf('pageResult = await listMessagesPage')

  assert.notEqual(inProgressIndex, -1)
  assert.notEqual(listMessagesIndex, -1)
  assert.ok(inProgressIndex < listMessagesIndex)
  assert.match(
    source,
    /checkpointHistoricalScanProgress\(\s*db,\s*chefId,\s*baseTotalProcessed \+ result\.processed,\s*baseTotalSeen \+ result\.seen\s*\)/
  )
  assert.match(
    source,
    /const baseTotalSeen = Math\.max\(scanConn\.historical_scan_total_seen \?\? 0,\s*baseTotalProcessed\)/
  )
})

test('historical scan classification reuses Gmail metadata before AI fallback', () => {
  const source = readSource('lib/gmail/historical-scan.ts')

  assert.match(source, /labelIds:\s*email\.labelIds/)
  assert.match(source, /listUnsubscribe:\s*email\.listUnsubscribe/)
  assert.match(source, /precedence:\s*email\.precedence/)
  assert.match(source, /tenantId,/)
  assert.match(source, /getHistoricalMessageWithRetry/)
  assert.match(source, /classifyHistoricalEmailWithRetry/)
  assert.match(source, /TRANSIENT_MESSAGE_MAX_ATTEMPTS = 3/)
  assert.match(source, /TRANSIENT_CLASSIFICATION_MAX_ATTEMPTS = 3/)
  assert.match(source, /saveHistoricalFinding/)
  assert.match(source, /\.eq\('tenant_id', finding\.tenant_id\)/)
  assert.match(source, /\.eq\('gmail_message_id', finding\.gmail_message_id\)/)
  assert.match(source, /Historical finding insert failed:/)
})

test('settings UI no longer claims an idle scan is already starting soon', () => {
  const source = readSource('components/gmail/historical-scan-section.tsx')

  assert.doesNotMatch(source, /starting soon/i)
  assert.match(source, /waiting for the background worker to start/i)
  assert.match(source, /waiting for the next background batch to continue/i)
})

test('historical scan module exposes the script-compatible batch contract', () => {
  const source = readSource('lib/gmail/historical-scan.ts')

  assert.match(source, /export interface HistoricalScanBatchOptions/)
  assert.match(source, /messageConcurrency\?: number/)
  assert.match(source, /seen:\s*0/)
  assert.match(
    source,
    /export default\s*\{\s*buildHistoricalScanQuery,\s*runHistoricalScanBatch,\s*\}/s
  )
})
