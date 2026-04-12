import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { buildGreetingFastPath } = require('../../app/api/remy/stream/route-runtime-utils.ts')

test('greeting fast path stays deterministic and context-free', () => {
  const text = buildGreetingFastPath(new Date('2026-04-09T09:00:00-04:00'))

  assert.match(text, /^Morning, chef!/)
  assert.match(
    text,
    /Ask me about events, clients, menus, costs, drafts, or what needs attention today\./
  )
})
