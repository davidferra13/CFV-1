import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { __testOnly } from '@/lib/chef-decision-engine/actions'

let helpers: Awaited<ReturnType<typeof __testOnly>>

before(async () => {
  helpers = await __testOnly()
})

describe('chef decision engine action helpers', () => {
  it('rejects malformed cached planning payloads before they are surfaced as decisions', () => {
    assert.equal(
      helpers.isStoredChefDecisionPayload({
        generatedAt: '2026-04-22T10:00:00.000Z',
        summary: {},
        finalMenu: {},
        ingredientPlan: {},
        prepPlan: {},
        executionReadiness: {},
        riskFlags: [],
        trace: [],
      }),
      false
    )

    assert.equal(
      helpers.isStoredChefDecisionPayload({
        generatedAt: '2026-04-22T10:00:00.000Z',
        summary: {},
        finalMenu: {},
        ingredientPlan: {},
        prepPlan: {},
        executionReadiness: {},
        riskFlags: [],
        trace: [],
        evidence: [],
      }),
      true
    )
  })

  it('normalizes duplicate external selection signals into a single course record', () => {
    const normalized = helpers.normalizeSelectionSignals({
      courses: [
        {
          courseKey: '1:starter',
          courseName: 'Starter',
          options: [
            {
              dishId: 'dish-a',
              voteCount: 0,
              selectedGuestIds: ['guest-1'],
              selectedGuestNames: ['Alex'],
              source: 'external',
            },
          ],
        },
        {
          courseKey: '1:starter',
          courseNumber: 1,
          courseName: 'Starter',
          options: [
            {
              dishId: 'dish-a',
              voteCount: 4,
              selectedGuestIds: ['guest-1', 'guest-2'],
              selectedGuestNames: ['Alex', 'Jordan'],
              source: 'external',
            },
            {
              dishId: 'dish-b',
              voteCount: 2,
              selectedGuestIds: ['guest-3'],
              selectedGuestNames: ['Casey'],
              source: 'external',
            },
          ],
        },
      ],
    })

    assert.equal(normalized.length, 1)
    assert.equal(normalized[0]?.courseKey, '1:starter')
    assert.equal(normalized[0]?.totalVotes, 6)

    const dishA = normalized[0]?.options.find((option) => option.dishId === 'dish-a')
    assert.equal(dishA?.voteCount, 4)
    assert.deepEqual(dishA?.selectedGuestIds, ['guest-1', 'guest-2'])
    assert.deepEqual(dishA?.selectedGuestNames, ['Alex', 'Jordan'])
  })

  it('keeps poll provenance when menu fallback signals are merged later', () => {
    const pollSignals = helpers.normalizeSelectionSignals({
      courses: [
        {
          courseKey: '1:starter',
          courseName: 'Starter',
          totalVotes: 5,
          options: [
            {
              dishId: 'dish-a',
              voteCount: 5,
              selectedGuestIds: ['guest-1'],
              selectedGuestNames: ['Alex'],
              source: 'poll',
            },
          ],
        },
      ],
    })

    const menuSignals = helpers.normalizeSelectionSignals({
      courses: [
        {
          courseKey: '1:starter',
          courseName: 'Starter',
          options: [
            {
              dishId: 'dish-a',
              voteCount: 0,
              source: 'menu',
            },
          ],
        },
      ],
    })

    const merged = helpers.mergeSelectionSignals(pollSignals, menuSignals)
    const option = merged[0]?.options[0]

    assert.equal(option?.source, 'poll')
    assert.equal(option?.voteCount, 5)
  })

  it('marks only single-dish menu courses as locked execution selections', () => {
    const signals = helpers.buildLockedMenuSignals('menu-1', [
      {
        id: 'dish-starter',
        menu_id: 'menu-1',
        name: 'Starter Dish',
        description: null,
        course_name: 'Starter',
        course_number: 1,
        dietary_tags: null,
        allergen_flags: null,
      },
      {
        id: 'dish-main-a',
        menu_id: 'menu-1',
        name: 'Main Dish A',
        description: null,
        course_name: 'Main',
        course_number: 2,
        dietary_tags: null,
        allergen_flags: null,
      },
      {
        id: 'dish-main-b',
        menu_id: 'menu-1',
        name: 'Main Dish B',
        description: null,
        course_name: 'Main',
        course_number: 2,
        dietary_tags: null,
        allergen_flags: null,
      },
    ])

    const starter = signals.find((course) => course.courseKey === '1:starter')
    const main = signals.find((course) => course.courseKey === '2:main')

    assert.equal(starter?.lockedDishId, 'dish-starter')
    assert.equal(starter?.lockedReason, 'The event already points to a selected execution menu.')
    assert.equal(starter?.options[0]?.source, 'locked')

    assert.equal(main?.lockedDishId, null)
    assert.equal(main?.lockedReason, null)
    assert.equal(
      main?.options.every((option) => option.source === 'menu'),
      true
    )
  })
})
