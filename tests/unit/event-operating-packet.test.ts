import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPieCartPlan } from '@/lib/chef-ops/pie-cart'
import {
  buildEventOperatingPacket,
  shapeEventOperatingPacketForAudience,
} from '@/lib/god-mode/event-operating-packet'
import { evaluateApprovalGate } from '@/lib/god-mode/approval-gates'
import { noBlankState } from '@/lib/god-mode/no-blank-policy'
import { buildQuoteTruth } from '@/lib/god-mode/quote-truth'

describe('event operating packet', () => {
  it('combines PIE Cart, quote truth, safety, and automation into readiness', () => {
    const pieCart = buildPieCartPlan(
      [
        {
          ingredientName: 'Chicken',
          requiredQuantity: 20,
          unit: 'lb',
          unitPriceCents: 499,
          confidence: 0.86,
          resolutionTier: 'regional',
          freshness: 'current',
        },
      ],
      'snapshot_plan'
    )
    const packet = buildEventOperatingPacket({
      eventId: 'event-1',
      tenantId: 'tenant-1',
      title: 'Dinner',
      pieCart,
      quote: {
        quotedTotalCents: 300000,
        projectedCostCents: pieCart.totalCents,
        targetMarginPercent: 50,
      },
      safety: { allergyConfirmed: true, dietaryUnknownCount: 0 },
      automation: { drafted: 0, failed: 0, scheduled: 2, needsApproval: 0 },
    })

    assert.equal(packet.readiness, 'ready')
    assert.equal(packet.procurement.ready, true)
    assert.equal(packet.money.marginProtected, true)
  })

  it('shapes client-safe packets without quote facts', () => {
    const packet = buildEventOperatingPacket({
      eventId: 'event-1',
      tenantId: 'tenant-1',
      title: 'Dinner',
      safety: { allergyConfirmed: false, dietaryUnknownCount: 1 },
    })
    const clientPacket = shapeEventOperatingPacketForAudience(packet, 'client')

    assert.equal('money' in clientPacket, false)
    assert.deepEqual(clientPacket.missingFacts, ['pie_cart_missing'])
  })

  it('evaluates no-blank states, quote truth, and approval gates', () => {
    assert.deepEqual(noBlankState('price', null), {
      fact: 'price',
      status: 'fallback',
      valueLabel: 'Estimated fallback required',
      action: 'use_pie_fallback_and_review_confidence',
    })

    const quoteTruth = buildQuoteTruth({
      quotedTotalCents: 100000,
      projectedFoodCostCents: 45000,
      targetMarginPercent: 60,
      pieConfidence: 0.5,
    })
    assert.equal(quoteTruth.protectsMargin, false)
    assert.deepEqual(quoteTruth.warnings, ['target_margin_not_protected', 'low_pie_confidence'])

    assert.equal(
      evaluateApprovalGate({ kind: 'allergy_conflict', severity: 'critical' }).blocked,
      true
    )
  })
})
