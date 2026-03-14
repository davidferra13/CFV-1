// Menu Approval Workflow â€” Server Actions
// Enables chefs to send menu snapshots to clients for formal approval,
// and clients to approve or request revisions.

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { MenuApprovalRequestEmail } from '@/lib/email/templates/menu-approval-request'
import React from 'react'
import { format } from 'date-fns'
import { createNotification, getChefAuthUserId, getChefProfile } from '@/lib/notifications/actions'
import { createClientNotification } from '@/lib/notifications/client-actions'
import { sendMenuApprovedChefEmail, sendMenuRevisionChefEmail } from '@/lib/email/notifications'

// ============================================
// SCHEMAS
// ============================================

const RequestRevisionSchema = z.object({
  request_id: z.string().uuid(),
  notes: z.string().min(1, 'Please describe what you would like changed'),
})

export type RequestRevisionInput = z.infer<typeof RequestRevisionSchema>

// ============================================
// CHEF ACTIONS
// ============================================

/**
 * Send the current event menus to the client for approval.
 * Snapshots the menu items, creates a menu_approval_request record,
 * updates the event's menu_approval_status, and emails the client.
 */
export async function sendMenuForApproval(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Load event + client + linked menus
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, menu_approval_status,
      clients (id, full_name, email),
      menus (
        id, name, description, cuisine_type, service_style,
        dishes (
          id, course_name, course_number, description,
          dietary_tags, allergen_flags, chef_notes, sort_order
        )
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  const client = (event as any).clients
  if (!client) throw new Error('No client linked to this event')

  // Build rich menu snapshot (full dish details for client review)
  const menus: any[] = (event as any).menus ?? []
  const menuSnapshot = menus.map((menu: any) => {
    const dishes = (menu.dishes ?? []).sort(
      (a: any, b: any) => (a.course_number ?? 0) - (b.course_number ?? 0)
    )

    return {
      menu_name: menu.name,
      menu_description: menu.description || null,
      cuisine_type: menu.cuisine_type || null,
      service_style: menu.service_style || null,
      // Legacy format: flat dish name array (backward compat)
      dishes: dishes.map((d: any) => d.course_name).filter(Boolean),
      // Rich format: full dish objects
      courses: dishes.map((d: any) => ({
        id: d.id,
        courseName: d.course_name,
        courseNumber: d.course_number,
        description: d.description || null,
        dietaryTags: d.dietary_tags ?? [],
        allergenFlags: d.allergen_flags ?? [],
      })),
    }
  })

  const now = new Date().toISOString()

  // Create approval request record
  const { data: request, error: insertError } = await supabase
    .from('menu_approval_requests')
    .insert({
      event_id: eventId,
      chef_id: user.tenantId!,
      client_id: client.id,
      menu_snapshot: menuSnapshot,
      sent_at: now,
      status: 'sent',
    })
    .select('id')
    .single()

  if (insertError || !request) {
    console.error('[sendMenuForApproval] Insert error:', insertError)
    throw new Error('Failed to create approval request')
  }

  // Update event approval status
  await supabase
    .from('events')
    .update({
      menu_approval_status: 'sent',
      menu_sent_at: now,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  // Email the client
  if (client.email) {
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/my-events/${eventId}/approve-menu?req=${request.id}`
    await sendEmail({
      to: client.email,
      subject: `Menu ready for review â€” ${event.occasion ?? 'your event'}`,
      react: React.createElement(MenuApprovalRequestEmail, {
        clientName: client.full_name ?? 'there',
        occasion: event.occasion ?? 'your upcoming event',
        eventDate: event.event_date ? format(new Date(event.event_date), 'MMMM d, yyyy') : 'TBD',
        menuSnapshot,
        approvalUrl,
      }),
    })
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)

  // Non-blocking: notify client in-app
  try {
    await createClientNotification({
      tenantId: user.tenantId!,
      clientId: client.id,
      category: 'event',
      action: 'event_proposed_to_client',
      title: 'Menu ready for your review',
      body: `Review and approve the menu for ${event.occasion ?? 'your event'}`,
      actionUrl: `/my-events/${eventId}/approve-menu?req=${request.id}`,
      eventId,
    })
  } catch (err) {
    console.error('[sendMenuForApproval] Non-blocking client notification failed:', err)
  }

  return { success: true, requestId: request.id }
}

/**
 * Get the latest menu approval request for an event (chef view).
 */
export async function getMenuApprovalStatus(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('menu_approval_status, menu_sent_at, menu_approved_at, menu_revision_notes')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { data: latestRequest } = await supabase
    .from('menu_approval_requests')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { event, latestRequest }
}

// ============================================
// CLIENT ACTIONS
// ============================================

/**
 * Client approves the menu.
 */
export async function approveMenu(requestId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: request } = await supabase
    .from('menu_approval_requests')
    .select('id, event_id, chef_id, status')
    .eq('id', requestId)
    .eq('client_id', user.entityId)
    .single()

  if (!request) throw new Error('Approval request not found')
  if (request.status !== 'sent') throw new Error('This request is no longer pending')

  const now = new Date().toISOString()

  // Update the request (optimistic lock: only update if still 'sent')
  const { data: updatedRequest, error: updateError } = await supabase
    .from('menu_approval_requests')
    .update({ status: 'approved', responded_at: now })
    .eq('id', requestId)
    .eq('client_id', user.entityId)
    .eq('status', 'sent')
    .select('id')

  if (updateError || !updatedRequest || updatedRequest.length === 0) {
    throw new Error('This request has already been responded to')
  }

  // Update the event
  await supabase
    .from('events')
    .update({
      menu_approval_status: 'approved',
      menu_approved_at: now,
      menu_revision_notes: null,
    })
    .eq('id', request.event_id)

  revalidatePath(`/my-events/${request.event_id}`)
  revalidatePath(`/events/${request.event_id}`)

  // Non-blocking: notify chef + email
  try {
    const chefAuthId = await getChefAuthUserId(request.chef_id)
    if (chefAuthId) {
      await createNotification({
        tenantId: request.chef_id,
        recipientId: chefAuthId,
        category: 'event',
        action: 'menu_approved',
        title: 'Menu approved',
        body: 'Your client approved the menu',
        eventId: request.event_id,
      })
    }

    // Get event details for email
    const supabaseAdmin = createServerClient()
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('occasion, event_date, clients(full_name)')
      .eq('id', request.event_id)
      .single()

    const chef = await getChefProfile(request.chef_id)
    if (chef?.email && eventData) {
      await sendMenuApprovedChefEmail({
        chefEmail: chef.email,
        chefName: chef.name,
        clientName: (eventData as any).clients?.full_name ?? 'Your client',
        occasion: eventData.occasion ?? 'your event',
        eventDate: eventData.event_date ?? 'TBD',
        eventId: request.event_id,
      })
    }
  } catch (err) {
    console.error('[approveMenu] Non-blocking chef notification failed:', err)
  }

  return { success: true }
}

/**
 * Client requests menu revision.
 */
export async function requestMenuRevision(input: RequestRevisionInput) {
  const user = await requireClient()
  const validated = RequestRevisionSchema.parse(input)
  const supabase: any = createServerClient()

  const { data: request } = await supabase
    .from('menu_approval_requests')
    .select('id, event_id, status, chef_id')
    .eq('id', validated.request_id)
    .eq('client_id', user.entityId)
    .single()

  if (!request) throw new Error('Approval request not found')
  if (request.status !== 'sent') throw new Error('This request is no longer pending')

  const now = new Date().toISOString()

  // Optimistic lock: only update if still 'sent'
  const { data: updatedRevision, error: revisionError } = await supabase
    .from('menu_approval_requests')
    .update({
      status: 'revision_requested',
      responded_at: now,
      revision_notes: validated.notes,
    })
    .eq('id', validated.request_id)
    .eq('client_id', user.entityId)
    .eq('status', 'sent')
    .select('id')

  if (revisionError || !updatedRevision || updatedRevision.length === 0) {
    throw new Error('This request has already been responded to')
  }

  await supabase
    .from('events')
    .update({
      menu_approval_status: 'revision_requested',
      menu_revision_notes: validated.notes,
    })
    .eq('id', request.event_id)

  revalidatePath(`/my-events/${request.event_id}`)
  revalidatePath(`/events/${request.event_id}`)

  // Non-blocking: notify chef + email
  try {
    const chefAuthId = await getChefAuthUserId(request.chef_id)
    if (chefAuthId) {
      await createNotification({
        tenantId: request.chef_id,
        recipientId: chefAuthId,
        category: 'event',
        action: 'menu_revision_requested',
        title: 'Menu revision requested',
        body: validated.notes,
        eventId: request.event_id,
      })
    }

    const supabaseAdmin = createServerClient()
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('occasion, event_date, clients(full_name)')
      .eq('id', request.event_id)
      .single()

    const chef = await getChefProfile(request.chef_id)
    if (chef?.email && eventData) {
      await sendMenuRevisionChefEmail({
        chefEmail: chef.email,
        chefName: chef.name,
        clientName: (eventData as any).clients?.full_name ?? 'Your client',
        occasion: eventData.occasion ?? 'your event',
        eventDate: eventData.event_date ?? 'TBD',
        revisionNotes: validated.notes,
        eventId: request.event_id,
      })
    }
  } catch (err) {
    console.error('[requestMenuRevision] Non-blocking chef notification failed:', err)
  }

  return { success: true }
}

/**
 * Get the active approval request for a client event (client view).
 */
export async function getClientMenuApprovalRequest(requestId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data } = (await supabase
    .from('menu_approval_requests')
    .select('*')
    .eq('id', requestId)
    .eq('client_id', user.entityId)
    .single()) as { data: Record<string, any> | null }

  return data
}
