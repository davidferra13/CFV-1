import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertNoUnreviewedApproval,
  buildDataRightsCase,
  buildDmcaTakedownCase,
  buildMarketingSmsConsent,
  buildPaymentTaxMarketplaceReviewFlag,
  buildPolicyAcceptance,
  getDefaultLegalReadinessItems,
  getRequiredPoliciesForRole,
  summarizeLegalReadiness,
  type LegalPolicyVersion,
} from '@/lib/legal/readiness'
import {
  isPublicUnauthenticatedPath,
  isChefRoutePath,
  isAdminRoutePath,
} from '@/lib/auth/route-policy'
import { TAKEOUT_CATEGORY_MAP } from '@/lib/exports/takeout-categories'

describe('legal readiness domain model', () => {
  it('defaults attorney/accountant-dependent readiness to draft or needs_review', () => {
    const allDefaults = [
      ...getDefaultLegalReadinessItems('global'),
      ...getDefaultLegalReadinessItems('tenant'),
    ]

    assert.ok(allDefaults.length > 0)
    assert.equal(
      allDefaults.every((item) => item.status !== 'approved'),
      true
    )
    assert.equal(
      allDefaults.every((item) => item.requiresProfessionalReview),
      true
    )
  })

  it('blocks professional-review approval without review metadata', () => {
    assert.throws(
      () =>
        assertNoUnreviewedApproval({
          status: 'approved',
          requiresProfessionalReview: true,
          lastReviewedAt: null,
        }),
      /cannot be approved/
    )
  })

  it('builds policy acceptance records with reacceptance metadata', () => {
    const policy: LegalPolicyVersion = {
      id: 'policy-1',
      policyType: 'privacy_policy',
      version: '2026-05-16-draft',
      status: 'draft',
      publicPath: '/privacy',
      materialChange: true,
      requiresReacceptance: false,
      requiresProfessionalReview: true,
    }

    const acceptance = buildPolicyAcceptance({
      policy,
      role: 'chef',
      userId: 'user-1',
      tenantId: 'tenant-1',
      source: 'settings/legal-readiness',
      acceptedAt: '2026-05-16T00:00:00.000Z',
    })

    assert.equal(acceptance.policyType, 'privacy_policy')
    assert.equal(acceptance.version, '2026-05-16-draft')
    assert.equal(acceptance.reacceptanceRequired, true)
    assert.equal(acceptance.tenantId, 'tenant-1')
  })

  it('keeps transactional SMS separate from marketing opt-in', () => {
    const consent = buildMarketingSmsConsent({
      tenantId: 'tenant-1',
      subjectType: 'phone',
      phone: '+15551234567',
      channel: 'sms',
      messageClass: 'transactional',
      consentState: 'opted_in',
      source: 'booking_update',
    })

    assert.equal(consent.messageClass, 'transactional')
    assert.equal(consent.consentState, 'implied')
  })

  it('keeps data rights, tax review, and DMCA helpers in review-safe states', () => {
    const dataRights = buildDataRightsCase({
      requestType: 'deletion',
      requesterEmail: 'client@example.com',
      requiresIdentityVerification: true,
    })
    const taxFlag = buildPaymentTaxMarketplaceReviewFlag({
      tenantId: 'tenant-1',
      area: 'marketplace_facilitator',
    })
    const dmca = buildDmcaTakedownCase({
      complainantEmail: 'owner@example.com',
      contentType: 'profile_photo',
      contentUrl: 'https://example.com/photo.jpg',
    })

    assert.equal(dataRights.status, 'submitted')
    assert.equal(taxFlag.status, 'needs_review')
    assert.equal(taxFlag.requiresProfessionalReview, true)
    assert.equal(dmca.status, 'submitted')
    assert.equal(dmca.requiresProfessionalReview, true)
  })

  it('summarizes missing, draft, needs_review, approved, and not_applicable readiness', () => {
    const summary = summarizeLegalReadiness([
      {
        scope: 'global',
        itemKey: 'draft-policy',
        category: 'policy',
        title: 'Draft policy',
        status: 'draft',
        requiresProfessionalReview: true,
      },
      {
        scope: 'global',
        itemKey: 'na',
        category: 'policy',
        title: 'Not applicable',
        status: 'not_applicable',
        requiresProfessionalReview: false,
      },
    ])

    assert.equal(summary.counts.draft, 1)
    assert.equal(summary.counts.not_applicable, 1)
    assert.equal(summary.needsWorkCount, 1)
    assert.equal(summary.readyCount, 1)
  })

  it('defines role-specific required policies', () => {
    assert.deepEqual(getRequiredPoliciesForRole('chef'), [
      'terms_of_service',
      'privacy_policy',
      'chef_agreement',
    ])
    assert.ok(getRequiredPoliciesForRole('guest').includes('guest_terms'))
  })
})

describe('legal readiness route wiring', () => {
  it('registers public legal placeholder routes unauthenticated', () => {
    for (const route of [
      '/cookie-policy',
      '/acceptable-use',
      '/refund-cancellation',
      '/dmca',
      '/chef-agreement',
      '/client-terms',
      '/guest-terms',
      '/staff-terms',
      '/vendor-agreement',
      '/partner-terms',
    ]) {
      assert.equal(isPublicUnauthenticatedPath(route), true, `${route} should be public`)
    }
  })

  it('keeps admin and chef legal readiness in the protected route families', () => {
    assert.equal(isAdminRoutePath('/admin/legal-readiness'), true)
    assert.equal(isChefRoutePath('/settings/legal-readiness'), true)
  })
})

describe('legal readiness takeout scoping', () => {
  it('exports clients through tenant_id and sensitive child records through tenant scope', () => {
    const clients = TAKEOUT_CATEGORY_MAP.get('clients')
    assert.ok(clients)
    assert.equal(clients.tables[0].name, 'clients')
    assert.equal(clients.tables[0].fkColumn, 'tenant_id')
    assert.equal(
      clients.tables
        .filter((table) => table.name !== 'clients')
        .every((table) => table.fkColumn === 'tenant_id'),
      true
    )
  })

  it('exports selected child records through already-scoped parent rows', () => {
    const recipes = TAKEOUT_CATEGORY_MAP.get('recipes')
    const menus = TAKEOUT_CATEGORY_MAP.get('menus')

    assert.equal(
      recipes?.tables.some(
        (table) => table.name === 'recipe_ingredients' && table.parentTable === 'recipes'
      ),
      true
    )
    assert.equal(
      menus?.tables.some((table) => table.name === 'menu_items' && table.parentTable === 'menus'),
      true
    )
  })
})
