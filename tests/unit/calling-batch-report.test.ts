import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const CALL_HUB = resolve(ROOT, 'components/calling/call-hub.tsx')

test('call hub launches selected vendors as a reported safe batch', () => {
  const src = readFileSync(CALL_HUB, 'utf8')

  assert.match(src, /type BatchCallReport/)
  assert.match(src, /setBatchReport/)
  assert.match(src, /Call batch report/)
  assert.match(src, /for \(const v of toCall\)/)
  assert.doesNotMatch(src, /Promise\.allSettled\(toCall/)
  assert.match(src, /failed to launch/)
})
