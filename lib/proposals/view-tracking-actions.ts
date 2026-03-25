'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type ProposalView = {
  id: string
  quoteId: string
  viewerIp: string
  viewedAt: string
  timeOnPageSeconds: number | null
  sectionsViewed: string[] | null
}

export type ProposalViewAnalytics = {
  quoteId: string
  totalViews: number
  uniqueIps: number
  avgTimeOnPageSeconds: number
  mostViewedSections: { section: string; count: number }[]
  firstViewedAt: string | null
  lastViewedAt: string | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const RecordViewSchema = z.object({
  quoteId: z.string().uuid(),
  viewerIp: z.string().min(1),
  timeOnPageSeconds: z.number().int().min(0).optional(),
  sectionsViewed: z.array(z.string()).optional(),
})

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Record a proposal view. This does NOT require chef auth because
 * it is called from the client-facing proposal page. Uses the
 * admin (service-role) client to bypass RLS.
 */
export async function recordProposalView(
  quoteId: string,
  viewerIp: string,
  timeOnPageSeconds?: number,
  sectionsViewed?: string[]
): Promise<ProposalView> {
  const parsed = RecordViewSchema.parse({
    quoteId,
    viewerIp,
    timeOnPageSeconds,
    sectionsViewed,
  })

  // Use admin client - no auth required for client-side tracking
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('proposal_views')
    .insert({
      quote_id: parsed.quoteId,
      viewer_ip: parsed.viewerIp,
      viewed_at: new Date().toISOString(),
      time_on_page_seconds: parsed.timeOnPageSeconds ?? null,
      sections_viewed: parsed.sectionsViewed ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to record proposal view: ${error.message}`)

  return mapView(data)
}

/**
 * Get analytics for proposal views on a specific quote.
 * Requires chef auth - only the owning chef can see view analytics.
 */
export async function getProposalViewAnalytics(quoteId: string): Promise<ProposalViewAnalytics> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the quote belongs to this chef
  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (quoteError || !quote) {
    throw new Error(`Quote not found or access denied: ${quoteError?.message || 'Not found'}`)
  }

  // Fetch all views for this quote (using admin to avoid RLS issues on proposal_views)
  const adminDb = createServerClient({ admin: true })

  const { data: views, error: viewsError } = await (adminDb as any)
    .from('proposal_views')
    .select('*')
    .eq('quote_id', quoteId)
    .order('viewed_at', { ascending: true })

  if (viewsError) throw new Error(`Failed to fetch view analytics: ${viewsError.message}`)

  const rows: any[] = views || []

  if (rows.length === 0) {
    return {
      quoteId,
      totalViews: 0,
      uniqueIps: 0,
      avgTimeOnPageSeconds: 0,
      mostViewedSections: [],
      firstViewedAt: null,
      lastViewedAt: null,
    }
  }

  // Compute unique IPs
  const uniqueIps = new Set(rows.map((r) => r.viewer_ip)).size

  // Compute average time on page (only rows that have a value)
  const timesOnPage = rows
    .filter((r) => r.time_on_page_seconds != null)
    .map((r) => r.time_on_page_seconds as number)
  const avgTimeOnPageSeconds =
    timesOnPage.length > 0
      ? Math.round(timesOnPage.reduce((a, b) => a + b, 0) / timesOnPage.length)
      : 0

  // Compute most viewed sections
  const sectionCounts: Record<string, number> = {}
  for (const row of rows) {
    const sections: string[] = row.sections_viewed || []
    for (const section of sections) {
      sectionCounts[section] = (sectionCounts[section] || 0) + 1
    }
  }
  const mostViewedSections = Object.entries(sectionCounts)
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count)

  return {
    quoteId,
    totalViews: rows.length,
    uniqueIps,
    avgTimeOnPageSeconds,
    mostViewedSections,
    firstViewedAt: rows[0].viewed_at,
    lastViewedAt: rows[rows.length - 1].viewed_at,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapView(row: any): ProposalView {
  return {
    id: row.id,
    quoteId: row.quote_id,
    viewerIp: row.viewer_ip,
    viewedAt: row.viewed_at,
    timeOnPageSeconds: row.time_on_page_seconds,
    sectionsViewed: row.sections_viewed,
  }
}
