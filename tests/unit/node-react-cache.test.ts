import test from 'node:test'
import assert from 'node:assert/strict'
import '../helpers/node-react-cache.cjs'
import { cache } from 'react'

test('node cache compatibility executes each call without sharing auth results', async () => {
  let user = 'first-user'
  let calls = 0
  const readUser = cache(async () => {
    calls += 1
    return user
  })
  assert.equal(await readUser(), 'first-user')
  user = 'second-user'
  assert.equal(await readUser(), 'second-user')
  assert.equal(calls, 2)
})

test('node cache compatibility propagates errors and retries the callback', () => {
  let calls = 0
  const fail = cache(() => {
    calls += 1
    throw new Error('session unavailable')
  })
  assert.throws(fail, /session unavailable/)
  assert.throws(fail, /session unavailable/)
  assert.equal(calls, 2)
})
