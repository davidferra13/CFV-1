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
  const supabase = createServerClient()

  // Load event + client + linked menus
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, menu_approval_status,
      clients (id, full_name, email),
      menus (
        id, name,
        menu_dishes (
          dishes (name)
        )
      )
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  const client = (event as any).clients
  if (!client) throw new Error('No client linked to this event')

  // Build menu snapshot
  const menus: any[] = (event as any).menus ?? []
  const menuSnapshot = menus.map((menu: any) => ({
    menu_name: menu.name,
    dishes: (menu.menu_dishes ?? []).map((md: any) => md.dishes?.name).filter(Boolean),
  }))

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
        eventDate: event.event_date
          ? format(new Date(event.event_date), 'MMMM d, yyyy')
          : 'TBD',
        menuSnapshot,
        approvalUrl,
      }),
    })
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, requestId: request.id }
}

/**
 * Get the latest menu approval request for an event (chef view).
 */
export async function getMenuApprovalStatus(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

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
  const supabase = createServerClient()

  const { data: request } = await supabase
    .from('menu_approval_requests')
    .select('id, event_id, chef_id, status')
    .eq('id', requestId)
    .eq('client_id', user.entityId)
    .single()

  if (!request) throw new Error('Approval request not found')
  if (request.status !== 'sent') throw new Error('This request is no longer pending')

  const now = new Date().toISOString()

  // Update the request
  await supabase
    .from('menu_approval_requests')
    .update({ status: 'approved', responded_at: now })
    .eq('id', requestId)
    .eq('client_id', user.entityId)

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
  return { success: true }
}

/**
 * Client requests menu revision.
 */
export async function requestMenuRevision(input: RequestRevisionInput) {
  const user = await requireClient()
  const validated = RequestRevisionSchema.parse(input)
  const supabase = createServerClient()

  const { data: request } = await supabase
    .from('menu_approval_requests')
    .select('id, event_id, status')
    .eq('id', validated.request_id)
    .eq('client_id', user.entityId)
    .single()

  if (!request) throw new Error('Approval request not found')
  if (request.status !== 'sent') throw new Error('This request is no longer pending')

  const now = new Date().toISOString()

  await supabase
    .from('menu_approval_requests')
    .update({
      status: 'revision_requested',
      responded_at: now,
      revision_notes: validated.notes,
    })
    .eq('id', validated.request_id)
    .eq('client_id', user.entityId)

  await supabase
    .from('events')
    .update({
      menu_approval_status: 'revision_requested',
      menu_revision_notes: validated.notes,
    })
    .eq('id', request.event_id)

  revalidatePath(`/my-events/${request.event_id}`)
  return { success: true }
}

/**
 * Get the active approval request for a client event (client view).
 */
export async function getClientMenuApprovalRequest(requestId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('menu_approval_requests')
    .select('*')
    .eq('id', requestId)
    .eq('client_id', user.entityId)
    .single() as { data: Record<string, any> | null }

  return data
}
