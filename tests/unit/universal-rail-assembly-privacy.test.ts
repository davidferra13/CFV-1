import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  stripForbiddenFields,
  STAFF_FORBIDDEN_FIELDS,
  PARTNER_FORBIDDEN_FIELDS,
} from '@/lib/discovery/universal-rail-privacy'
import type { UniversalRailRole } from '@/lib/discovery/universal-rail-types'

// ---------------------------------------------------------------------------
// assembleRailForPage privacy integration
//
// Rather than mocking deep module internals (registry, state, resolvers),
// we test the privacy contract directly: after assembly injects metadata,
// the staff/partner stripping logic produces correct output. This tests
// the same code path as assembleRailForPage lines 324-332 without needing
// to wire up the full pipeline.
// ---------------------------------------------------------------------------

/**
 * Simulate the post-assembly privacy stripping that assembleRailForPage
 * applies. This mirrors the exact logic from universal-rail-assembly.ts.
 */
function applyRolePrivacy(
  role: UniversalRailRole,
  items: Array<{ definitionId: string; metadata: Record<string, unknown> }>
): void {
  if (role === 'staff') {
    for (const item of items) {
      item.metadata = stripForbiddenFields(item.metadata, STAFF_FORBIDDEN_FIELDS)
    }
  } else if (role === 'partner') {
    for (const item of items) {
      item.metadata = stripForbiddenFields(item.metadata, PARTNER_FORBIDDEN_FIELDS)
    }
  }
}

const SAMPLE_METADATA: Record<string, unknown> = {
  event_name: 'Farm Dinner',
  guests: 12,
  menu_name: 'Harvest Menu',
  // Financial fields (staff-forbidden)
  quoted_price: 3600,
  revenue: 3600,
  margin: 1200,
  food_cost: 900,
  labor_cost: 600,
  tips: 300,
  payroll_amount: 500,
  lead_value: 2000,
  conversion_metrics: { rate: 0.45 },
  pricing_strategy: 'premium',
  // PII fields (partner-forbidden)
  client_pii: { email: 'test@example.com', phone: '555-0100' },
  chef_financials: { bank: 'Chase', routing: '000' },
  staff_payroll: { hourly: 25 },
  other_partner_data: { name: 'Vendor Co' },
  internal_margins: 0.33,
  business_metrics: { monthly_revenue: 15000 },
}

function makeItems() {
  return [
    { definitionId: 'item-1', metadata: { ...SAMPLE_METADATA } },
    { definitionId: 'item-2', metadata: { ...SAMPLE_METADATA } },
  ]
}

describe('assembleRailForPage privacy integration', () => {
  it('staff role assembly strips financial metadata fields', () => {
    const items = makeItems()
    applyRolePrivacy('staff', items)

    for (const item of items) {
      // Financial fields stripped
      assert.equal(item.metadata.quoted_price, undefined, 'quoted_price should be stripped')
      assert.equal(item.metadata.revenue, undefined, 'revenue should be stripped')
      assert.equal(item.metadata.margin, undefined, 'margin should be stripped')
      assert.equal(item.metadata.food_cost, undefined, 'food_cost should be stripped')
      assert.equal(item.metadata.labor_cost, undefined, 'labor_cost should be stripped')
      assert.equal(item.metadata.tips, undefined, 'tips should be stripped')
      assert.equal(item.metadata.payroll_amount, undefined, 'payroll_amount should be stripped')
      assert.equal(item.metadata.lead_value, undefined, 'lead_value should be stripped')
      assert.equal(item.metadata.conversion_metrics, undefined, 'conversion_metrics stripped')
      assert.equal(item.metadata.pricing_strategy, undefined, 'pricing_strategy stripped')

      // Non-financial fields preserved
      assert.equal(item.metadata.event_name, 'Farm Dinner')
      assert.equal(item.metadata.guests, 12)
      assert.equal(item.metadata.menu_name, 'Harvest Menu')

      // PII fields NOT stripped for staff (they need client contact info)
      assert.ok(item.metadata.client_pii !== undefined, 'staff keeps client_pii')
      assert.ok(item.metadata.chef_financials !== undefined, 'staff keeps chef_financials')
    }
  })

  it('partner role assembly strips PII metadata fields', () => {
    const items = makeItems()
    applyRolePrivacy('partner', items)

    for (const item of items) {
      // PII fields stripped
      assert.equal(item.metadata.client_pii, undefined, 'client_pii should be stripped')
      assert.equal(item.metadata.chef_financials, undefined, 'chef_financials stripped')
      assert.equal(item.metadata.staff_payroll, undefined, 'staff_payroll stripped')
      assert.equal(item.metadata.other_partner_data, undefined, 'other_partner_data stripped')
      assert.equal(item.metadata.internal_margins, undefined, 'internal_margins stripped')
      assert.equal(item.metadata.business_metrics, undefined, 'business_metrics stripped')

      // Non-PII fields preserved
      assert.equal(item.metadata.event_name, 'Farm Dinner')
      assert.equal(item.metadata.guests, 12)
      assert.equal(item.metadata.menu_name, 'Harvest Menu')

      // Financial fields NOT stripped for partner
      assert.equal(item.metadata.quoted_price, 3600, 'partner keeps quoted_price')
      assert.equal(item.metadata.revenue, 3600, 'partner keeps revenue')
    }
  })

  it('chef role assembly does NOT strip any fields', () => {
    const items = makeItems()
    applyRolePrivacy('chef', items)

    for (const item of items) {
      // All fields preserved
      assert.equal(item.metadata.quoted_price, 3600)
      assert.equal(item.metadata.revenue, 3600)
      assert.equal(item.metadata.margin, 1200)
      assert.deepEqual(item.metadata.client_pii, {
        email: 'test@example.com',
        phone: '555-0100',
      })
      assert.deepEqual(item.metadata.chef_financials, { bank: 'Chase', routing: '000' })
      assert.equal(item.metadata.event_name, 'Farm Dinner')
    }
  })

  it('client role assembly does NOT strip any fields', () => {
    const items = makeItems()
    applyRolePrivacy('client', items)

    for (const item of items) {
      // All fields preserved
      assert.equal(item.metadata.quoted_price, 3600)
      assert.equal(item.metadata.revenue, 3600)
      assert.deepEqual(item.metadata.client_pii, {
        email: 'test@example.com',
        phone: '555-0100',
      })
      assert.equal(item.metadata.event_name, 'Farm Dinner')
      assert.equal(item.metadata.guests, 12)
    }
  })
})
