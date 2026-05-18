import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import {
  reputationToSocialPrompt,
  eventDebriefToSocialPrompt,
  milestoneToSocialPrompt,
  calendarTeaseToSocialPrompt,
} from '@/lib/ai/signal-social-prompts'
import { z } from 'zod'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { SocialPillar } from '@/lib/social/types'

export interface SocialDraftResult {
  type: 'social_post'
  title: string
  caption: string
  pillar: SocialPillar
  hashtags: string[]
  eventId?: string
  mediaHint?: string
  metadata: {
    signalId: string
    signalDomain: string
    confidence: number
  }
}

const SocialSchema = z.object({
  title: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  mediaHint: z.string().optional(),
})

const DOMAIN_TO_PILLAR: Partial<Record<string, SocialPillar>> = {
  reputation: 'social_proof',
  event_debrief: 'behind_scenes',
  pipeline: 'offers',
  calendar: 'offers',
}

const SOCIAL_DOMAINS = new Set(['reputation', 'event_debrief', 'pipeline', 'calendar'])
const DEDUP_DAYS = 14

export async function generateSocialDraft(
  signal: ProactiveSignal,
  tenantId: string
): Promise<SocialDraftResult | null> {
  if (!SOCIAL_DOMAINS.has(signal.domain)) return null

  const db: any = createServerClient()

  // Dedup: check for recent social drafts with same entity
  const cutoff = new Date(Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const entityKey = signal.entityIds[0]
  if (entityKey) {
    const { data: existing } = await db
      .from('social_posts')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['idea', 'draft'])
      .gte('created_at', cutoff)
      .limit(1)

    if (existing?.length) return null
  }

  const { data: profile } = await db
    .from('chef_profiles')
    .select('business_name')
    .eq('tenant_id', tenantId)
    .single()

  const chefName = profile?.business_name ?? 'Chef'
  let prompt: string

  if (signal.domain === 'reputation') {
    prompt = reputationToSocialPrompt(signal, chefName)
  } else if (signal.domain === 'event_debrief') {
    const eventId = signal.entityIds.find((id) => id.startsWith('event_'))
    let eventDetails = {}
    if (eventId) {
      const rawId = eventId.replace('event_', '')
      const { data: ev } = await db
        .from('events')
        .select('occasion, guest_count, location_city')
        .eq('id', rawId)
        .eq('tenant_id', tenantId)
        .single()
      if (ev) {
        eventDetails = {
          occasion: ev.occasion,
          guestCount: ev.guest_count,
          location: ev.location_city,
        }
      }
    }
    prompt = eventDebriefToSocialPrompt(signal, eventDetails)
  } else if (signal.domain === 'pipeline') {
    prompt = milestoneToSocialPrompt(signal, signal.detail)
  } else {
    prompt = calendarTeaseToSocialPrompt(signal, chefName)
  }

  const parsed = await parseWithOllama(prompt, SocialSchema)
  if (!parsed) return null

  const pillar = DOMAIN_TO_PILLAR[signal.domain] ?? 'behind_scenes'
  const eventId = signal.entityIds.find((id) => id.startsWith('event_'))

  return {
    type: 'social_post',
    title: parsed.title,
    caption: parsed.caption,
    pillar,
    hashtags: parsed.hashtags,
    eventId: eventId?.replace('event_', ''),
    mediaHint: parsed.mediaHint,
    metadata: {
      signalId: signal.id,
      signalDomain: signal.domain,
      confidence: signal.confidence,
    },
  }
}
