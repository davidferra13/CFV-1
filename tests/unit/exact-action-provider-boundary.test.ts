import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function source(path: string): string {
  return readFileSync(path, 'utf8')
}

test('Stripe refund is executed only through the exact approval executor', () => {
  const code = source('lib/stripe/refund.ts')
  assert.match(code, /executeExactApprovedAction/)
  assert.match(code, /loadExactApprovalAction/)
  assert.match(code, /exact_approval_refund_/)
  assert.match(code, /stripe\.refunds\.retrieve/)
})

test('Stripe Connect account creation and links share the approval boundary', () => {
  const code = source('lib/stripe/connect.ts')
  assert.match(code, /executeExactApprovedAction/)
  assert.match(code, /loadExactApprovalAction/)
  assert.match(code, /stripe\.accounts\.create/)
  assert.match(code, /stripe\.accountLinks\.create/)
})
test('unsafe deferred transfer loop is removed and remains read-only', () => {
  const code = source('lib/stripe/deferred-transfers.ts')
  assert.doesNotMatch(code, /stripe\.transfers\.create/)
  assert.match(code, /Transfers remain hard-disabled/)
  assert.match(code, /canResolve: false/)
})

test('refund completion never auto-sends or uses bypass refund paths', () => {
  const action = source('lib/cancellation/refund-actions.ts')
  const modal = source('components/events/initiate-refund-modal.tsx')
  const webhook = source('app/api/webhooks/stripe/route.ts')
  const tickets = source('lib/tickets/actions.ts')
  assert.doesNotMatch(action, /sendRefundInitiatedEmail/)
  assert.match(action, /Outbound communication needs its own exact preview/)
  assert.match(modal, /No client message was sent/)
  assert.doesNotMatch(webhook, /stripe\.refunds\.create/)
  assert.doesNotMatch(tickets, /stripe\.refunds\.create/)
  assert.match(tickets, /Ticket refund blocked: exact amount and destination approval/)
})

test('all external Remy messages require approval', () => {
  const code = source('lib/communication/remy-approval-guardrails.ts')
  assert.match(code, /const safeAutoAckAllowed = false/)
  assert.match(code, /if \(externalSendSideEffect\)/)
})

test('high-risk autonomy cannot be enabled by preferences', () => {
  const code = source('lib/autonomy/approval-router.ts')
  assert.match(code, /if \(action\.riskLevel === 'high'\)/)
  assert.doesNotMatch(code, /riskLevel === 'high' && !preferences\.allowHighRiskAuto/)
})
test('database consumption is atomic, scoped, expiring, and single-use', () => {
  const sql = source('database/migrations/20260908000100_exact_action_approval_gateway.sql')
  assert.match(sql, /CREATE OR REPLACE FUNCTION consume_exact_action_approval/)
  assert.match(sql, /auth\.uid\(\) <> p_actor_id/)
  assert.match(sql, /action_hash = p_action_hash/)
  assert.match(sql, /status = 'approved'/)
  assert.match(sql, /status = 'consumed'/)
  assert.match(sql, /approval_expires_at > now\(\)/)
  assert.match(sql, /consumed_at IS NULL/)
})

test('admin subscription cancellation cannot bypass exact approval', () => {
  const code = source('lib/admin/chef-admin-actions.ts')
  assert.doesNotMatch(code, /stripe\.subscriptions\.cancel/)
  assert.match(code, /Stripe subscription cancellation blocked: exact approval/)
})

test('legacy status-only approvals cannot authorize consequential domains', () => {
  const code = source('lib/autonomy/approval-queue-actions.ts')
  assert.match(code, /legacyCannotAuthorize/)
  assert.match(code, /requires a new exact-payload approval preview/)
  assert.match(code, /\.eq\('status', 'pending'\)/)
})
