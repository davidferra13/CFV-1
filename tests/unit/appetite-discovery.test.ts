import { describe, expect, it } from 'vitest'
import {
  appetiteSignalsFromTagIds,
  boostAndFilterByAppetite,
} from '@/lib/discovery/appetite-discovery'

type Card = {
  id: string
  title: string
  subtitle: string | null
  eyebrow: string
  priceLabel: string | null
  dietaryTags: string[]
  serviceModes: string[]
  relevanceScore: number
}

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    title: id,
    subtitle: null,
    eyebrow: 'Private Chef',
    priceLabel: null,
    dietaryTags: [],
    serviceModes: [],
    relevanceScore: 10,
    ...overrides,
  }
}
describe('appetite discovery adapter', () => {
  it('turns explicit need tags into hard constraints', () => {
    expect(appetiteSignalsFromTagIds(['need-vegan', 'taste-spicy'])).toEqual([
      expect.objectContaining({ tagId: 'need-vegan', hardness: 'hard' }),
      expect.objectContaining({ tagId: 'taste-spicy', hardness: 'soft' }),
    ])
  })

  it('removes cards that miss a direct need constraint', () => {
    const results = boostAndFilterByAppetite(
      [card('vegan', { dietaryTags: ['Vegan'] }), card('steak', { title: 'Steak dinner' })],
      ['need-vegan']
    )

    expect(results.map((result) => result.id)).toEqual(['vegan'])
  })

  it('keeps all cards for soft appetite tags and boosts matching cards', () => {
    const results = boostAndFilterByAppetite(
      [card('plain'), card('spicy', { title: 'Spicy noodles' })],
      ['taste-spicy']
    )

    expect(results).toHaveLength(2)
    expect(results.find((result) => result.id === 'spicy')?.relevanceScore).toBeGreaterThan(10)
  })
  it('ignores unknown appetite tags without changing the feed', () => {
    const cards = [card('one'), card('two')]

    expect(boostAndFilterByAppetite(cards, ['not-a-real-tag'])).toEqual(cards)
  })
})
