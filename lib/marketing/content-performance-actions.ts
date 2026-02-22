// Content Performance Server Actions
// Chef-only: Record and analyze social media content performance metrics

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const PlatformEnum = z.enum(['instagram', 'tiktok', 'facebook', 'youtube', 'twitter', 'other'])

const RecordContentPerformanceSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  platform: PlatformEnum,
  impressions: z.number().int().nonnegative('Impressions must be non-negative'),
  reach: z.number().int().nonnegative('Reach must be non-negative'),
  saves: z.number().int().nonnegative().optional(),
  shares: z.number().int().nonnegative().optional(),
  inquiryAttributed: z.boolean().optional(),
})

export type RecordContentPerformanceInput = z.infer<typeof RecordContentPerformanceSchema>
export type Platform = z.infer<typeof PlatformEnum>

// ============================================
// RETURN TYPES
// ============================================

export type ContentPost = {
  id: string
  postId: string
  platform: Platform
  impressions: number
  reach: number
  saves: number
  shares: number
  inquiryAttributed: boolean
  recordedAt: string
  createdAt: string
}

export type PlatformROI = {
  platform: Platform
  totalPosts: number
  totalImpressions: number
  totalReach: number
  totalSaves: number
  totalShares: number
  inquiryCount: number
  inquiryConversionRate: number
}

export type ContentROISummary = {
  platforms: PlatformROI[]
  totalPosts: number
  totalInquiries: number
  overallConversionRate: number
}

export type RankedContent = ContentPost & {
  engagementScore: number
}

// ============================================
// HELPERS
// ============================================

function mapContentPost(row: any): ContentPost {
  return {
    id: row.id,
    postId: row.post_id,
    platform: row.platform,
    impressions: row.impressions,
    reach: row.reach,
    saves: row.saves ?? 0,
    shares: row.shares ?? 0,
    inquiryAttributed: row.inquiry_attributed ?? false,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

/**
 * Compute engagement score: impressions + saves*3 + shares*2
 */
function computeEngagementScore(row: any): number {
  return (row.impressions ?? 0) + (row.saves ?? 0) * 3 + (row.shares ?? 0) * 2
}

// ============================================
// ACTIONS
// ============================================

/**
 * Record performance metrics for a social media post.
 */
export async function recordContentPerformance(input: RecordContentPerformanceInput) {
  const user = await requireChef()
  const validated = RecordContentPerformanceSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('content_performance')
    .insert({
      chef_id: user.tenantId!,
      post_id: validated.postId,
      platform: validated.platform,
      impressions: validated.impressions,
      reach: validated.reach,
      saves: validated.saves ?? 0,
      shares: validated.shares ?? 0,
      inquiry_attributed: validated.inquiryAttributed ?? false,
    })
    .select()
    .single()

  if (error) {
    console.error('[recordContentPerformance] Error:', error)
    throw new Error('Failed to record content performance')
  }

  revalidatePath('/marketing')
  return { success: true, post: mapContentPost(data) }
}

/**
 * Get aggregated content ROI stats by platform.
 * Optionally filter by date range. Returns inquiry conversion rates.
 */
export async function getContentROI(
  startDate?: string,
  endDate?: string
): Promise<ContentROISummary> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase.from('content_performance').select('*').eq('chef_id', user.tenantId!)

  if (startDate) {
    query = query.gte('recorded_at', startDate)
  }
  if (endDate) {
    query = query.lte('recorded_at', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getContentROI] Error:', error)
    throw new Error('Failed to fetch content ROI')
  }

  const rows = data ?? []

  // Aggregate by platform
  const platformMap: Record<string, PlatformROI> = {}

  for (const row of rows) {
    const p = row.platform as Platform
    if (!platformMap[p]) {
      platformMap[p] = {
        platform: p,
        totalPosts: 0,
        totalImpressions: 0,
        totalReach: 0,
        totalSaves: 0,
        totalShares: 0,
        inquiryCount: 0,
        inquiryConversionRate: 0,
      }
    }

    const agg = platformMap[p]
    agg.totalPosts++
    agg.totalImpressions += row.impressions ?? 0
    agg.totalReach += row.reach ?? 0
    agg.totalSaves += row.saves ?? 0
    agg.totalShares += row.shares ?? 0
    if (row.inquiry_attributed) agg.inquiryCount++
  }

  // Compute conversion rates
  const platforms = Object.values(platformMap).map((p) => ({
    ...p,
    inquiryConversionRate: p.totalPosts > 0 ? p.inquiryCount / p.totalPosts : 0,
  }))

  const totalPosts = rows.length
  const totalInquiries = rows.filter((r: any) => r.inquiry_attributed).length

  return {
    platforms,
    totalPosts,
    totalInquiries,
    overallConversionRate: totalPosts > 0 ? totalInquiries / totalPosts : 0,
  }
}

/**
 * Get the best performing content posts ranked by engagement score.
 * Engagement = impressions + saves*3 + shares*2
 */
export async function getBestPerformingContent(limit = 10): Promise<RankedContent[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('content_performance')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('recorded_at', { ascending: false })

  if (error) {
    console.error('[getBestPerformingContent] Error:', error)
    throw new Error('Failed to fetch content performance')
  }

  const rows = data ?? []

  // Compute engagement score and sort
  const ranked: RankedContent[] = rows
    .map((row: any) => ({
      ...mapContentPost(row),
      engagementScore: computeEngagementScore(row),
    }))
    .sort((a: RankedContent, b: RankedContent) => b.engagementScore - a.engagementScore)
    .slice(0, limit)

  return ranked
}
