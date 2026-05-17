'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  PortalExperienceConfig,
  PortalSection,
  PortalInteraction,
  PortalFeedback,
  PortalAccessLog,
  PortalExperienceSummary,
} from './portal-experience-types'

// ---------------------------------------------------------------------------
// 1. getPortalConfig - get portal experience config for an event
// ---------------------------------------------------------------------------
export async function getPortalConfig(
  eventId: string
): Promise<PortalExperienceConfig | null> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('portal_experience_configs')
    .select('*')
    .eq('tenant_id', chef.id)
    .eq('event_id', eventId)
    .single()

  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    eventId: data.event_id,
    visibleSections: (data.visible_sections ?? []) as PortalSection[],
    customBranding: data.custom_branding,
    welcomeMessage: data.welcome_message,
    createdAt: data.created_at,
  }
}

// ---------------------------------------------------------------------------
// 2. updatePortalConfig - upsert portal config for an event
// ---------------------------------------------------------------------------
export async function updatePortalConfig(
  eventId: string,
  visibleSections: PortalSection[],
  welcomeMessage?: string | null,
  customBranding?: Record<string, unknown> | null
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  await db
    .from('portal_experience_configs')
    .upsert(
      {
        tenant_id: chef.id,
        event_id: eventId,
        visible_sections: JSON.stringify(visibleSections),
        welcome_message: welcomeMessage ?? null,
        custom_branding: customBranding ? JSON.stringify(customBranding) : null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,event_id' }
    )

  return { success: true }
}

// ---------------------------------------------------------------------------
// 3. recordPortalInteraction - track client portal usage
// ---------------------------------------------------------------------------
export async function recordPortalInteraction(
  eventId: string,
  clientId: string,
  section: PortalSection,
  action: string
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  await db
    .from('portal_interactions')
    .insert({
      tenant_id: chef.id,
      event_id: eventId,
      client_id: clientId,
      section,
      action,
      created_at: new Date().toISOString(),
    })

  return { success: true }
}

// ---------------------------------------------------------------------------
// 4. recordPortalFeedback - save client feedback
// ---------------------------------------------------------------------------
export async function recordPortalFeedback(
  eventId: string,
  clientId: string,
  rating: number,
  comment?: string | null,
  section?: PortalSection | null
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  await db
    .from('portal_feedback')
    .insert({
      tenant_id: chef.id,
      event_id: eventId,
      client_id: clientId,
      rating,
      comment: comment ?? null,
      section: section ?? null,
      created_at: new Date().toISOString(),
    })

  return { success: true }
}

// ---------------------------------------------------------------------------
// 5. getPortalAccessLog - access history for an event portal
// ---------------------------------------------------------------------------
export async function getPortalAccessLog(
  eventId: string,
  limit: number = 50
): Promise<PortalInteraction[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('portal_interactions')
    .select('*')
    .eq('tenant_id', chef.id)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    clientId: row.client_id,
    section: row.section as PortalSection,
    action: row.action,
    timestamp: row.created_at,
  }))
}

// ---------------------------------------------------------------------------
// 6. getPortalExperienceSummary - aggregated stats for portal usage
// ---------------------------------------------------------------------------
export async function getPortalExperienceSummary(
  eventId: string
): Promise<PortalExperienceSummary> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Get interactions for section view counts
  const { data: interactions } = await db
    .from('portal_interactions')
    .select('section, created_at')
    .eq('tenant_id', chef.id)
    .eq('event_id', eventId)

  const sectionViews: Record<PortalSection, number> = {
    overview: 0,
    menu: 0,
    timeline: 0,
    documents: 0,
    communication: 0,
    payment: 0,
  }

  let lastAccessed: string | null = null
  const rows = interactions ?? []
  for (const row of rows) {
    const sec = row.section as PortalSection
    if (sec in sectionViews) {
      sectionViews[sec]++
    }
    if (!lastAccessed || row.created_at > lastAccessed) {
      lastAccessed = row.created_at
    }
  }

  // Get feedback score
  const { data: feedback } = await db
    .from('portal_feedback')
    .select('rating')
    .eq('tenant_id', chef.id)
    .eq('event_id', eventId)

  const feedbackRows = feedback ?? []
  const ratings = feedbackRows
    .map((r: any) => r.rating)
    .filter((r: number | null) => r !== null) as number[]
  const feedbackScore =
    ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : null

  return {
    eventId,
    totalVisits: rows.length,
    avgDuration: 0, // duration tracking requires client-side instrumentation
    sectionViews,
    feedbackScore,
    lastAccessed,
  }
}

// ---------------------------------------------------------------------------
// 7. getPortalFeedbackSummary - feedback ratings and comments
// ---------------------------------------------------------------------------
export async function getPortalFeedbackSummary(
  eventId?: string
): Promise<PortalFeedback[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('portal_feedback')
    .select('*')
    .eq('tenant_id', chef.id)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data } = await query

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    clientId: row.client_id,
    rating: row.rating,
    comment: row.comment,
    section: row.section as PortalSection | null,
    createdAt: row.created_at,
  }))
}
