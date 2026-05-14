import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'
import type { CulinaryProfileSharingGrantRecord } from '@/lib/discovery/profile-sharing-contracts'
import { parseRemyBudgetIntent, evaluateRemyBudgetFit } from '@/lib/remy/budget-realism'
import { detectRemyDecisionBlockers } from '@/lib/remy/blocker-detection'
import { triageRemyDietarySafety } from '@/lib/remy/safety-triage'

test('dietary safety triage blocks hard conflicts without leaking hidden member details', () => {
  const profile = derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'shellfish',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'shellfish',
        kind: 'allergen',
        polarity: 'allergy',
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
        observedAt: '2026-05-12T10:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'peanut-guest',
        ownerId: 'client-1',
        domain: 'event',
        source: 'chef_entered',
        rawValue: 'peanut',
        kind: 'allergen',
        polarity: 'allergy',
        scope: { level: 'guest', guestId: 'guest-2', label: 'Guest 2' },
        shareCategory: 'private',
        metadata: { private: true },
        observedAt: '2026-05-12T11:00:00.000Z',
      }),
    ],
    { ownerId: 'client-1' }
  )
  const grant: CulinaryProfileSharingGrantRecord = {
    id: 'grant-1',
    ownerId: 'client-1',
    scope: 'chef',
    granteeChefId: 'chef-1',
    categories: ['dietary'],
    grantedAt: '2026-05-12T09:00:00.000Z',
  }

  const triage = triageRemyDietarySafety({
    profile,
    candidate: {
      label: 'Shellfish Noodles',
      terms: [{ value: 'shrimp', kind: 'ingredient' }],
      menuConfidence: { tier: 'high', canSupportStrongClaim: true },
    },
    sharing: {
      grants: [grant],
      access: {
        ownerId: 'client-1',
        requestingChefId: 'chef-1',
        now: '2026-05-13T12:00:00.000Z',
      },
    },
  })

  assert.equal(triage.label, 'do_not_recommend')
  assert.equal(triage.mayRecommend, false)
  assert.deepEqual(triage.visibleConstraintLabels, ['Shellfish'])
  assert.equal(triage.hiddenConstraintCount, 1)
  assert.equal(triage.visibleConstraintLabels.includes('Peanut'), false)
})

test('missing menu proof with hard dietary constraints needs confirmation instead of certainty', () => {
  const profile = derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'gluten',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'gluten',
        kind: 'allergen',
        polarity: 'allergy',
        observedAt: '2026-05-12T10:00:00.000Z',
      }),
    ],
    { ownerId: 'client-1' }
  )

  const triage = triageRemyDietarySafety({
    profile,
    candidate: {
      label: 'Mystery Tasting Menu',
      terms: [],
      menuConfidence: { tier: 'unknown', canSupportStrongClaim: false },
    },
  })

  assert.equal(triage.label, 'needs_confirmation')
  assert.match(triage.reasons.join(' '), /No ingredient or menu terms/)
  assert.ok(triage.confirmationQuestions.length > 0)
})

test('budget realism refuses all-in claims on weak price proof and unknown fees', () => {
  const intent = parseRemyBudgetIntent('under $100 all-in and avoid surprise fees')
  const fit = evaluateRemyBudgetFit({
    intent,
    candidate: {
      label: 'Pasta House',
      estimatedAllInCents: 9200,
      hasUnknownFees: true,
      priceConfidence: { tier: 'low', canSupportStrongClaim: false },
      priceFreshness: { state: 'stale', canSupportFreshClaim: false },
    },
  })

  assert.equal(intent.mode, 'all_in_cap')
  assert.equal(fit.status, 'maybe_fits')
  assert.equal(fit.canClaimAllInFit, false)
  assert.equal(fit.confidence, 'weak')
  assert.match(fit.warnings.join(' '), /Do not claim firm budget fit/)
  assert.match(fit.warnings.join(' '), /Unknown fees/)
})

test('blocker detection spans group, dietary, budget, source, and freshness constraints', () => {
  const blockers = detectRemyDecisionBlockers({
    candidates: [
      {
        candidate: {
          id: 'cand-1',
          type: 'restaurant',
          label: 'Pasta House',
          supportsGroupSize: 4,
        },
        dietaryTriage: {
          label: 'needs_confirmation',
          candidateLabel: 'Pasta House',
          mayRecommend: true,
          visibleConstraintLabels: [],
          hiddenConstraintCount: 1,
          reasons: ['Menu proof is weak.'],
          confirmationQuestions: ['Can the operator confirm ingredients?'],
        },
        budgetFit: {
          candidateLabel: 'Pasta House',
          status: 'does_not_fit',
          canClaimAllInFit: false,
          confidence: 'confirmed',
          warnings: [],
        },
        sourceGaps: [{ kind: 'menu_proof', severity: 'blocker', reason: 'No current menu.' }],
      },
    ],
    group: {
      expectedVotes: 3,
      receivedVotes: 1,
      locationDisagreement: true,
      dateSelected: false,
      requestedGroupSize: 6,
      shortlistUpdatedAt: '2026-05-01T12:00:00.000Z',
      currentAt: '2026-05-13T12:00:00.000Z',
    },
  })

  const types = blockers.map((blocker) => blocker.type)
  assert.ok(types.includes('missing_votes'))
  assert.ok(types.includes('location_disagreement'))
  assert.ok(types.includes('no_date'))
  assert.ok(types.includes('stale_shortlist'))
  assert.ok(types.includes('group_size'))
  assert.ok(types.includes('dietary_confirmation'))
  assert.ok(types.includes('budget_mismatch'))
  assert.ok(types.includes('weak_data'))
})
