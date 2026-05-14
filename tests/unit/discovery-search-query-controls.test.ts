import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assembleDiscoveryRailItems,
  evaluateDiscoveryRailSlotPolicy,
  isDiscoveryRailItemOnCooldown,
  normalizeDiscoveryRailCooldownKey,
  resolveDiscoveryRailMotionContract,
  type DiscoveryRailAssemblyItem,
} from '@/lib/discovery/control-rail-contracts'
import {
  applyDiscoverySignalPolicy,
  extractFavoriteDiscoverySignals,
  type DiscoverySignalCandidate,
  type FavoriteDiscoveryEntity,
} from '@/lib/discovery/control-signal-policy'
import {
  parseDiscoveryQuery,
  discoveryQueryToSearchParams,
} from '@/lib/discovery/query-understanding'
import { buildDiscoveryAutocompleteSuggestions } from '@/lib/discovery/search-autocomplete'

test('parseDiscoveryQuery extracts dinner planning filters from freeform text', () => {
  const parsed = parseDiscoveryQuery('birthday dinner for 8 near Brooklyn under 100')
  const params = discoveryQueryToSearchParams(parsed)

  assert.equal(parsed.filters.occasion, 'birthday dinner')
  assert.equal(parsed.filters.partySize, 8)
  assert.equal(parsed.filters.location, 'brooklyn')
  assert.equal(parsed.filters.maxBudgetPerPerson, 100)
  assert.equal(params.get('intent'), 'birthday_dinner')
  assert.equal(params.get('partySize'), '8')
  assert.equal(params.get('location'), 'Brooklyn')
  assert.ok(parsed.confidence >= 0.85)
})

test('autocomplete ranks prefix, alias, recent, and favorite matches across discovery entities', () => {
  const suggestions = buildDiscoveryAutocompleteSuggestions('sush', undefined, {
    favorites: ['Sushi'],
    recent: ['Japanese'],
  })

  assert.equal(suggestions[0].label, 'Sushi')
  assert.equal(suggestions[0].type, 'dish')
  assert.equal(suggestions[0].reason, 'favorite')
  assert.ok(suggestions.some((suggestion) => suggestion.label === 'Japanese'))
  assert.ok(suggestions.every((suggestion) => suggestion.href.startsWith('/')))
})

test('rail assembly suppresses passive cooldown repeats but lets manual shuffle bypass them', () => {
  const items = railItems()
  const cooledKey = normalizeDiscoveryRailCooldownKey(items[0])
  const now = Date.parse('2026-05-13T00:00:00.000Z')

  assert.equal(
    isDiscoveryRailItemOnCooldown(items[0], [{ key: cooledKey, lastSeenAt: now - 60_000 }], now),
    true
  )

  const passive = assembleDiscoveryRailItems(items, {
    now,
    seed: 'passive',
    targetCount: 6,
    impressions: [{ key: cooledKey, lastSeenAt: now - 60_000 }],
  })
  const shuffled = assembleDiscoveryRailItems(items, {
    now,
    seed: 'manual',
    manualShuffle: true,
    impressions: [{ key: cooledKey, lastSeenAt: now - 60_000 }],
  })

  assert.equal(
    passive.some((item) => item.label === items[0].label),
    false
  )
  assert.equal(
    shuffled.some((item) => item.label === items[0].label),
    true
  )
})

test('rail assembly enforces practical ratio, hidden suppression, saved boost, and quiet controls', () => {
  const items = railItems()
  const hiddenKey = normalizeDiscoveryRailCooldownKey(items[1])
  const savedKey = normalizeDiscoveryRailCooldownKey(items[5])
  const assembled = assembleDiscoveryRailItems(items, {
    seed: 'policy',
    hiddenKeys: [hiddenKey],
    savedKeys: [savedKey],
  })
  const report = evaluateDiscoveryRailSlotPolicy(assembled)

  assert.equal(assembled[0].label, items[5].label)
  assert.equal(
    assembled.some((item) => item.label === items[1].label),
    false
  )
  assert.equal(report.passed, true)
  assert.ok(report.practicalRatio >= 0.8)
})

test('motion contracts distinguish flick momentum from dice and lever randomizer controls', () => {
  const flick = resolveDiscoveryRailMotionContract({
    control: 'flick',
    pointerVelocityPxPerMs: 1.2,
  })
  const dice = resolveDiscoveryRailMotionContract({ control: 'dice' })
  const lever = resolveDiscoveryRailMotionContract({ control: 'lever', reducedMotion: true })

  assert.equal(flick.preservesMomentum, true)
  assert.equal(flick.protectsActivation, true)
  assert.equal(dice.rowStopMode, 'staggered')
  assert.equal(dice.shouldResetScrollStart, true)
  assert.equal(lever.animation, 'instant_offset')
  assert.equal(lever.protectsActivation, true)
})

test('favorite signals boost discovery only when favorites mode is active and incognito is off', () => {
  const favorites: FavoriteDiscoveryEntity[] = [
    {
      id: 'fav-restaurant-1',
      type: 'restaurant',
      label: 'Casa Mia',
      cuisines: ['Italian'],
      dishes: ['Pasta'],
      locations: ['Brooklyn'],
    },
  ]
  const candidates: DiscoverySignalCandidate[] = [
    {
      id: 'operator-1',
      type: 'operator',
      label: 'Brooklyn Pasta Counter',
      href: '/nearby/brooklyn-pasta-counter',
      tags: ['Italian', 'Pasta', 'Brooklyn'],
      baseScore: 5,
    },
    {
      id: 'operator-2',
      type: 'operator',
      label: 'Generic Grill',
      href: '/nearby/grill',
      baseScore: 8,
    },
  ]

  const signals = extractFavoriteDiscoverySignals(favorites)
  const boosted = applyDiscoverySignalPolicy(candidates, signals, { favoritesMode: true })
  const incognito = applyDiscoverySignalPolicy(candidates, signals, {
    favoritesMode: true,
    incognito: true,
  })

  assert.ok(signals.some((signal) => signal.type === 'restaurant' && signal.direct))
  assert.equal(boosted[0].id, 'operator-1')
  assert.ok(boosted[0].favoriteSignalWeight > 0)
  assert.equal(incognito[0].favoriteSignalWeight, 0)
  assert.equal(
    incognito.every((candidate) => candidate.influenceAllowed === false),
    true
  )
})

function railItems(): DiscoveryRailAssemblyItem[] {
  return [
    { type: 'cuisine', label: 'Italian', href: '/chefs?cuisine=italian' },
    { type: 'cuisine', label: 'Thai', href: '/chefs?cuisine=thai' },
    { type: 'service', label: 'Private dinner', href: '/chefs?serviceType=private_dinner' },
    { type: 'occasion', label: 'Birthday dinner', href: '/eat?intent=birthday_dinner' },
    { type: 'story', label: 'Culinary news', href: '/eat?story=local', slotKind: 'ambient' },
    { type: 'saved', label: 'Saved chefs', href: '/chefs?saved=1' },
    { type: 'chef_pick', label: 'Chef feature', href: '/chef/nina', slotKind: 'editorial' },
    { type: 'location', label: 'Near Brooklyn', href: '/nearby?location=Brooklyn' },
    { type: 'craving', label: 'Sushi', href: '/eat?craving=sushi' },
    { type: 'group_size', label: 'Dinner for 8', href: '/eat?partySize=8' },
  ]
}
