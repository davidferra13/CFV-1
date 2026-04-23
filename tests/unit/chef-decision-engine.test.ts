import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildChefDecisionEngine } from '@/lib/chef-decision-engine/engine'
import type {
  ChefDecisionContext,
  ChefDecisionCourseInput,
  ChefDecisionDishInput,
  ChefDecisionGuest,
} from '@/lib/chef-decision-engine/types'

function makeDish(overrides: Partial<ChefDecisionDishInput> = {}): ChefDecisionDishInput {
  return {
    id: overrides.id ?? 'dish-default',
    menuId: overrides.menuId ?? 'menu-1',
    courseKey: overrides.courseKey ?? '1:starter',
    courseNumber: overrides.courseNumber ?? 1,
    courseName: overrides.courseName ?? 'Starter',
    name: overrides.name ?? 'Dish Default',
    description: overrides.description ?? null,
    dietaryTags: overrides.dietaryTags ?? [],
    allergenFlags: overrides.allergenFlags ?? [],
    ingredientNames: overrides.ingredientNames ?? ['olive oil', 'herbs'],
    equipment: overrides.equipment ?? ['saute pan'],
    ingredients: overrides.ingredients ?? [
      {
        ingredientId: 'ingredient-1',
        ingredientName: 'olive oil',
        unit: 'tbsp',
        quantityPerGuest: 1,
        allergenFlags: [],
        dietaryTags: [],
        sourceRecipeId: 'recipe-1',
        sourceRecipeName: 'Recipe Default',
      },
    ],
    operationalMetrics: overrides.operationalMetrics ?? {
      componentCount: 3,
      makeAheadComponentCount: 1,
      onSiteComponentCount: 2,
      totalPrepMinutes: 40,
      totalCookMinutes: 25,
      totalTimeMinutes: 65,
      missingRecipeComponentCount: 0,
    },
    costMetrics: overrides.costMetrics ?? {
      costPerPortionCents: 1200,
      hasCompleteCostData: true,
      ingredientCount: 6,
      lastPriceUpdatedAt: '2026-04-20T10:00:00.000Z',
    },
    history: overrides.history ?? {
      avgRating: 4.7,
      reviewCount: 6,
      positiveCount: 4,
      negativeCount: 0,
      repeatCount: 1,
      wasRejected: false,
      recentlyServedOn: '2026-03-18',
      requestCount: 0,
      avoidCount: 0,
    },
  }
}

function makeGuests(overrides: Partial<ChefDecisionGuest>[] = []): ChefDecisionGuest[] {
  const defaults: ChefDecisionGuest[] = [
    {
      id: 'guest-1',
      name: 'Alex',
      attending: true,
      constraints: [],
    },
    {
      id: 'guest-2',
      name: 'Jordan',
      attending: true,
      constraints: [],
    },
  ]

  return defaults.map((guest, index) => ({
    ...guest,
    ...(overrides[index] ?? {}),
  }))
}

function makeContext(overrides: Partial<ChefDecisionContext> = {}): ChefDecisionContext {
  const course: ChefDecisionCourseInput = {
    courseKey: '1:starter',
    courseNumber: 1,
    courseName: 'Starter',
    pollId: 'poll-1',
    totalVotes: 6,
    lockedDishId: null,
    lockedReason: null,
    options: [
      {
        dish: makeDish({
          id: 'dish-a',
          name: 'Roasted Tomato Tart',
          dietaryTags: ['vegetarian'],
          ingredientNames: ['tomato', 'puff pastry', 'goat cheese'],
          costMetrics: {
            costPerPortionCents: 1100,
            hasCompleteCostData: true,
            ingredientCount: 7,
            lastPriceUpdatedAt: '2026-04-20T10:00:00.000Z',
          },
        }),
        voteCount: 4,
        selectedGuestIds: ['guest-1'],
        selectedGuestNames: ['Alex'],
        source: 'poll',
        explicitLock: false,
      },
      {
        dish: makeDish({
          id: 'dish-b',
          name: 'Chilled Pea Soup',
          dietaryTags: ['vegetarian', 'gluten-free'],
          ingredientNames: ['peas', 'cream', 'mint'],
          costMetrics: {
            costPerPortionCents: 1300,
            hasCompleteCostData: true,
            ingredientCount: 6,
            lastPriceUpdatedAt: '2026-04-20T10:00:00.000Z',
          },
        }),
        voteCount: 2,
        selectedGuestIds: ['guest-2'],
        selectedGuestNames: ['Jordan'],
        source: 'poll',
        explicitLock: false,
      },
    ],
  }

  return {
    referenceDate: '2026-04-22',
    event: {
      id: 'event-1',
      clientId: 'client-1',
      clientName: 'Morgan',
      eventDate: '2026-05-02',
      guestCount: 6,
      serviceStyle: 'plated',
      specialRequests: null,
      kitchenConstraints: null,
      equipmentAvailable: ['saute pan', 'oven'],
      equipmentMustBring: [],
      confirmedEquipment: ['saute pan', 'oven'],
      allergies: [],
      dietaryRestrictions: [],
    },
    clientSignals: {
      loved: [],
      disliked: [],
      favoriteDishes: [],
      cuisinePreferences: [],
      spicePreference: null,
      pastEventCount: 2,
    },
    guests: makeGuests(),
    courses: [course],
    ...overrides,
  }
}

describe('chef decision engine', () => {
  it('chooses the strongest majority dish and marks execution ready when no blockers exist', () => {
    const result = buildChefDecisionEngine(makeContext())

    assert.equal(result.finalMenu.courses[0]?.selectedDishName, 'Roasted Tomato Tart')
    assert.equal(result.finalMenu.courses[0]?.consensus, 'strong')
    assert.equal(result.executionReadiness.state, 'ready')
    assert.equal(result.ingredientPlan.coverage, 'full')
  })

  it('honors locked selections over poll majorities', () => {
    const context = makeContext()
    context.courses[0] = {
      ...context.courses[0],
      lockedDishId: 'dish-b',
      lockedReason: 'Client approved the soup already.',
    }

    const result = buildChefDecisionEngine(context)

    assert.equal(result.finalMenu.courses[0]?.selectedDishName, 'Chilled Pea Soup')
    assert.equal(result.finalMenu.courses[0]?.consensus, 'locked')
    assert.equal(result.finalMenu.status, 'locked')
  })

  it('recommends a main dish plus accommodation when a minority guest constraint diverges', () => {
    const context = makeContext({
      event: {
        ...makeContext().event,
        guestCount: 10,
      },
      guests: [
        {
          id: 'guest-1',
          name: 'Alex',
          attending: true,
          constraints: [],
        },
        {
          id: 'guest-2',
          name: 'Jordan',
          attending: true,
          constraints: [
            {
              label: 'vegan',
              type: 'dietary',
              severity: 'preference',
            },
          ],
        },
      ],
      courses: [
        {
          ...makeContext().courses[0],
          totalVotes: 10,
          options: [
            {
              dish: makeDish({
                id: 'dish-majority',
                name: 'Braised Short Rib',
                ingredientNames: ['beef', 'red wine', 'butter'],
                dietaryTags: [],
                costMetrics: {
                  costPerPortionCents: 2200,
                  hasCompleteCostData: true,
                  ingredientCount: 8,
                  lastPriceUpdatedAt: '2026-04-20T10:00:00.000Z',
                },
              }),
              voteCount: 8,
              selectedGuestIds: ['guest-1'],
              selectedGuestNames: ['Alex'],
              source: 'poll',
              explicitLock: false,
            },
            {
              dish: makeDish({
                id: 'dish-accommodation',
                name: 'Cauliflower Steak',
                dietaryTags: ['vegan', 'gluten-free'],
                ingredientNames: ['cauliflower', 'olive oil', 'capers'],
                costMetrics: {
                  costPerPortionCents: 1400,
                  hasCompleteCostData: true,
                  ingredientCount: 7,
                  lastPriceUpdatedAt: '2026-04-20T10:00:00.000Z',
                },
              }),
              voteCount: 2,
              selectedGuestIds: ['guest-2'],
              selectedGuestNames: ['Jordan'],
              source: 'poll',
              explicitLock: false,
            },
          ],
        },
      ],
    })

    const result = buildChefDecisionEngine(context)
    const course = result.finalMenu.courses[0]

    assert.equal(course?.selectedDishName, 'Braised Short Rib')
    assert.equal(course?.branchStrategy, 'main_plus_accommodation')
    assert.equal(course?.accommodation?.dishName, 'Cauliflower Steak')
    assert.equal(result.executionReadiness.state, 'risk')
  })

  it('flags ties as weak execution confidence', () => {
    const context = makeContext()
    context.courses[0] = {
      ...context.courses[0],
      totalVotes: 4,
      options: context.courses[0].options.map((option) => ({
        ...option,
        voteCount: 2,
      })),
    }

    const result = buildChefDecisionEngine(context)

    assert.equal(result.finalMenu.courses[0]?.consensus, 'tie')
    assert.equal(
      result.riskFlags.some((flag) => flag.code === 'selection_tie'),
      true
    )
    assert.equal(result.executionReadiness.state, 'risk')
  })

  it('surfaces missing recipe-linked components as an execution risk', () => {
    const context = makeContext({
      courses: [
        {
          ...makeContext().courses[0],
          options: [
            {
              ...makeContext().courses[0].options[0],
              dish: makeDish({
                id: 'dish-gap',
                name: 'Charred Carrot Salad',
                operationalMetrics: {
                  componentCount: 4,
                  makeAheadComponentCount: 2,
                  onSiteComponentCount: 2,
                  totalPrepMinutes: 45,
                  totalCookMinutes: 10,
                  totalTimeMinutes: 55,
                  missingRecipeComponentCount: 2,
                },
              }),
              voteCount: 6,
            },
          ],
        },
      ],
    })

    const result = buildChefDecisionEngine(context)

    assert.equal(result.executionReadiness.state, 'risk')
    assert.equal(result.executionReadiness.metrics.missingRecipeComponentCount, 2)
    assert.equal(
      result.riskFlags.some((flag) => flag.code === 'recipe_component_gap'),
      true
    )
  })

  it('marks execution not ready when safety, ingredient coverage, and equipment all fail', () => {
    const context = makeContext({
      event: {
        ...makeContext().event,
        confirmedEquipment: [],
        equipmentAvailable: [],
      },
      guests: [
        {
          id: 'guest-1',
          name: 'Alex',
          attending: true,
          constraints: [
            {
              label: 'shellfish',
              type: 'allergy',
              severity: 'anaphylaxis',
            },
          ],
        },
      ],
      courses: [
        {
          ...makeContext().courses[0],
          totalVotes: 5,
          options: [
            {
              dish: makeDish({
                id: 'dish-risk',
                name: 'Lobster Risotto',
                allergenFlags: ['shellfish'],
                ingredientNames: ['lobster', 'rice', 'butter'],
                equipment: ['portable burner'],
                ingredients: [],
              }),
              voteCount: 5,
              selectedGuestIds: ['guest-1'],
              selectedGuestNames: ['Alex'],
              source: 'poll',
              explicitLock: false,
            },
          ],
        },
      ],
    })

    const result = buildChefDecisionEngine(context)

    assert.equal(result.executionReadiness.state, 'not_ready')
    assert.equal(
      result.riskFlags.some(
        (flag) => flag.code === 'dietary_conflict' && flag.severity === 'critical'
      ),
      true
    )
    assert.equal(
      result.riskFlags.some(
        (flag) => flag.code === 'equipment_gap' && flag.severity === 'critical'
      ),
      true
    )
    assert.equal(result.ingredientPlan.coverage, 'missing')
  })
})
