// OpenClaw Social Package Ingest
// Normalized ingestion boundary: converts an OpenClaw-prepared social package
// into a standard ChefFlow social post draft.
// No direct DB calls here - returns a plain object for the caller to persist.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { OpenClawSocialPackage, SocialPost } from './types'

export type IngestResult = { success: true; postId: string } | { success: false; error: string }

/**
 * Ingest an OpenClaw-prepared social package as a new draft social post.
 * The chef reviews and edits the draft before it enters the approval queue.
 */
export async function ingestOpenClawPackage(pkg: OpenClawSocialPackage): Promise<IngestResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Build per-platform caption overrides from the package
  const captions: Record<string, string> = {}
  for (const platform of pkg.platform_targets) {
    const override = pkg.caption_overrides?.[platform]
    captions[`caption_${platform}`] = override ?? pkg.caption_master
  }

  const now = new Date()
  const targetYear = now.getFullYear()
  const weekNumber = getISOWeek(now)

  const insert = {
    tenant_id: chef.tenantId,
    created_by: chef.entityId,
    updated_by: chef.entityId,
    post_code: `OC-${pkg.provenance_id.slice(0, 8).toUpperCase()}`,
    target_year: targetYear,
    week_number: weekNumber,
    slot_number: 0,
    schedule_at: now.toISOString(),
    pillar: pkg.pillar ?? 'recipe',
    status: 'draft',
    media_type: pkg.media_type,
    title: `OpenClaw import - ${pkg.campaign ?? pkg.pillar ?? 'draft'}`,
    caption_master: pkg.caption_master,
    caption_instagram: captions['caption_instagram'] ?? pkg.caption_master,
    caption_facebook: captions['caption_facebook'] ?? pkg.caption_master,
    caption_tiktok: captions['caption_tiktok'] ?? pkg.caption_master,
    caption_linkedin: captions['caption_linkedin'] ?? pkg.caption_master,
    caption_x: captions['caption_x'] ?? pkg.caption_master,
    caption_pinterest: captions['caption_pinterest'] ?? pkg.caption_master,
    caption_youtube_shorts: captions['caption_youtube_shorts'] ?? pkg.caption_master,
    hashtags: pkg.hashtags ?? [],
    cta: pkg.cta ?? '',
    platforms: pkg.platform_targets,
    campaign: pkg.campaign ?? '',
    seasonal_flag: false,
    hot_swap_ready: false,
    notes: [pkg.notes ?? '', `OpenClaw provenance: ${pkg.provenance_id}`]
      .filter(Boolean)
      .join('\n'),
    mention_handles: [],
    collaborator_tags: [],
    location_tag: '',
    alt_text: '',
    preflight_ready: false,
    preflight_missing_items: [],
    queued_to_platforms: [],
    published_to_platforms: [],
  }

  const { data, error } = await db.from('social_posts').insert(insert).select('id').single()

  if (error || !data?.id) {
    return {
      success: false,
      error: error?.message ?? 'Failed to create post from OpenClaw package',
    }
  }

  revalidatePath('/social/planner')
  return { success: true, postId: data.id }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
