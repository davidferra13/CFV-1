import test from 'node:test'
import assert from 'node:assert/strict'

import { analyzeVoiceAffect } from '@/lib/affective/voice-affect'

test('analyzeVoiceAffect flags urgent friction with evidence', () => {
  const result = analyzeVoiceAffect({
    transcript:
      'I am frustrated because the invoice is wrong and I need this fixed today. The cost is over budget.',
    source: 'call',
    role: 'inbound_voicemail',
    direction: 'inbound',
    now: new Date('2026-04-28T12:00:00.000Z'),
  })

  assert.equal(result.risk_level, 'high')
  assert.equal(result.confidence, 'high')
  assert.ok(result.signals.some((signal) => signal.signal === 'friction'))
  assert.ok(result.signals.some((signal) => signal.signal === 'urgency'))
  assert.ok(result.signals.some((signal) => signal.signal === 'price_sensitivity'))
  assert.match(result.guardrail, /not a claim/)
})

test('analyzeVoiceAffect treats short positive transcript as low confidence', () => {
  const result = analyzeVoiceAffect({
    transcript: 'Yes, perfect.',
    source: 'call',
    now: new Date('2026-04-28T12:00:00.000Z'),
  })

  assert.equal(result.risk_level, 'none')
  assert.equal(result.confidence, 'low')
  assert.ok(result.signals.some((signal) => signal.signal === 'positive_interest'))
})

test('analyzeVoiceAffect does not invent signals without transcript', () => {
  const result = analyzeVoiceAffect({
    transcript: '',
    source: 'voice_memo',
    now: new Date('2026-04-28T12:00:00.000Z'),
  })

  assert.equal(result.risk_level, 'none')
  assert.equal(result.confidence, 'low')
  assert.deepEqual(result.signals, [])
  assert.match(result.summary, /No affective signal/)
})
