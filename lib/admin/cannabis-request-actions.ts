'use server'

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logAdminAction } from './audit'
import { revalidatePath } from 'next/cache'

// ─── Fetch All Cannabis Dinner Requests ─────────────────────────────────────

export async function getAllCannabisRequests() {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('cannabis_dinner_requests')
    .select(
      `
      id, auth_user_id, client_id, tenant_id, status,
      preferred_date, guest_count, location_notes, format_preference,
      menu_preferences, cannabis_experience_goal, desired_intensity,
      guest_onboarding_needed, notes, admin_notes, reviewed_by, reviewed_at,
      converted_event_id, created_at
    `
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error('Failed to fetch cannabis requests: ' + error.message)

  // Enrich with client info
  const requests = data ?? []
  if (requests.length === 0) return []

  const clientIds = [...new Set(requests.map((r: any) => r.client_id))]
  const { data: clients } = await db.from('clients').select('id, name, email').in('id', clientIds)

  const clientMap = Object.fromEntries((clients ?? []).map((c: any) => [c.id, c]))

  return requests.map((r: any) => ({
    ...r,
    client_name: clientMap[r.client_id]?.name ?? null,
    client_email: clientMap[r.client_id]?.email ?? null,
  })) as CannabisRequest[]
}

export interface CannabisRequest {
  id: string
  auth_user_id: string
  client_id: string
  tenant_id: string
  status: 'submitted' | 'under_review' | 'approved' | 'declined' | 'converted'
  preferred_date: string | null
  guest_count: number | null
  location_notes: string | null
  format_preference: string | null
  menu_preferences: string | null
  cannabis_experience_goal: string | null
  desired_intensity: string | null
  guest_onboarding_needed: boolean
  notes: string | null
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  converted_event_id: string | null
  created_at: string
  client_name: string | null
  client_email: string | null
}

export async function reviewCannabisRequest(input: {
  requestId: string
  decision: 'approved' | 'declined'
  adminNotes?: string
}) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { data: request, error: fetchErr } = await db
    .from('cannabis_dinner_requests')
    .select('*')
    .eq('id', input.requestId)
    .single()

  if (fetchErr || !request) throw new Error('Request not found')
  if (request.status !== 'submitted' && request.status !== 'under_review') {
    throw new Error('Request already reviewed')
  }

  const { error } = await db
    .from('cannabis_dinner_requests')
    .update({
      status: input.decision,
      admin_notes: input.adminNotes ?? null,
      reviewed_by: admin.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)

  if (error) throw new Error('Failed to review request: ' + error.message)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: input.decision === 'approved' ? 'cannabis_tier_granted' : 'cannabis_tier_revoked',
    targetId: input.requestId,
    targetType: 'cannabis_dinner_request',
    details: { decision: input.decision, notes: input.adminNotes },
  })

  revalidatePath('/admin/cannabis/access')
  return { success: true }
}

export async function convertCannabisRequestToEvent(input: { requestId: string }) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { data: request, error: fetchErr } = await db
    .from('cannabis_dinner_requests')
    .select('*')
    .eq('id', input.requestId)
    .eq('status', 'approved')
    .single()

  if (fetchErr || !request) {
    throw new Error('Approved request not found')
  }

  const { data: event, error: eventErr } = await db
    .from('events')
    .insert({
      tenant_id: request.tenant_id,
      client_id: request.client_id,
      status: 'draft',
      cannabis_preference: true,
      event_date: request.preferred_date ?? null,
      guest_count: request.guest_count ?? null,
      occasion: 'Cannabis Dinner',
      notes:
        [request.cannabis_experience_goal, request.menu_preferences, request.notes]
          .filter(Boolean)
          .join('\n\n') || null,
      location_notes: request.location_notes ?? null,
    })
    .select('id')
    .single()

  if (eventErr || !event)
    throw new Error('Failed to create event: ' + (eventErr?.message ?? 'unknown'))

  await db
    .from('cannabis_dinner_requests')
    .update({
      status: 'converted',
      converted_event_id: event.id,
    })
    .eq('id', input.requestId)

  if (request.desired_intensity) {
    const categoryMap: Record<string, string> = {
      micro: 'micro_dose',
      light: 'cannabis_friendly',
      moderate: 'infused_menu',
      full: 'infused_menu',
      custom: 'cannabis_friendly',
    }
    await db.from('cannabis_event_details').insert({
      event_id: event.id,
      tenant_id: request.tenant_id,
      cannabis_category: categoryMap[request.desired_intensity] ?? 'cannabis_friendly',
    })
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_tier_granted',
    targetId: event.id,
    targetType: 'event',
    details: { convertedFrom: input.requestId },
  })

  revalidatePath('/admin/cannabis/access')
  return { success: true, eventId: event.id }
}
