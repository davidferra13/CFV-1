import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildProfileSafeCraftOutput,
  canPublishCraftProofCandidate,
  deriveMostAdvancedCraftState,
  evaluateCraftEvolutionLabSliceReadiness,
  getCraftEvolutionLabProgramArchitecture,
  getCraftEvolutionLabSwarmBuildPath,
  isPrivateCraftVisibility,
  isPublicCraftVisibility,
  CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS,
  type CraftSourceRef,
  type CuisineIdentitySignal,
  type PublicProofCandidateContract,
  type SignatureCandidateContract,
} from '../../lib/intelligence/craft-evolution-lab-contract.js'

const sourceRef: CraftSourceRef = {
  source: 'dish_index',
  table: 'dish_index',
  rowId: 'dish-1',
}

function proof(
  overrides: Partial<PublicProofCandidateContract> = {}
): PublicProofCandidateContract {
  return {
    id: 'proof-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    subjectKind: 'dish',
    subjectId: 'dish-1',
    kind: 'portfolio_entry',
    state: 'approved',
    publicCopy: 'Signature lamb tortellini with preserved lemon brodo.',
    evidenceRefs: [sourceRef],
    assetIds: ['asset-1'],
    approvedByUserId: 'user-1',
    approvedAt: '2026-05-21T00:00:00.000Z',
    visibility: 'public_profile',
    ...overrides,
  }
}

function signature(
  overrides: Partial<SignatureCandidateContract> = {}
): SignatureCandidateContract {
  return {
    id: 'sig-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    dishId: 'dish-1',
    experimentId: 'experiment-1',
    name: 'Lamb Tortellini Brodo',
    state: 'signature',
    confidence: 'high',
    reasons: ['repeat client requests', 'stable execution'],
    proofCandidateIds: ['proof-1'],
    publicReadiness: 'approved_public',
    visibility: 'public_profile',
    ...overrides,
  }
}

function identity(overrides: Partial<CuisineIdentitySignal> = {}): CuisineIdentitySignal {
  return {
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    label: 'Italian preservation techniques',
    category: 'technique',
    confidence: 'high',
    visibility: 'public_profile',
    sourceRefs: [sourceRef],
    ...overrides,
  }
}

describe('Craft Evolution Lab contract', () => {
  it('preserves Program 8 architecture and links the extracted build family', () => {
    const architecture = getCraftEvolutionLabProgramArchitecture()

    assert.equal(
      architecture.parentQueueItemId,
      'BQ-20260520T183000Z-chef-life-craft-evolution-lab-program'
    )
    assert.equal(architecture.sourceSpecPath, 'docs/specs/chef-life-expansion-swarm-spec-pack.md')
    assert.equal(architecture.sourceSpecHeading, 'Program 8 - Craft Evolution Lab')
    assert.deepEqual(architecture.outcomes, [
      'dish_experiments',
      'signature_candidates',
      'technique_goals',
      'inspiration_sources',
      'client_reactions',
      'public_proof_candidates',
      'profile_safe_outputs',
    ])
    assert.deepEqual(architecture.childQueueItemIds, [
      'BQ-20260520T183100Z-chef-life-craft-evolution-lab-foundation',
      'BQ-20260520T183100Z-chef-life-craft-evolution-lab-surface',
      'BQ-20260520T183100Z-chef-life-craft-evolution-lab-decision-integration',
      'BQ-20260520T183100Z-chef-life-craft-evolution-lab-proof-security',
    ])
    assert.equal(architecture.dataOwnership.duplicateSystemsForbidden, true)
    assert.deepEqual(architecture.securityPrivacy.chefServerActionGuards, [
      'requireChef',
      'requireAuth',
    ])
    assert.deepEqual(architecture.securityPrivacy.tenantQueryScope, [
      'user.entityId',
      'user.tenantId',
    ])
    assert.equal(architecture.securityPrivacy.rawPrivateMemoryMayPublish, false)
    assert.deepEqual(architecture.proofExpectations.mobileWidthsPx, [390, 430])
  })

  it('defines a serially mergeable swarm build path with auth, tenant, proof, and mobile gates', () => {
    const buildPath = getCraftEvolutionLabSwarmBuildPath()

    assert.deepEqual(
      buildPath.map((wave) => wave.label),
      [
        'Domain/Data/Security',
        'Capture/Memory',
        'Surfaces',
        'Public/Client Integration',
        'Verification',
      ]
    )
    assert.deepEqual(buildPath[0].after, [])
    assert.deepEqual(buildPath[2].after, [1, 2])
    assert.equal(
      buildPath.every((wave) =>
        CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS.every((key) => wave.mustCarry.includes(key))
      ),
      true
    )
    assert.equal(
      buildPath.some((wave) =>
        wave.authAndTenantRules.some((rule) => rule.includes('requireChef()'))
      ),
      true
    )
    assert.equal(
      buildPath.some((wave) =>
        wave.authAndTenantRules.some((rule) => rule.includes('user.entityId'))
      ),
      true
    )
    assert.equal(
      buildPath.some((wave) =>
        wave.proofRequirements.some((requirement) => requirement.includes('390px and 430px'))
      ),
      true
    )
  })

  it('blocks fired slices that do not carry the full program contract', () => {
    assert.deepEqual(
      evaluateCraftEvolutionLabSliceReadiness({
        queueItemId: 'BQ-20260520T183100Z-chef-life-craft-evolution-lab-surface',
        carriedKeys: CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS,
      }),
      {
        queueItemId: 'BQ-20260520T183100Z-chef-life-craft-evolution-lab-surface',
        ready: true,
        missingCarryKeys: [],
      }
    )

    assert.deepEqual(
      evaluateCraftEvolutionLabSliceReadiness({
        queueItemId: 'BQ-20260520T183100Z-chef-life-craft-evolution-lab-surface',
        carriedKeys: ['source_spec', 'product_domain'],
      }),
      {
        queueItemId: 'BQ-20260520T183100Z-chef-life-craft-evolution-lab-surface',
        ready: false,
        missingCarryKeys: [
          'data_ownership',
          'user_roles',
          'security_privacy',
          'integration_points',
          'proof_expectations',
        ],
      }
    )
  })

  it('defines explicit lifecycle progression and visibility guards', () => {
    assert.equal(deriveMostAdvancedCraftState(['idea', 'tested', 'signature']), 'signature')
    assert.equal(deriveMostAdvancedCraftState([]), 'unknown')

    assert.equal(isPrivateCraftVisibility('private_only'), true)
    assert.equal(isPrivateCraftVisibility('never_publish'), true)
    assert.equal(isPublicCraftVisibility('public_profile'), true)
    assert.equal(isPublicCraftVisibility('requires_evidence'), false)
  })

  it('blocks public proof until visibility, approval, evidence, and copy are all present', () => {
    assert.equal(canPublishCraftProofCandidate(proof()), true)
    assert.equal(canPublishCraftProofCandidate(proof({ visibility: 'requires_evidence' })), false)
    assert.equal(canPublishCraftProofCandidate(proof({ state: 'candidate' })), false)
    assert.equal(canPublishCraftProofCandidate(proof({ evidenceRefs: [] })), false)
    assert.equal(canPublishCraftProofCandidate(proof({ publicCopy: '   ' })), false)
    assert.equal(canPublishCraftProofCandidate(proof({ visibility: 'never_publish' })), false)
  })

  it('builds profile-safe output by redacting private and unproven craft facts', () => {
    const output = buildProfileSafeCraftOutput({
      tenantId: 'tenant-1',
      chefId: 'chef-1',
      proofCandidates: [
        proof({ id: 'public-proof' }),
        proof({ id: 'private-proof', visibility: 'private_only' }),
        proof({ id: 'missing-evidence', evidenceRefs: [] }),
      ],
      signatureCandidates: [
        signature({ id: 'public-signature' }),
        signature({ id: 'private-signature', visibility: 'private_only' }),
        signature({ id: 'not-ready', publicReadiness: 'needs_evidence' }),
      ],
      cuisineIdentitySignals: [
        identity({ label: 'Italian preservation techniques' }),
        identity({ label: 'Private family memory', visibility: 'private_only' }),
      ],
      visibility: 'public_profile',
    })

    assert.deepEqual(
      output.approvedProofs.map((candidate) => candidate.id),
      ['public-proof']
    )
    assert.deepEqual(output.signatureDishNames, ['Lamb Tortellini Brodo'])
    assert.deepEqual(
      output.cuisineIdentitySignals.map((signal) => signal.label),
      ['Italian preservation techniques']
    )
    assert.equal(output.redactedCandidateCount, 5)
    assert.equal(output.visibility, 'public_profile')
  })
})
