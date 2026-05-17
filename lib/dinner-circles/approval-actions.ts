'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { JoinRequest, ApprovalMode, RequestStatus } from './approval-types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const GuestInputSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  email: z.string().email().max(320).transform((s) => s.toLowerCase().trim()),
  phone: z.string().max(30).optional().transform((s) => s?.trim() || undefined),
  message: z.string().max(1000).optional().transform((s) => s?.trim() || undefined),
})

// ---------------------------------------------------------------------------
// requestCircleJoin - Guest requests to join (pending approval)
// No auth required (public guest action)
// ---------------------------------------------------------------------------

export async function requestCircleJoin(
  circleId: string,
  rawGuest: { name: string; email: string; phone?: string; message?: string }
): Promise<{ success: boolean; requestId?: string; autoApproved?: boolean; error?: string }> {
  const guest = GuestInputSchema.parse(rawGuest)
  const db: any = createServerClient({ admin: true })

  // Verify circle exists and is active
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, approval_mode, is_active')
    .eq('id', circleId)
    .single()

  if (!circle || !circle.is_active) {
    return { success: false, error: 'Circle not found or inactive' }
  }

  // Check for duplicate pending request from same email
  const { data: existing } = await db
    .from('circle_join_requests')
    .select('id, status')
    .eq('circle_id', circleId)
    .ilike('guest_email', guest.email)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    if (existing.status === 'approved') {
      return { success: true, requestId: existing.id, autoApproved: true }
    }
    return { success: false, error: 'A pending request already exists for this email' }
  }

  const approvalMode: ApprovalMode = circle.approval_mode || 'auto'
  const status: RequestStatus = approvalMode === 'auto' ? 'approved' : 'pending'

  const { data: request, error: insertError } = await db
    .from('circle_join_requests')
    .insert({
      circle_id: circleId,
      guest_name: guest.name,
      guest_email: guest.email,
      guest_phone: guest.phone || null,
      message: guest.message || null,
      status,
      reviewed_at: approvalMode === 'auto' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (insertError) {
    return { success: false, error: 'Failed to submit join request' }
  }

  return {
    success: true,
    requestId: request.id,
    autoApproved: approvalMode === 'auto',
  }
}

// ---------------------------------------------------------------------------
// approveJoinRequest - Chef/host approves a pending request
// ---------------------------------------------------------------------------

export async function approveJoinRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load request and verify it belongs to chef's circle
  const { data: request } = await db
    .from('circle_join_requests')
    .select('id, circle_id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) {
    return { success: false, error: 'Request not found or already reviewed' }
  }

  // Verify circle belongs to this chef's tenant
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, tenant_id')
    .eq('id', request.circle_id)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!circle) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error: updateError } = await db
    .from('circle_join_requests')
    .update({
      status: 'approved',
      reviewed_by: user.entityId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (updateError) {
    return { success: false, error: 'Failed to approve request' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// ---------------------------------------------------------------------------
// rejectJoinRequest - Chef/host rejects a pending request
// ---------------------------------------------------------------------------

export async function rejectJoinRequest(
  requestId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: request } = await db
    .from('circle_join_requests')
    .select('id, circle_id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) {
    return { success: false, error: 'Request not found or already reviewed' }
  }

  const { data: circle } = await db
    .from('hub_groups')
    .select('id, tenant_id')
    .eq('id', request.circle_id)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!circle) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error: updateError } = await db
    .from('circle_join_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.entityId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason?.trim() || null,
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (updateError) {
    return { success: false, error: 'Failed to reject request' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// ---------------------------------------------------------------------------
// getPendingRequests - All pending join requests for a circle
// ---------------------------------------------------------------------------

export async function getPendingRequests(
  circleId: string
): Promise<JoinRequest[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify circle belongs to this chef
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, tenant_id')
    .eq('id', circleId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!circle) return []

  const { data, error } = await db
    .from('circle_join_requests')
    .select(
      'id, circle_id, guest_name, guest_email, guest_phone, message, status, reviewed_by, reviewed_at, rejection_reason, created_at'
    )
    .eq('circle_id', circleId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return []

  return (data ?? []).map((r: any) => ({
    id: r.id,
    circleId: r.circle_id,
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    guestPhone: r.guest_phone,
    message: r.message,
    status: r.status as RequestStatus,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    rejectionReason: r.rejection_reason,
    createdAt: r.created_at,
  }))
}

// ---------------------------------------------------------------------------
// getRequestStatus - Check status of a join request (public, no auth)
// ---------------------------------------------------------------------------

export async function getRequestStatus(
  requestId: string
): Promise<{ status: RequestStatus; rejectionReason: string | null } | null> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('circle_join_requests')
    .select('status, rejection_reason')
    .eq('id', requestId)
    .single()

  if (!data) return null

  return {
    status: data.status as RequestStatus,
    rejectionReason: data.rejection_reason,
  }
}

// ---------------------------------------------------------------------------
// setCircleApprovalMode - Toggle between 'auto' and 'manual' approval
// ---------------------------------------------------------------------------

export async function setCircleApprovalMode(
  circleId: string,
  mode: ApprovalMode
): Promise<{ success: boolean; error?: string }> {
  if (mode !== 'auto' && mode !== 'manual') {
    return { success: false, error: 'Invalid mode. Use "auto" or "manual".' }
  }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data: circle } = await db
    .from('hub_groups')
    .select('id, tenant_id')
    .eq('id', circleId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!circle) {
    return { success: false, error: 'Circle not found or unauthorized' }
  }

  const { error: updateError } = await db
    .from('hub_groups')
    .update({ approval_mode: mode })
    .eq('id', circleId)

  if (updateError) {
    return { success: false, error: 'Failed to update approval mode' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
