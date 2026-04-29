import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const triggerSource = readFileSync(resolve('lib/notifications/triggers.ts'), 'utf8')

test('restaurant ops notifications link to current route surfaces', () => {
  assert.match(triggerSource, /link: '\/tasks'/)
  assert.match(triggerSource, /link: '\/stations\/orders'/)
  assert.match(triggerSource, /link: `\/stations\/\$\{stationId\}`/)
  assert.match(triggerSource, /link: '\/ops\/inventory'/)
})

test('restaurant ops notifications do not link to retired ops paths', () => {
  assert.doesNotMatch(triggerSource, /\/ops\/tasks/)
  assert.doesNotMatch(triggerSource, /\/ops\/orders/)
  assert.doesNotMatch(triggerSource, /\/ops\/clipboard/)
  assert.doesNotMatch(triggerSource, /\/ops\/stations\/\$\{stationId\}/)
})
