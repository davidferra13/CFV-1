import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const VOICE_HELPERS = resolve(ROOT, 'lib/calling/voice-helpers.ts')
const TWILIO_ACTIONS = resolve(ROOT, 'lib/calling/twilio-actions.ts')
const GATHER_ROUTE = resolve(ROOT, 'app/api/calling/gather/route.ts')

test('outbound voice scripts disclose AI, recording, purpose, and opt-out path', () => {
  const src = readFileSync(VOICE_HELPERS, 'utf8')

  assert.match(src, /AI assistant calling on behalf of/)
  assert.match(src, /This call may be recorded/)
  assert.match(src, /stop calling at any time/)
  assert.match(src, /check availability and pricing/)
  assert.match(src, /confirm a vendor delivery/)
  assert.match(src, /confirm event logistics/)
})

test('outbound call initiation blocks contacts with prior AI call opt-outs', () => {
  const src = readFileSync(TWILIO_ACTIONS, 'utf8')

  assert.match(src, /checkAiCallOptOut/)
  assert.match(src, /ai_call_opt_out_requested/)
  assert.match(src, /\.contains\('action_log'/)

  const optOutChecks = src.match(/checkAiCallOptOut\(db, user\.tenantId!,/g) ?? []
  assert.ok(optOutChecks.length >= 4, 'all outbound call roles must check opt-out state')
})

test('gather route records stop-calling requests as durable call state', () => {
  const src = readFileSync(GATHER_ROUTE, 'utf8')

  assert.match(src, /AI_CALL_OPT_OUT_ACTION = 'ai_call_opt_out_requested'/)
  assert.match(src, /has(?:AiCall|VoiceAgent)OptOutRequest/)
  assert.match(src, /handleAiCallOptOut/)
  assert.match(src, /Contact requested no AI assistant calls/)

  const optOutDispatch = Math.max(
    src.indexOf('hasAiCallOptOutRequest(speech)'),
    src.indexOf('hasVoiceAgentOptOutRequest(speech)')
  )
  const normalDispatch = src.indexOf("if (role === 'vendor_delivery')")
  assert.ok(
    optOutDispatch > -1 && normalDispatch > -1 && optOutDispatch < normalDispatch,
    'opt-out handling must run before normal role dispatch'
  )
})
