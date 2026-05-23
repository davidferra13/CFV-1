import assert from 'node:assert/strict'
import test from 'node:test'
import {
  composePublicProfile,
  extractPrivateFactsFromRawMemory,
  normalizeChefBirthdate,
  normalizeChefProfileFacts,
  normalizePublicBioSettings,
  PROFILE_FACT_SENSITIVITIES,
  PROFILE_FACT_VISIBILITIES,
  type ChefProfileFact,
} from '@/lib/profile/fact-guardrails'

function fact(overrides: Partial<ChefProfileFact> = {}): ChefProfileFact {
  return {
    id: overrides.id ?? 'fact-1',
    category: overrides.category ?? 'credentials',
    label: overrides.label ?? 'Certified',
    value: overrides.value ?? 'ServSafe certified',
    visibility: overrides.visibility ?? 'public_profile',
    sensitivity: overrides.sensitivity ?? 'none',
    confidence: overrides.confidence ?? 'chef_verified',
    source: overrides.source ?? 'chef_entered',
    intendedUse: overrides.intendedUse ?? 'proof_chip',
    freshness: overrides.freshness ?? 'current',
    publishability: overrides.publishability ?? 'publishable',
    evidenceUrl: overrides.evidenceUrl ?? null,
    permissionRecordedAt: overrides.permissionRecordedAt ?? null,
  }
}

test('profile fact contract includes required visibility and sensitivity values', () => {
  assert.deepEqual(PROFILE_FACT_VISIBILITIES, [
    'private_only',
    'chef_internal',
    'client_safe',
    'public_profile',
    'website_only',
    'requires_permission',
    'requires_evidence',
    'never_publish',
  ])

  assert.ok(PROFILE_FACT_SENSITIVITIES.includes('cannabis'))
  assert.ok(PROFILE_FACT_SENSITIVITIES.includes('celebrity_private_client'))
  assert.ok(PROFILE_FACT_SENSITIVITIES.includes('medical_dietary_claim'))
  assert.ok(PROFILE_FACT_SENSITIVITIES.includes('named_third_party'))
  assert.ok(PROFILE_FACT_SENSITIVITIES.includes('negative_defamatory_story'))
  assert.ok(PROFILE_FACT_SENSITIVITIES.includes('legal_compliance'))
  assert.ok(PROFILE_FACT_SENSITIVITIES.includes('identity_private_life'))
})

test('public profile composition only uses publishable public_profile facts', () => {
  const composition = composePublicProfile({
    tagline: 'A'.repeat(200),
    bio: 'B'.repeat(800),
    settings: normalizePublicBioSettings({ maxChars: 240 }),
    facts: [
      fact({ id: 'public' }),
      fact({ id: 'private', visibility: 'private_only' }),
      fact({ id: 'permission', visibility: 'requires_permission' }),
      fact({ id: 'blocked', publishability: 'blocked' }),
      fact({ id: 'website', visibility: 'website_only' }),
    ],
  })

  assert.equal(composition.tagline?.length, 160)
  assert.equal(composition.bio?.length, 240)
  assert.deepEqual(
    composition.facts.map((item) => item.id),
    ['public']
  )
  assert.deepEqual(composition.proofChips, ['ServSafe certified'])
})

test('public bio composition drops raw or sensitive bio text instead of rendering it directly', () => {
  const composition = composePublicProfile({
    bio: 'Born in July and cooked cannabis dinners for a celebrity private client under NDA.',
    settings: { cannabisDisclosureMode: 'hidden' },
    facts: [fact()],
  })

  assert.equal(composition.bio, null)
  assert.deepEqual(composition.proofChips, ['ServSafe certified'])
})

test('sensitive facts require cannabis disclosure, evidence, or permission before publication', () => {
  const hidden = composePublicProfile({
    settings: { cannabisDisclosureMode: 'hidden' },
    facts: [fact({ id: 'cannabis', category: 'cannabis', sensitivity: 'cannabis' })],
  })
  assert.equal(hidden.facts.length, 0)

  const visible = composePublicProfile({
    settings: { cannabisDisclosureMode: 'credentialed_public' },
    facts: [fact({ id: 'cannabis', category: 'cannabis', sensitivity: 'cannabis' })],
  })
  assert.equal(visible.facts.length, 1)

  const medicalWithoutEvidence = composePublicProfile({
    facts: [fact({ id: 'medical', sensitivity: 'medical_dietary_claim' })],
  })
  assert.equal(medicalWithoutEvidence.facts.length, 0)

  const celebrityWithPermission = composePublicProfile({
    facts: [
      fact({
        id: 'private-client-proof',
        sensitivity: 'celebrity_private_client',
        permissionRecordedAt: '2026-05-21T00:00:00.000Z',
      }),
    ],
  })
  assert.equal(celebrityWithPermission.facts.length, 1)
})

test('birthday separates full DOB from month/day purpose metadata', () => {
  const birthdate = normalizeChefBirthdate({ dateOfBirth: '1984-07-13' })

  assert.equal(birthdate.dateOfBirth, '1984-07-13')
  assert.equal(birthdate.birthMonth, 7)
  assert.equal(birthdate.birthDay, 13)
  assert.equal(birthdate.purpose.fullDob, 'legal_compliance_only')
  assert.equal(birthdate.purpose.monthDay, 'internal_reminders_personalization')
  assert.equal(birthdate.purpose.age, 'computed_when_needed')
})

test('raw memory extraction defaults ambiguous and sensitive facts to private blocked review', () => {
  const facts = normalizeChefProfileFacts(
    extractPrivateFactsFromRawMemory(
      'Born in July. Cannabis dinners for a celebrity private client under NDA.'
    )
  )

  assert.ok(facts.length >= 3)
  assert.ok(facts.every((item) => item.visibility === 'private_only'))
  assert.ok(facts.every((item) => item.publishability === 'blocked'))
  assert.ok(facts.every((item) => item.confidence === 'needs_review'))
})
