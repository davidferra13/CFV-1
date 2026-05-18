import { createServerClient } from '@/lib/db/server'
import { generateSocialDraft, type SocialDraftResult } from './draft-generators/social-draft'
import type { ProactiveSignal } from './types'

const MIN_CONFIDENCE = 0.7
const MIN_URGENCY = 3
const SOCIAL_DOMAINS = new Set(['reputation', 'event_debrief', 'pipeline', 'calendar'])

export async function processSocialSignals(
  signals: ProactiveSignal[],
  tenantId: string
): Promise<SocialDraftResult[]> {
  const qualifying = signals.filter(
    (s) =>
      SOCIAL_DOMAINS.has(s.domain) && s.confidence >= MIN_CONFIDENCE && s.urgency >= MIN_URGENCY
  )

  const results: SocialDraftResult[] = []
  for (const signal of qualifying) {
    const draft = await generateSocialDraft(signal, tenantId)
    if (draft) results.push(draft)
  }

  return results
}

export async function persistSocialDrafts(
  drafts: SocialDraftResult[],
  tenantId: string,
  userId: string
): Promise<string[]> {
  if (!drafts.length) return []

  const db: any = createServerClient()
  const ids: string[] = []

  for (const draft of drafts) {
    const now = new Date().toISOString()
    const weekNumber = Math.ceil(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    )

    const { data, error } = await db
      .from('social_posts')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        target_year: new Date().getFullYear(),
        week_number: weekNumber,
        slot_number: 0,
        pillar: draft.pillar,
        status: 'idea',
        media_type: 'image',
        title: draft.title,
        caption_master: draft.caption,
        caption_instagram: draft.caption,
        caption_facebook: draft.caption,
        caption_tiktok: '',
        caption_linkedin: '',
        caption_x: draft.caption.slice(0, 280),
        caption_pinterest: '',
        caption_youtube_shorts: '',
        hashtags: draft.hashtags,
        cta: '',
        preflight_ready: false,
        preflight_missing_items: ['needs_media', 'needs_review'],
        queued_to_platforms: [],
        published_to_platforms: [],
        publish_checklist_notes: draft.mediaHint ?? '',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (data?.id) ids.push(data.id)
    if (error) console.error('[social-bridge] insert failed:', error.message)
  }

  return ids
}
