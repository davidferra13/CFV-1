import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  listSourceDefinitions,
  isCulinaryRadarSourceKey,
} = require('../../lib/culinary-radar/source-registry.ts')
const { parseCdcRecord, parseIftRecord } = require('../../lib/culinary-radar/adapters/index.ts')

test('source registry uses database seed keys for every approved source', () => {
  const keys = listSourceDefinitions().map((source: { key: string }) => source.key)

  assert.deepEqual(keys, [
    'fda_recalls',
    'fsis_recalls',
    'cdc_foodborne_outbreaks',
    'wck_opportunities',
    'worldchefs_sustainability',
    'ift_food_science',
  ])
  assert.equal(isCulinaryRadarSourceKey('fda'), false)
  assert.equal(isCulinaryRadarSourceKey('fda_recalls'), true)
})

test('new page-monitor adapters preserve source-backed categories', () => {
  const cdc = parseCdcRecord({
    id: 'cdc-current',
    title: 'Current foodborne outbreak investigations',
    summary: 'CDC current outbreak notices.',
    url: 'https://www.cdc.gov/foodborne-outbreaks/index.html',
    date: '2026-04-29T00:00:00Z',
  })
  const ift = parseIftRecord({
    id: 'ift-news',
    title: 'Food science trends',
    summary: 'IFT publishes innovation and safety material.',
    url: 'https://www.ift.org/news-and-publications',
    date: '2026-04-29T00:00:00Z',
  })

  assert.equal(cdc.sourceKey, 'cdc_foodborne_outbreaks')
  assert.equal(cdc.category, 'safety')
  assert.equal(ift.sourceKey, 'ift_food_science')
  assert.equal(ift.category, 'craft')
})
