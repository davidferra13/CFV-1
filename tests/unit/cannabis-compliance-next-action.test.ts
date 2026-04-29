import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync('app/(chef)/cannabis/compliance/page.tsx', 'utf8')

test('cannabis compliance empty state links to existing event next actions', () => {
  assert.match(pageSource, /No active cannabis events found/)
  assert.match(pageSource, /href="\/cannabis\/events"/)
  assert.match(pageSource, /href="\/events\/new\?cannabis=true"/)
  assert.match(pageSource, /View cannabis events/)
  assert.match(pageSource, /Create cannabis event/)
})
