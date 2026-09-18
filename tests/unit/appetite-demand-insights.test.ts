import { describe, expect, it } from 'vitest'
import { buildAppetiteDemandPanelModel } from '@/lib/analytics/appetite-demand'
import type { AppetiteMarketSnapshot } from '@/lib/discovery/appetite-engine'

const snapshot: AppetiteMarketSnapshot = {
  demand: [
    { tagId: 'food-thai', score: 5, evidenceCount: 9 },
    { tagId: 'feel-crispy', score: 3, evidenceCount: 4 },
    { tagId: 'taste-spicy', score: 2, evidenceCount: 2 },
    { tagId: 'food-pizza', score: -1, evidenceCount: 2 },
  ],
  bundleDemand: [
    { tagIds: ['food-thai', 'feel-crispy'], score: 4, evidenceCount: 5 },
    { tagIds: ['food-thai', 'taste-spicy'], score: 2, evidenceCount: 1 },
  ],
  marketGaps: [],
  bundleMarketGaps: [],
}

describe('appetite demand analytics', () => {
  it('turns positive aggregate demand into decision-ready operator signals', () => {
    const model = buildAppetiteDemandPanelModel(snapshot)

    expect(model.hasDemand).toBe(true)
    expect(model.topSignals[0]).toEqual(
      expect.objectContaining({
        tagId: 'food-thai',
        label: 'Thai',
        domain: 'food',
        confidence: 'strong',
      })
    )
    expect(model.topSignals.some((item) => item.tagId === 'food-pizza')).toBe(false)
    expect(model.topSignals[0].href).toContain('/eat?appetite=food-thai')
  })

  it('keeps compound demand intact instead of flattening it into tags', () => {
    const model = buildAppetiteDemandPanelModel(snapshot)

    expect(model.topBundles[0]).toEqual(
      expect.objectContaining({
        tagIds: ['food-thai', 'feel-crispy'],
        label: 'Thai + Crispy',
        confidence: 'growing',
      })
    )
    expect(model.topBundles[0].href).toContain('food-thai%2Cfeel-crispy')
  })

  it('labels sparse evidence honestly as early rather than overstating confidence', () => {
    const model = buildAppetiteDemandPanelModel({
      ...snapshot,
      demand: [{ tagId: 'food-korean', score: 1.4, evidenceCount: 1 }],
      bundleDemand: [],
    })

    expect(model.topSignals[0]).toEqual(
      expect.objectContaining({ tagId: 'food-korean', confidence: 'early' })
    )
  })
})
