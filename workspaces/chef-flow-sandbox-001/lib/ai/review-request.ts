'use server'

// Review Request Drafter
// AI crafts a personalized review request message per client.
// Distinct from followup-draft.ts (general follow-up) — this specifically asks for a review.
// Routed to OLLAMA (contains client PII — names, event details, menu items).
// Output is DRAFT ONLY — chef must approve before sending.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseWithOllama } from './parse-ollama'

export interface ReviewRequestDraft {
  subject: string
  body: string // full message body
  shortVersion: string // SMS/social version under 160 chars
  reviewPlatformSuggestion: string // e.g. "Google", "Yelp", "Instagram"
  generatedAt: string
}

const ReviewRequestSchema = z.object({
  subject: z.string(),
  body: z.string(),
  shortVersion: z.string(),
  reviewPlatformSuggestion: z.string(),
})

const SYSTEM_PROMPT = `You are a drafting assistant for a private chef. You craft personalized review request messages.

RULES:
- Write in first person singular (I, me, my). Warm, genuine, never pushy or salesy.
- Reference specific details from the event to make it personal.
- The ask should feel natural, like a friend asking for a favor.
- NO exclamation points in the opening line.
- NO "I hope this email finds you well" or any generic opener.
- NO em dashes. Use commas, periods, semicolons, or colons instead.
- Under 120 words for the body.
- Sign off naturally (not "Best regards").
- shortVersion must be under 160 characters for SMS/DM.

Return ONLY valid JSON:
{
  "subject": "email subject line",
  "body": "full message body",
  "shortVersion": "SMS/DM version under 160 characters",
  "reviewPlatformSuggestion": "Google|Yelp|Instagram|Facebook (pick best for a private chef)"
}`

export async function draftReviewRequest(eventId: string): Promise<ReviewRequestDraft> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [eventResult, chefResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        `
        occasion, guest_count, event_date, service_style,
        client_id,
        clients(full_name)
      `
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase.from('chefs').select('display_name, business_name').eq('id', user.tenantId!).single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const chef = chefResult.data
  const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
  const clientName = client?.full_name ?? 'there'
  const firstName = clientName.split(' ')[0]

  // Get event highlights (menu)
  const menuResult = await (supabase as any)
    .from('event_menu_components')
    .select('name, course_type')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(5)

  const menuItems = (menuResult.data ?? []) as Array<{ name: string; course_type: string | null }>

  const menuHighlight =
    menuItems.length > 0
      ? menuItems
          .slice(0, 3)
          .map((m) => m.name)
          .join(', ')
      : null

  const userPrompt = `Draft a review request for this event:

Chef: ${chef?.display_name ?? 'Chef'}, ${chef?.business_name ?? ''}
Client first name: ${firstName}
Event: ${event.occasion ?? 'Private Dinner'}
Event date: ${event.event_date ?? 'recently'}
Guest count: ${event.guest_count ?? 'a few'}
Menu highlights: ${menuHighlight ?? 'a custom menu'}
Service style: ${event.service_style ?? 'plated'}

Open with a personal reference to the specific event. Express genuine enjoyment. Ask for a review in one sentence, casually. Sign off naturally.`

  const parsed = await parseWithOllama(SYSTEM_PROMPT, userPrompt, ReviewRequestSchema, {
    modelTier: 'standard',
    timeoutMs: 60_000,
    maxTokens: 1024,
  })

  return { ...parsed, generatedAt: new Date().toISOString() }
}
