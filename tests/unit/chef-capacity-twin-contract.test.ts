import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCapacityProfile,
  buildClientSafeCapacityGate,
  deriveCapacityDecision,
  estimateCapacityWorkload,
} from '../../lib/intelligence/chef-capacity-twin'
import {
  buildClientSafeCapacitySummary,
  containsPrivateCapacityLeak,
  deriveMostRestrictiveCapacityState,
  getRequiredCapacitySourceSystems,
  isPrivateCapacityVisibility,
  type PrivateCapacityConstraintContract,
} from '../../lib/intelligence/chef-capacity-twin-contract'

const profile = buildCapacityProfile({
  tenantId: 'tenant-1',
  chefId: 'chef-1',
  capacitySettings: {
    default_prep_hours: 4,
    default_travel_minutes: 60,
    default_cleanup_hours: 1,
  },
  legacyChef: {
    max_hours_per_week: 35,
    min_rest_days_per_week: 1,
  },
})

const restConstraint: PrivateCapacityConstraintContract = {
  tenantId: 'tenant-1',
  chefId: 'chef-1',
  kind: 'rest_day',
  source: 'capacity_settings',
  severity: 'warning',
  startsAt: '2026-06-05',
  endsAt: '2026-06-05',
  label: 'Protected rest day for sleep debt recovery',
  privateNotes: 'Do not disclose this private context.',
  visibility: 'private_only',
}

test('capacity twin contract ranks restrictive states and private visibility', () => {
  assert.equal(deriveMostRestrictiveCapacityState(['available', 'tight', 'unsafe']), 'unsafe')
  assert.equal(deriveMostRestrictiveCapacityState(['available', 'unknown']), 'unknown')
  assert.equal(deriveMostRestrictiveCapacityState([]), 'unknown')

  assert.equal(isPrivateCapacityVisibility('private_only'), true)
  assert.equal(isPrivateCapacityVisibility('chef_staff_private'), true)
  assert.equal(isPrivateCapacityVisibility('client_safe_summary'), false)
})

test('workload estimates keep unknown factors explicit instead of pretending zero load', () => {
  const workload = estimateCapacityWorkload({
    tenantId: 'tenant-1',
    subjectType: 'inquiry',
    subjectId: 'inquiry-1',
    targetDate: '2026-06-05',
    guestCount: null,
    menuKnown: false,
    locationKnown: false,
    staffPlanKnown: false,
  })

  assert.equal(workload.confidence, 'low')
  assert.equal(workload.unknownFactors.includes('prep'), true)
  assert.equal(workload.unknownFactors.includes('travel'), true)
  assert.equal(workload.unknownFactors.includes('service'), true)
  assert.equal(workload.totalKnownMinutes > 0, true)
})

test('capacity decisions combine workload, profile limits, constraints, and client-safe alternatives', () => {
  const decision = deriveCapacityDecision({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    subjectType: 'quote',
    subjectId: 'quote-1',
    targetDate: '2026-06-05',
    profile,
    workloadInput: {
      guestCount: 24,
      serviceStyle: 'tasting_menu',
      menuKnown: true,
      locationKnown: true,
      staffPlanKnown: false,
      complexity: 'complex',
    },
    privateConstraints: [restConstraint],
    existingDayMinutes: 180,
    existingWeekMinutes: 1200,
  })

  assert.equal(decision.state, 'recovery_required')
  assert.equal(decision.severity, 'warning')
  assert.equal(decision.privateConstraints.length, 1)
  assert.equal(
    decision.clientSafeAlternatives.every((item) => item.visibility === 'client_safe_summary'),
    true
  )

  const clientSafe = buildClientSafeCapacityGate(decision)
  assert.equal(clientSafe.visibility, 'client_safe_summary')
  assert.equal(clientSafe.blockedPrivateReasonCount > 0, true)
  assert.equal(JSON.stringify(clientSafe).includes('sleep debt'), false)
  assert.equal(JSON.stringify(clientSafe).includes('recovery'), false)
})

test('client-safe summaries drop alternatives that contain private capacity leaks', () => {
  const workload = estimateCapacityWorkload({
    tenantId: 'tenant-1',
    subjectType: 'event',
    subjectId: 'event-1',
    targetDate: '2026-06-05',
    guestCount: 8,
    menuKnown: true,
    locationKnown: true,
    staffPlanKnown: true,
  })
  const decision = deriveCapacityDecision({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    subjectType: 'event',
    subjectId: 'event-1',
    targetDate: '2026-06-05',
    profile,
    workload,
  })
  decision.clientSafeAlternatives.push({
    kind: 'date',
    message: 'The chef has an injury and needs recovery.',
    targetDate: null,
    visibility: 'client_safe_summary',
  })

  const summary = buildClientSafeCapacitySummary(decision)
  assert.equal(
    summary.alternatives.some((item) => containsPrivateCapacityLeak(item.message)),
    false
  )
  assert.equal(summary.blockedPrivateReasonCount, 1)
})

test('capacity source map composes existing systems instead of creating duplicate systems', () => {
  assert.deepEqual(getRequiredCapacitySourceSystems('quote'), [
    'chef_capacity_settings',
    'chef_scheduling_rules',
    'chefs',
    'events',
    'event_prep_blocks',
    'quotes',
    'inquiries',
  ])
  assert.equal(getRequiredCapacitySourceSystems('calendar_date').includes('calendar'), true)
})
