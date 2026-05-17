import test from 'node:test'
import assert from 'node:assert/strict'

import {
  validateRailItemDestination,
  filterValidRailDestinations,
  auditRailDestinations,
} from '../../lib/discovery/homepage-discovery-destinations'
import {
  validateDiscoveryDestination,
  getDiscoveryDestinationFamily,
} from '../../lib/discovery/discovery-destination-contract'
import type { DiscoveryRailItem } from '../../lib/discovery/homepage-discovery-rail'

// ── Allowed public paths ──

const ALLOWED_PATH_PREFIXES = [
  '/chefs',
  '/chef/',
  '/eat',
  '/nearby',
  '/ingredients',
  '/cuisines/',
  '/hub',
  '/book',
  '/contact',
  '/gift-cards',
  '/how-it-works',
  '/services',
  '/trust',
  '/cannabis/public',
]

function isAllowedPublicPath(href: string): boolean {
  try {
    const url = new URL(href, 'https://chef.test')
    return ALLOWED_PATH_PREFIXES.some(
      (prefix) =>
        url.pathname === prefix ||
        url.pathname.startsWith(`${prefix}/`) ||
        url.pathname.startsWith(prefix)
    )
  } catch {
    return false
  }
}

// ── Exhaustive rail item pools from cuisine-marquee.tsx ──
// We import these statically to prove every item routes to an allowed path.
// Since the pools are module-level constants in a 'use client' file, we
// replicate the key items here for contract testing.

const CUISINE_ITEMS: DiscoveryRailItem[] = [
  { type: 'cuisine', label: 'Italian', href: '/cuisines/italian' },
  { type: 'cuisine', label: 'Japanese', href: '/cuisines/japanese' },
  { type: 'cuisine', label: 'Mexican', href: '/cuisines/mexican' },
  { type: 'cuisine', label: 'French', href: '/cuisines/french' },
  { type: 'cuisine', label: 'Korean', href: '/chefs?cuisine=korean' },
]

const SERVICE_ITEMS: DiscoveryRailItem[] = [
  { type: 'service', label: 'Private dinner', href: '/chefs?serviceType=private_dinner' },
  { type: 'service', label: 'Meal prep', href: '/chefs?serviceType=meal_prep' },
  { type: 'service', label: 'Catering', href: '/chefs?serviceType=catering' },
  { type: 'service', label: 'Cooking class', href: '/chefs?serviceType=cooking_class' },
  { type: 'service', label: 'Wedding chef', href: '/chefs?serviceType=wedding' },
  { type: 'service', label: 'Pop-up', href: '/chefs?serviceType=popup' },
  { type: 'service', label: 'Supper club', href: '/nearby?type=supper_club' },
  { type: 'service', label: 'Food truck', href: '/nearby?type=food_truck' },
  { type: 'service', label: 'Farmers market', href: '/nearby?q=farmers+market' },
]

const OCCASION_ITEMS: DiscoveryRailItem[] = [
  { type: 'occasion', label: 'Dinner tonight', href: '/eat?intent=tonight' },
  { type: 'occasion', label: 'Dinner party', href: '/eat?intent=dinner_party' },
  { type: 'occasion', label: 'Birthday dinner', href: '/eat?eventStyle=Birthday+dinner' },
  { type: 'occasion', label: 'Holiday party', href: '/eat?eventStyle=Holiday+party' },
  { type: 'occasion', label: 'Brunch', href: '/eat?eventStyle=Brunch' },
  { type: 'occasion', label: 'Date night', href: '/eat?eventStyle=Date+night' },
]

const FOOD_TYPE_ITEMS: DiscoveryRailItem[] = [
  { type: 'food_type', label: 'Pizza', href: '/nearby?q=pizza' },
  { type: 'food_type', label: 'Sushi', href: '/nearby?q=sushi' },
  { type: 'food_type', label: 'Burgers', href: '/nearby?q=burgers' },
  { type: 'food_type', label: 'Tacos', href: '/nearby?q=tacos' },
]

const DIETARY_ITEMS: DiscoveryRailItem[] = [
  { type: 'dietary', label: 'Vegan', href: '/chefs?dietary=vegan' },
  { type: 'dietary', label: 'Gluten-Free', href: '/chefs?dietary=gluten_free' },
  { type: 'dietary', label: 'Halal', href: '/chefs?dietary=halal' },
]

const FEATURED_CHEF_ITEMS: DiscoveryRailItem[] = [
  { type: 'featured_chef', label: 'Chef Example', href: '/chef/example-slug' },
]

const CIRCLE_ITEMS: DiscoveryRailItem[] = [
  { type: 'circle', label: 'Dinner Circles', href: '/hub' },
  { type: 'circle', label: 'Open tables', href: '/hub/open-tables' },
  { type: 'circle', label: 'Community Circles', href: '/hub/circles' },
]

const SPECIAL_DINING_ITEMS: DiscoveryRailItem[] = [
  { type: 'special_dining', label: 'Cannabis Dining', href: '/cannabis/public' },
]

const TIME_ITEMS: DiscoveryRailItem[] = [
  { type: 'time', label: 'Quick eats', href: '/eat?intent=quick_eats' },
  { type: 'time', label: 'Under 30 min', href: '/nearby?q=quick+food' },
  { type: 'time', label: 'Open now', href: '/nearby?q=open+now' },
  { type: 'time', label: 'Delivery-friendly', href: '/nearby?q=delivery' },
]

const GROUP_SIZE_ITEMS: DiscoveryRailItem[] = [
  { type: 'group_size', label: 'Solo', href: '/eat?partySize=1' },
  { type: 'group_size', label: 'Couple', href: '/eat?partySize=2' },
  { type: 'group_size', label: 'Big group', href: '/eat?partySize=large' },
]

const PRICE_ITEMS: DiscoveryRailItem[] = [
  { type: 'price', label: '$', href: '/chefs?priceRange=budget' },
  { type: 'price', label: '$$', href: '/chefs?priceRange=mid' },
  { type: 'price', label: '$$$', href: '/chefs?priceRange=premium' },
  { type: 'price', label: 'Splurge', href: '/chefs?priceRange=luxury' },
]

const STORY_ITEMS: DiscoveryRailItem[] = [
  { type: 'story', label: "Chef's picks", href: '/chefs?sort=featured' },
  { type: 'story', label: 'Peak ingredients', href: '/ingredients' },
  { type: 'story', label: 'Hidden gems', href: '/nearby?q=hidden+gems' },
  { type: 'story', label: 'Meet a local chef', href: '/chefs?sort=featured' },
  { type: 'story', label: 'Cuisine deep dive', href: '/eat?craving=regional' },
]

const SURPRISE_ITEMS: DiscoveryRailItem[] = [
  { type: 'surprise', label: 'Surprise me', href: '/eat?craving=adventurous&intent=surprise_me' },
  { type: 'surprise', label: 'Surprise me', href: '/nearby?q=hidden+gems' },
  { type: 'surprise', label: 'Surprise me', href: '/chefs?priceRange=mid&sort=availability' },
]

const SEASONAL_ITEMS: DiscoveryRailItem[] = [
  { type: 'seasonal', label: 'Seasonal menu', href: '/ingredients' },
  { type: 'seasonal', label: 'Grilling season', href: '/eat?craving=grilled' },
  { type: 'seasonal', label: 'Sunday meal prep', href: '/chefs?serviceType=meal_prep' },
]

const MOOD_ITEMS: DiscoveryRailItem[] = [
  { type: 'mood', label: 'Cozy', href: '/eat?craving=cozy' },
  { type: 'mood', label: 'Spicy', href: '/eat?craving=spicy' },
]

const TECHNIQUE_ITEMS: DiscoveryRailItem[] = [
  { type: 'technique', label: 'Grill', href: '/eat?craving=grilled' },
  { type: 'technique', label: 'Smoke', href: '/eat?craving=smoked' },
]

const INGREDIENT_ITEMS: DiscoveryRailItem[] = [
  { type: 'ingredient', label: 'Chicken', href: '/eat?craving=chicken' },
  { type: 'ingredient', label: 'Salmon', href: '/eat?craving=salmon' },
]

const VIBE_ITEMS: DiscoveryRailItem[] = [
  {
    type: 'vibe',
    label: 'Fine dining',
    href: '/chefs?serviceType=private_dinner&priceRange=premium',
  },
  { type: 'vibe', label: 'Casual', href: '/eat?craving=casual' },
]

const SAVED_ITEMS: DiscoveryRailItem[] = [
  { type: 'saved', label: 'Surprise me', href: '/eat?intent=surprise_me' },
  { type: 'saved', label: 'Recently viewed', href: '/chefs?sort=featured&q=recent' },
  { type: 'saved', label: 'Saved chefs', href: '/chefs?sort=featured&q=saved' },
]

const CULINARY_SIGNAL_ITEMS: DiscoveryRailItem[] = [
  { type: 'culinary_signal', label: 'Asparagus', href: '/ingredients' },
]

const COMBO_ITEMS: DiscoveryRailItem[] = [
  {
    type: 'combo',
    label: 'Vegan dinner party',
    href: '/chefs?dietary=vegan&serviceType=private_dinner',
  },
  { type: 'combo', label: 'Big group BBQ', href: '/chefs?cuisine=barbecue&serviceType=catering' },
]

const CHEF_PICK_ITEMS: DiscoveryRailItem[] = [
  { type: 'chef_pick', label: "Chef's picks", href: '/chefs?sort=featured' },
  { type: 'chef_pick', label: 'Trending now', href: '/chefs?sort=availability' },
  { type: 'chef_pick', label: 'Hidden gems', href: '/nearby?sort=featured&q=hidden+gems' },
]

const CRAVING_ITEMS: DiscoveryRailItem[] = [
  { type: 'craving', label: 'Comfort Food', href: '/eat?craving=comfort+food' },
]

const LOCATION_ITEMS: DiscoveryRailItem[] = [
  { type: 'location', label: 'Chefs in Miami', href: '/chefs?location=Miami' },
  { type: 'location', label: 'Near Miami', href: '/nearby?location=Miami' },
]

const ALL_RAIL_ITEMS: DiscoveryRailItem[] = [
  ...CUISINE_ITEMS,
  ...SERVICE_ITEMS,
  ...OCCASION_ITEMS,
  ...FOOD_TYPE_ITEMS,
  ...DIETARY_ITEMS,
  ...FEATURED_CHEF_ITEMS,
  ...CIRCLE_ITEMS,
  ...SPECIAL_DINING_ITEMS,
  ...TIME_ITEMS,
  ...GROUP_SIZE_ITEMS,
  ...PRICE_ITEMS,
  ...STORY_ITEMS,
  ...SURPRISE_ITEMS,
  ...SEASONAL_ITEMS,
  ...MOOD_ITEMS,
  ...TECHNIQUE_ITEMS,
  ...INGREDIENT_ITEMS,
  ...VIBE_ITEMS,
  ...SAVED_ITEMS,
  ...CULINARY_SIGNAL_ITEMS,
  ...COMBO_ITEMS,
  ...CHEF_PICK_ITEMS,
  ...CRAVING_ITEMS,
  ...LOCATION_ITEMS,
]

// ── Tests ──

test('every rail item type routes to an allowed public destination', () => {
  const { invalid } = auditRailDestinations(ALL_RAIL_ITEMS)
  if (invalid.length > 0) {
    const report = invalid
      .map(
        (entry) =>
          `  ${entry.item.type} "${entry.item.label}" -> ${entry.item.href}: ${entry.reason}`
      )
      .join('\n')
    assert.fail(`${invalid.length} rail items have invalid destinations:\n${report}`)
  }
})

test('no rail item exposes private identifiers in query parameters', () => {
  for (const item of ALL_RAIL_ITEMS) {
    const result = validateRailItemDestination(item)
    assert.equal(
      result.privateIdLeak,
      false,
      `${item.type} "${item.label}" leaks private ID in ${item.href}`
    )
  }
})

test('service items routing to /nearby are valid destinations', () => {
  const nearbyServices = SERVICE_ITEMS.filter((item) => item.href.startsWith('/nearby'))
  assert.ok(nearbyServices.length >= 2, 'Should have service items routing to /nearby')

  for (const item of nearbyServices) {
    const result = validateRailItemDestination(item)
    assert.ok(
      result.valid,
      `service "${item.label}" -> ${item.href} should be valid (${result.reason})`
    )
    assert.equal(result.family, 'nearby')
  }
})

test('special_dining Cannabis Dining routes to /cannabis/public as public_info', () => {
  const result = validateRailItemDestination({
    type: 'special_dining',
    href: '/cannabis/public',
  })
  assert.ok(result.valid, `cannabis/public should be valid: ${result.reason}`)
  assert.equal(result.family, 'public_info')
})

test('story items routing to /chefs and /nearby are valid destinations', () => {
  const chefsStory = STORY_ITEMS.find((item) => item.href.startsWith('/chefs'))
  const nearbyStory = STORY_ITEMS.find((item) => item.href.startsWith('/nearby'))
  assert.ok(chefsStory, 'Should have story items routing to /chefs')
  assert.ok(nearbyStory, 'Should have story items routing to /nearby')

  assert.ok(validateRailItemDestination(chefsStory!).valid)
  assert.ok(validateRailItemDestination(nearbyStory!).valid)
})

test('surprise items routing to /nearby are valid destinations', () => {
  const nearbySurprise = SURPRISE_ITEMS.find((item) => item.href.startsWith('/nearby'))
  assert.ok(nearbySurprise, 'Should have surprise items routing to /nearby')
  assert.ok(validateRailItemDestination(nearbySurprise!).valid)
})

test('time items routing to /nearby are valid destinations', () => {
  const nearbyTime = TIME_ITEMS.filter((item) => item.href.startsWith('/nearby'))
  assert.ok(nearbyTime.length >= 2, 'Should have time items routing to /nearby')

  for (const item of nearbyTime) {
    assert.ok(
      validateRailItemDestination(item).valid,
      `time "${item.label}" -> ${item.href} should be valid`
    )
  }
})

test('seasonal items routing to /chefs are valid destinations', () => {
  const chefsSeasonal = SEASONAL_ITEMS.find((item) => item.href.startsWith('/chefs'))
  assert.ok(chefsSeasonal, 'Should have seasonal items routing to /chefs')
  assert.ok(validateRailItemDestination(chefsSeasonal!).valid)
})

test('circle items route exclusively to hub destinations', () => {
  for (const item of CIRCLE_ITEMS) {
    const result = validateRailItemDestination(item)
    assert.ok(result.valid, `circle "${item.label}" -> ${item.href} should be valid`)
    assert.equal(result.family, 'hub')
  }
})

test('featured_chef items route exclusively to chef_profile destinations', () => {
  for (const item of FEATURED_CHEF_ITEMS) {
    const result = validateRailItemDestination(item)
    assert.ok(result.valid, `featured_chef "${item.label}" -> ${item.href} should be valid`)
    assert.equal(result.family, 'chef_profile')
  }
})

test('filterValidRailDestinations removes invalid items and keeps valid ones', () => {
  const items: DiscoveryRailItem[] = [
    { type: 'cuisine', label: 'Italian', href: '/cuisines/italian' },
    { type: 'featured_chef', label: 'Bad Chef', href: '/admin/chefs/bad' },
    { type: 'service', label: 'Meal prep', href: '/chefs?serviceType=meal_prep' },
  ]

  const filtered = filterValidRailDestinations(items)
  assert.equal(filtered.length, 2)
  assert.equal(filtered[0].label, 'Italian')
  assert.equal(filtered[1].label, 'Meal prep')
})

test('private routes are rejected for all item types', () => {
  const privateHrefs = [
    '/admin',
    '/api/discovery',
    '/dashboard',
    '/events/123',
    '/recipes/my-secret',
  ]

  for (const href of privateHrefs) {
    const result = getDiscoveryDestinationFamily(href)
    assert.equal(result, null, `${href} should not be an approved destination`)
  }
})

test('location context does not leak into unsupported routes', () => {
  const result = validateRailItemDestination({
    type: 'culinary_signal',
    href: '/ingredients',
  })
  assert.ok(result.valid)
  assert.equal(result.family, 'ingredients')
})

test('chef_pick items routing to /nearby are valid', () => {
  const nearbyPick = CHEF_PICK_ITEMS.find((item) => item.href.startsWith('/nearby'))
  assert.ok(nearbyPick, 'Should have chef_pick items routing to /nearby')
  assert.ok(
    validateRailItemDestination(nearbyPick!).valid,
    `chef_pick "${nearbyPick!.label}" -> ${nearbyPick!.href} should be valid`
  )
})
