import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assessClientDataFreshness,
  type ClientFactFreshnessInput,
} from '../../lib/clients/client-data-freshness'

const NOW = new Date('2026-04-29T12:00:00.000Z')

test('marks recently reviewed facts as current', () => {
  const report = assessClientDataFreshness(
    [
      {
        field: 'email',
        value: 'client@example.com',
        updatedAt: '2026-04-20T12:00:00.000Z',
        source: 'client',
      },
      {
        field: 'allergies',
        value: ['peanut'],
        updatedAt: '2026-04-20T12:00:00.000Z',
        confirmedAt: '2026-04-25T12:00:00.000Z',
        source: 'chef',
      },
    ],
    { now: NOW }
  )

  assert.strictEqual(report.byField.email.status, 'current')
  assert.strictEqual(report.byField.email.daysSinceUpdate, 9)
  assert.strictEqual(report.byField.allergies.status, 'current')
  assert.strictEqual(report.byField.allergies.reviewAgeDays, 4)
})

test('marks populated facts as stale after the field review window', () => {
  const report = assessClientDataFreshness(
    {
      phone: {
        value: '555-0100',
        updatedAt: '2025-01-01T12:00:00.000Z',
        source: 'client',
      },
    },
    { now: NOW }
  )

  assert.strictEqual(report.byField.phone.status, 'stale')
  assert.strictEqual(report.byField.phone.daysSinceUpdate, 483)
  assert.strictEqual(report.summary.staleCount, 1)
})

test('marks blank, absent, and false-present facts as missing', () => {
  const report = assessClientDataFreshness(
    [
      {
        field: 'address',
        value: '   ',
        updatedAt: '2026-04-20T12:00:00.000Z',
      },
      {
        field: 'email',
        valuePresent: false,
        value: 'client@example.com',
        updatedAt: '2026-04-20T12:00:00.000Z',
      },
    ],
    { now: NOW }
  )

  assert.strictEqual(report.byField.address.status, 'missing')
  assert.strictEqual(report.byField.email.status, 'missing')
  assert.strictEqual(report.byField.kitchen_constraints.status, 'missing')
})

test('marks populated safety-critical facts as unconfirmed when never confirmed', () => {
  const report = assessClientDataFreshness(
    [
      {
        field: 'dietary_restrictions',
        value: ['gluten-free'],
        updatedAt: '2026-04-28T12:00:00.000Z',
        source: 'client',
      },
      {
        field: 'access_instructions',
        value: 'Use side gate',
        updatedAt: '2026-04-28T12:00:00.000Z',
      },
    ],
    { now: NOW }
  )

  assert.strictEqual(report.byField.dietary_restrictions.status, 'unconfirmed')
  assert.strictEqual(report.byField.dietary_restrictions.daysSinceUpdate, 1)
  assert.strictEqual(report.byField.access_instructions.status, 'unconfirmed')
  assert.strictEqual(report.summary.unconfirmedCriticalCount, 2)
})

test('uses confirmedAt as the safety-critical review date before updatedAt', () => {
  const facts: ClientFactFreshnessInput[] = [
    {
      field: 'allergies',
      value: ['shellfish'],
      updatedAt: '2026-04-28T12:00:00.000Z',
      confirmedAt: '2025-12-01T12:00:00.000Z',
    },
  ]

  const report = assessClientDataFreshness(facts, { now: NOW })

  assert.strictEqual(report.byField.allergies.status, 'stale')
  assert.strictEqual(report.byField.allergies.daysSinceUpdate, 1)
  assert.strictEqual(report.byField.allergies.daysSinceConfirmation, 149)
  assert.strictEqual(report.byField.allergies.reviewAgeDays, 149)
})

test('summary prioritizes unconfirmed critical fields before missing and stale fields', () => {
  const report = assessClientDataFreshness(
    {
      allergies: {
        value: ['tree nuts'],
        updatedAt: '2026-04-28T12:00:00.000Z',
      },
      address: {
        value: '',
        updatedAt: '2026-04-28T12:00:00.000Z',
      },
      phone: {
        value: '555-0100',
        updatedAt: '2025-01-01T12:00:00.000Z',
      },
    },
    { now: NOW }
  )

  assert.strictEqual(report.summary.unconfirmedCriticalCount, 1)
  assert.strictEqual(report.summary.missingCount, 5)
  assert.strictEqual(report.summary.staleCount, 1)
  assert.strictEqual(report.summary.nextReviewField, 'allergies')
})
