export const NATIONAL_BRAND_AUDIT_ROOTS = ['app', 'components', 'lib']

export const NATIONAL_BRAND_AUDIT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx'])

export const NATIONAL_BRAND_AUDIT_EXCLUDED_PATHS = [/^lib\/demo\//i]

export const NATIONAL_BRAND_AUDIT_RULES = [
  {
    id: 'haverhill',
    label: 'Haverhill market reference',
    pattern: /\bhaverhill\b/i,
  },
  {
    id: 'merrimack',
    label: 'Merrimack market reference',
    pattern: /\bmerrimack(?:\s+valley)?\b/i,
  },
  {
    id: 'coastal-new-england',
    label: 'Coastal New England reference',
    pattern: /\bcoastal\s+new\s+england\b/i,
  },
  {
    id: 'cape-cod',
    label: 'Cape Cod reference',
    pattern: /\bcape\s+cod\b/i,
  },
  {
    id: 'north-shore',
    label: 'North Shore reference',
    pattern: /\bnorth\s+shore\b/i,
  },
  {
    id: 'new-england',
    label: 'New England regional reference',
    pattern: /\bnew\s+england\b/i,
  },
  {
    id: 'named-city-example-copy',
    label: 'Named-city example copy on a live surface',
    pattern:
      /\b(?:atlanta|austin|boston|brooklyn|chicago|dallas|denver|houston|los\s+angeles|miami|napa(?:\s+valley)?|new\s+york(?:\s+city)?|palm\s+beach|phoenix|portland|san\s+diego|san\s+francisco|santa\s+barbara|scottsdale|seattle)\b/i,
    contextPattern:
      /\b(?:placeholder|helper(?:Text)?|hint|example|e\.g\.|for example|query like|type any query|search by|searches for|looking for|open for bookings|private chef for|urgent: need|location tag|service area)\b/i,
  },
]

export const NATIONAL_BRAND_AUDIT_ALLOWLIST = [
  {
    path: /^lib\/email-references\/deterministic-extractors\.ts$/i,
    ruleIds: ['cape-cod'],
    reason: 'Legitimate inbound-location parsing for real customer text.',
  },
  {
    path: /^lib\/openclaw\/region-config\.ts$/i,
    ruleIds: ['haverhill', 'merrimack'],
    reason: 'Real OpenCLAW store-coverage regions used for market-specific catalog data.',
  },
]
