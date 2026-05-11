'use server'

import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Remy Profile Management
// ---------------------------------------------------------------------------

/**
 * Get or create the Remy hub_guest_profile for a tenant.
 * Remy needs a profile to author messages in circles (author_profile_id FK).
 * One profile per tenant, created lazily on first circle Remy interaction.
 */
export async function ensureRemyProfile(tenantId: string): Promise<string> {
  const db = createServerClient({ admin: true })
  const remyEmail = `remy+${tenantId}@system.chefflow.internal`

  // Check existing
  const { data: existing } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('email', remyEmail)
    .single()

  if (existing) return existing.id

  // Create Remy profile
  const { data: created, error } = await db
    .from('hub_guest_profiles')
    .insert({
      email: remyEmail,
      display_name: 'Remy',
      avatar_url: '/images/remy-avatar.webp',
      bio: 'Your AI concierge for this dinner circle',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create Remy profile: ${error.message}`)
  return created.id
}

// ---------------------------------------------------------------------------
// Message Posting
// ---------------------------------------------------------------------------

export type RemyVisibility = 'circle' | 'chef_only'
export type RemyIntent = 'question' | 'nudge' | 'welcome' | 'dietary_alert' | 'timeline'

/**
 * Post a Remy message to a circle's feed.
 * Stores in hub_messages with source='remy' and visibility metadata.
 */
export async function postRemyMessage(input: {
  groupId: string
  tenantId: string
  body: string
  visible: RemyVisibility
  intent: RemyIntent
  messageType?: 'text' | 'notification'
  triggeredByMessageId?: string
}): Promise<string> {
  const db = createServerClient({ admin: true })
  const remyProfileId = await ensureRemyProfile(input.tenantId)

  const { data, error } = await db
    .from('hub_messages')
    .insert({
      group_id: input.groupId,
      author_profile_id: remyProfileId,
      message_type: input.messageType ?? 'text',
      body: input.body,
      source: 'remy',
      system_metadata: {
        remy_visible: input.visible,
        remy_intent: input.intent,
        triggered_by_message_id: input.triggeredByMessageId ?? null,
      },
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to post Remy message: ${error.message}`)

  // Update circle last_message_at for feed ordering
  await db
    .from('hub_groups')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: input.body.slice(0, 100),
    })
    .eq('id', input.groupId)

  return data.id
}

// ---------------------------------------------------------------------------
// Welcome Messages
// ---------------------------------------------------------------------------

const WELCOME_MESSAGES: Record<string, string> = {
  circle:
    "I'm Remy, your concierge for this dinner. Ask me about the menu, dietary accommodations, timing, or logistics. You can turn me off anytime in your circle settings.",
  dinner_club:
    "I'm Remy, your concierge for this dinner club. I'll keep track of menus, preferences, and upcoming events.",
  planning:
    "I'm Remy, here to help plan your event. I can help with dietary needs, menu ideas, and coordination.",
  community: "I'm Remy. I'm here if you need help with food questions or keeping things organized.",
  crew: "I'm Remy. I can help coordinate logistics, timing, and prep for this event.",
  bridge: "I'm Remy. I'm here to help with coordination and keep things moving smoothly.",
}

/**
 * Post a Remy welcome message to a newly created circle.
 * Called after circle creation. No-op if Remy already posted a welcome.
 */
export async function postRemyWelcome(
  groupId: string,
  tenantId: string,
  groupType: string
): Promise<void> {
  const db = createServerClient({ admin: true })

  // Check if welcome already posted (dedup)
  const { data: existing } = await db
    .from('hub_messages')
    .select('id')
    .eq('group_id', groupId)
    .eq('source', 'remy')
    .limit(1)
    .single()

  if (existing) return // Already welcomed

  const welcomeText = WELCOME_MESSAGES[groupType] ?? WELCOME_MESSAGES.circle

  await postRemyMessage({
    groupId,
    tenantId,
    body: welcomeText,
    visible: 'circle',
    intent: 'welcome',
  })
}

// ---------------------------------------------------------------------------
// Visibility Determination
// ---------------------------------------------------------------------------

/**
 * Determine whether a Remy response should be visible to all or chef-only.
 * Business questions (margin, cost, profit, pipeline, client history) are chef-only.
 * Everything else is circle-wide.
 */
export async function determineRemyVisibility(
  message: string,
  memberRole: string
): Promise<RemyVisibility> {
  // Only chef can trigger chef_only - guests always get circle visibility
  if (memberRole !== 'chef') return 'circle'

  const businessPatterns = [
    /\b(?:margin|profit|cost|revenue|expense|markup|price\s*point)\b/i,
    /\b(?:pipeline|urgency|attention|lead\s*score)\b/i,
    /\b(?:client\s*history|booking\s*frequency|loyalty\s*tier)\b/i,
    /\b(?:how\s+much\s+(?:am\s+I|do\s+I|will\s+I)\s+mak)/i,
    /\b(?:what(?:'s|s)?\s+my\s+(?:margin|profit|cost|net|gross))\b/i,
    /\b(?:compare\s+(?:this|their)\s+spend)\b/i,
    /\b(?:quote\s+breakdown|total\s+quoted)\b/i,
  ]

  for (const pattern of businessPatterns) {
    if (pattern.test(message)) return 'chef_only'
  }

  return 'circle'
}
