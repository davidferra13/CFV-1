const STATE_CODE_TO_NAME: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
  PR: 'Puerto Rico',
  VI: 'U.S. Virgin Islands',
  GU: 'Guam',
  MP: 'Northern Mariana Islands',
  AS: 'American Samoa',
}

const STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(STATE_CODE_TO_NAME).map(([code, name]) => [name.toLowerCase(), code])
)

type AddressParts = {
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part.trim() || part === '-') return part
      if (part.length <= 2) return part.toUpperCase()
      return `${part[0].toUpperCase()}${part.slice(1)}`
    })
    .join('')
}

export function normalizeStateCode(value?: string | null): string | null {
  if (!value) return null

  const trimmed = normalizeWhitespace(value).replace(/\./g, '')
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  if (STATE_CODE_TO_NAME[upper]) return upper

  return STATE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null
}

export function normalizeStateLabel(value?: string | null): string | null {
  const code = normalizeStateCode(value)
  if (code) return STATE_CODE_TO_NAME[code]
  if (!value) return null
  return titleCase(normalizeWhitespace(value))
}

export function normalizeCity(value?: string | null): string | null {
  if (!value) return null
  const trimmed = normalizeWhitespace(value)
  if (!trimmed) return null
  return titleCase(trimmed)
}

export function normalizeZip(value?: string | null): string | null {
  if (!value) return null
  const trimmed = normalizeWhitespace(value)
  if (!trimmed) return null
  const digits = trimmed.replace(/[^\d-]/g, '')
  return digits || null
}

export function normalizeStreetAddress(value?: string | null): string | null {
  if (!value) return null
  const trimmed = normalizeWhitespace(value)
  return trimmed || null
}

export function normalizeUsAddressParts(parts: AddressParts) {
  const stateCode = normalizeStateCode(parts.state)

  return {
    address: normalizeStreetAddress(parts.address),
    city: normalizeCity(parts.city),
    stateCode,
    stateName: stateCode ? STATE_CODE_TO_NAME[stateCode] : normalizeStateLabel(parts.state),
    zip: normalizeZip(parts.zip),
  }
}

export function buildUsAddressLine(parts: AddressParts): string {
  const normalized = normalizeUsAddressParts(parts)
  return [
    normalized.address,
    normalized.city,
    normalized.stateCode ?? normalized.stateName,
    normalized.zip,
  ]
    .filter(Boolean)
    .join(', ')
}

export function formatCityState(
  city?: string | null,
  state?: string | null,
  options?: { useStateCode?: boolean }
): string {
  const normalizedCity = normalizeCity(city)
  const normalizedState = options?.useStateCode
    ? normalizeStateCode(state)
    : normalizeStateLabel(state)

  return [normalizedCity, normalizedState].filter(Boolean).join(', ')
}

export function getStateFacetLabel(value?: string | null): string {
  return normalizeStateLabel(value) ?? 'Unknown'
}
