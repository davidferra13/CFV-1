// Menu Approval Workflow - Server Actions
// Enables chefs to send menu snapshots to clients for formal approval,
// and clients to approve or request revisions.

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { MenuApprovalRequestEmail } from '@/lib/email/templates/menu-approval-request'
import React from 'react'
import { format } from 'date-fns'
import { createNotification, getChefAuthUserId, getChefProfile } from '@/lib/notifications/actions'
import { createClientNotification } from '@/lib/notifications/client-actions'
import { sendMenuApprovedChefEmail, sendMenuRevisionChefEmail } from '@/lib/email/notifications'
import { pushToDLQ } from '@/lib/resilience/retry'

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
  const db: any = createServerClient()

  // Load event + client + linked menus
  const { data: event, error: eventError } = await db
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

  const { data: rpcResponse, error: rpcError } = await db.rpc('send_menu_for_approval_atomic', {
    p_event_id: eventId,
    p_chef_id: user.tenantId!,
    p_menu_snapshot: menuSnapshot,
    p_actor_id: user.id,
  })

  if (rpcError || !rpcResponse) {
    console.error('[sendMenuForApproval] RPC error:', rpcError)
    throw new Error('Failed to send menu for approval')
  }

  const request = rpcResponse as { request_id: string }

  // Email the client
  if (client.email) {
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/my-events/${eventId}/approve-menu?req=${request.request_id}`
    await sendEmail({
      to: client.email,
      subject: `Menu ready for review - ${event.occasion ?? 'your event'}`,
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
      actionUrl: `/my-events/${eventId}/approve-menu?req=${request.request_id}`,
      eventId,
    })
  } catch (err) {
    console.error('[sendMenuForApproval] Non-blocking client notification failed:', err)
    await pushToDLQ(createServerClient({ admin: true }) as any, {
      tenantId: user.tenantId!,
      jobType: 'menu.approval.notify_client',
      jobId: eventId,
      payload: { event_id: eventId, client_id: client.id },
      errorMessage: err instanceof Error ? err.message : 'Unknown notification failure',
      attempts: 1,
    })
  }

  return { success: true, requestId: request.request_id }
}

/**
 * Get the latest menu approval request for an event (chef view).
 */
export async function getMenuApprovalStatus(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('menu_approval_status, menu_sent_at, menu_approved_at, menu_revision_notes')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { data: latestRequest } = await db
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
  const db: any = createServerClient()

  const { data: rpcResponse, error: rpcError } = await db.rpc('respond_menu_approval_atomic', {
    p_request_id: requestId,
    p_client_id: user.entityId,
    p_new_status: 'approved',
    p_revision_notes: null,
    p_actor_id: user.id,
  })

  if (rpcError || !rpcResponse) {
    throw new Error(rpcError?.message || 'This request has already been responded to')
  }

  const request = rpcResponse as { event_id: string; chef_id: string }

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
    const dbAdmin = createServerClient()
    const { data: eventData } = await dbAdmin
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
    await pushToDLQ(createServerClient({ admin: true }) as any, {
      tenantId: request.chef_id,
      jobType: 'menu.approval.notify_chef',
      jobId: requestId,
      payload: { request_id: requestId, event_id: request.event_id, client_id: user.entityId },
      errorMessage: err instanceof Error ? err.message : 'Unknown notification failure',
      attempts: 1,
    })
  }

  return { success: true }
}

/**
 * Client requests menu revision.
 */
export async function requestMenuRevision(input: RequestRevisionInput) {
  const user = await requireClient()
  const validated = RequestRevisionSchema.parse(input)
  const db: any = createServerClient()

  const { data: rpcResponse, error: rpcError } = await db.rpc('respond_menu_approval_atomic', {
    p_request_id: validated.request_id,
    p_client_id: user.entityId,
    p_new_status: 'revision_requested',
    p_revision_notes: validated.notes,
    p_actor_id: user.id,
  })

  if (rpcError || !rpcResponse) {
    throw new Error(rpcError?.message || 'This request has already been responded to')
  }

  const request = rpcResponse as { event_id: string; chef_id: string }

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

    const dbAdmin = createServerClient()
    const { data: eventData } = await dbAdmin
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
    await pushToDLQ(createServerClient({ admin: true }) as any, {
      tenantId: request.chef_id,
      jobType: 'menu.revision.notify_chef',
      jobId: validated.request_id,
      payload: {
        request_id: validated.request_id,
        event_id: request.event_id,
        client_id: user.entityId,
      },
      errorMessage: err instanceof Error ? err.message : 'Unknown notification failure',
      attempts: 1,
    })
  }

  return { success: true }
}

/**
 * Get the active approval request for a client event (client view).
 */
export async function getClientMenuApprovalRequest(requestId: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data } = (await db
    .from('menu_approval_requests')
    .select('*')
    .eq('id', requestId)
    .eq('client_id', user.entityId)
    .single()) as { data: Record<string, any> | null }

  return data
}
