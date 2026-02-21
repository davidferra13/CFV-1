import test from 'node:test'
import assert from 'node:assert/strict'
import {
  UuidSchema,
  DateStringSchema,
  CentsSchema,
  PositiveCentsSchema,
  PhoneSchema,
  EventStatusSchema,
  TransitionEventInputSchema,
  LedgerEntrySchema,
  safeValidate,
} from '@/lib/validation/schemas'

// ─── UuidSchema ──────────────────────────────────────────────────────────────

test('UuidSchema accepts valid UUID v4', () => {
  const result = UuidSchema.safeParse('f47ac10b-58cc-4372-a567-0e02b2c3d479')
  assert.equal(result.success, true)
})

test('UuidSchema rejects non-UUID string', () => {
  const result = UuidSchema.safeParse('not-a-uuid')
  assert.equal(result.success, false)
})

test('UuidSchema rejects empty string', () => {
  const result = UuidSchema.safeParse('')
  assert.equal(result.success, false)
})

// ─── DateStringSchema ────────────────────────────────────────────────────────

test('DateStringSchema accepts YYYY-MM-DD', () => {
  const result = DateStringSchema.safeParse('2026-06-15')
  assert.equal(result.success, true)
})

test('DateStringSchema rejects ISO timestamp', () => {
  const result = DateStringSchema.safeParse('2026-06-15T10:00:00Z')
  assert.equal(result.success, false)
})

test('DateStringSchema rejects MM/DD/YYYY format', () => {
  const result = DateStringSchema.safeParse('06/15/2026')
  assert.equal(result.success, false)
})

// ─── CentsSchema ─────────────────────────────────────────────────────────────

test('CentsSchema accepts zero', () => {
  const result = CentsSchema.safeParse(0)
  assert.equal(result.success, true)
})

test('CentsSchema accepts positive integer', () => {
  const result = CentsSchema.safeParse(50000)
  assert.equal(result.success, true)
})

test('CentsSchema rejects decimal (float)', () => {
  const result = CentsSchema.safeParse(99.99)
  assert.equal(result.success, false)
})

test('CentsSchema rejects negative value', () => {
  const result = CentsSchema.safeParse(-100)
  assert.equal(result.success, false)
})

// ─── PositiveCentsSchema ─────────────────────────────────────────────────────

test('PositiveCentsSchema rejects zero', () => {
  const result = PositiveCentsSchema.safeParse(0)
  assert.equal(result.success, false)
})

test('PositiveCentsSchema accepts 1 cent', () => {
  const result = PositiveCentsSchema.safeParse(1)
  assert.equal(result.success, true)
})

// ─── PhoneSchema ─────────────────────────────────────────────────────────────

test('PhoneSchema accepts valid US phone', () => {
  const result = PhoneSchema.safeParse('+1 617 555 1234')
  assert.equal(result.success, true)
})

test('PhoneSchema accepts empty string', () => {
  const result = PhoneSchema.safeParse('')
  assert.equal(result.success, true)
})

test('PhoneSchema rejects too-short string', () => {
  const result = PhoneSchema.safeParse('123')
  assert.equal(result.success, false)
})

// ─── EventStatusSchema ───────────────────────────────────────────────────────

test('EventStatusSchema accepts all 8 valid statuses', () => {
  const statuses = [
    'draft',
    'proposed',
    'accepted',
    'paid',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ]
  for (const s of statuses) {
    const result = EventStatusSchema.safeParse(s)
    assert.equal(result.success, true, `Expected ${s} to be valid`)
  }
})

test('EventStatusSchema rejects unknown status', () => {
  const result = EventStatusSchema.safeParse('unknown')
  assert.equal(result.success, false)
})

// ─── TransitionEventInputSchema ───────────────────────────────────────────────

test('TransitionEventInputSchema accepts valid input', () => {
  const result = TransitionEventInputSchema.safeParse({
    eventId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    toStatus: 'proposed',
  })
  assert.equal(result.success, true)
})

test('TransitionEventInputSchema fills defaults for metadata and systemTransition', () => {
  const result = TransitionEventInputSchema.safeParse({
    eventId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    toStatus: 'confirmed',
  })
  assert.equal(result.success, true)
  if (result.success) {
    assert.deepEqual(result.data.metadata, {})
    assert.equal(result.data.systemTransition, false)
  }
})

test('TransitionEventInputSchema rejects invalid eventId', () => {
  const result = TransitionEventInputSchema.safeParse({
    eventId: 'not-a-uuid',
    toStatus: 'proposed',
  })
  assert.equal(result.success, false)
})

test('TransitionEventInputSchema rejects invalid toStatus', () => {
  const result = TransitionEventInputSchema.safeParse({
    eventId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    toStatus: 'flying',
  })
  assert.equal(result.success, false)
})

// ─── safeValidate ────────────────────────────────────────────────────────────

test('safeValidate returns success and data on valid input', () => {
  const result = safeValidate(CentsSchema, 500)
  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data, 500)
  }
})

test('safeValidate returns error string on invalid input', () => {
  const result = safeValidate(CentsSchema, -5)
  assert.equal(result.success, false)
  if (!result.success) {
    assert.equal(typeof result.error, 'string')
    assert.ok(result.error.length > 0)
  }
})

test('safeValidate error message includes path for nested schemas', () => {
  const result = safeValidate(LedgerEntrySchema, {
    eventId: 'not-a-uuid',
    tenantId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    entryType: 'payment',
    amountCents: 1000,
    transactionReference: 'stripe_pi_abc123',
  })
  assert.equal(result.success, false)
  if (!result.success) {
    assert.ok(result.error.includes('eventId'), `Expected 'eventId' in error: "${result.error}"`)
  }
})

test('safeValidate returns generic message when no path', () => {
  const result = safeValidate(CentsSchema, 'not-a-number')
  assert.equal(result.success, false)
  if (!result.success) {
    assert.equal(typeof result.error, 'string')
  }
})
