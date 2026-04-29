import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionsSource = readFileSync('lib/wix/actions.ts', 'utf8')
const submissionActionsSource = readFileSync('lib/wix/submission-actions.ts', 'utf8')

test('wix server actions expose only async exports from use server files', () => {
  assert.doesNotMatch(submissionActionsSource, /export type /)
  assert.match(submissionActionsSource, /type WixSubmissionDetail = /)
})

test('wix realtime broadcasts log non-blocking failures', () => {
  assert.doesNotMatch(actionsSource, /catch\s*\{\s*\}/)
  assert.doesNotMatch(submissionActionsSource, /catch\s*\{\s*\}/)
  assert.match(actionsSource, /function warnWixBroadcastFailure/)
  assert.match(submissionActionsSource, /function warnWixSubmissionBroadcastFailure/)
  assert.match(
    actionsSource,
    /console\.warn\(`\[wix\/actions\] \$\{action\} broadcast failed`, err\)/
  )
  assert.match(
    submissionActionsSource,
    /console\.warn\('\[wix\/submission-actions\] update broadcast failed', err\)/
  )
})

test('wix void mutations return explicit feedback', () => {
  assert.match(
    actionsSource,
    /export async function disconnectWix\(\): Promise<\{ success: true \}>/
  )
  assert.match(
    actionsSource,
    /export async function retryWixSubmission\(submissionId: string\): Promise<\{ success: true \}>/
  )
  assert.match(actionsSource, /return \{ success: true \}/)
})
