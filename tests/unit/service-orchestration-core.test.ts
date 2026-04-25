import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildServiceOrchestrationPlan,
  type TastingMenuCourse,
} from '@/lib/service-execution/orchestration-core'

function course(overrides: Partial<TastingMenuCourse>): TastingMenuCourse {
  return {
    id: overrides.id ?? `course-${overrides.courseNumber ?? 1}`,
    courseNumber: overrides.courseNumber ?? 1,
    name: overrides.name ?? 'Course',
    targetServeMinute: overrides.targetServeMinute ?? 0,
    targetPaceMinutes: overrides.targetPaceMinutes ?? 8,
    temperature: overrides.temperature ?? 'hot',
    narrativeTags: overrides.narrativeTags ?? [],
    components: overrides.components ?? [],
  }
}

test('flags missing and late component dependencies', () => {
  const plan = buildServiceOrchestrationPlan({
    courses: [
      course({
        courseNumber: 5,
        targetServeMinute: 60,
        components: [
          {
            id: 'protein',
            name: 'Rested lamb',
            role: 'protein',
            prepStage: 'during_service',
            readyMinute: 70,
            laborMinutes: 8,
          },
          {
            id: 'plate',
            name: 'Lamb plate-up',
            role: 'other',
            prepStage: 'during_service',
            neededMinute: 62,
            dependsOnComponentIds: ['protein', 'missing-sauce'],
          },
        ],
      }),
    ],
  })

  assert.deepEqual(plan.dependencyRisks.map((risk) => risk.type).sort(), [
    'late_dependency',
    'missing_dependency',
  ])
  assert.equal(plan.serviceReady, false)
})

test('flags hold-limit violations across dependent components', () => {
  const plan = buildServiceOrchestrationPlan({
    courses: [
      course({
        courseNumber: 6,
        targetServeMinute: 75,
        components: [
          {
            id: 'reduction',
            name: 'Duck jus reduction',
            role: 'sauce',
            prepStage: 'day_before',
            readyMinute: -120,
            holdLimitMinutes: 90,
          },
          {
            id: 'finish',
            name: 'Glaze and plate duck',
            role: 'protein',
            prepStage: 'during_service',
            neededMinute: 72,
            dependsOnComponentIds: ['reduction'],
          },
        ],
      }),
    ],
  })

  assert.equal(plan.dependencyRisks.length, 1)
  assert.equal(plan.dependencyRisks[0].type, 'hold_limit')
})

test('detects overlapping resource contention above capacity', () => {
  const plan = buildServiceOrchestrationPlan({
    resources: [{ id: 'burner', label: 'Front burner', capacity: 1 }],
    courses: [
      course({
        courseNumber: 4,
        targetServeMinute: 45,
        components: [
          {
            id: 'sauce',
            name: 'Butter sauce',
            role: 'sauce',
            prepStage: 'during_service',
            requiredResources: [
              { resourceId: 'burner', window: { startMinute: 35, endMinute: 50 } },
            ],
          },
        ],
      }),
      course({
        courseNumber: 5,
        targetServeMinute: 55,
        components: [
          {
            id: 'sear',
            name: 'Scallop sear',
            role: 'protein',
            prepStage: 'during_service',
            requiredResources: [
              { resourceId: 'burner', window: { startMinute: 44, endMinute: 58 } },
            ],
          },
        ],
      }),
    ],
  })

  assert.equal(plan.resourceConflicts.length, 1)
  assert.equal(plan.resourceConflicts[0].resourceId, 'burner')
  assert.deepEqual(plan.resourceConflicts[0].window, { startMinute: 44, endMinute: 50 })
  assert.equal(plan.serviceReady, false)
})

test('groups prep work by multi-day stage with labor totals', () => {
  const plan = buildServiceOrchestrationPlan({
    courses: [
      course({
        courseNumber: 1,
        targetServeMinute: 0,
        components: [
          {
            id: 'pickle',
            name: 'Compressed apple',
            role: 'garnish',
            prepStage: 'day_before',
            laborMinutes: 20,
          },
          {
            id: 'crisp',
            name: 'Buckwheat crisp',
            role: 'texture',
            prepStage: 'day_of',
            laborMinutes: 12,
          },
        ],
      }),
    ],
  })

  assert.deepEqual(
    plan.prepTimeline.map((group) => [group.stage, group.totalLaborMinutes]),
    [
      ['day_before', 20],
      ['day_of', 12],
    ]
  )
})

test('surfaces menu flow repetition and reusable components', () => {
  const plan = buildServiceOrchestrationPlan({
    courses: [
      course({
        courseNumber: 1,
        targetServeMinute: 0,
        temperature: 'cold',
        narrativeTags: ['citrus'],
        components: [
          {
            id: 'gel-1',
            name: 'Yuzu gel',
            role: 'garnish',
            prepStage: 'day_before',
            reusableKey: 'yuzu-gel',
          },
        ],
      }),
      course({
        courseNumber: 2,
        targetServeMinute: 12,
        temperature: 'cold',
        narrativeTags: ['citrus'],
        components: [
          {
            id: 'gel-2',
            name: 'Yuzu gel dots',
            role: 'garnish',
            prepStage: 'day_before',
            reusableKey: 'yuzu-gel',
          },
        ],
      }),
    ],
  })

  assert.ok(plan.menuFlowWarnings.some((warning) => warning.type === 'repeated_temperature'))
  assert.ok(plan.menuFlowWarnings.some((warning) => warning.type === 'repeated_narrative_tag'))
  assert.deepEqual(plan.reusableComponents[0].courseNumbers, [1, 2])
})

test('links complexity and cost to pricing readiness', () => {
  const plan = buildServiceOrchestrationPlan({
    pricing: {
      guestCount: 8,
      quotedPriceCents: 160000,
      targetMarginPercent: 55,
      fixedCostCents: 20000,
      laborCostCents: 45000,
    },
    courses: [
      course({
        courseNumber: 1,
        targetServeMinute: 0,
        components: [
          {
            id: 'caviar',
            name: 'Caviar bite',
            role: 'other',
            prepStage: 'day_of',
            costCents: 30000,
          },
          {
            id: 'tartlet',
            name: 'Tartlet shell',
            role: 'texture',
            prepStage: 'day_before',
            costCents: 10000,
          },
        ],
      }),
    ],
  })

  assert.equal(plan.pricing?.totalCostCents, 105000)
  assert.equal(plan.pricing?.status, 'margin_risk')
  assert.equal(plan.serviceReady, false)
})
