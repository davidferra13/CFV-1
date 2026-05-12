import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDiscoveryHref,
  buildRow2,
  type DiscoveryRailItem,
  type HomepageLocationContext,
} from '../../app/(public)/_components/cuisine-marquee'

const miami: HomepageLocationContext = {
  location: 'Miami, FL',
  lat: 25.7617,
  lng: -80.1918,
}

function params(href: string): URLSearchParams {
  return new URL(href, 'https://chef.test').searchParams
}

test('buildDiscoveryHref sends /chefs routes location, lat, and lng', () => {
  const href = buildDiscoveryHref('/chefs?cuisine=seafood', miami)
  const search = params(href)

  assert.equal(new URL(href, 'https://chef.test').pathname, '/chefs')
  assert.equal(search.get('cuisine'), 'seafood')
  assert.equal(search.get('location'), 'Miami, FL')
  assert.equal(search.get('lat'), '25.7617')
  assert.equal(search.get('lng'), '-80.1918')
  assert.equal(search.get('lon'), null)
})

test('buildDiscoveryHref sends /nearby routes location, lat, and lon', () => {
  const search = params(buildDiscoveryHref('/nearby?q=pizza', miami))

  assert.equal(search.get('q'), 'pizza')
  assert.equal(search.get('location'), 'Miami, FL')
  assert.equal(search.get('lat'), '25.7617')
  assert.equal(search.get('lon'), '-80.1918')
  assert.equal(search.get('lng'), null)
})

test('buildDiscoveryHref sends /eat routes location only', () => {
  const search = params(buildDiscoveryHref('/eat?craving=tacos', miami))

  assert.equal(search.get('craving'), 'tacos')
  assert.equal(search.get('location'), 'Miami, FL')
  assert.equal(search.get('lat'), null)
  assert.equal(search.get('lng'), null)
  assert.equal(search.get('lon'), null)
})

test('buildDiscoveryHref leaves unsupported and blank-location routes unchanged', () => {
  assert.equal(buildDiscoveryHref('/ingredients', miami), '/ingredients')
  assert.equal(
    buildDiscoveryHref('/chefs?serviceType=private_dinner', { ...miami, location: '   ' }),
    '/chefs?serviceType=private_dinner'
  )
})

test('buildRow2 interleaves chef, location, and culinary signal inserts without dropping static items', () => {
  const staticItems: DiscoveryRailItem[] = Array.from({ length: 8 }, (_, i) => ({
    type: 'service',
    label: `Service ${i + 1}`,
    href: `/chefs?serviceType=service_${i + 1}`,
  }))
  const chefs: DiscoveryRailItem[] = [
    { type: 'featured_chef', label: 'Chef One', href: '/chef/one' },
    { type: 'featured_chef', label: 'Chef Two', href: '/chef/two' },
  ]
  const locations: DiscoveryRailItem[] = [
    { type: 'location', label: 'Chefs in Miami', href: '/chefs?location=Miami' },
  ]
  const signals: DiscoveryRailItem[] = [
    { type: 'culinary_signal', label: 'Mango', href: '/ingredients' },
  ]

  const result = buildRow2(staticItems, chefs, locations, signals)

  for (const item of [...staticItems, ...chefs, ...locations, ...signals]) {
    assert.ok(result.includes(item), `${item.label} should be present`)
  }

  assert.ok(result.indexOf(chefs[0]) < result.indexOf(chefs[1]))
  assert.ok(result.indexOf(locations[0]) > result.indexOf(chefs[0]))
})
