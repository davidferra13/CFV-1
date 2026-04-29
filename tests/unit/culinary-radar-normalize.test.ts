import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { normalizeRadarItem, normalizeRadarItems } = require('../../lib/culinary-radar/normalize.ts')
const { getSourceDefinition } = require('../../lib/culinary-radar/source-registry.ts')
const {
  parseFdaRecord,
  parseFsisRecord,
  parseWckRecord,
  parseWorldchefsRecord,
} = require('../../lib/culinary-radar/adapters/index.ts')

test('normalizeRadarItem creates stable ids and content hashes from canonical fields', () => {
  const source = getSourceDefinition('fda')
  const base = parseFdaRecord({
    recall_number: 'F-1234-2026',
    title: '  Undeclared Almond in Catering Sauce  ',
    summary: 'Product used by food service operators.',
    status: 'Ongoing',
    classification: 'Class I',
    url: 'https://www.fda.gov/safety/recalls/example',
    published_at: '2026-04-29T12:00:00Z',
    updated_at: '2026-04-29T15:00:00Z',
  })
  const noisy = parseFdaRecord({
    recall_number: ' f-1234-2026 ',
    title: 'Undeclared   almond in catering sauce',
    summary: ' Product used by food service operators. ',
    status: 'ongoing',
    classification: 'class i',
    url: 'https://www.fda.gov/safety/recalls/example?utm_source=test',
    published_at: '2026-04-29T12:00:00.000Z',
    updated_at: '2026-04-29T15:00:00.000Z',
  })

  const first = normalizeRadarItem(base, source)
  const second = normalizeRadarItem(noisy, source)

  assert.equal(first.id, second.id)
  assert.equal(first.contentHash, second.contentHash)
  assert.equal(first.sourceKey, 'fda')
  assert.equal(first.title, 'Undeclared almond in catering sauce')
  assert.equal(first.url, 'https://www.fda.gov/safety/recalls/example')
})

test('normalizeRadarItems parses fixture-like source records and sorts deterministically', () => {
  const records = [
    parseWorldchefsRecord({
      id: 'wc-5',
      headline: 'Worldchefs publishes food safety webinar',
      body: 'Training update for chef educators.',
      link: 'https://worldchefs.org/news/webinar',
      date: '2026-04-20',
      region: 'global',
    }),
    parseFsisRecord({
      recall_id: 'fsis-048-2026',
      title: 'Chicken recall for Listeria risk',
      reason: 'Ready to eat poultry products may be contaminated.',
      classification: 'Class I',
      url: 'https://www.fsis.usda.gov/recalls-alerts/example',
      published_date: '2026-04-28',
      active: true,
    }),
    parseWckRecord({
      slug: 'central-kitchen-flood-response',
      title: 'Central kitchen flood response',
      description: 'Emergency feeding operations need volunteers.',
      publishedAt: '2026-04-27T08:00:00Z',
      url: 'https://wck.org/news/central-kitchen-flood-response',
      locations: ['Kentucky'],
    }),
  ]

  const normalized = normalizeRadarItems(records)

  assert.deepEqual(
    normalized.map((item: { sourceKey: string }) => item.sourceKey),
    ['fsis', 'wck', 'worldchefs']
  )
  assert.equal(normalized[0].severity, 'critical')
  assert.equal(normalized[1].sourceLabel, 'World Central Kitchen')
  assert.equal(normalized[2].sourceAuthority, 'industry')
})
