/**
 * TypeScript types for the Charity Hours Logging feature.
 * No 'use server' — safe to import in both server and client code.
 */

export type CharityHourEntry = {
  id: string
  organizationName: string
  organizationAddress: string | null
  googlePlaceId: string | null
  ein: string | null
  isVerified501c: boolean
  serviceDate: string // YYYY-MM-DD
  hours: number // decimal
  notes: string | null
  createdAt: string
}

export type CharityOrganization = {
  organizationName: string
  organizationAddress: string | null
  googlePlaceId: string | null
  ein: string | null
  isVerified501c: boolean
  lastUsed: string // most recent service_date
  totalHours: number
}

export type CharityHoursSummary = {
  totalHours: number
  totalEntries: number
  uniqueOrgs: number
  verified501cOrgs: number
  hoursByOrg: { name: string; hours: number; isVerified: boolean }[]
}

export type ProPublicaNonprofit = {
  ein: string
  name: string
  city: string
  state: string
  nteeCode: string | null
  income: number
  rulingDate: string | null
}

/** NTEE category IDs used by the ProPublica Nonprofit Explorer API */
export const NTEE_CATEGORIES = [
  { id: 1, label: 'Arts, Culture & Humanities' },
  { id: 2, label: 'Education' },
  { id: 3, label: 'Environment & Animals' },
  { id: 4, label: 'Health' },
  { id: 5, label: 'Human Services' },
  { id: 6, label: 'International' },
  { id: 7, label: 'Public Benefit' },
  { id: 8, label: 'Religion' },
  { id: 9, label: 'Mutual Benefit' },
  { id: 10, label: 'Other' },
] as const

/** US states for the state dropdown filter */
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const
