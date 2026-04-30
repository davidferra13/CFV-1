import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = resolve(process.cwd(), 'lib/calling/voice-ops-actions.ts')

test('voice ops server actions export only async functions', () => {
  const src = readFileSync(SOURCE, 'utf8')

  assert.match(src, /^'use server'/)
  assert.match(src, /export async function createVoiceCallCampaign/)
  assert.match(src, /export async function recordVoiceOpsForAiCall/)
  assert.doesNotMatch(src, /export const /)
  assert.doesNotMatch(src, /export type /)
  assert.doesNotMatch(src, /export class /)
})

test('voice ops server actions authenticate before database access', () => {
  const src = readFileSync(SOURCE, 'utf8')
  const createBody = functionBody(src, 'createVoiceCallCampaign')
  const recordBody = functionBody(src, 'recordVoiceOpsForAiCall')

  assert.ok(createBody.indexOf('await requireChef()') < createBody.indexOf('createServerClient()'))
  assert.ok(recordBody.indexOf('await requireChef()') < recordBody.indexOf('createServerClient()'))
})

test('voice ops server actions tenant-scope reads and writes', () => {
  const src = readFileSync(SOURCE, 'utf8')

  assert.match(src, /chef_id: user\.tenantId!/)
  assert.match(src, /\.eq\('chef_id', user\.tenantId!\)/)
  assert.match(src, /\.from\('voice_call_campaigns'\)/)
  assert.match(src, /\.from\('voice_call_campaign_recipients'\)/)
  assert.match(src, /\.from\('voice_session_events'\)/)
  assert.match(src, /\.from\('voice_post_call_actions'\)/)
})

test('voice ops server actions return feedback and revalidate call sheet', () => {
  const src = readFileSync(SOURCE, 'utf8')

  assert.match(src, /Promise<\{\s*success: boolean/)
  assert.match(src, /return \{ success: false, error:/)
  assert.match(src, /revalidatePath\('\/culinary\/call-sheet'\)/)
})

function functionBody(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${name} not found`)
  const next = src.indexOf('\nexport async function ', start + 1)
  return next === -1 ? src.slice(start) : src.slice(start, next)
}
