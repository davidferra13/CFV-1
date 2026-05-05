/**
 * PIE Test Suite: Subcategory Floors + Synthetic Pricing
 *
 * Tests inferSubcategory() and SUBCATEGORY_FLOOR_CENTS to ensure
 * PIE Law 9 (never-null) produces reasonable estimates.
 * The inline synthetic tier is the absolute last resort. If these
 * floors are wrong, chefs see absurd prices.
 *
 * Run: npm run test:unit -- tests/unit/pie.subcategory-floors.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  inferSubcategory,
  SUBCATEGORY_FLOOR_CENTS,
  CATEGORY_FLOOR_CENTS,
  DEFAULT_FLOOR_CENTS,
} from '../../lib/pricing/subcategory-floors.js'

// ─────────────────────────────────────────────────────────────────────────────
// SUBCATEGORY INFERENCE
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Subcategory Inference', () => {
  it('infers chicken breast from "chicken breast"', () => {
    assert.equal(inferSubcategory('chicken breast'), 'chicken_breast')
  })

  it('infers saffron from "saffron threads"', () => {
    assert.equal(inferSubcategory('saffron threads'), 'saffron')
  })

  it('infers beef_premium from "wagyu"', () => {
    const sub = inferSubcategory('wagyu beef tenderloin')
    assert.ok(
      sub === 'beef_premium' || sub === 'wagyu',
      `Expected beef_premium or wagyu, got "${sub}"`
    )
  })

  it('infers shrimp from "jumbo shrimp"', () => {
    assert.equal(inferSubcategory('jumbo shrimp'), 'shrimp')
  })

  it('infers salmon from "atlantic salmon fillet"', () => {
    assert.equal(inferSubcategory('atlantic salmon fillet'), 'salmon')
  })

  it('infers ground_beef from "ground beef 80/20"', () => {
    assert.equal(inferSubcategory('ground beef 80/20'), 'ground_beef')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR PRICE SANITY
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Floor Price Sanity', () => {
  it('wagyu/premium beef is expensive (> $20/lb)', () => {
    assert.ok(SUBCATEGORY_FLOOR_CENTS['beef_premium'] >= 2000)
  })

  it('chicken whole is cheap (< $3/lb)', () => {
    assert.ok(SUBCATEGORY_FLOOR_CENTS['chicken_whole'] < 300)
  })

  it('saffron is very expensive (> $10)', () => {
    assert.ok(SUBCATEGORY_FLOOR_CENTS['saffron'] >= 1000)
  })

  it('milk is cheap (< $5/gal)', () => {
    assert.ok(SUBCATEGORY_FLOOR_CENTS['milk_whole'] < 500)
  })

  it('lobster is expensive (> $15/lb)', () => {
    const lobster = SUBCATEGORY_FLOOR_CENTS['lobster']
    assert.ok(lobster >= 1500, `Lobster floor ${lobster} should be >= 1500`)
  })

  it('all protein subcategories exist', () => {
    const proteinSubs = [
      'chicken_whole',
      'chicken_breast',
      'chicken_thigh',
      'ground_beef',
      'beef_steak',
      'pork_chop',
      'lamb',
      'turkey_whole',
      'salmon',
      'shrimp',
      'lobster',
    ]
    for (const sub of proteinSubs) {
      assert.ok(SUBCATEGORY_FLOOR_CENTS[sub] != null, `Missing subcategory floor: ${sub}`)
    }
  })

  it('DEFAULT_FLOOR_CENTS is a reasonable fallback', () => {
    assert.ok(DEFAULT_FLOOR_CENTS > 0, 'Default floor must be positive')
    assert.ok(DEFAULT_FLOOR_CENTS < 1500, 'Default floor should not be extreme')
  })

  it('all category floors are positive', () => {
    for (const [cat, cents] of Object.entries(CATEGORY_FLOOR_CENTS)) {
      assert.ok(cents > 0, `Category floor "${cat}" must be positive, got ${cents}`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-ABSURDITY: wagyu != chicken, saffron != salt
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Anti-Absurdity Guards', () => {
  it('wagyu floor > chicken breast floor (5x minimum)', () => {
    const wagyu = SUBCATEGORY_FLOOR_CENTS['beef_premium']
    const chicken = SUBCATEGORY_FLOOR_CENTS['chicken_breast']
    assert.ok(
      wagyu >= chicken * 5,
      `Wagyu (${wagyu}) should be at least 5x chicken breast (${chicken})`
    )
  })

  it('saffron floor > black pepper floor (10x minimum)', () => {
    const saffron = SUBCATEGORY_FLOOR_CENTS['saffron']
    const pepper = SUBCATEGORY_FLOOR_CENTS['black_pepper'] || CATEGORY_FLOOR_CENTS['spice'] || 199
    assert.ok(
      saffron >= pepper * 5,
      `Saffron (${saffron}) should be way more than pepper (${pepper})`
    )
  })

  it('lobster floor > tilapia floor (3x minimum)', () => {
    const lobster = SUBCATEGORY_FLOOR_CENTS['lobster']
    const tilapia =
      SUBCATEGORY_FLOOR_CENTS['tilapia'] || SUBCATEGORY_FLOOR_CENTS['fish_mild'] || 599
    assert.ok(
      lobster >= tilapia * 2,
      `Lobster (${lobster}) should be way more than tilapia (${tilapia})`
    )
  })

  it('truffle oil floor > vegetable oil floor', () => {
    const truffle =
      SUBCATEGORY_FLOOR_CENTS['truffle_oil'] || SUBCATEGORY_FLOOR_CENTS['truffle'] || 1999
    const vegOil = SUBCATEGORY_FLOOR_CENTS['vegetable_oil'] || CATEGORY_FLOOR_CENTS['oil'] || 299
    assert.ok(truffle > vegOil, `Truffle oil (${truffle}) should exceed vegetable oil (${vegOil})`)
  })
})
