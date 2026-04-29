import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('lib/charity/hours-actions.ts', 'utf8')

test('charity hours realtime broadcasts log non-blocking failures', () => {
  assert.doesNotMatch(source, /catch\s*\{\s*\}/)
  assert.match(
    source,
    /function warnBroadcastFailure\(action: 'insert' \| 'update' \| 'delete', err: unknown\)/
  )
  assert.match(
    source,
    /console\.warn\(`\[charity\/hours-actions\] \$\{action\} broadcast failed`, err\)/
  )
  assert.match(source, /catch \(err\) \{\s*warnBroadcastFailure\('insert', err\)\s*\}/)
  assert.match(source, /catch \(err\) \{\s*warnBroadcastFailure\('update', err\)\s*\}/)
  assert.match(source, /catch \(err\) \{\s*warnBroadcastFailure\('delete', err\)\s*\}/)
})

test('charity hours delete returns explicit mutation feedback', () => {
  assert.match(
    source,
    /export async function deleteCharityHours\(id: string\): Promise<\{ success: true \}>/
  )
  assert.match(source, /return \{ success: true \}/)
})
