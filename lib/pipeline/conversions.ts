'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createEvent, type CreateEventInput } from '@/lib/events/actions'
import { generateEventContract } from '@/lib/contracts/actions'

// ─── Input Schemas ───────────────────────────────────────────────

const UuidSchema = z.string().uuid()

// ─── Result Types ────────────────────────────────────────────────

type ConversionSuccess = { success: true; [key: string]: unknown }
type ConversionFailure = { success: false; error: string }
type ConversionResult = ConversionSuccess | ConversionFailure

// ─── Create Proposal from Lead ───────────────────────────────────

export async function createProposalFromLead(
  inquiryId: string
): Promise<ConversionResult & { proposalId?: string }> {
  try {
    UuidSchema.parse(inquiryId)
    const user = await requireChef()
    const db: any = createServerClient()

    // Load inquiry, verify tenant ownership
    const { data: inquiry, error: inqError } = await db
      .from('inquiries')
      .select(
        'id, client_id, status, confirmed_budget_cents, confirmed_occasion, clients(full_name)'
      )
      .eq('id', inquiryId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (inqError || !inquiry) {
      return { success: false, error: 'Inquiry not found' }
    }

    const clientName = inquiry.clients?.full_name || 'Client'
    const occasion = inquiry.confirmed_occasion || 'Private Dining'

    // Create the proposal
    const { data: proposal, error: proposalError } = await db
      .from('client_proposals')
      .insert({
        tenant_id: user.tenantId!,
        client_id: inquiry.client_id,
        title: `Proposal for ${clientName} - ${occasion}`,
        total_price_cents: inquiry.confirmed_budget_cents || 0,
        status: 'draft',
      })
      .select('id')
      .single()

    if (proposalError || !proposal) {
      return {
        success: false,
        error: `Failed to create proposal: ${proposalError?.message || 'unknown error'}`,
      }
    }

    // Update inquiry status to 'quoted' if currently new or awaiting_chef
    if (['new', 'awaiting_chef'].includes(inquiry.status)) {
      await db
        .from('inquiries')
        .update({ status: 'quoted' })
        .eq('id', inquiryId)
        .eq('tenant_id', user.tenantId!)
    }

    revalidatePath('/pipeline')
    revalidatePath('/proposals')
    revalidatePath('/leads')

    return { success: true, proposalId: proposal.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create proposal from lead' }
  }
}

// ─── Create Event from Proposal ──────────────────────────────────

export async function createEventFromProposal(
  proposalId: string
): Promise<ConversionResult & { eventId?: string }> {
  try {
    UuidSchema.parse(proposalId)
    const user = await requireChef()
    const db: any = createServerClient()

    // Load proposal, verify tenant ownership
    const { data: proposal, error: propError } = await db
      .from('client_proposals')
      .select('id, client_id, event_id, title, total_price_cents')
      .eq('id', proposalId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (propError || !proposal) {
      return { success: false, error: 'Proposal not found' }
    }

    // If already linked to an event, return that
    if (proposal.event_id) {
      return { success: true, eventId: proposal.event_id }
    }

    if (!proposal.client_id) {
      return { success: false, error: 'Proposal has no client linked' }
    }

    // Extract occasion from title or use default
    const titleMatch = proposal.title?.match(/- (.+)$/)
    const occasion = titleMatch ? titleMatch[1] : 'Private Dining'

    // Default event date: 14 days from now
    const defaultDate = new Date(Date.now() + 14 * 86400000)
    const eventDateStr = defaultDate.toISOString().slice(0, 10)

    const eventInput: CreateEventInput = {
      client_id: proposal.client_id,
      event_date: eventDateStr,
      serve_time: '',
      location_address: '',
      location_city: '',
      location_zip: '',
      occasion,
      quoted_price_cents: proposal.total_price_cents || 0,
      guest_count: 1,
    }

    const result = await createEvent(eventInput)

    if (!result?.success || !result?.event?.id) {
      return { success: false, error: 'Failed to create event' }
    }

    // Link proposal to event
    await db
      .from('client_proposals')
      .update({ event_id: result.event.id })
      .eq('id', proposalId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath('/pipeline')
    revalidatePath('/events')
    revalidatePath('/proposals')

    return { success: true, eventId: result.event.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create event from proposal' }
  }
}

// ─── Convert Proposal to Contract ────────────────────────────────

export async function convertProposalToContract(
  proposalId: string
): Promise<ConversionResult & { contractId?: string; eventId?: string }> {
  try {
    UuidSchema.parse(proposalId)
    const user = await requireChef()
    const db: any = createServerClient()

    // Load proposal, verify tenant ownership
    const { data: proposal, error: propError } = await db
      .from('client_proposals')
      .select('id, event_id')
      .eq('id', proposalId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (propError || !proposal) {
      return { success: false, error: 'Proposal not found' }
    }

    // If no event linked, create one first
    let eventId = proposal.event_id
    if (!eventId) {
      const eventResult = await createEventFromProposal(proposalId)
      if (!eventResult.success || !eventResult.eventId) {
        return {
          success: false,
          error: eventResult.success === false ? eventResult.error : 'Failed to create event',
        }
      }
      eventId = eventResult.eventId
    }

    // Generate contract for the event
    const contract = await generateEventContract(eventId)

    if (!contract?.id) {
      return { success: false, error: 'Failed to generate contract' }
    }

    revalidatePath('/pipeline')
    revalidatePath('/contracts')

    return { success: true, contractId: contract.id, eventId }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to convert proposal to contract' }
  }
}

// ─── Create Event from Lead ──────────────────────────────────────

export async function createEventFromLead(
  inquiryId: string
): Promise<ConversionResult & { eventId?: string }> {
  try {
    UuidSchema.parse(inquiryId)
    const user = await requireChef()
    const db: any = createServerClient()

    // Load inquiry, verify tenant ownership
    const { data: inquiry, error: inqError } = await db
      .from('inquiries')
      .select(
        'id, client_id, status, confirmed_date, confirmed_budget_cents, confirmed_guest_count, confirmed_occasion, confirmed_location'
      )
      .eq('id', inquiryId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (inqError || !inquiry) {
      return { success: false, error: 'Inquiry not found' }
    }

    if (!inquiry.client_id) {
      return { success: false, error: 'Inquiry has no client linked' }
    }

    // Use confirmed date or default to 14 days out
    const defaultDate = new Date(Date.now() + 14 * 86400000)
    const eventDate = inquiry.confirmed_date || defaultDate.toISOString().slice(0, 10)

    const eventInput: CreateEventInput = {
      client_id: inquiry.client_id,
      event_date: eventDate,
      serve_time: '',
      guest_count: inquiry.confirmed_guest_count || 1,
      occasion: inquiry.confirmed_occasion || 'Private Dining',
      quoted_price_cents: inquiry.confirmed_budget_cents || 0,
      location_address: inquiry.confirmed_location || '',
      location_city: '',
      location_zip: '',
    }

    const result = await createEvent(eventInput)

    if (!result?.success || !result?.event?.id) {
      return { success: false, error: 'Failed to create event' }
    }

    // Update inquiry: mark as confirmed, link to event
    await db
      .from('inquiries')
      .update({
        status: 'confirmed',
        converted_to_event_id: result.event.id,
      })
      .eq('id', inquiryId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath('/pipeline')
    revalidatePath('/events')
    revalidatePath('/leads')

    return { success: true, eventId: result.event.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create event from lead' }
  }
}
