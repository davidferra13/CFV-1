import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { parseHistoricalInquirySource } from '../../lib/business-history-import/parse-source'

const source = {
  fromAddress: 'Sam Example <SAM@example.test>',
  receivedAt: '2016-04-01T12:00:00Z',
  bodyPreview: 'Dinner date: 2016-05-04. We have 8 guests.',
}

test('historical extraction preserves source year and envelope identity', () => {
  const result = parseHistoricalInquirySource(source)
  assert.equal(result.fields.firstContactAt, '2016-04-01T12:00:00.000Z')
  assert.equal(result.fields.confirmedDate, '2016-05-04')
  assert.equal(result.fields.confirmedGuestCount, 8)
  assert.deepEqual(result.clientLead, { email: 'sam@example.test', fullName: 'Sam Example' })
})

test('relative dates and unspecified years remain unknown', () => {
  for (const bodyPreview of ['Dinner tomorrow, 8 guests', 'Dinner on May 4, 8 guests']) {
    assert.equal(
      parseHistoricalInquirySource({ ...source, bodyPreview }).fields.confirmedDate,
      null
    )
  }
})

test('conflicting and impossible explicit dates are retained for review', () => {
  for (const bodyPreview of [
    'Dinner date: 2016-02-30',
    'Dinner date: 2016-05-04 or date: 2016-05-05',
  ]) {
    const result = parseHistoricalInquirySource({ ...source, bodyPreview })
    assert.equal(result.fields.confirmedDate, null)
    assert.ok(result.warnings.length)
  }
})

test('conflicting counts and unrelated dates are not promoted into confirmed fields', () => {
  const result = parseHistoricalInquirySource({
    ...source,
    bodyPreview: 'Born 1980-01-01. 8 guests or 12 guests.',
  })
  assert.equal(result.fields.confirmedDate, null)
  assert.equal(result.fields.confirmedGuestCount, null)
})

test('missing or invalid historical source time never falls back to present day', () => {
  for (const receivedAt of [null, '', '2016-02-30T12:00:00Z', 'tomorrow']) {
    assert.throws(() => parseHistoricalInquirySource({ ...source, receivedAt }), /source date/)
  }
})

test('unusable envelope leaves the client link unresolved', () => {
  const result = parseHistoricalInquirySource({ ...source, fromAddress: 'Unknown' })
  assert.equal(result.clientLead, null)
  assert.ok(result.warnings.includes('sender_unresolved'))
})

test('platform notifications do not create a client for the platform sender', () => {
  for (const fromAddress of [
    'Take a Chef <support@takeachef.com>',
    'noreply@privatechefmanager.com',
    'Notifications <no-reply@example.test>',
  ]) {
    assert.equal(parseHistoricalInquirySource({ ...source, fromAddress }).clientLead, null)
  }
})
