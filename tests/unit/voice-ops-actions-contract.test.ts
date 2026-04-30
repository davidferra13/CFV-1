import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = resolve(process.cwd(), 'lib/calling/voice-ops-actions.ts')
const RECORDER_SOURCE = resolve(process.cwd(), 'lib/calling/voice-ops-recorder.ts')

test('voice ops server actions export only async functions', () => {
  const src = readFileSync(SOURCE, 'utf8')

  assert.match(src, /^'use server'/)
  assert.match(src, /export async function createVoiceCallCampaign/)
  assert.match(src, /export async function recordVoiceOpsForAiCall/)
  assert.match(src, /export async function launchVoiceCallCampaign/)
  assert.match(src, /export async function completeVoicePostCallAction/)
  assert.match(src, /export async function markVoicePostCallActionNeedsReview/)
  assert.match(src, /export async function snoozeVoicePostCallAction/)
  assert.match(src, /export async function skipVoicePostCallAction/)
  assert.doesNotMatch(src, /export const /)
  assert.doesNotMatch(src, /export type /)
  assert.doesNotMatch(src, /export class /)
})

test('voice ops server actions authenticate before database access', () => {
  const src = readFileSync(SOURCE, 'utf8')
  const createBody = functionBody(src, 'createVoiceCallCampaign')
  const recordBody = functionBody(src, 'recordVoiceOpsForAiCall')
  const launchBody = functionBody(src, 'launchVoiceCallCampaign')
  const completeBody = functionBody(src, 'completeVoicePostCallAction')
  const reviewBody = functionBody(src, 'markVoicePostCallActionNeedsReview')
  const snoozeBody = functionBody(src, 'snoozeVoicePostCallAction')
  const skipBody = functionBody(src, 'skipVoicePostCallAction')

  assert.ok(createBody.indexOf('await requireChef()') < createBody.indexOf('createServerClient()'))
  assert.ok(recordBody.indexOf('await requireChef()') < recordBody.indexOf('createServerClient()'))
  assert.ok(launchBody.indexOf('await requireChef()') < launchBody.indexOf('createServerClient()'))
  assert.ok(
    completeBody.indexOf('await requireChef()') < completeBody.indexOf('createServerClient()')
  )
  assert.ok(reviewBody.indexOf('await requireChef()') < reviewBody.indexOf('createServerClient()'))
  assert.ok(snoozeBody.indexOf('await requireChef()') < snoozeBody.indexOf('createServerClient()'))
  assert.ok(skipBody.indexOf('await requireChef()') < skipBody.indexOf('createServerClient()'))
})

test('voice ops server actions tenant-scope reads and writes', () => {
  const src = readFileSync(SOURCE, 'utf8')
  const recorderSrc = readFileSync(RECORDER_SOURCE, 'utf8')

  assert.match(src, /chef_id: user\.tenantId!/)
  assert.match(src, /\.eq\('chef_id', user\.tenantId!\)/)
  assert.match(src, /\.from\('voice_call_campaigns'\)/)
  assert.match(src, /\.from\('voice_call_campaign_recipients'\)/)
  assert.match(src, /\.from\('voice_post_call_actions'\)/)
  assert.match(src, /\.eq\('campaign_id', campaignId\)/)
  assert.match(src, /\.eq\('id', actionId\)/)
  assert.match(src, /closeVoicePostCallAction/)
  assert.match(src, /closeoutIntent/)
  assert.match(src, /snoozedUntil/)
  assert.match(src, /recordVoiceOpsForAiCallWithDb/)
  assert.match(recorderSrc, /\.from\('voice_session_events'\)/)
  assert.match(recorderSrc, /\.from\('voice_post_call_actions'\)/)
  assert.match(recorderSrc, /\.eq\('chef_id', chefId\)/)
  assert.match(recorderSrc, /voiceOpsSource/)
  assert.match(recorderSrc, /duplicateKey/)
})

test('voice ops server actions return feedback and revalidate call sheet', () => {
  const src = readFileSync(SOURCE, 'utf8')

  assert.match(src, /Promise<\{\s*success: boolean/)
  assert.match(src, /return \{ success: false, error:/)
  assert.match(src, /revalidatePath\('\/culinary\/call-sheet'\)/)
  assert.match(src, /evaluateVoiceScriptQuality/)
  assert.match(src, /maxConcurrent/)
})

function functionBody(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${name} not found`)
  const next = src.indexOf('\nexport async function ', start + 1)
  return next === -1 ? src.slice(start) : src.slice(start, next)
}
