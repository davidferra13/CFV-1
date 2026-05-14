import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveCardVariant } from '@/components/discovery/discovery-card'
import type {
  DiscoveryRailItem,
  HomepageDiscoveryLane,
} from '@/lib/discovery/homepage-discovery-rail'

function makeItem(type: DiscoveryRailItem['type']): Pick<DiscoveryRailItem, 'type'> {
  return { type }
}

test('resolveCardVariant: cuisine in taste lane => food_photo', () => {
  assert.equal(resolveCardVariant(makeItem('cuisine'), 'taste'), 'food_photo')
})

test('resolveCardVariant: craving in taste lane => food_photo', () => {
  assert.equal(resolveCardVariant(makeItem('craving'), 'taste'), 'food_photo')
})

test('resolveCardVariant: occasion in occasion lane => abstract', () => {
  assert.equal(resolveCardVariant(makeItem('occasion'), 'occasion'), 'abstract')
})

test('resolveCardVariant: service in occasion lane => abstract', () => {
  assert.equal(resolveCardVariant(makeItem('service'), 'occasion'), 'abstract')
})

test('resolveCardVariant: featured_chef in chefflow_picks => proof', () => {
  assert.equal(resolveCardVariant(makeItem('featured_chef'), 'chefflow_picks'), 'proof')
})

test('resolveCardVariant: chef_pick in chefflow_picks => food_photo (no proof data)', () => {
  assert.equal(resolveCardVariant(makeItem('chef_pick'), 'chefflow_picks'), 'food_photo')
})

test('resolveCardVariant: technique in taste lane => food_photo (default)', () => {
  assert.equal(resolveCardVariant(makeItem('technique'), 'taste'), 'food_photo')
})

test('resolveCardVariant: circle in occasion lane => abstract (default)', () => {
  assert.equal(resolveCardVariant(makeItem('circle'), 'occasion'), 'abstract')
})
