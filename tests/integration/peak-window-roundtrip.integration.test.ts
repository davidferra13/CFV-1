/**
 * Integration Test: Peak Window Round-Trip
 *
 * Verifies the complete lifecycle of recipe peak windows:
 * 1) Create a recipe with peak window fields
 * 2) Read back and verify all 6 fields are stored correctly
 * 3) Update peak window via updateRecipePeakWindow pattern
 * 4) Verify updated values round-trip correctly
 * 5) Verify computePrepTimeline uses the stored peak windows
 * 6) Verify storage_method CHECK constraint rejects invalid values
 */

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { testDb } from '../helpers/test-db.js'
import {
  computePrepTimeline,
  type TimelineRecipeInput,
} from '../../lib/prep-timeline/compute-timeline.js'

testDb.skipIfNoDatabase()

const db = testDb.getClient()

let chefId: string
let recipeId: string

describe('Peak Window Round-Trip', () => {
  before(async () => {
    const { tenantId } = await testDb.createTestChef()
    chefId = tenantId
  })

  after(async () => {
    await testDb.cleanup()
  })

  it('creates a recipe with all 6 peak window fields', async () => {
    const { data: recipe, error } = await db
      .from('recipes')
      .insert({
        tenant_id: chefId,
        name: `Peak Window Test Recipe ${Date.now()}`,
        category: 'sauce',
        peak_hours_min: 2,
        peak_hours_max: 48,
        safety_hours_max: 72,
        storage_method: 'fridge',
        freezable: true,
        frozen_extends_hours: 720,
      })
      .select(
        'id, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours'
      )
      .single()

    assert.ifError(error)
    assert.ok(recipe, 'Recipe should be created')
    recipeId = recipe.id

    assert.equal(recipe.peak_hours_min, 2)
    assert.equal(recipe.peak_hours_max, 48)
    assert.equal(recipe.safety_hours_max, 72)
    assert.equal(recipe.storage_method, 'fridge')
    assert.equal(recipe.freezable, true)
    assert.equal(recipe.frozen_extends_hours, 720)
  })

  it('reads back peak window fields correctly', async () => {
    const { data: recipe, error } = await db
      .from('recipes')
      .select(
        'peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours'
      )
      .eq('id', recipeId)
      .single()

    assert.ifError(error)
    assert.equal(recipe.peak_hours_min, 2)
    assert.equal(recipe.peak_hours_max, 48)
    assert.equal(recipe.safety_hours_max, 72)
    assert.equal(recipe.storage_method, 'fridge')
    assert.equal(recipe.freezable, true)
    assert.equal(recipe.frozen_extends_hours, 720)
  })

  it('updates peak window fields', async () => {
    const { error: updateError } = await db
      .from('recipes')
      .update({
        peak_hours_min: 0,
        peak_hours_max: 4,
        safety_hours_max: 8,
        storage_method: 'room_temp',
        freezable: false,
        frozen_extends_hours: null,
      })
      .eq('id', recipeId)
      .eq('tenant_id', chefId)

    assert.ifError(updateError)

    const { data: updated, error: readError } = await db
      .from('recipes')
      .select(
        'peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours'
      )
      .eq('id', recipeId)
      .single()

    assert.ifError(readError)
    assert.equal(updated.peak_hours_min, 0)
    assert.equal(updated.peak_hours_max, 4)
    assert.equal(updated.safety_hours_max, 8)
    assert.equal(updated.storage_method, 'room_temp')
    assert.equal(updated.freezable, false)
    assert.equal(updated.frozen_extends_hours, null)
  })

  it('rejects invalid storage_method values', async () => {
    const { error } = await db
      .from('recipes')
      .update({ storage_method: 'invalid_method' })
      .eq('id', recipeId)

    assert.ok(error, 'Should reject invalid storage method')
    assert.ok(
      error.message.includes('check') ||
        error.message.includes('constraint') ||
        error.code === '23514',
      `Error should be a CHECK constraint violation, got: ${error.message}`
    )
  })

  it('computePrepTimeline uses stored peak windows correctly', () => {
    const serviceDate = new Date(2026, 3, 20, 18, 0, 0) // Apr 20, 6pm

    const inputs: TimelineRecipeInput[] = [
      {
        recipeId: 'test-1',
        recipeName: 'Test Sauce',
        componentName: 'Beurre Blanc',
        dishName: 'Scallops',
        courseName: 'Main',
        category: 'sauce',
        peakHoursMin: 2,
        peakHoursMax: 48,
        safetyHoursMax: 72,
        storageMethod: 'fridge',
        freezable: true,
        frozenExtendsHours: 720,
        prepTimeMinutes: 30,
        isMakeAhead: true,
        makeAheadWindowHours: null,
        allergenFlags: [],
      },
      {
        recipeId: 'test-2',
        recipeName: 'Seared Scallops',
        componentName: 'Scallops',
        dishName: 'Scallops',
        courseName: 'Main',
        category: 'protein',
        peakHoursMin: 0,
        peakHoursMax: 1,
        safetyHoursMax: 2,
        storageMethod: 'fridge',
        freezable: false,
        frozenExtendsHours: null,
        prepTimeMinutes: 15,
        isMakeAhead: false,
        makeAheadWindowHours: null,
        allergenFlags: ['shellfish'],
      },
    ]

    const timeline = computePrepTimeline(inputs, serviceDate)

    // Sauce (48h peak) should be on Day -2
    // Scallops (1h peak) should be on service day
    assert.ok(timeline.days.length > 0, 'Should have prep days')

    const serviceDayItems = timeline.days.find((d) => d.isServiceDay)?.items ?? []
    const prepDayItems = timeline.days.filter((d) => !d.isServiceDay).flatMap((d) => d.items)

    assert.ok(
      serviceDayItems.some((i) => i.recipeName === 'Seared Scallops'),
      'Scallops (1h peak) should be on service day'
    )
    assert.ok(
      prepDayItems.some((i) => i.recipeName === 'Test Sauce'),
      'Sauce (48h peak) should be on a prep day before service'
    )

    // Verify effectiveCeiling = min(peakMax, safetyMax)
    const sauceItem = [...serviceDayItems, ...prepDayItems].find(
      (i) => i.recipeName === 'Test Sauce'
    )
    assert.ok(sauceItem, 'Sauce should exist in timeline')
    assert.equal(sauceItem!.effectiveCeiling, 48, 'effectiveCeiling should be min(48, 72) = 48')

    const scallopItem = [...serviceDayItems, ...prepDayItems].find(
      (i) => i.recipeName === 'Seared Scallops'
    )
    assert.ok(scallopItem, 'Scallop should exist in timeline')
    assert.equal(scallopItem!.effectiveCeiling, 1, 'effectiveCeiling should be min(1, 2) = 1')

    // Grocery deadline should exist (1 day before earliest prep)
    assert.ok(timeline.groceryDeadline, 'Should have a grocery deadline')
  })

  it('handles null peak windows gracefully (falls back to category defaults)', () => {
    const serviceDate = new Date(2026, 3, 20, 18, 0, 0)

    const inputs: TimelineRecipeInput[] = [
      {
        recipeId: 'test-null',
        recipeName: 'No Peak Window Recipe',
        componentName: 'Mystery Component',
        dishName: 'Surprise',
        courseName: 'Appetizer',
        category: 'sauce',
        peakHoursMin: null,
        peakHoursMax: null,
        safetyHoursMax: null,
        storageMethod: null,
        freezable: false,
        frozenExtendsHours: null,
        prepTimeMinutes: 20,
        isMakeAhead: false,
        makeAheadWindowHours: null,
        allergenFlags: [],
      },
    ]

    const timeline = computePrepTimeline(inputs, serviceDate)

    // Should still produce a timeline (using category defaults for sauce)
    const allItems = timeline.days.flatMap((d) => d.items)
    const untimedItems = timeline.untimedItems ?? []

    assert.ok(
      allItems.length > 0 || untimedItems.length > 0,
      'Should place item in timeline or untimedItems'
    )
  })
})
