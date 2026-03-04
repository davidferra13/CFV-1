import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTaxClass,
  resolveCatalogModifierSelections,
  sanitizeManualModifierSelections,
} from '@/lib/commerce/checkout-item-normalization'

describe('commerce checkout item normalization', () => {
  it('normalizes valid tax classes and rejects invalid ones', () => {
    assert.equal(normalizeTaxClass('prepared_food'), 'prepared_food')
    assert.equal(normalizeTaxClass('STANDARD'), 'standard')
    assert.throws(() => normalizeTaxClass('unknown_tax'))
  })

  it('sanitizes manual modifiers and rejects duplicate selections', () => {
    const normalized = sanitizeManualModifierSelections([
      { name: 'Bread', option: 'Wheat', price_delta_cents: 50 },
      { name: 'Cheese', option: 'Swiss', price_delta_cents: 125 },
    ])
    assert.equal(normalized.length, 2)
    assert.deepEqual(normalized[0], {
      name: 'Bread',
      option: 'Wheat',
      price_delta_cents: 50,
    })

    assert.throws(() =>
      sanitizeManualModifierSelections([
        { name: 'Bread', option: 'Wheat', price_delta_cents: 0 },
        { name: 'bread', option: 'wheat', price_delta_cents: 0 },
      ])
    )
  })

  it('validates catalog modifiers and blocks tampered deltas', () => {
    const catalog = [
      {
        name: 'Bread',
        options: [
          { label: 'White', price_delta_cents: 0 },
          { label: 'Wheat', price_delta_cents: 75 },
        ],
      },
      {
        name: 'Cheese',
        options: [
          { label: 'None', price_delta_cents: 0 },
          { label: 'Swiss', price_delta_cents: 125 },
        ],
      },
    ]

    const normalized = resolveCatalogModifierSelections({
      productName: 'Turkey Sandwich',
      catalogModifiers: catalog,
      selections: [
        { name: 'bread', option: 'wheat', price_delta_cents: 75 },
        { name: 'cheese', option: 'swiss', price_delta_cents: 125 },
      ],
    })

    assert.deepEqual(normalized, [
      { name: 'Bread', option: 'Wheat', price_delta_cents: 75 },
      { name: 'Cheese', option: 'Swiss', price_delta_cents: 125 },
    ])

    assert.throws(() =>
      resolveCatalogModifierSelections({
        productName: 'Turkey Sandwich',
        catalogModifiers: catalog,
        selections: [{ name: 'Bread', option: 'Wheat', price_delta_cents: -500 }],
      })
    )
  })
})
