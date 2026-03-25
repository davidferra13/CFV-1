'use server'

import { createServerClient } from '@/lib/db/server'
import { getCircleForContext } from './circle-lookup'

// ---------------------------------------------------------------------------
// Email-to-Circle Routing
// Routes inbound email replies into the Dinner Circle as messages.
// Called from Gmail sync when a thread reply is identified.
// ---------------------------------------------------------------------------

/**
 * Find or create a hub guest profile for an email sender,
 * and ensure they're a member of the specified circle.
 */
export async function findOrCreateClientHubProfile(input: {
  email: string
  name: string
  circleGroupId: string
}): Promise<{ profileToken: string; profileId: string }> {
  const db = createServerClient({ admin: true })
  const normalizedEmail = input.email.toLowerCase().trim()

  // Try to find existing profile by email
  const { data: existing } = await db
    .from('hub_guest_profiles')
    .select('id, profile_token')
    .eq('email_normalized', normalizedEmail)
    .limit(1)
    .maybeSingle()

  let profileId: string
  let profileToken: string

  if (existing) {
    profileId = existing.id
    profileToken = existing.profile_token
  } else {
    // Create new guest profile
    const { data: created, error } = await db
      .from('hub_guest_profiles')
      .insert({
        email: input.email,
        email_normalized: normalizedEmail,
        display_name: input.name || input.email.split('@')[0],
        notifications_enabled: true,
      })
      .select('id, profile_token')
      .single()

    if (error || !created) {
      throw new Error(`Failed to create hub profile: ${error?.message}`)
    }

    profileId = created.id
    profileToken = created.profile_token
  }

  // Ensure they're a member of the circle
  const { data: membership } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', input.circleGroupId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!membership) {
    await db.from('hub_group_members').insert({
      group_id: input.circleGroupId,
      profile_id: profileId,
      role: 'member',
      can_post: true,
      can_invite: false,
      can_pin: false,
    })
  }

  return { profileToken, profileId }
}

/**
 * Post an email reply as a message in the Dinner Circle.
 * Called from Gmail sync after identifying an existing inquiry thread.
 *
 * The message is tagged with source='email' so the UI shows a "via email" badge.
 * Notifications to other circle members are skipped since the chef already sees
 * the email in their inbox.
 */
export async function routeEmailReplyToCircle(input: {
  inquiryId: string
  eventId?: string | null
  senderEmail: string
  senderName: string
  emailBody: string
}): Promise<boolean> {
  try {
    const circle = await getCircleForContext({
      inquiryId: input.inquiryId,
      eventId: input.eventId,
    })

    if (!circle) return false

    const { profileId } = await findOrCreateClientHubProfile({
      email: input.senderEmail,
      name: input.senderName,
      circleGroupId: circle.groupId,
    })

    const cleanedBody = cleanEmailBody(input.emailBody)
    if (!cleanedBody || cleanedBody.length < 2) return false

    const db = createServerClient({ admin: true })
    const { error } = await db.from('hub_messages').insert({
      group_id: circle.groupId,
      author_profile_id: profileId,
      message_type: 'text',
      body: cleanedBody,
      source: 'email',
    })

    if (error) {
      console.error('[email-to-circle] Failed to insert message:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[non-blocking] Failed to route email reply to circle', err)
    return false
  }
}

/**
 * Strip email signatures, quoted text, and HTML from an email body.
 * Returns just the reply content.
 */
function cleanEmailBody(body: string): string {
  let cleaned = body

  // Remove HTML tags if present
  cleaned = cleaned.replace(/<[^>]+>/g, '')

  // Remove common email signature delimiters and everything after
  const sigPatterns = [
    /\n--\s*\n[\s\S]*/, // "-- " delimiter
    /\nSent from my .*/i, // "Sent from my iPhone/Android"
    /\nGet Outlook .*/i, // "Get Outlook for iOS"
    /\n_{3,}[\s\S]*/, // "___" line
    /\n-{3,}[\s\S]*/, // "---" line
  ]

  for (const pattern of sigPatterns) {
    cleaned = cleaned.replace(pattern, '')
  }

  // Remove quoted text (lines starting with ">")
  cleaned = cleaned
    .split('\n')
    .filter((line) => !line.startsWith('>'))
    .join('\n')

  // Remove "On [date], [name] wrote:" blocks
  cleaned = cleaned.replace(/On .+wrote:\s*$/im, '')

  // Trim whitespace
  cleaned = cleaned.trim()

  // Collapse multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned
}
