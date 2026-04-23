import assert from 'node:assert/strict'
import test from 'node:test'
import {
  scanNationalBrandAuditContent,
  type NationalBrandAuditFinding,
} from '../../lib/site/national-brand-audit'
import {
  NEUTRAL_ADDRESS_PLACEHOLDER,
  NEUTRAL_BOOKING_REQUEST_EXAMPLE,
  NEUTRAL_BOOKING_PAGE_HEADLINE_EXAMPLE,
  NEUTRAL_DIRECTORY_QUERY_EXAMPLE,
  NEUTRAL_LOCATION_PLACEHOLDER,
  NEUTRAL_LOCATION_TAG_PLACEHOLDER,
  NEUTRAL_NEARBY_OG_LOCATION_TOKENS,
  NEUTRAL_NEARBY_QUERY_EXAMPLES,
  NEUTRAL_NETWORK_AVAILABILITY_PLACEHOLDER,
  NEUTRAL_NETWORK_REFERRAL_OFFER_PLACEHOLDER,
  NEUTRAL_NETWORK_REFERRAL_REQUEST_PLACEHOLDER,
  NEUTRAL_NETWORK_URGENT_NEED_PLACEHOLDER,
  NEUTRAL_PAST_EVENTS_CSV_PLACEHOLDER,
  NEUTRAL_PROSPECTING_QUERY_EXAMPLE_COPY,
  NEUTRAL_PROSPECTING_QUERY_PLACEHOLDER,
  NEUTRAL_PROSPECTING_REGION_PLACEHOLDER,
  NEUTRAL_PROSPECT_CSV_PLACEHOLDER,
  NEUTRAL_SERVICE_AREA_PLACEHOLDER,
  NEUTRAL_VENDOR_SEARCH_PLACEHOLDER,
} from '../../lib/site/national-brand-copy'

function findingIds(findings: NationalBrandAuditFinding[]) {
  return findings.map((finding) => finding.ruleId)
}

test('flags forbidden regional-bias terms in live copy', () => {
  const findings = scanNationalBrandAuditContent({
    relativePath: 'app/(public)/nearby/_components/nearby-filters.tsx',
    content: 'const prompt = "Private chefs in Haverhill..."',
  })

  assert.deepEqual(findingIds(findings), ['haverhill'])
})

test('honors the allowlist for legitimate store-coverage config', () => {
  const findings = scanNationalBrandAuditContent({
    relativePath: 'lib/openclaw/region-config.ts',
    content: "label: 'Haverhill / Merrimack Valley, MA'",
  })

  assert.equal(findings.length, 0)
})

test('flags named-city placeholder and example copy on live surfaces', () => {
  const findings = scanNationalBrandAuditContent({
    relativePath: 'components/marketing/home-dual-entry.tsx',
    content: [
      'placeholder="Brooklyn, Miami, Austin, Napa"',
      'placeholder:',
      "  'Open for bookings on March 12-15 in Dallas, TX. Up to 14 guests.'",
      'Type any query like "yacht clubs in San Diego" or "luxury wedding planners in Napa Valley."',
    ].join('\n'),
  })

  assert.deepEqual(findingIds(findings), [
    'named-city-example-copy',
    'named-city-example-copy',
    'named-city-example-copy',
  ])
})

test('ignores parsing comments and non-live geography data', () => {
  const findings = scanNationalBrandAuditContent({
    relativePath: 'lib/ai/directory-search-parser.ts',
    content: [
      '// e.g. "Italian chef for a wedding near Boston under $200/person"',
      '// -> { location: "Boston, MA" }',
      "const states = ['Massachusetts', 'New York']",
    ].join('\n'),
  })

  assert.equal(findings.length, 0)
})

test('shared neutral examples stay clear of forbidden regional terms', () => {
  const findings = scanNationalBrandAuditContent({
    relativePath: 'lib/site/national-brand-copy.ts',
    content: [
      NEUTRAL_ADDRESS_PLACEHOLDER,
      NEUTRAL_LOCATION_PLACEHOLDER,
      NEUTRAL_SERVICE_AREA_PLACEHOLDER,
      NEUTRAL_LOCATION_TAG_PLACEHOLDER,
      NEUTRAL_BOOKING_PAGE_HEADLINE_EXAMPLE,
      NEUTRAL_BOOKING_REQUEST_EXAMPLE,
      NEUTRAL_DIRECTORY_QUERY_EXAMPLE,
      NEUTRAL_VENDOR_SEARCH_PLACEHOLDER,
      NEUTRAL_PROSPECTING_QUERY_PLACEHOLDER,
      NEUTRAL_PROSPECTING_REGION_PLACEHOLDER,
      NEUTRAL_PROSPECTING_QUERY_EXAMPLE_COPY,
      NEUTRAL_PROSPECT_CSV_PLACEHOLDER,
      NEUTRAL_PAST_EVENTS_CSV_PLACEHOLDER,
      NEUTRAL_NETWORK_AVAILABILITY_PLACEHOLDER,
      NEUTRAL_NETWORK_REFERRAL_REQUEST_PLACEHOLDER,
      NEUTRAL_NETWORK_REFERRAL_OFFER_PLACEHOLDER,
      NEUTRAL_NETWORK_URGENT_NEED_PLACEHOLDER,
      ...NEUTRAL_NEARBY_QUERY_EXAMPLES,
      ...NEUTRAL_NEARBY_OG_LOCATION_TOKENS,
    ].join('\n'),
  })

  assert.equal(findings.length, 0)
})
