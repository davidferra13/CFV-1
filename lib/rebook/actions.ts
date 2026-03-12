'use server'

import crypto from 'crypto'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { getRebookUrl } from '@/lib/qr/qr-code'
import { createServerClient } from '@/lib/supabase/server'

type RebookFormInitialValues = {
  full_name: string
  email: string
  phone: string
  address: string
  serve_time: string
  guest_count: string
  occasion: string
  allergy_flag: 'none' | 'yes' | 'unknown'
  allergies_food_restrictions: string
  additional_notes: string
}

type RebookReadyData = {
  state: 'ready'
  token: string
  url: string
  expiresAt: string
  chefSlug: string | null
  chefName: string
  eventTitle: string
  eventDate: string
  initialValues: Partial<RebookFormInitialValues>
}

type RebookUnavailableData = {
  state: 'expired' | 'used'
  chefSlug: string | null
  chefName: string
  eventTitle: string
  eventDate: string
}

export type RebookLandingData = RebookReadyData | RebookUnavailableData | { state: 'invalid' }

type CompletedEventRow = {
  id: string
  tenant_id: string
  client_id: string
  status: string
  occasion: string | null
  event_date: string
  serve_time: string | null
  guest_count: number | null
  location_address: string | null
  location_city: string | null
  location_state: string | null
  location_zip: string | null
}

type ClientRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  allergies: string[] | null
  dietary_restrictions: string[] | null
}

type ChefRow = {
  id: string
  slug: string | null
  display_name: string | null
  business_name: string | null
}

type RebookTokenRow = {
  tenant_id: string
  event_id: string
  client_id: string
  token: string
  expires_at: string
  used_at: string | null
}

function buildAddress(event: CompletedEventRow) {
  return [event.location_address, event.location_city, event.location_state, event.location_zip]
    .filter(Boolean)
    .join(', ')
}

function formatTimeForFormInput(value: string | null | undefined) {
  if (!value) return ''
  if (/(am|pm)/i.test(value)) {
    return value.replace(/\s+/g, ' ').trim().toUpperCase()
  }

  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return value

  let hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12

  return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`
}

function buildDietarySummary(client: ClientRow) {
  const parts = [...(client.allergies || []), ...(client.dietary_restrictions || [])]
    .map((item) => item?.trim())
    .filter(Boolean)
  return Array.from(new Set(parts)).join(', ')
}

function buildEventTitle(event: CompletedEventRow) {
  return event.occasion?.trim() || 'Private Chef Dinner'
}

function buildChefName(chef: ChefRow) {
  return chef.display_name?.trim() || chef.business_name?.trim() || 'Your chef'
}

function buildAdditionalNotes(event: CompletedEventRow) {
  const title = buildEventTitle(event)
  const dateLabel = new Date(`${event.event_date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return `Rebooking based on ${title} on ${dateLabel}.`
}

function buildReadyPayload(
  tokenRow: RebookTokenRow,
  event: CompletedEventRow,
  client: ClientRow,
  chef: ChefRow
): RebookReadyData {
  const dietarySummary = buildDietarySummary(client)

  return {
    state: 'ready',
    token: tokenRow.token,
    url: getRebookUrl(tokenRow.token),
    expiresAt: tokenRow.expires_at,
    chefSlug: chef.slug,
    chefName: buildChefName(chef),
    eventTitle: buildEventTitle(event),
    eventDate: event.event_date,
    initialValues: {
      full_name: client.full_name?.trim() || '',
      email: client.email?.trim() || '',
      phone: client.phone?.trim() || '',
      address: buildAddress(event),
      serve_time: formatTimeForFormInput(event.serve_time),
      guest_count: event.guest_count ? String(event.guest_count) : '',
      occasion: buildEventTitle(event),
      allergy_flag: dietarySummary ? 'yes' : 'none',
      allergies_food_restrictions: dietarySummary,
      additional_notes: buildAdditionalNotes(event),
    },
  }
}

function buildUnavailablePayload(
  state: 'expired' | 'used',
  event: CompletedEventRow,
  chef: ChefRow
): RebookUnavailableData {
  return {
    state,
    chefSlug: chef.slug,
    chefName: buildChefName(chef),
    eventTitle: buildEventTitle(event),
    eventDate: event.event_date,
  }
}

async function loadCompletedEventContext(eventId: string) {
  const supabase = createServerClient({ admin: true })

  const { data: event } = await supabase
    .from('events')
    .select(
      'id, tenant_id, client_id, status, occasion, event_date, serve_time, guest_count, location_address, location_city, location_state, location_zip'
    )
    .eq('id', eventId)
    .eq('status', 'completed')
    .maybeSingle()

  const typedEvent = event as CompletedEventRow | null
  if (!typedEvent?.client_id || !typedEvent?.tenant_id) {
    return null
  }

  const [{ data: client }, { data: chef }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, email, phone, allergies, dietary_restrictions')
      .eq('id', typedEvent.client_id)
      .maybeSingle(),
    supabase
      .from('chefs')
      .select('id, slug, display_name, business_name')
      .eq('id', typedEvent.tenant_id)
      .maybeSingle(),
  ])

  if (!client || !chef) {
    return null
  }

  return {
    supabase,
    event: typedEvent,
    client: client as ClientRow,
    chef: chef as ChefRow,
  }
}

async function generateUniqueToken(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = crypto.randomBytes(24).toString('hex')
    const { data: existing } = await supabase
      .from('rebook_tokens')
      .select('id')
      .eq('token', token)
      .maybeSingle()

    if (!existing) return token
  }

  throw new Error('Failed to generate rebook token')
}

async function getActiveTokenForEvent(supabase: any, eventId: string) {
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('rebook_tokens')
    .select('tenant_id, event_id, client_id, token, expires_at, used_at')
    .eq('event_id', eventId)
    .is('used_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .maybeSingle()

  return (data as RebookTokenRow | null) ?? null
}

async function createRebookToken(
  supabase: any,
  payload: Pick<RebookTokenRow, 'tenant_id' | 'event_id' | 'client_id' | 'token'>
) {
  const { data, error } = (await supabase
    .from('rebook_tokens')
    .insert(payload)
    .select('tenant_id, event_id, client_id, token, expires_at, used_at')
    .single()) as { data: RebookTokenRow | null; error: Error | null }

  return { data, error }
}

async function findRebookTokenByToken(supabase: any, token: string) {
  const { data } = (await supabase
    .from('rebook_tokens')
    .select('tenant_id, event_id, client_id, token, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()) as { data: RebookTokenRow | null }

  return data
}

export async function getOrCreateRebookDataForCompletedEvent(eventId: string) {
  const context = await loadCompletedEventContext(eventId)
  if (!context) return null

  const existingToken = await getActiveTokenForEvent(context.supabase, eventId)
  if (existingToken) {
    return buildReadyPayload(existingToken, context.event, context.client, context.chef)
  }

  const token = await generateUniqueToken(context.supabase)
  const { data: inserted, error } = await createRebookToken(context.supabase, {
    tenant_id: context.event.tenant_id,
    event_id: context.event.id,
    client_id: context.client.id,
    token,
  })

  if (error || !inserted) {
    throw new Error('Failed to create rebook token')
  }

  return buildReadyPayload(inserted as RebookTokenRow, context.event, context.client, context.chef)
}

export async function getOrCreateRebookDataForClientEvent(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .eq('status', 'completed')
    .maybeSingle()

  if (!event) return null

  return getOrCreateRebookDataForCompletedEvent(eventId)
}

export async function getOrCreateRebookDataForChefEvent(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .maybeSingle()

  if (!event) return null

  return getOrCreateRebookDataForCompletedEvent(eventId)
}

export async function getRebookLandingData(token: string): Promise<RebookLandingData> {
  const supabase = createServerClient({ admin: true })
  const tokenRow = await findRebookTokenByToken(supabase, token)

  const typedToken = tokenRow as RebookTokenRow | null
  if (!typedToken) {
    return { state: 'invalid' }
  }

  const [{ data: event }, { data: client }, { data: chef }] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, tenant_id, client_id, status, occasion, event_date, serve_time, guest_count, location_address, location_city, location_state, location_zip'
      )
      .eq('id', typedToken.event_id)
      .maybeSingle(),
    supabase
      .from('clients')
      .select('id, full_name, email, phone, allergies, dietary_restrictions')
      .eq('id', typedToken.client_id)
      .maybeSingle(),
    supabase
      .from('chefs')
      .select('id, slug, display_name, business_name')
      .eq('id', typedToken.tenant_id)
      .maybeSingle(),
  ])

  if (!event || !client || !chef) {
    return { state: 'invalid' }
  }

  const typedEvent = event as CompletedEventRow
  const typedClient = client as ClientRow
  const typedChef = chef as ChefRow

  if (typedToken.used_at) {
    return buildUnavailablePayload('used', typedEvent, typedChef)
  }

  if (new Date(typedToken.expires_at) < new Date()) {
    return buildUnavailablePayload('expired', typedEvent, typedChef)
  }

  return buildReadyPayload(typedToken, typedEvent, typedClient, typedChef)
}

export async function markRebookTokenUsed(token: string) {
  const supabase = createServerClient({ admin: true })
  await supabase
    .from('rebook_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null)
}
