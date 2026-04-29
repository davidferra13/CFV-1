import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAcquisitionReadiness } from '@/lib/validation/acquisition-readiness'

describe('acquisition readiness', () => {
  it('requires public booking submissions', () => {
    const result = buildAcquisitionReadiness({
      publicBookingSubmissions: 0,
      utmAttributedSubmissions: 0,
      referralAttributedSubmissions: 0,
      uniqueSources: 0,
    })

    assert.equal(result.status, 'missing')
  })

  it('detects submissions without source proof', () => {
    const result = buildAcquisitionReadiness({
      publicBookingSubmissions: 3,
      utmAttributedSubmissions: 0,
      referralAttributedSubmissions: 0,
      uniqueSources: 0,
    })

    assert.equal(result.status, 'instrumented')
    assert.match(result.evidence, /none have campaign or referral attribution/)
    assert.equal(result.href, '/admin/pulse')
  })

  it('keeps single-source attribution in operator review', () => {
    const result = buildAcquisitionReadiness({
      publicBookingSubmissions: 3,
      utmAttributedSubmissions: 2,
      referralAttributedSubmissions: 0,
      uniqueSources: 1,
    })

    assert.equal(result.status, 'operator_review')
    assert.equal(result.href, '/admin/pulse')
  })

  it('verifies multi-source attribution', () => {
    const result = buildAcquisitionReadiness({
      publicBookingSubmissions: 4,
      utmAttributedSubmissions: 2,
      referralAttributedSubmissions: 1,
      uniqueSources: 2,
    })

    assert.equal(result.status, 'verified')
    assert.equal(result.href, '/admin/pulse')
  })
})
