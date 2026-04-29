import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { parseFdaRecord, parseWckRecord } = require('../../lib/culinary-radar/adapters/index.ts')
const { normalizeRadarItem } = require('../../lib/culinary-radar/normalize.ts')
const { matchRadarItemToChefContext } = require('../../lib/culinary-radar/match-chef-context.ts')

test('matchRadarItemToChefContext links regulatory items to chef entities and actions', () => {
  const item = normalizeRadarItem(
    parseFdaRecord({
      recall_number: 'F-777-2026',
      title: 'Class I recall for basil pesto with undeclared walnut',
      summary: 'Distributed to food service operators and catering businesses.',
      status: 'Ongoing',
      classification: 'Class I',
      url: 'https://www.fda.gov/safety/recalls/basil-pesto',
      published_at: '2026-04-29T12:00:00Z',
    })
  )

  const match = matchRadarItemToChefContext(item, [
    {
      type: 'ingredient',
      id: 'ing_1',
      label: 'Basil pesto',
      terms: ['basil pesto', 'pesto'],
      href: '/culinary/ingredients',
    },
    {
      type: 'event',
      id: 'evt_1',
      label: 'Thursday tasting',
      terms: ['catering', 'tasting'],
      href: '/events/evt_1',
    },
  ])

  assert.equal(match.matchedEntities.length, 2)
  assert.equal(match.relevanceScore, 100)
  assert.deepEqual(match.recommendedActions, [
    'Check labels, lot numbers, and vendor invoices.',
    'Review affected event menus and prep lists.',
  ])
})

test('matchRadarItemToChefContext keeps broad opportunity items non-urgent without entity matches', () => {
  const item = normalizeRadarItem(
    parseWckRecord({
      slug: 'volunteer-update',
      title: 'Volunteer update for regional relief kitchens',
      description: 'World Central Kitchen shares a general volunteer update.',
      url: 'https://wck.org/news/volunteer-update',
      publishedAt: '2026-04-29T12:00:00Z',
      locations: ['global'],
    })
  )

  const match = matchRadarItemToChefContext(item, [
    {
      type: 'profile',
      id: 'chef_1',
      label: 'Private chef profile',
      terms: ['pastry', 'nutrition'],
    },
  ])

  assert.equal(match.matchedEntities.length, 0)
  assert.equal(match.matchReasons.length, 0)
  assert.deepEqual(match.recommendedActions, [
    'Review opportunity requirements.',
    'Save the deadline as a task if relevant.',
  ])
})
