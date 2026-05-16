import assert from 'node:assert/strict'
import test from 'node:test'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { EvidenceLabel } from '@/components/operating-loop/evidence-label'
import {
  formatEvidenceMetadata,
  formatEvidenceSource,
  getEvidenceDisplayMetadata,
  getEvidenceLabelDefinition,
  selectEvidenceLabel,
} from '@/lib/operating-loop/evidence-labels'

test('defines operating-loop evidence display metadata for all supported labels', () => {
  const labels = [
    'confirmed',
    'computed',
    'inferred',
    'user_entered',
    'stale',
    'unknown',
    'disputed',
    'claimed',
  ] as const

  for (const label of labels) {
    const metadata = getEvidenceLabelDefinition(label)

    assert.equal(metadata.label, label)
    assert.equal(typeof metadata.shortDescription, 'string')
    assert.equal(metadata.shortDescription.length > 0, true)
    assert.equal(typeof metadata.isCertain, 'boolean')
    assert.equal(typeof metadata.needsReview, 'boolean')
  }

  assert.equal(getEvidenceLabelDefinition('confirmed').isCertain, true)
  assert.equal(getEvidenceLabelDefinition('computed').isCertain, true)
  assert.equal(getEvidenceLabelDefinition('user_entered').isCertain, true)
  assert.equal(getEvidenceLabelDefinition('inferred').isCertain, false)
  assert.equal(getEvidenceLabelDefinition('claimed').needsReview, true)
  assert.equal(getEvidenceLabelDefinition('stale').needsReview, true)
  assert.equal(getEvidenceLabelDefinition('unknown').needsReview, true)
  assert.equal(getEvidenceLabelDefinition('disputed').needsReview, true)
})

test('combines evidence label and loop state without presenting weak states as fact', () => {
  const stale = getEvidenceDisplayMetadata('confirmed', 'stale')
  const uncertain = getEvidenceDisplayMetadata('computed', 'uncertain')
  const blocked = getEvidenceDisplayMetadata('confirmed', 'blocked')
  const waiting = getEvidenceDisplayMetadata('confirmed', 'waiting')

  assert.equal(stale.label, 'stale')
  assert.equal(stale.isCertain, false)
  assert.equal(stale.needsReview, true)

  assert.equal(uncertain.label, 'unknown')
  assert.equal(uncertain.isCertain, false)
  assert.equal(uncertain.needsReview, true)

  assert.equal(blocked.label, 'confirmed')
  assert.equal(blocked.isCertain, false)
  assert.equal(blocked.needsReview, true)

  assert.equal(waiting.label, 'confirmed')
  assert.equal(waiting.isCertain, false)
  assert.equal(waiting.needsReview, true)
})

test('formats privacy-safe evidence metadata without leaking sensitive source text', () => {
  const sensitive = formatEvidenceMetadata({
    label: 'claimed',
    source: 'private note: client says the budget ceiling is flexible',
    confidence: 0.62,
    timestamp: '2026-05-15T12:00:00.000Z',
    href: '/clients/private-note',
    sensitive: true,
  })

  assert.equal(sensitive.sourceLabel, 'Restricted evidence')
  assert.equal(sensitive.href, null)
  assert.equal(sensitive.isCertain, false)
  assert.equal(sensitive.needsReview, true)
  assert.doesNotMatch(sensitive.summary, /budget ceiling/i)
  assert.match(sensitive.summary, /Restricted evidence/)

  assert.equal(
    formatEvidenceSource('Internal note - kitchen staffing constraint'),
    'Restricted evidence'
  )
})

test('selects disputed stale unknown computed inferred and user-entered labels predictably', () => {
  const now = new Date('2026-05-15T00:00:00.000Z')

  assert.equal(selectEvidenceLabel({ hasConflictingSources: true }), 'disputed')
  assert.equal(
    selectEvidenceLabel({
      explicitLabel: 'confirmed',
      sourceUpdatedAt: '2026-04-01T00:00:00.000Z',
      now,
      staleAfterDays: 14,
    }),
    'stale'
  )
  assert.equal(selectEvidenceLabel({ hasSource: false, confidence: null }), 'unknown')
  assert.equal(selectEvidenceLabel({ isAiGenerated: true, confidence: 0.95 }), 'inferred')
  assert.equal(selectEvidenceLabel({ isComputed: true }), 'computed')
  assert.equal(selectEvidenceLabel({ isUserEntered: true }), 'user_entered')
  assert.equal(selectEvidenceLabel({ confidence: 0.91 }), 'computed')
  assert.equal(selectEvidenceLabel({ confidence: 0.72 }), 'inferred')
})

test('renders a small accessible reusable evidence label component', () => {
  const markup = renderToStaticMarkup(
    createElement(EvidenceLabel, {
      label: 'inferred',
      loopState: 'uncertain',
      showDescription: true,
    })
  )

  assert.match(markup, /aria-label="Unknown: Evidence missing"/)
  assert.match(markup, /data-evidence-label="unknown"/)
  assert.match(markup, /data-evidence-review="true"/)
  assert.match(markup, />Unknown</)
  assert.match(markup, />Evidence missing</)
})
