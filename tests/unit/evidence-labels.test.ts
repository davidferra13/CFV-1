import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatConfidence,
  formatEvidenceMetadata,
  formatEvidenceSource,
  getConfidenceBand,
  getEvidencePriority,
  getStrongestEvidenceLabel,
  shouldPresentAsFact,
  sortEvidenceLabelsByPriority,
} from '@/lib/evidence-labels/format'

test('formats confidence without inventing missing percentages', () => {
  assert.equal(formatConfidence(null), null)
  assert.equal(formatConfidence(Number.NaN), null)
  assert.equal(formatConfidence(0.823), '82% confidence')
  assert.equal(formatConfidence(82.3), '82% confidence')
  assert.equal(formatConfidence(2), '2% confidence')

  assert.equal(getConfidenceBand(null), 'unknown')
  assert.equal(getConfidenceBand(0.81), 'high')
  assert.equal(getConfidenceBand(0.5), 'medium')
  assert.equal(getConfidenceBand(0.49), 'low')
})

test('prioritizes confirmed evidence above inferred confidence and treats disputed as unsafe', () => {
  const sorted = sortEvidenceLabelsByPriority(['inferred', 'confirmed', 'unknown', 'computed'])

  assert.deepEqual(sorted, ['confirmed', 'computed', 'inferred', 'unknown'])
  assert.equal(getEvidencePriority('confirmed') > getEvidencePriority('inferred'), true)
  assert.equal(getStrongestEvidenceLabel(['unknown', 'inferred', 'confirmed']), 'confirmed')
  assert.equal(shouldPresentAsFact('confirmed'), true)
  assert.equal(shouldPresentAsFact('disputed'), false)
})

test('stale unknown and disputed metadata are cautionary and not presented as facts', () => {
  const stale = formatEvidenceMetadata({
    label: 'stale',
    source: 'Vendor catalog',
    confidence: 0.92,
    timestamp: '2026-01-02T10:00:00.000Z',
  })
  const unknown = formatEvidenceMetadata({ label: 'unknown' })
  const disputed = formatEvidenceMetadata({
    label: 'disputed',
    source: 'Invoice and vendor catalog disagree',
  })

  assert.equal(stale.factual, false)
  assert.equal(stale.caution, true)
  assert.match(stale.summary, /Stale/)
  assert.match(stale.summary, /92% confidence/)
  assert.match(stale.summary, /Jan 2, 2026/)

  assert.equal(unknown.factual, false)
  assert.equal(unknown.summary, 'Unknown')

  assert.equal(disputed.factual, false)
  assert.equal(disputed.tone, 'danger')
  assert.match(disputed.description, /conflict/i)
})

test('source formatting constrains private note content', () => {
  assert.equal(formatEvidenceSource(null), null)
  assert.equal(formatEvidenceSource('  Vendor catalog   import  '), 'Vendor catalog import')
  assert.equal(formatEvidenceSource('private note: client says budget is flexible'), 'Private note')
  assert.equal(formatEvidenceSource('Internal note - call transcript details'), 'Private note')

  const longSource =
    'Uploaded vendor document with a very long filename and extra parsing context that should not take over compact UI'

  assert.equal(formatEvidenceSource(longSource)?.endsWith('...'), true)
})
