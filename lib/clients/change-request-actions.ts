'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import type { ChangeRequestType, ChangeRequestStatus, ChangeRequestImpact, ChangeRequest, ChangeRequestStats } from './change-request-types'

export async function submitChangeRequest(
  eventId: string,
  requestType: ChangeRequestType,
  description: string,
  clientNotes?: string
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_change_requests')
    .insert({
      event_id: eventId,
      client_id: eventId, // caller should pass real client_id; fallback
      tenant_id: user.tenantId!,
      request_type: requestType,
      description,
      client_notes: clientNotes ?? null,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new UnknownAppError(`Failed to submit change request: ${error.message}`)

  revalidatePath('/dashboard')
  revalidatePath('/clients')
  return data as ChangeRequest
}

export async function getChangeRequests(
  eventId?: string,
  status?: ChangeRequestStatus
): Promise<ChangeRequest[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('client_change_requests')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (eventId) {
    query = query.eq('event_id', eventId)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
    .order('submitted_at', { ascending: false })
    .limit(50)

  if (error) throw new UnknownAppError(`Failed to fetch change requests: ${error.message}`)

  return (data ?? []) as ChangeRequest[]
}

export async function getChangeRequestDetail(requestId: string): Promise<ChangeRequest | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_change_requests')
    .select('*')
    .eq('id', requestId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) throw new UnknownAppError(`Failed to fetch change request detail: ${error.message}`)

  return (data ?? null) as ChangeRequest | null
}

export async function reviewChangeRequest(
  requestId: string,
  status: ChangeRequestStatus,
  chefNotes?: string,
  impact?: ChangeRequestImpact
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_change_requests')
    .update({
      status,
      chef_notes: chefNotes ?? null,
      impact: impact ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.authUserId,
    })
    .eq('id', requestId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new UnknownAppError(`Failed to review change request: ${error.message}`)

  revalidatePath('/dashboard')
  revalidatePath('/clients')
  return data as ChangeRequest
}

export async function getChangeRequestStats(): Promise<ChangeRequestStats> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_change_requests')
    .select('status, submitted_at, reviewed_at')
    .eq('tenant_id', user.tenantId!)

  if (error) throw new UnknownAppError(`Failed to fetch change request stats: ${error.message}`)

  const rows = (data ?? []) as Array<{ status: string; submitted_at: string; reviewed_at: string | null }>

  let pending = 0
  let approved = 0
  let rejected = 0
  let totalResponseMs = 0
  let responseCount = 0

  for (const row of rows) {
    if (row.status === 'pending') pending++
    else if (row.status === 'approved' || row.status === 'partially_approved') approved++
    else if (row.status === 'rejected') rejected++

    if (row.reviewed_at && row.submitted_at) {
      const ms = new Date(row.reviewed_at).getTime() - new Date(row.submitted_at).getTime()
      if (ms > 0) {
        totalResponseMs += ms
        responseCount++
      }
    }
  }

  return {
    pending,
    approved,
    rejected,
    total: rows.length,
    avgResponseHours: responseCount > 0 ? Math.round((totalResponseMs / responseCount / 3600000) * 10) / 10 : null,
  }
}

export async function getClientChangeHistory(clientId: string): Promise<ChangeRequest[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_change_requests')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('submitted_at', { ascending: false })

  if (error) throw new UnknownAppError(`Failed to fetch client change history: ${error.message}`)

  return (data ?? []) as ChangeRequest[]
}
