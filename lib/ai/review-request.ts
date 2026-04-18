'use server'

// Review Request Drafter
// AI crafts a personalized review request message per client.
// Distinct from followup-draft.ts (general follow-up) - this specifically asks for a review.
// Routed to local Ollama (Gemma 4). No cloud dependency.
// Output is DRAFT ONLY - chef must approve before sending.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'

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

export async function draftReviewRequest(eventId: string): Promise<ReviewRequestDraft> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [eventResult, chefResult] = await Promise.all([
    db
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
    db.from('chefs').select('display_name, business_name').eq('id', user.tenantId!).single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const chef = chefResult.data
  const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
  const clientName = client?.full_name ?? 'there'
  const firstName = clientName.split(' ')[0]

  // Get event highlights (menu)
  const menuResult = await (db as any)
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

  const systemPrompt = `You are a personal chef crafting a review request message to a client after a successful event.
Write in first person singular. Warm, genuine, never pushy or salesy.
Reference specific details from the event to make it personal.
The ask should feel natural - like a friend asking for a favor, not a business soliciting reviews.

Rules:
- Open with a personal reference to the specific event (not a generic opener)
- Express genuine enjoyment of the experience
- Ask for a review in one sentence - keep it casual
- Offer to answer any questions
- Sign off naturally (not "Best regards")
- NO exclamation points in the opening line
- NO "I hope this email finds you well"
- Under 120 words for the body`

  const userContent = `Chef: ${chef?.display_name ?? 'Chef'}, ${chef?.business_name ?? ''}
Client first name: ${firstName}
Event: ${event.occasion ?? 'Private Dinner'}
Event date: ${event.event_date ?? 'recently'}
Guest count: ${event.guest_count ?? 'a few'}
Menu highlights: ${menuHighlight ?? 'a custom menu'}
Service style: ${event.service_style ?? 'plated'}

Return JSON: {
  "subject": "email subject line",
  "body": "full message body",
  "shortVersion": "SMS/DM version under 160 characters",
  "reviewPlatformSuggestion": "Google|Yelp|Instagram|Facebook (pick best for a private chef)"
}`

  const parsed = await parseWithOllama(systemPrompt, userContent, ReviewRequestSchema, {
    temperature: 0.7,
    maxTokens: 1024,
  })
  return { ...parsed, generatedAt: new Date().toISOString() }
}
