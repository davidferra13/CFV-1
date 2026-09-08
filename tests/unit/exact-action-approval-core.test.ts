import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertPreviewIntegrity,
  createExactActionPreview,
  fingerprintExactAction,
  validateExactAction,
  type ExactAction,
  type FinancialDisclosure,
} from '../../lib/security/exact-action-approval-core'

const NOW = new Date('2026-09-08T04:00:00.000Z')

function money(): FinancialDisclosure {
  return {
    currency: 'USD',
    grossMinor: 60000,
    fees: [
      { label: 'processing', amountMinor: 1770 },
      { label: 'platform', amountMinor: 2030 },
    ],
    netMinor: 56200,
    source: { institution: 'Stripe', accountType: 'balance', last4: '0000' },
    destination: { institution: 'Approved bank', accountType: 'checking', last4: '4242' },
    timing: 'standard payout',
    rail: 'ACH',
    reversible: false,
    reversalPath: 'Contact provider; reversal is not guaranteed',
    noActionResult: 'Funds remain in the Stripe balance',
  }
}

function action(overrides: Partial<ExactAction> = {}): ExactAction {
  return {
    actionId: 'action-1',
    tenantId: 'tenant-1',
    actorId: 'david',
    toolName: 'stripe.transfers.create',
    category: 'finance',
    operation: 'create_transfer',
    environment: 'external',
    target: {
      provider: 'stripe',
      accountRef: 'acct_dfpc',
      destinationLast4: '4242',
    },
    payload: { amountMinor: 56200, currency: 'USD' },
    financialDisclosure: money(),
    contextVersion: 'stripe-state-v1',
    ...overrides,
  }
}
test('builds a short-lived preview bound to the exact action', () => {
  const preview = createExactActionPreview(action(), { now: NOW })
  assert.equal(preview.actionHash, fingerprintExactAction(preview.action))
  assert.equal(Date.parse(preview.expiresAt) - Date.parse(preview.createdAt), 10 * 60 * 1000)
  assert.doesNotThrow(() => assertPreviewIntegrity(preview, NOW))
})

test('hash changes when destination, amount, tool, environment, or context changes', () => {
  const base = action()
  const hashes = new Set([
    fingerprintExactAction(base),
    fingerprintExactAction({
      ...base,
      target: { ...base.target, destinationLast4: '9632' },
    }),
    fingerprintExactAction({ ...base, payload: { amountMinor: 56199, currency: 'USD' } }),
    fingerprintExactAction({ ...base, toolName: 'stripe.payouts.create' }),
    fingerprintExactAction({ ...base, environment: 'production' }),
    fingerprintExactAction({ ...base, contextVersion: 'stripe-state-v2' }),
  ])
  assert.equal(hashes.size, 6)
})
test('object key order cannot change the canonical hash', () => {
  const left = action({ payload: { currency: 'USD', amountMinor: 56200 } })
  const right = action({ payload: { amountMinor: 56200, currency: 'USD' } })
  assert.equal(fingerprintExactAction(left), fingerprintExactAction(right))
})

test('rejects raw banking and credential material', () => {
  assert.match(
    validateExactAction(action({ payload: { accountNumber: '123456789' } })) ?? '',
    /^raw_secret_forbidden/
  )
  assert.match(
    validateExactAction(action({ target: { nested: { accessToken: 'secret' } } })) ?? '',
    /^raw_secret_forbidden/
  )
})

test('rejects a missing or inconsistent financial disclosure', () => {
  assert.equal(
    validateExactAction(action({ financialDisclosure: undefined })),
    'financial_disclosure_missing'
  )
  assert.equal(
    validateExactAction({
      ...action(),
      financialDisclosure: { ...money(), netMinor: 56201 },
    }),
    'financial_math_mismatch'
  )
})
test('fee labels and amounts are part of the approval', () => {
  const original = action()
  const changed = action({
    financialDisclosure: {
      ...money(),
      fees: [
        { label: 'processing', amountMinor: 1800 },
        { label: 'platform', amountMinor: 2000 },
      ],
    },
  })
  assert.notEqual(fingerprintExactAction(original), fingerprintExactAction(changed))
})

test('recipient and exact message body are part of communication approval', () => {
  const message = action({
    category: 'communication',
    toolName: 'postmark.sendEmail',
    operation: 'send_email',
    target: { recipient: 'approved@example.com', threadId: 'thread-1' },
    payload: { subject: 'Approved', body: 'Exact approved body' },
    financialDisclosure: undefined,
  })
  assert.notEqual(
    fingerprintExactAction(message),
    fingerprintExactAction({
      ...message,
      target: { recipient: 'wrong@example.com', threadId: 'thread-1' },
    })
  )
})
test('expired or modified previews are rejected', () => {
  const preview = createExactActionPreview(action(), { now: NOW, ttlMs: 1000 })
  assert.throws(
    () => assertPreviewIntegrity(preview, new Date(NOW.getTime() + 1001)),
    /approval_preview_expired/
  )

  const changed = {
    ...preview,
    action: {
      ...preview.action,
      payload: { amountMinor: 1, currency: 'USD' },
    },
  }
  assert.throws(() => assertPreviewIntegrity(changed, NOW), /preview_action_hash_mismatch/)
})

test('TTL cannot exceed ten minutes', () => {
  assert.throws(
    () => createExactActionPreview(action(), { now: NOW, ttlMs: 10 * 60 * 1000 + 1 }),
    /approval_ttl_out_of_range/
  )
})

test('unknown categories fail closed', () => {
  const unsafe = action({ category: 'finance' })
  ;(unsafe as { category: string }).category = 'maybe_safe'
  assert.equal(validateExactAction(unsafe), 'unknown_risk_category')
})
