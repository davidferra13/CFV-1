import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PRIVATE_MEMORY_VISIBILITY_LEVELS,
  applyPrivateMemoryTenantScope,
  buildChefLifeUnknownDecisionState,
  buildChefLifeRoleSafeDerivedReadModel,
  buildPrivateMemoryFact,
  canPublishPrivateMemoryPublicClaim,
  canReadPrivateMemoryDerived,
  canReadPrivateMemorySource,
  classifyPrivateMemorySourceState,
  composePrivateMemorySafeBriefing,
  composePrivateMemorySafeBriefingFromFacts,
  getChefLifeReadModelAccessContract,
  hasPrivateMemoryTenantAccess,
  mapVisibilityToServerAccessRule,
  projectPrivateMemoryFactsForAudience,
  reduceChefLifeUnknownDecisionState,
  resolvePrivateMemoryTenantScope,
  suppressChefLifeUnknownDecisionState,
  validatePrivateMemoryFactContract,
  type PrivateMemoryAuthContext,
  type PrivateMemoryFact,
} from '../../lib/intelligence/private-memory-visibility-contract'

const chefUser: PrivateMemoryAuthContext = {
  role: 'chef',
  entityId: 'tenant-1',
  tenantId: 'tenant-1',
}

const clientUser: PrivateMemoryAuthContext = {
  role: 'client',
  entityId: 'client-1',
  tenantId: 'tenant-1',
}

const otherTenantUser: PrivateMemoryAuthContext = {
  role: 'chef',
  entityId: 'tenant-2',
  tenantId: 'tenant-2',
}

function buildFact(overrides: Partial<PrivateMemoryFact> = {}): PrivateMemoryFact {
  return buildPrivateMemoryFact({
    id: 'memory-1',
    owner: {
      tenantId: 'tenant-1',
      chefId: 'tenant-1',
      subjectType: 'chef',
      subjectId: 'tenant-1',
    },
    visibility: 'client_safe',
    privateValue: 'Chef is recovering from a medical issue and cannot take late service.',
    safeSummary: 'This date needs a lighter scope or earlier service window.',
    sourceRefs: [
      {
        kind: 'manual_note',
        system: 'manual_chef_input',
        table: 'chef_private_memory',
        rowId: 'memory-1',
        capturedAt: '2026-05-21T00:00:00.000Z',
        manualNote: 'Chef-entered source note',
      },
    ],
    confidence: 'high',
    freshness: {
      capturedAt: '2026-05-21T00:00:00.000Z',
      lastVerifiedAt: '2026-05-21T00:00:00.000Z',
      staleAfter: '2026-08-21T00:00:00.000Z',
      expiresAt: null,
    },
    intendedUse: ['capacity_planning', 'client_safe_explanation'],
    permissionGrants: [],
    evidenceRefs: [],
    contradictionRefs: [],
    publicClaimEligibility: {
      eligible: true,
      requiresApprovedEvidence: false,
      suppressionReason: null,
      approvedAt: null,
    },
    auditTrail: [
      {
        id: 'audit-1',
        action: 'created',
        actorUserId: 'chef-user-1',
        at: '2026-05-21T00:00:00.000Z',
        note: 'Fact created from manual chef input.',
      },
    ],
    ...overrides,
  })
}

test('private memory visibility kernel exposes one reusable visibility enum', () => {
  assert.deepEqual(PRIVATE_MEMORY_VISIBILITY_LEVELS, [
    'private_only',
    'chef_internal',
    'staff_safe',
    'client_safe',
    'guest_safe',
    'vendor_safe',
    'public_profile',
    'website_only',
    'remy_safe',
    'requires_permission',
    'requires_evidence',
    'expired',
    'never_publish',
  ])
})

test('read model surface contracts make route policy, auth gate, and tenant scope explicit', () => {
  assert.deepEqual(getChefLifeReadModelAccessContract('public_profile'), {
    surface: 'public_profile',
    audience: 'public',
    routePolicyExport: 'PUBLIC_UNAUTHENTICATED_PATHS',
    routePrefix: '/chef',
    serverActionGate: null,
    runtimeGuard: null,
    tenantScope: 'public',
    tenantScopeColumn: null,
    tenantScopeValue: null,
    sourcePolicy: 'derived_only',
  })

  assert.deepEqual(getChefLifeReadModelAccessContract('client_portal'), {
    surface: 'client_portal',
    audience: 'client',
    routePolicyExport: 'CLIENT_PROTECTED_PATHS',
    routePrefix: '/my',
    serverActionGate: 'requireAuth',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  })

  assert.deepEqual(getChefLifeReadModelAccessContract('staff_briefing'), {
    surface: 'staff_briefing',
    audience: 'staff',
    routePolicyExport: 'STAFF_PROTECTED_PATHS',
    routePrefix: '/staff',
    serverActionGate: 'requireAuth',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  })

  assert.deepEqual(getChefLifeReadModelAccessContract('vendor_briefing'), {
    surface: 'vendor_briefing',
    audience: 'vendor',
    routePolicyExport: 'VENDOR_PROTECTED_PATHS',
    routePrefix: '/vendor',
    serverActionGate: 'requireAuth',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  })

  assert.deepEqual(getChefLifeReadModelAccessContract('admin_support'), {
    surface: 'admin_support',
    audience: 'admin',
    routePolicyExport: 'ADMIN_PATHS',
    routePrefix: '/admin',
    serverActionGate: 'requireAuth',
    runtimeGuard: 'requireAdmin',
    tenantScope: 'user.entityId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.entityId',
    sourcePolicy: 'derived_only',
  })

  assert.deepEqual(getChefLifeReadModelAccessContract('remy_output'), {
    surface: 'remy_output',
    audience: 'remy',
    routePolicyExport: 'CHEF_PROTECTED_PATHS',
    routePrefix: '/remy',
    serverActionGate: 'requireChef',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  })
})

test('tenant-scope helper applies DB filters from authenticated user context only', () => {
  const filters: Array<[string, string]> = []
  const query = {
    eq(column: string, value: string) {
      filters.push([column, value])
      return this
    },
  }

  assert.equal(applyPrivateMemoryTenantScope(query, clientUser), query)
  assert.deepEqual(filters, [['tenant_id', 'tenant-1']])

  const fallbackUser: PrivateMemoryAuthContext = {
    role: 'vendor',
    entityId: 'tenant-from-entity',
    tenantId: null,
  }
  applyPrivateMemoryTenantScope(query, fallbackUser, 'chef_id')
  assert.deepEqual(filters[1], ['chef_id', 'tenant-from-entity'])
})

test('sensitive facts carry owner, source, confidence, freshness, intended use, and access rules', () => {
  const fact = buildFact()
  assert.deepEqual(validatePrivateMemoryFactContract(fact), [])
  assert.equal(fact.sourceRefs[0].kind, 'manual_note')
  assert.equal(fact.auditTrail?.[0].action, 'created')

  const issues = validatePrivateMemoryFactContract({
    visibility: 'private_only',
    privateValue: 'Missing metadata',
  })

  assert.deepEqual(issues, [
    'owner.tenantId is required',
    'owner.chefId is required',
    'at least one source ref is required',
    'confidence is required',
    'freshness.capturedAt is required',
    'intendedUse is required',
    'server-side access rules are required',
  ])
})

test('source access is chef/admin/server only and tenant-scoped through user tenant context', () => {
  const fact = buildFact({ visibility: 'private_only' })

  assert.equal(resolvePrivateMemoryTenantScope(chefUser), 'tenant-1')
  assert.equal(hasPrivateMemoryTenantAccess(fact, chefUser), true)
  assert.equal(hasPrivateMemoryTenantAccess(fact, otherTenantUser), false)
  assert.equal(canReadPrivateMemorySource({ fact, audience: 'chef', user: chefUser }), true)
  assert.equal(canReadPrivateMemorySource({ fact, audience: 'client', user: clientUser }), false)
  assert.equal(canReadPrivateMemorySource({ fact, audience: 'chef', user: otherTenantUser }), false)
})

test('client, staff, website, and public projections never expose private source records', () => {
  const facts = [
    buildFact({
      id: 'guest',
      visibility: 'guest_safe',
      privateValue: 'Guest has private accessibility notes.',
      safeSummary: 'Guest seating should avoid stairs.',
      intendedUse: ['guest_safe_explanation'],
    }),
    buildFact({
      id: 'vendor',
      visibility: 'vendor_safe',
      privateValue: 'Supplier credit dispute and backup plan.',
      safeSummary: 'Confirm backup supplier before Thursday.',
      intendedUse: ['vendor_safe_briefing'],
    }),
    buildFact({
      id: 'remy',
      visibility: 'remy_safe',
      privateValue: 'Chef-only Remy reasoning trace.',
      safeSummary: 'Suggest a lighter prep plan without private reasons.',
      intendedUse: ['remy_output'],
    }),
    buildFact({
      id: 'staff',
      visibility: 'staff_safe',
      privateValue: 'Gate code is 1234 and should stay internal.',
      safeSummary: 'Use the service entrance after checking in.',
      intendedUse: ['household_operations'],
    }),
    buildFact({ id: 'client', visibility: 'client_safe' }),
    buildFact({
      id: 'public',
      visibility: 'public_profile',
      privateValue: 'Full private growth plan.',
      safeSummary: 'Seasonal menus with careful event pacing.',
      intendedUse: ['public_profile_display'],
    }),
    buildFact({
      id: 'website',
      visibility: 'website_only',
      privateValue: 'Internal website campaign note.',
      safeSummary: 'Available for intimate dinners and retreats.',
      intendedUse: ['website_display'],
    }),
    buildFact({ id: 'never', visibility: 'never_publish' }),
    buildFact({ id: 'private', visibility: 'private_only' }),
  ]

  const staffView = projectPrivateMemoryFactsForAudience({
    facts,
    audience: 'staff',
    user: chefUser,
  })
  const clientView = projectPrivateMemoryFactsForAudience({
    facts,
    audience: 'client',
    user: clientUser,
  })
  const publicView = projectPrivateMemoryFactsForAudience({ facts, audience: 'public' })
  const websiteView = projectPrivateMemoryFactsForAudience({ facts, audience: 'website' })
  const guestView = projectPrivateMemoryFactsForAudience({
    facts,
    audience: 'guest',
    user: clientUser,
  })
  const vendorView = projectPrivateMemoryFactsForAudience({
    facts,
    audience: 'vendor',
    user: chefUser,
  })
  const remyView = projectPrivateMemoryFactsForAudience({
    facts,
    audience: 'remy',
    user: chefUser,
  })
  const combinedJson = JSON.stringify([
    ...staffView,
    ...clientView,
    ...publicView,
    ...websiteView,
    ...guestView,
    ...vendorView,
    ...remyView,
  ])

  assert.deepEqual(
    staffView.map((fact) => fact.sourceRecordId),
    ['staff']
  )
  assert.deepEqual(
    clientView.map((fact) => fact.sourceRecordId),
    ['client']
  )
  assert.deepEqual(
    publicView.map((fact) => fact.sourceRecordId),
    ['public']
  )
  assert.deepEqual(
    websiteView.map((fact) => fact.sourceRecordId),
    ['public', 'website']
  )
  assert.deepEqual(
    guestView.map((fact) => fact.sourceRecordId),
    ['guest']
  )
  assert.deepEqual(
    vendorView.map((fact) => fact.sourceRecordId),
    ['vendor']
  )
  assert.deepEqual(
    remyView.map((fact) => fact.sourceRecordId),
    ['remy']
  )
  assert.equal(combinedJson.includes('Gate code is 1234'), false)
  assert.equal(combinedJson.includes('Supplier credit dispute'), false)
  assert.equal(combinedJson.includes('Chef-only Remy reasoning trace'), false)
  assert.equal(combinedJson.includes('sourceRefs'), false)
  assert.equal(combinedJson.includes('privateValue'), false)
})

test('role-safe derived read model wraps projections with source-filter and route contract proof', () => {
  const readModel = buildChefLifeRoleSafeDerivedReadModel({
    surface: 'client_portal',
    facts: [
      buildFact({
        id: 'client-visible',
        visibility: 'client_safe',
        safeSummary: 'Arrival timing can move without exposing private reasons.',
      }),
      buildFact({
        id: 'other-tenant',
        owner: {
          tenantId: 'tenant-2',
          chefId: 'tenant-2',
          subjectType: 'chef',
          subjectId: 'tenant-2',
        },
        visibility: 'client_safe',
        safeSummary: 'Other tenant detail.',
      }),
      buildFact({
        id: 'private-source',
        visibility: 'private_only',
        safeSummary: 'Private detail should not project.',
      }),
    ],
    user: clientUser,
  })

  assert.equal(readModel.surface, 'client_portal')
  assert.equal(readModel.access.serverActionGate, 'requireAuth')
  assert.equal(readModel.access.tenantScopeValue, 'user.tenantId')
  assert.equal(readModel.sourceFiltered, true)
  assert.deepEqual(
    readModel.views.map((view) => view.sourceRecordId),
    ['client-visible']
  )
  assert.equal(JSON.stringify(readModel).includes('Other tenant detail'), false)
  assert.equal(JSON.stringify(readModel).includes('Private detail should not project'), false)
})

test('permission, evidence, expired, and never-publish rules block unsafe derived views', () => {
  const now = new Date('2026-05-21T00:00:00.000Z')
  const permissioned = buildFact({
    id: 'permissioned',
    visibility: 'requires_permission',
    permissionGrants: [
      {
        audience: 'client',
        grantedByUserId: 'user-1',
        grantedAt: '2026-05-20T00:00:00.000Z',
        expiresAt: '2026-06-20T00:00:00.000Z',
      },
    ],
  })
  const evidenceBacked = buildFact({
    id: 'evidence-backed',
    visibility: 'requires_evidence',
    evidenceRefs: [
      {
        source: 'compliance_record',
        table: 'permits',
        rowId: 'permit-1',
        verificationState: 'approved',
      },
    ],
  })
  const missingEvidence = buildFact({ id: 'missing-evidence', visibility: 'requires_evidence' })
  const expired = buildFact({
    id: 'expired',
    visibility: 'client_safe',
    freshness: {
      capturedAt: '2026-01-01T00:00:00.000Z',
      lastVerifiedAt: null,
      staleAfter: null,
      expiresAt: '2026-05-01T00:00:00.000Z',
    },
  })
  const neverPublish = buildFact({ id: 'never', visibility: 'never_publish' })

  assert.equal(
    canReadPrivateMemoryDerived({
      fact: permissioned,
      audience: 'client',
      user: clientUser,
      now,
    }),
    true
  )

  const staffView = projectPrivateMemoryFactsForAudience({
    facts: [evidenceBacked, missingEvidence, expired, neverPublish],
    audience: 'staff',
    user: chefUser,
    now,
  })

  assert.deepEqual(
    staffView.map((fact) => fact.sourceRecordId),
    ['evidence-backed']
  )
})

test('source confidence and freshness classify unsourced, stale, evidence-required, and verified facts', () => {
  const now = new Date('2026-05-21T00:00:00.000Z')

  assert.equal(classifyPrivateMemorySourceState(buildFact(), now), 'sourced')
  assert.equal(classifyPrivateMemorySourceState(buildFact({ sourceRefs: [] }), now), 'unsourced')
  assert.equal(
    classifyPrivateMemorySourceState(
      buildFact({
        contradictionRefs: [
          {
            source: 'client_profile',
            table: 'client_household_facts',
            rowId: 'fact-2',
            reason: 'Client corrected the earlier household note.',
            contradictedAt: '2026-05-21T00:00:00.000Z',
          },
        ],
      }),
      now
    ),
    'contradicted'
  )
  assert.equal(
    classifyPrivateMemorySourceState(
      buildFact({
        freshness: {
          capturedAt: '2026-01-01T00:00:00.000Z',
          lastVerifiedAt: null,
          staleAfter: null,
          expiresAt: '2026-05-01T00:00:00.000Z',
        },
      }),
      now
    ),
    'stale'
  )
  assert.equal(
    classifyPrivateMemorySourceState(
      buildFact({
        freshness: {
          capturedAt: '2026-01-01T00:00:00.000Z',
          lastVerifiedAt: null,
          staleAfter: '2026-05-01T00:00:00.000Z',
          expiresAt: null,
        },
      }),
      now
    ),
    'stale'
  )
  assert.equal(
    classifyPrivateMemorySourceState(buildFact({ visibility: 'requires_evidence' }), now),
    'evidence_required'
  )
  assert.equal(
    classifyPrivateMemorySourceState(
      buildFact({
        confidence: 'verified',
        visibility: 'requires_evidence',
        evidenceRefs: [
          {
            source: 'compliance_record',
            table: 'permits',
            rowId: 'permit-1',
            verificationState: 'approved',
          },
        ],
      }),
      now
    ),
    'verified'
  )
})

test('unknown decision states keep source gaps actionable through reduction and suppression', () => {
  const unknown = buildChefLifeUnknownDecisionState({
    tenantId: 'tenant-1',
    program: 'household',
    subjectType: 'client',
    subjectId: 'client-1',
    label: 'Parking instructions are unknown',
    reductionAction: 'Ask house manager to confirm parking before service.',
    deadlineAt: '2026-05-22T00:00:00.000Z',
  })

  assert.equal(unknown.blocksDecision, true)
  assert.equal(unknown.proofState, 'missing')
  assert.equal(unknown.sourceGap, 'Parking instructions are unknown')

  const suppressed = suppressChefLifeUnknownDecisionState(unknown, {
    reason: 'Chef accepted risk for this visit.',
    until: '2026-05-23T00:00:00.000Z',
  })
  assert.equal(suppressed.blocksDecision, false)
  assert.equal(suppressed.suppressionReason, 'Chef accepted risk for this visit.')
  assert.equal(suppressed.sourceGap, unknown.sourceGap)

  const reduced = reduceChefLifeUnknownDecisionState(suppressed, 'verified')
  assert.equal(reduced.blocksDecision, false)
  assert.equal(reduced.proofState, 'verified')
  assert.equal(reduced.suppressionReason, null)
})

test('safe briefings compose from derived views and retain redaction trace for chef review', () => {
  const derivedViews = projectPrivateMemoryFactsForAudience({
    facts: [buildFact({ id: 'client' })],
    audience: 'client',
    user: clientUser,
  })

  const briefing = composePrivateMemorySafeBriefing({
    tenantId: 'tenant-1',
    audience: 'client',
    title: 'Schedule update',
    views: [
      ...derivedViews,
      {
        ...derivedViews[0],
        tenantId: 'other-tenant',
        sourceRecordId: 'other',
        value: 'Other tenant value',
      },
    ],
  })

  assert.equal(briefing.body, 'This date needs a lighter scope or earlier service window.')
  assert.deepEqual(briefing.sourceRecordIds, ['client'])
  assert.deepEqual(briefing.redactionNotes, ['client: source_private'])
  assert.equal(briefing.approvalState, 'needs_chef_review')
  assert.equal(JSON.stringify(briefing).includes('medical issue'), false)
  assert.equal(JSON.stringify(briefing).includes('Other tenant value'), false)
})

test('safe briefing composer builds purpose-specific role-safe variants from approved derived facts', () => {
  const facts = [
    buildFact({
      id: 'staff-task',
      visibility: 'staff_safe',
      privateValue: 'Host is anxious about visible prep clutter.',
      safeSummary: 'Keep prep equipment out of guest sightlines during arrival.',
      intendedUse: ['staff_safe_briefing', 'household_operations'],
    }),
    buildFact({
      id: 'vendor-instruction',
      visibility: 'vendor_safe',
      privateValue: 'Backup rental vendor is being tested after a prior failure.',
      safeSummary: 'Confirm backup rental timing before Thursday.',
      intendedUse: ['vendor_safe_briefing'],
    }),
    buildFact({
      id: 'client-update',
      visibility: 'client_safe',
      privateValue: 'Chef is managing a private recovery constraint.',
      safeSummary: 'The service plan should use an earlier finish window.',
      intendedUse: ['client_safe_explanation', 'crisis_recovery'],
    }),
    buildFact({
      id: 'public-profile',
      visibility: 'public_profile',
      privateValue: 'Private craft-development notes.',
      safeSummary: 'Seasonal menus for intimate dinners and retreats.',
      intendedUse: ['public_profile_display'],
    }),
    buildFact({
      id: 'private-source',
      visibility: 'private_only',
      privateValue: 'Chef-only medical note.',
      safeSummary: 'Do not leak this summary either.',
      intendedUse: ['staff_safe_briefing'],
    }),
    buildFact({
      id: 'other-tenant',
      owner: {
        tenantId: 'tenant-2',
        chefId: 'tenant-2',
        subjectType: 'chef',
        subjectId: 'tenant-2',
      },
      visibility: 'staff_safe',
      privateValue: 'Other tenant private note.',
      safeSummary: 'Other tenant safe summary.',
      intendedUse: ['staff_safe_briefing'],
    }),
  ]

  const staffBriefing = composePrivateMemorySafeBriefingFromFacts({
    tenantId: 'tenant-1',
    audience: 'staff',
    purpose: 'staff_tasks',
    title: 'Arrival staff briefing',
    facts,
    user: chefUser,
  })

  assert.equal(staffBriefing.body, 'Keep prep equipment out of guest sightlines during arrival.')
  assert.deepEqual(
    staffBriefing.sourceFacts.map((fact) => fact.sourceRecordId),
    ['staff-task']
  )
  assert.equal(staffBriefing.sourceFacts[0].approvedDerived, true)
  assert.equal(staffBriefing.sourceFacts[0].sourceState, 'sourced')
  assert.equal(staffBriefing.sourceFacts[0].sourceLabel.includes('manual note'), true)
  assert.deepEqual(staffBriefing.sourceRecordIds, ['staff-task'])
  assert.equal(staffBriefing.approvalState, 'needs_chef_review')
  assert.ok(staffBriefing.redactionNotes.includes('staff-task: source_private'))
  assert.ok(staffBriefing.redactionNotes.includes('private-source: omitted_private_only'))
  assert.deepEqual(
    staffBriefing.copyVariants.map((variant) => variant.id),
    ['summary', 'sendable_message', 'checklist']
  )
  assert.equal(JSON.stringify(staffBriefing).includes('Host is anxious'), false)
  assert.equal(JSON.stringify(staffBriefing).includes('Chef-only medical note'), false)
  assert.equal(JSON.stringify(staffBriefing).includes('Other tenant'), false)

  const approvedClientBriefing = composePrivateMemorySafeBriefingFromFacts({
    tenantId: 'tenant-1',
    audience: 'client',
    purpose: 'recovery_communications',
    title: 'Schedule adjustment',
    facts,
    user: clientUser,
    approvedByChefUserId: 'chef-user-1',
  })

  assert.equal(approvedClientBriefing.approvalState, 'approved_to_send')
  assert.equal(approvedClientBriefing.body, 'The service plan should use an earlier finish window.')
  assert.deepEqual(
    approvedClientBriefing.sourceFacts.map((fact) => fact.sourceRecordId),
    ['client-update']
  )

  const publicBriefing = composePrivateMemorySafeBriefingFromFacts({
    tenantId: 'tenant-1',
    audience: 'public',
    purpose: 'public_profile_copy',
    title: 'Profile copy',
    facts,
  })

  assert.equal(publicBriefing.body, 'Seasonal menus for intimate dinners and retreats.')
  assert.deepEqual(
    publicBriefing.copyVariants.map((variant) => variant.id),
    ['summary', 'public_profile']
  )
  assert.equal(JSON.stringify(publicBriefing).includes('Private craft-development notes'), false)
})

test('public claims that require evidence suppress until public-approved proof exists', () => {
  const needsEvidence = buildFact({
    id: 'public-needs-evidence',
    visibility: 'public_profile',
    privateValue: 'Chef has a verified allergy-safe service process.',
    safeSummary: 'Allergy-aware service planning available.',
    intendedUse: ['public_profile_display'],
    publicClaimEligibility: {
      eligible: true,
      requiresApprovedEvidence: true,
      suppressionReason: null,
      approvedAt: null,
    },
  })

  assert.equal(canPublishPrivateMemoryPublicClaim({ fact: needsEvidence }), false)
  assert.deepEqual(
    projectPrivateMemoryFactsForAudience({ facts: [needsEvidence], audience: 'public' }),
    []
  )

  const approved = buildFact({
    ...needsEvidence,
    evidenceRefs: [
      {
        source: 'compliance_record',
        table: 'allergen_protocols',
        rowId: 'protocol-1',
        verificationState: 'approved',
        approvedForPublicClaim: true,
        approvedAt: '2026-05-21T00:00:00.000Z',
        approvedByUserId: 'chef-user-1',
      },
    ],
    publicClaimEligibility: {
      eligible: true,
      requiresApprovedEvidence: true,
      suppressionReason: null,
      approvedAt: '2026-05-21T00:00:00.000Z',
    },
  })

  const publicView = projectPrivateMemoryFactsForAudience({
    facts: [approved],
    audience: 'public',
  })

  assert.equal(canPublishPrivateMemoryPublicClaim({ fact: approved }), true)
  assert.deepEqual(
    publicView.map((fact) => fact.sourceRecordId),
    ['public-needs-evidence']
  )
  assert.equal(publicView[0].sourceState, 'verified')
  assert.equal(JSON.stringify(publicView).includes('verified allergy-safe'), false)
})

test('server access rule mapping keeps auth gates and tenant scopes explicit', () => {
  assert.deepEqual(mapVisibilityToServerAccessRule('staff_safe', 'staff'), {
    audience: 'staff',
    authGate: 'requireAuth',
    tenantScope: 'user.tenantId',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: 'private_memory_staff_derived_access',
  })

  assert.deepEqual(mapVisibilityToServerAccessRule('private_only', 'client'), {
    audience: 'client',
    authGate: 'requireAuth',
    tenantScope: 'user.tenantId',
    canReadSource: false,
    canReadDerived: false,
    auditEvent: 'private_memory_client_derived_access',
  })

  assert.deepEqual(mapVisibilityToServerAccessRule('private_only', 'admin'), {
    audience: 'admin',
    authGate: 'requireAdmin',
    tenantScope: 'user.entityId',
    canReadSource: true,
    canReadDerived: false,
    auditEvent: 'private_memory_admin_access',
  })
})
