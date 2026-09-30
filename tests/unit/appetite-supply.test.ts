import { describe, expect, it } from 'vitest'
import { buildAppetiteSupplyCensus } from '@/lib/discovery/appetite-supply'

describe('appetite supply census', () => {
  it('builds a complete census from complete public supply sources', () => {
    const census = buildAppetiteSupplyCensus([
      {
        source: 'chefs',
        status: 'complete',
        totalKnown: 1,
        records: [
          {
            id: 'chef-1',
            sourceType: 'chef',
            texts: ['Thai', 'Gluten-Free', 'Private chef'],
            availabilityWeight: 1,
          },
        ],
      },
      {
        source: 'listings',
        status: 'complete',
        totalKnown: 1,
        records: [
          {
            id: 'listing-1',
            sourceType: 'listing',
            texts: ['Korean', 'Spicy'],
            availabilityWeight: 1,
          },
        ],
      },
    ])

    expect(census.coverage).toBe('complete')
    expect(census.canMeasureGaps).toBe(true)
    expect(census.observedCount).toBe(2)
    expect(census.totalKnown).toBe(2)
    expect(census.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'chef-1',
          sourceType: 'chef',
          tagIds: expect.arrayContaining([
            'food-thai',
            'need-gluten-free',
            'logistics-private-chef',
          ]),
        }),
        expect.objectContaining({
          id: 'listing-1',
          sourceType: 'listing',
          tagIds: expect.arrayContaining(['food-korean', 'taste-spicy']),
        }),
      ])
    )
  })

  it('marks the census capped when any public supply source hits its collection cap', () => {
    const census = buildAppetiteSupplyCensus([
      {
        source: 'chefs',
        status: 'capped',
        totalKnown: null,
        records: [{ id: 'chef-1', sourceType: 'chef', texts: ['Thai'], availabilityWeight: 1 }],
      },
      {
        source: 'listings',
        status: 'complete',
        totalKnown: 1,
        records: [
          { id: 'listing-1', sourceType: 'listing', texts: ['Pizza'], availabilityWeight: 1 },
        ],
      },
    ])

    expect(census.coverage).toBe('capped')
    expect(census.canMeasureGaps).toBe(false)
  })

  it('marks partial coverage when one source fails and keeps surviving observations', () => {
    const census = buildAppetiteSupplyCensus([
      {
        source: 'chefs',
        status: 'failed',
        totalKnown: null,
        records: [],
      },
      {
        source: 'listings',
        status: 'complete',
        totalKnown: 1,
        records: [
          { id: 'listing-1', sourceType: 'listing', texts: ['Mexican'], availabilityWeight: 1 },
        ],
      },
    ])

    expect(census.coverage).toBe('partial')
    expect(census.canMeasureGaps).toBe(false)
    expect(census.observedCount).toBe(1)
  })

  it('marks supply unavailable when every source fails', () => {
    const census = buildAppetiteSupplyCensus([
      { source: 'chefs', status: 'failed', totalKnown: null, records: [] },
      { source: 'listings', status: 'failed', totalKnown: null, records: [] },
    ])

    expect(census.coverage).toBe('unavailable')
    expect(census.canMeasureGaps).toBe(false)
    expect(census.observations).toEqual([])
  })
})
