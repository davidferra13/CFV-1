import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyPieReliability, summarizeReliabilityBuckets } from '@/lib/pricing/pie-reliability'

test('PIE reliability treats direct fresh observations as trustworthy', () => {
  const classification = classifyPieReliability({
    resolutionTier: 'chef_receipt',
    confidence: 0.9,
    effectiveConfidence: 0.9,
    freshness: 'current',
    confirmedAt: new Date().toISOString(),
  })

  assert.equal(classification.bucket, 'direct_observed')
  assert.equal(classification.isTrustworthyForExactCosting, true)
  assert.equal(classification.shouldShowEstimateLabel, false)
})

test('PIE reliability labels synthetic and stale values as estimates', () => {
  const synthetic = classifyPieReliability({
    resolutionTier: 'synthetic',
    confidence: 0.2,
    effectiveConfidence: 0.2,
    freshness: 'recent',
  })
  const stale = classifyPieReliability({
    resolutionTier: 'regional',
    confidence: 0.7,
    effectiveConfidence: 0.7,
    freshness: 'stale',
  })

  assert.equal(synthetic.shouldShowEstimateLabel, true)
  assert.equal(stale.bucket, 'stale')
  assert.equal(stale.isTrustworthyForExactCosting, false)
})

test('PIE reliability summary blocks high synthetic or low confidence mixes', () => {
  const summary = summarizeReliabilityBuckets([
    classifyPieReliability({
      resolutionTier: 'synthetic',
      confidence: 0.2,
      effectiveConfidence: 0.2,
      freshness: 'recent',
    }),
    classifyPieReliability({
      resolutionTier: 'synthetic',
      confidence: 0.2,
      effectiveConfidence: 0.2,
      freshness: 'recent',
    }),
    classifyPieReliability({
      resolutionTier: 'regional',
      confidence: 0.7,
      effectiveConfidence: 0.7,
      freshness: 'recent',
      confirmedAt: new Date().toISOString(),
    }),
  ])

  assert.equal(summary.trustGateStatus, 'block')
})
