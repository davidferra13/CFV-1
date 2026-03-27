'use server'

// Cross-tenant inquiry management - admin views all inquiries, founder can claim local ones.
// Admin-only.

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { calculateDistanceMiles } from '@/lib/geo/public-location'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlatformInquiry = {
  id: string
  created_at: string
  client_name: string
  client_email: string
  location: string
  occasion: string
  guest_count: number | null
  status: string
  chef_id: string
  chef_name: string
  distance_from_founder: number | null
  is_local: boolean
  is_open_booking: boolean
  converted_to_event_id: string | null
}

export type InquiryListInput = {
  limit?: number
  offset?: number
  status?: string
  localOnly?: boolean
  search?: string
}

export type InquiryListResult = {
  items: PlatformInquiry[]
  total: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FounderGeo = {
  lat: number | null
  lng: number | null
  radiusMiles: number
  chefId: string | null
}

async function getFounderInfo(db: any): Promise<FounderGeo> {
  const owner = await resolveOwnerIdentity(db)
  if (!owner.ownerChefId) return { lat: null, lng: null, radiusMiles: 50, chefId: null }

  const { data: discovery } = await db
    .from('chef_discovery_profiles')
    .select('service_area_lat, service_area_lng, service_area_radius_miles')
    .eq('chef_id', owner.ownerChefId)
    .maybeSingle()

  return {
    lat: discovery?.service_area_lat ?? null,
    lng: discovery?.service_area_lng ?? null,
    radiusMiles: discovery?.service_area_radius_miles ?? 50,
    chefId: owner.ownerChefId,
  }
}

// ---------------------------------------------------------------------------
// getPlatformInquiryList
// ---------------------------------------------------------------------------

export async function getPlatformInquiryList(
  input: InquiryListInput = {}
): Promise<InquiryListResult> {
  await requireAdmin()
  const db: any = createAdminClient()

  const limit = Math.min(input.limit ?? 50, 200)
  const offset = input.offset ?? 0

  // Build query
  let q = db
    .from('inquiries')
    .select(
      'id, tenant_id, client_id, channel, status, confirmed_occasion, confirmed_guest_count, confirmed_location, first_contact_at, created_at, converted_to_event_id, unknown_fields'
    )
    .order('created_at', { ascending: false })

  if (input.status) {
    q = q.eq('status', input.status)
  }

  const { data: inquiries, error } = await q
  if (error) throw new Error(`Failed to load inquiries: ${error.message}`)
  const allInquiries: any[] = inquiries ?? []

  // Load chefs and clients in parallel for lookups
  const [chefsResult, clientsResult, founderInfo] = await Promise.all([
    db.from('chefs').select('id, display_name, business_name, email'),
    db.from('clients').select('id, full_name, email'),
    getFounderInfo(db),
  ])

  const chefMap = new Map<string, { name: string; email: string }>()
  for (const c of chefsResult.data ?? []) {
    chefMap.set(c.id, {
      name: c.display_name || c.business_name || 'Unknown Chef',
      email: c.email || '',
    })
  }

  const clientMap = new Map<string, { name: string; email: string }>()
  for (const c of clientsResult.data ?? []) {
    clientMap.set(c.id, {
      name: c.full_name || 'Unknown',
      email: c.email || '',
    })
  }

  // Map inquiries to output format
  let items: PlatformInquiry[] = allInquiries.map((row: any) => {
    const chef = chefMap.get(row.tenant_id)
    const client = clientMap.get(row.client_id)
    const isOpenBooking = row.unknown_fields?.open_booking === true || row.channel === 'website'

    // Distance from founder
    let distFromFounder: number | null = null
    const distMiles = row.unknown_fields?.distance_miles
    if (typeof distMiles === 'number') {
      distFromFounder = Math.round(distMiles)
    }

    const isLocal = distFromFounder !== null && distFromFounder <= founderInfo.radiusMiles

    return {
      id: row.id,
      created_at: row.created_at,
      client_name: client?.name || 'Unknown',
      client_email: client?.email || '',
      location: row.confirmed_location || '',
      occasion: row.confirmed_occasion || '',
      guest_count: row.confirmed_guest_count,
      status: row.status,
      chef_id: row.tenant_id,
      chef_name: chef?.name || 'Unknown Chef',
      distance_from_founder: distFromFounder,
      is_local: isLocal,
      is_open_booking: isOpenBooking,
      converted_to_event_id: row.converted_to_event_id,
    }
  })

  // Apply search filter (client name or email)
  if (input.search) {
    const term = input.search.toLowerCase().trim()
    items = items.filter(
      (i) =>
        i.client_name.toLowerCase().includes(term) ||
        i.client_email.toLowerCase().includes(term) ||
        i.location.toLowerCase().includes(term)
    )
  }

  // Apply local-only filter
  if (input.localOnly) {
    items = items.filter((i) => i.is_local)
  }

  const total = items.length
  const paged = items.slice(offset, offset + limit)

  return { items: paged, total }
}

// ---------------------------------------------------------------------------
// claimInquiryForFounder
// ---------------------------------------------------------------------------

export async function claimInquiryForFounder(input: {
  inquiryId: string
}): Promise<{ success: boolean; newInquiryId?: string; error?: string }> {
  await requireAdmin()
  const db: any = createAdminClient()

  const owner = await resolveOwnerIdentity(db)
  if (!owner.ownerChefId) {
    return { success: false, error: 'Founder chef account not found' }
  }

  // Load the source inquiry
  const { data: sourceInquiry, error: fetchErr } = await db
    .from('inquiries')
    .select('*')
    .eq('id', input.inquiryId)
    .single()

  if (fetchErr || !sourceInquiry) {
    return { success: false, error: 'Inquiry not found' }
  }

  // Check if founder already has this inquiry (by client email + occasion + date)
  const sourceClientId = sourceInquiry.client_id
  let sourceClientEmail = ''
  if (sourceClientId) {
    const { data: srcClient } = await db
      .from('clients')
      .select('email, full_name, phone')
      .eq('id', sourceClientId)
      .single()
    sourceClientEmail = srcClient?.email || ''

    // Check for duplicate under founder's tenant
    if (sourceClientEmail) {
      const { data: existingClient } = await db
        .from('clients')
        .select('id')
        .eq('tenant_id', owner.ownerChefId)
        .ilike('email', sourceClientEmail)
        .maybeSingle()

      if (existingClient) {
        const { data: existingInquiry } = await db
          .from('inquiries')
          .select('id')
          .eq('tenant_id', owner.ownerChefId)
          .eq('client_id', existingClient.id)
          .eq('confirmed_occasion', sourceInquiry.confirmed_occasion || '')
          .maybeSingle()

        if (existingInquiry) {
          return { success: false, error: 'You already have this inquiry' }
        }
      }
    }

    // Create or find client under founder's tenant
    let founderClientId: string

    const { data: existingFounderClient } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', owner.ownerChefId)
      .ilike('email', sourceClientEmail)
      .maybeSingle()

    if (existingFounderClient) {
      founderClientId = existingFounderClient.id
    } else {
      const { data: srcClientFull } = await db
        .from('clients')
        .select('full_name, email, phone, referral_source')
        .eq('id', sourceClientId)
        .single()

      const { data: newClient, error: clientErr } = await db
        .from('clients')
        .insert({
          tenant_id: owner.ownerChefId,
          full_name: srcClientFull?.full_name || 'Unknown',
          email: srcClientFull?.email || '',
          phone: srcClientFull?.phone || null,
          referral_source: 'website',
        })
        .select('id')
        .single()

      if (clientErr || !newClient) {
        return { success: false, error: `Failed to create client: ${clientErr?.message}` }
      }
      founderClientId = newClient.id
    }

    // Create inquiry under founder's tenant
    const { data: newInquiry, error: inquiryErr } = await db
      .from('inquiries')
      .insert({
        tenant_id: owner.ownerChefId,
        client_id: founderClientId,
        channel: sourceInquiry.channel,
        first_contact_at: sourceInquiry.first_contact_at || new Date().toISOString(),
        confirmed_date: sourceInquiry.confirmed_date,
        confirmed_guest_count: sourceInquiry.confirmed_guest_count,
        confirmed_location: sourceInquiry.confirmed_location,
        confirmed_occasion: sourceInquiry.confirmed_occasion,
        confirmed_dietary_restrictions: sourceInquiry.confirmed_dietary_restrictions,
        source_message: sourceInquiry.source_message,
        unknown_fields: {
          ...(sourceInquiry.unknown_fields || {}),
          claimed_from_inquiry_id: sourceInquiry.id,
          claimed_from_chef_id: sourceInquiry.tenant_id,
          claimed_at: new Date().toISOString(),
        },
        status: 'new',
      })
      .select('id')
      .single()

    if (inquiryErr || !newInquiry) {
      return { success: false, error: `Failed to create inquiry: ${inquiryErr?.message}` }
    }

    // Create draft event (non-blocking)
    try {
      const { data: event } = await db
        .from('events')
        .insert({
          tenant_id: owner.ownerChefId,
          client_id: founderClientId,
          inquiry_id: newInquiry.id,
          event_date: sourceInquiry.confirmed_date || null,
          guest_count: sourceInquiry.confirmed_guest_count || null,
          location_address: sourceInquiry.confirmed_location || '',
          occasion: sourceInquiry.confirmed_occasion || '',
          special_requests: sourceInquiry.source_message || null,
        })
        .select('id')
        .single()

      if (event) {
        await db.from('event_state_transitions').insert({
          tenant_id: owner.ownerChefId,
          event_id: event.id,
          from_status: null,
          to_status: 'draft',
          metadata: {
            action: 'claimed_from_admin_pulse',
            source_inquiry_id: sourceInquiry.id,
          },
        })
        await db
          .from('inquiries')
          .update({ converted_to_event_id: event.id })
          .eq('id', newInquiry.id)
      }
    } catch (eventErr) {
      console.error('[claim-inquiry] Event creation failed (non-blocking):', eventErr)
    }

    // Audit log
    try {
      await db.from('admin_audit_log').insert({
        action: 'claim_inquiry',
        details: {
          source_inquiry_id: sourceInquiry.id,
          new_inquiry_id: newInquiry.id,
          founder_chef_id: owner.ownerChefId,
          client_email: sourceClientEmail,
        },
      })
    } catch (auditErr) {
      console.error('[claim-inquiry] Audit log failed (non-blocking):', auditErr)
    }

    revalidatePath('/admin/inquiries')
    revalidatePath('/inquiries')

    return { success: true, newInquiryId: newInquiry.id }
  }

  return { success: false, error: 'No client data on source inquiry' }
}
