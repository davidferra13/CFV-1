// Client-Provided Menus: server actions for submission and chef review.
// Mixed auth: client-facing actions use token-based auth (no login required).
// Chef-facing actions use standard requireChef() tenant-scoped auth.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getClientPortalAccess } from '@/lib/client-portal/actions'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  ChefReviewAction,
  ClientMenuInput,
  ClientMenuSubmission,
  SubmissionStatus,
} from './client-menu-types'

// ─── Schemas ────────────────────────────────────────────────────────────────

const ClientMenuInputSchema = z.object({
  text_description: z.string().min(1, 'A description is required').max(5000),
  dish_list: z.array(z.string().min(1)).min(1, 'At least one dish is required'),
  dietary_notes: z.string().max(2000).optional(),
  inspiration_urls: z.array(z.string().url()).max(10).optional(),
})

const ReviewActionSchema = z.enum(['accept', 'reject', 'modify', 'counter_propose'])

// ─── Client-Facing Actions (token-based auth) ──────────────────────────────

/**
 * Client submits a menu idea for an event. Token-based auth, no login needed.
 * Creates a submission record with origin_type context for provenance tracking.
 */
export async function submitClientMenu(
  eventId: string,
  input: ClientMenuInput,
  clientToken: string
): Promise<{ submission: ClientMenuSubmission } | { error: string }> {
  const access = await getClientPortalAccess(clientToken)
  if (!access) return { error: 'Invalid or expired portal link.' }

  const parsed = ClientMenuInputSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid input.' }

  const db: any = createServerClient({ admin: true })

  // Verify event belongs to this tenant and client has access
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', access.tenantId)
    .maybeSingle()

  if (!event) return { error: 'Event not found.' }

  const { data: submission, error: insertErr } = await db
    .from('client_menu_submissions')
    .insert({
      event_id: eventId,
      tenant_id: access.tenantId,
      submitted_by_token: access.clientId,
      status: 'pending' as SubmissionStatus,
      raw_text: parsed.data.text_description,
      parsed_dishes: parsed.data.dish_list,
      dietary_notes: parsed.data.dietary_notes || null,
      inspiration_urls: parsed.data.inspiration_urls || null,
    })
    .select('*')
    .single()

  if (insertErr || !submission) {
    return { error: 'Failed to submit menu. Please try again.' }
  }

  revalidatePath('/menus')
  return { submission }
}

/**
 * Client checks the status of their submission. Token-based auth.
 */
export async function getSubmissionStatus(
  submissionId: string,
  clientToken: string
): Promise<ClientMenuSubmission | null> {
  const access = await getClientPortalAccess(clientToken)
  if (!access) return null

  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('client_menu_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('submitted_by_token', access.clientId)
    .maybeSingle()

  return data || null
}

// ─── Chef-Facing Actions (authenticated) ────────────────────────────────────

/**
 * Get all client menu submissions for an event. Chef auth-gated.
 */
export async function getClientMenuSubmissions(
  eventId: string
): Promise<ClientMenuSubmission[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data } = await db
    .from('client_menu_submissions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return data || []
}

/**
 * Chef reviews a client menu submission: accept, reject, or modify.
 * For counter-proposals, use counterProposeMenu() instead.
 */
export async function reviewClientMenu(
  submissionId: string,
  action: ChefReviewAction,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const parsedAction = ReviewActionSchema.safeParse(action)
  if (!parsedAction.success) return { success: false, error: 'Invalid review action.' }

  // Verify submission exists and belongs to this tenant
  const { data: submission } = await db
    .from('client_menu_submissions')
    .select('id, status')
    .eq('id', submissionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!submission) return { success: false, error: 'Submission not found.' }

  const statusMap: Record<string, SubmissionStatus> = {
    accept: 'accepted',
    reject: 'rejected',
    modify: 'modified',
    counter_propose: 'counter_proposed',
  }

  const { error: updateErr } = await db
    .from('client_menu_submissions')
    .update({
      status: statusMap[parsedAction.data],
      chef_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('tenant_id', tenantId)

  if (updateErr) return { success: false, error: 'Failed to update submission.' }

  revalidatePath('/menus')
  return { success: true }
}

/**
 * Chef links a counter-proposal menu to a client submission.
 * Sets status to 'counter_proposed' and associates the chef's alternative menu.
 */
export async function counterProposeMenu(
  submissionId: string,
  menuId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify submission exists and belongs to this tenant
  const { data: submission } = await db
    .from('client_menu_submissions')
    .select('id')
    .eq('id', submissionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!submission) return { success: false, error: 'Submission not found.' }

  // Verify menu exists and belongs to this tenant
  const { data: menu } = await db
    .from('menus')
    .select('id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!menu) return { success: false, error: 'Menu not found.' }

  const { error: updateErr } = await db
    .from('client_menu_submissions')
    .update({
      status: 'counter_proposed' as SubmissionStatus,
      counter_menu_id: menuId,
      chef_notes: notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('tenant_id', tenantId)

  if (updateErr) return { success: false, error: 'Failed to save counter-proposal.' }

  revalidatePath('/menus')
  return { success: true }
}
