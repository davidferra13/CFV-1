'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Public actions (no auth required — guests submitting interest)
// ---------------------------------------------------------------------------

const GuestLeadSchema = z.object({
  guestCode: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
})

/**
 * Look up chef info by event guest code.
 * Public — no auth required. Returns only public-safe fields.
 */
export async function getChefByGuestCode(code: string) {
  const supabase = createServerClient({ admin: true })

  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id')
    .eq('guest_code', code)
    .single()

  if (!event) return null

  const { data: chef } = await supabase
    .from('chefs')
    .select(
      'id, display_name, business_name, bio, profile_image_url, portal_primary_color, portal_background_color, tagline'
    )
    .eq('id', event.tenant_id)
    .single()

  if (!chef) return null

  return {
    chefName: (chef.display_name || chef.business_name) as string,
    chefPhoto: chef.profile_image_url as string | null,
    chefBio: chef.bio as string | null,
    tagline: chef.tagline as string | null,
    primaryColor: chef.portal_primary_color as string | null,
    backgroundColor: chef.portal_background_color as string | null,
    tenantId: chef.id as string,
    eventId: event.id as string,
  }
}

/**
 * Submit a guest lead from the public landing page.
 * No auth required — uses admin client.
 */
export async function submitGuestLead(input: {
  guestCode: string
  name: string
  email: string
  phone?: string
  message?: string
}) {
  const validated = GuestLeadSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Resolve guest code → event + tenant
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id')
    .eq('guest_code', validated.guestCode)
    .single()

  if (!event) {
    throw new Error('Invalid event code')
  }

  // Deduplicate: if this email already submitted for this event, update instead
  const { data: existing } = await supabase
    .from('guest_leads')
    .select('id')
    .eq('event_id', event.id)
    .eq('email', validated.email.toLowerCase().trim())
    .single()

  if (existing) {
    // Update existing lead with new info
    await supabase
      .from('guest_leads')
      .update({
        name: validated.name.trim(),
        phone: validated.phone?.trim() || null,
        message: validated.message?.trim() || null,
      })
      .eq('id', existing.id)

    return { success: true, deduplicated: true }
  }

  // Insert new lead
  const { error } = await supabase.from('guest_leads').insert({
    tenant_id: event.tenant_id,
    event_id: event.id,
    name: validated.name.trim(),
    email: validated.email.toLowerCase().trim(),
    phone: validated.phone?.trim() || null,
    message: validated.message?.trim() || null,
    status: 'new',
  })

  if (error) {
    console.error('[submitGuestLead] Insert error:', error)
    throw new Error('Failed to submit. Please try again.')
  }

  // Non-blocking: notify chef of new lead
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: event.tenant_id,
      recipientId: event.tenant_id,
      category: 'lead',
      action: 'new_guest_lead',
      title: 'New guest lead',
      body: `${validated.name.trim()} expressed interest after attending your event.`,
      actionUrl: '/guest-leads',
    })
  } catch (err) {
    console.error('[submitGuestLead] Notification failed (non-blocking):', err)
  }

  return { success: true, deduplicated: false }
}

// ---------------------------------------------------------------------------
// Chef actions (auth required)
// ---------------------------------------------------------------------------

/**
 * Get all guest leads for the current chef, newest first.
 */
export async function getGuestLeads(filters?: { status?: string }) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('guest_leads')
    .select(
      `
      id, tenant_id, event_id, name, email, phone, message,
      status, converted_client_id, created_at, updated_at
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getGuestLeads] Query error:', error)
    return []
  }

  return data ?? []
}

/**
 * Get guest lead stats for the dashboard.
 */
export async function getGuestLeadStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_leads')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  if (error || !data) {
    return { total: 0, new: 0, contacted: 0, converted: 0, archived: 0 }
  }

  const leads = data as { status: string }[]
  return {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    archived: leads.filter((l) => l.status === 'archived').length,
  }
}

/**
 * Update a guest lead's status.
 */
export async function updateGuestLeadStatus(
  leadId: string,
  status: 'new' | 'contacted' | 'converted' | 'archived'
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('guest_leads')
    .update({ status })
    .eq('id', leadId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateGuestLeadStatus] Error:', error)
    throw new Error('Failed to update lead status')
  }
}

/**
 * Convert a guest lead into a full client record.
 * Returns the new client ID.
 */
export async function convertLeadToClient(leadId: string) {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  // Get lead data
  const { data: lead, error: leadError } = await supabase
    .from('guest_leads')
    .select('*')
    .eq('id', leadId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (leadError || !lead) {
    throw new Error('Lead not found')
  }

  if (lead.status === 'converted' && lead.converted_client_id) {
    return { clientId: lead.converted_client_id, alreadyConverted: true }
  }

  // Check if client already exists by email
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('email', lead.email)
    .single()

  let clientId: string

  if (existingClient) {
    clientId = existingClient.id
  } else {
    // Create new client
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        tenant_id: user.tenantId!,
        full_name: lead.name,
        email: lead.email,
        phone: lead.phone || null,
        source: 'guest_pipeline',
        notes: lead.message ? `Guest note: ${lead.message}` : null,
      })
      .select('id')
      .single()

    if (clientError || !newClient) {
      console.error('[convertLeadToClient] Client creation error:', clientError)
      throw new Error('Failed to create client')
    }
    clientId = newClient.id
  }

  // Mark lead as converted
  await supabase
    .from('guest_leads')
    .update({
      status: 'converted',
      converted_client_id: clientId,
    })
    .eq('id', leadId)

  return { clientId, alreadyConverted: false }
}

/**
 * Get the guest code for an event (chef only).
 */
export async function getEventGuestCode(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('events')
    .select('guest_code')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  return (data?.guest_code as string) ?? null
}

/**
 * Get guest leads count for a specific event.
 */
export async function getEventGuestLeadCount(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('guest_leads')
    .select('id', { count: 'exact' })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  return data?.length ?? 0
}

/**
 * Draft a post-event guest outreach email (for chef review).
 * Returns a template string — chef must review and approve before sending.
 */
export async function draftGuestOutreachEmail(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get event + chef info
  const { data: event } = await supabase
    .from('events')
    .select('occasion, event_date, guest_code')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name, booking_slug')
    .eq('id', user.tenantId!)
    .single()

  if (!event || !chef) {
    throw new Error('Event or chef not found')
  }

  const chefName = chef.display_name || chef.business_name
  const occasion = event.occasion || 'your event'
  const eventDate = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'recently'

  const profileUrl = chef.booking_slug
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'}/chef/${chef.booking_slug}`
    : null

  const draft = [
    `Hi there,`,
    ``,
    `Thank you for joining us at ${occasion} on ${eventDate}! It was a pleasure cooking for you and your fellow guests.`,
    ``,
    `If you enjoyed the experience and would like to host your own private dining event, I'd love to help make that happen. Whether it's an intimate dinner for two, a birthday celebration, or a gathering with friends — I'm here to create something special for you.`,
    ``,
    profileUrl
      ? `You can learn more and submit an inquiry here: ${profileUrl}`
      : `Just reply to this email and we'll get started!`,
    ``,
    `Looking forward to cooking for you again.`,
    ``,
    `Warmly,`,
    `${chefName}`,
  ].join('\n')

  return { draft, chefName, occasion, eventDate }
}
