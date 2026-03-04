import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSignificantApprovalPhrase,
  normalizeSignificantApprovalInput,
  validateSignificantApprovalPhrase,
  isLegacySignificantTaskType,
} from '@/lib/ai/remy-significant-approval'

test('builds stable confirmation phrase from task type', () => {
  assert.equal(buildSignificantApprovalPhrase('Agent.Create_Event'), 'approve agent.create_event')
})

test('normalizes confirmation input whitespace and casing', () => {
  assert.equal(
    normalizeSignificantApprovalInput('  APPROVE    agent.create_event  '),
    'approve agent.create_event'
  )
})

test('validates matching confirmation phrase', () => {
  const result = validateSignificantApprovalPhrase({
    taskType: 'agent.create_event',
    provided: 'approve agent.create_event',
  })
  assert.equal(result.valid, true)
  assert.equal(result.expected, 'approve agent.create_event')
})

test('rejects mismatched confirmation phrase', () => {
  const result = validateSignificantApprovalPhrase({
    taskType: 'agent.create_event',
    provided: 'approve agent.update_event',
  })
  assert.equal(result.valid, false)
  assert.equal(result.expected, 'approve agent.create_event')
})

test('identifies legacy significant task types', () => {
  assert.equal(isLegacySignificantTaskType('event.create_draft'), true)
  assert.equal(isLegacySignificantTaskType('EVENT.CREATE_DRAFT'), true)
  assert.equal(isLegacySignificantTaskType('client.search'), false)
})
