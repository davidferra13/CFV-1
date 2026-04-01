'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getGoogleAccessToken } from './auth'
import { buildGoogleConnectEntryUrl } from './connect-entry'
import type { ParsedClient } from '@/lib/ai/parse-client-schema'

const CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly'
const PEOPLE_API_BASE = 'https://people.googleapis.com/v1'
const DEFAULT_MAX_CONTACTS = 1000

type ContactsImportPreviewOk = {
  status: 'ok'
  clients: ParsedClient[]
  totalFetched: number
  truncated: boolean
  warnings: string[]
}

type ContactsImportPreviewRedirect = {
  status: 'needs_connect' | 'needs_scope'
  connectUrl: string
}

type ContactsImportPreviewError = {
  status: 'error'
  message: string
}

export type ContactsImportPreviewResult =
  | ContactsImportPreviewOk
  | ContactsImportPreviewRedirect
  | ContactsImportPreviewError

/** Normalize a phone number to digits-only for dedup comparison. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 7 ? digits : null
}

export async function fetchGoogleContactsImportPreview(input?: {
  maxContacts?: number
}): Promise<ContactsImportPreviewResult> {
  const user = await requireChef()
  const maxContacts = input?.maxContacts ?? DEFAULT_MAX_CONTACTS
  const returnTo = '/import?mode=csv&source=google-contacts'

  const db = createServerClient({ admin: true }) as any

  // Check whether the chef has a Google connection row with a refresh token
  const { data: conn } = await db
    .from('google_connections')
    .select('refresh_token, scopes')
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (!conn || !conn.refresh_token) {
    const connectUrl = buildGoogleConnectEntryUrl([CONTACTS_SCOPE], { returnTo })
    return { status: 'needs_connect', connectUrl }
  }

  // Check whether contacts scope has been granted
  const scopes: string[] = Array.isArray(conn.scopes) ? conn.scopes : []
  if (!scopes.includes(CONTACTS_SCOPE)) {
    const connectUrl = buildGoogleConnectEntryUrl([CONTACTS_SCOPE], { returnTo })
    return { status: 'needs_scope', connectUrl }
  }

  // Fetch access token (handles refresh automatically)
  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(user.entityId)
  } catch (err) {
    const connectUrl = buildGoogleConnectEntryUrl([CONTACTS_SCOPE], { returnTo })
    return { status: 'needs_connect', connectUrl }
  }

  // Fetch contacts from Google People API
  const personFields = 'names,emailAddresses,phoneNumbers,addresses,biographies'
  const rawContacts: any[] = []
  let nextPageToken: string | undefined
  let truncated = false

  try {
    do {
      const params = new URLSearchParams({
        personFields,
        pageSize: '200',
        sortOrder: 'LAST_MODIFIED_DESCENDING',
      })
      if (nextPageToken) params.set('pageToken', nextPageToken)

      const response = await fetch(
        `${PEOPLE_API_BASE}/people/me/connections?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!response.ok) {
        const body = await response.text()
        return {
          status: 'error',
          message: `Google Contacts API returned ${response.status}. Please reconnect your Google account if this persists.`,
        }
      }

      const data = await response.json()
      const connections: any[] = data.connections ?? []
      rawContacts.push(...connections)
      nextPageToken = data.nextPageToken

      if (rawContacts.length >= maxContacts) {
        truncated = !!nextPageToken
        break
      }
    } while (nextPageToken)
  } catch (err) {
    return {
      status: 'error',
      message: 'Could not reach Google Contacts. Please check your connection and try again.',
    }
  }

  // Normalize raw contacts into ParsedClient shape
  const clients: ParsedClient[] = []
  const warnings: string[] = []

  for (const person of rawContacts.slice(0, maxContacts)) {
    const nameObj = (person.names ?? [])[0]
    const fullName: string = nameObj?.displayName?.trim() ?? ''

    if (!fullName) {
      warnings.push('Skipped a contact with no usable name.')
      continue
    }

    const emailObj = (person.emailAddresses ?? [])[0]
    const email: string | null = emailObj?.value?.trim() || null

    const phoneObj = (person.phoneNumbers ?? [])[0]
    const phone: string | null = phoneObj?.value?.trim() || null

    const addrObj = (person.addresses ?? [])[0]
    let address: string | null = null
    if (addrObj) {
      const parts = [
        addrObj.streetAddress,
        addrObj.city,
        addrObj.region,
        addrObj.postalCode,
        addrObj.country,
      ].filter(Boolean)
      address = parts.join(', ') || null
    }

    const bioObj = (person.biographies ?? [])[0]
    const vibeNotes: string | null = bioObj?.value?.trim() || null

    clients.push({
      full_name: fullName,
      email,
      phone,
      address,
      vibe_notes: vibeNotes,
      partner_name: null,
      dietary_restrictions: [],
      allergies: [],
      dislikes: [],
      spice_tolerance: null,
      favorite_cuisines: [],
      favorite_dishes: [],
      preferred_contact_method: null,
      referral_source: null,
      referral_source_detail: null,
      regular_guests: [],
      household_members: [],
      addresses: address
        ? [{ label: 'Home', address, city: '', state: '', zip: '', notes: '' }]
        : [],
      parking_instructions: null,
      access_instructions: null,
      kitchen_size: null,
      kitchen_constraints: null,
      house_rules: null,
      equipment_available: [],
      equipment_must_bring: [],
      what_they_care_about: null,
      wine_beverage_preferences: null,
      average_spend_cents: null,
      payment_behavior: null,
      tipping_pattern: null,
      status: 'active',
      children: [],
      farewell_style: null,
      personal_milestones: null,
      field_confidence: {},
    })
  }

  return {
    status: 'ok',
    clients,
    totalFetched: rawContacts.length,
    truncated,
    warnings,
  }
}
