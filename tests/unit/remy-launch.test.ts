import test from 'node:test'
import assert from 'node:assert/strict'

import { getOpenRemyPrompt, shouldAutoSendOpenRemyPrompt } from '@/lib/ai/remy-launch'

test('open remy prompt helper trims usable prompts', () => {
  assert.equal(getOpenRemyPrompt({ prompt: '  Catch me up  ' }), 'Catch me up')
  assert.equal(getOpenRemyPrompt({ prompt: '   ' }), null)
  assert.equal(getOpenRemyPrompt(), null)
})

test('open remy auto-send requires an explicit send flag and prompt', () => {
  assert.equal(
    shouldAutoSendOpenRemyPrompt({
      prompt: 'Catch me up since I was away',
      source: 'dashboard-return-to-work',
      send: true,
    }),
    true
  )
  assert.equal(
    shouldAutoSendOpenRemyPrompt({
      prompt: 'Catch me up since I was away',
      source: 'manual-prefill',
    }),
    false
  )
  assert.equal(shouldAutoSendOpenRemyPrompt({ prompt: '   ', send: true }), false)
})
