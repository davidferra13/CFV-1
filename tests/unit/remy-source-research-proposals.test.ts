import assert from 'node:assert/strict'
import test from 'node:test'

import { buildExternalMenuReadModel } from '@/lib/discovery/source-governance'
import {
  applyRemyResearchResultToConfidence,
  buildRemySourceUpgradePrompt,
  detectRemySourceGaps,
  proposeRemyOperatorResearch,
} from '@/lib/remy/source-research-proposals'

test('weak source candidates get upgrade prompts before high-confidence promotion', () => {
  const menu = buildExternalMenuReadModel({
    sourceType: 'menu_platform',
    sourceUrl: 'https://menus.example/pasta-house',
    extractionStatus: 'link_only',
    capturedAt: '2026-04-01T12:00:00.000Z',
    currentAt: '2026-05-13T12:00:00.000Z',
    hasAttribution: true,
  })
  const candidate = {
    id: 'cand-1',
    label: 'Pasta House',
    menu,
    fieldConfidence: {
      price: { tier: 'low' as const, canSupportStrongClaim: false },
      availability: { tier: 'unknown' as const, canSupportStrongClaim: false },
      operator_identity: { tier: 'medium' as const, canSupportStrongClaim: false },
    },
    freshness: {
      price: { state: 'stale' as const, canSupportFreshClaim: false },
    },
    photos: [
      {
        id: 'photo-1',
        src: null,
        width: 200,
        height: 200,
        confidence: 0.3,
      },
    ],
  }

  const gaps = detectRemySourceGaps(candidate)
  const prompt = buildRemySourceUpgradePrompt(candidate)
  const proposal = proposeRemyOperatorResearch(candidate)

  assert.ok(gaps.some((gap) => gap.kind === 'menu_proof'))
  assert.ok(gaps.some((gap) => gap.kind === 'price_proof'))
  assert.ok(gaps.some((gap) => gap.kind === 'freshness_proof'))
  assert.ok(gaps.some((gap) => gap.kind === 'photo_proof'))
  assert.equal(prompt.shouldPrompt, true)
  assert.match(prompt.prompt ?? '', /missing/)
  assert.equal(proposal.status, 'requires_user_approval')
  assert.ok(proposal.tasks.every((task) => task.requiresApproval))
})

test('failed source research does not improve confidence or create source labels', () => {
  const updated = applyRemyResearchResultToConfidence({
    currentConfidence: { score: 0.5, tier: 'low', canSupportStrongClaim: false },
    result: { status: 'failed', reason: 'Operator site unreachable' },
  })

  assert.equal(updated.confidence.score, 0.5)
  assert.equal(updated.confidence.canSupportStrongClaim, false)
  assert.deepEqual(updated.sourceLabels, [])
  assert.match(updated.warnings.join(' '), /Operator site unreachable/)
})

test('successful research only upgrades certainty when new source can support strong claims', () => {
  const weakResult = applyRemyResearchResultToConfidence({
    currentConfidence: { score: 0.5, tier: 'low', canSupportStrongClaim: false },
    result: {
      status: 'succeeded',
      sourceLabels: ['Direct website'],
      newConfidence: { tier: 'medium', canSupportStrongClaim: false },
    },
  })
  const strongResult = applyRemyResearchResultToConfidence({
    currentConfidence: { score: 0.5, tier: 'low', canSupportStrongClaim: false },
    result: {
      status: 'succeeded',
      sourceLabels: ['Claimed ChefFlow profile'],
      newConfidence: { tier: 'high', canSupportStrongClaim: true },
    },
  })

  assert.equal(weakResult.confidence.canSupportStrongClaim, false)
  assert.equal(weakResult.confidence.score, 0.5)
  assert.match(weakResult.warnings.join(' '), /still cannot support/)
  assert.equal(strongResult.confidence.canSupportStrongClaim, true)
  assert.equal(strongResult.confidence.score, 0.78)
  assert.deepEqual(strongResult.sourceLabels, ['Claimed ChefFlow profile'])
})
