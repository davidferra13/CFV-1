'use server'

// Testimonial Highlight Selection
// AI scans all client feedback/reviews and surfaces the top quotes for portfolio use.
// Routed to Gemini (curating public-intended content, quality judgment needed).
// Output is SUGGESTION ONLY — chef decides which to publish.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

const TestimonialHighlightSchema = z.object({
  clientNameInitial: z.string(),
  eventType: z.string(),
  quote: z.string(),
  fullContext: z.string(),
  why: z.string(),
  bestPlatform: z.string(),
  score: z.number().min(0).max(100),
})

const TestimonialResponseSchema = z.object({
  topTestimonials: z.array(TestimonialHighlightSchema),
  summary: z.string(),
})

export interface TestimonialHighlight {
  clientNameInitial: string // e.g. "S.M." — anonymized for portfolio
  eventType: string
  quote: string // the specific excerpt to feature
  fullContext: string // original full message for chef reference
  why: string // why this quote is compelling
  bestPlatform: string // where to use this (website, Instagram, email signature)
  score: number // 0–100 strength score
}

export interface TestimonialSelectionResult {
  topTestimonials: TestimonialHighlight[]
  portfolioReady: TestimonialHighlight[] // score >= 80 — ready to use as-is
  needsEditing: TestimonialHighlight[] // score 60–79 — good with minor edits
  summary: string
  generatedAt: string
}

// Types for tables not yet in generated types
interface AarRow {
  client_feedback: string | null
  event_id: string | null
  events: { occasion: string | null; clients: { full_name: string } | null } | null
}

interface SurveyRow {
  overall_rating: number | null
  feedback_text: string | null
  event_id: string | null
  events: { occasion: string | null; clients: { full_name: string } | null } | null
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function selectTestimonialHighlights(): Promise<TestimonialSelectionResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Gather AAR client feedback and positive messages
  const [aarResult, messagesResult, surveysResult] = await Promise.all([
    (supabase as any)
      .from('aars')
      .select(
        `
        client_feedback, event_id,
        events(occasion, clients(full_name))
      `
      )
      .eq('tenant_id', user.tenantId!)
      .not('client_feedback', 'is', null)
      .limit(30),
    supabase
      .from('messages')
      .select(
        `
        body, created_at, client_id,
        clients(full_name),
        events(occasion)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .eq('direction', 'inbound')
      .limit(50),
    (supabase as any)
      .from('client_surveys')
      .select(
        `
        overall_rating, feedback_text, event_id,
        events(occasion, clients(full_name))
      `
      )
      .eq('tenant_id', user.tenantId!)
      .gte('overall_rating', 4)
      .limit(20),
  ])

  const aars = (aarResult.data ?? []) as AarRow[]
  const messages = messagesResult.data ?? []
  const surveys = (surveysResult.data ?? []) as SurveyRow[]

  // Combine and format all feedback sources
  const feedbackItems: {
    source: string
    content: string
    clientName: string
    eventType: string
  }[] = []

  for (const aar of aars) {
    if (aar.client_feedback) {
      const event = Array.isArray(aar.events) ? aar.events[0] : aar.events
      const client = event?.clients
        ? Array.isArray(event.clients)
          ? event.clients[0]
          : event.clients
        : null
      feedbackItems.push({
        source: 'aar',
        content: aar.client_feedback,
        clientName: client?.full_name ?? 'Client',
        eventType: event?.occasion ?? 'Private Event',
      })
    }
  }

  for (const survey of surveys) {
    if (survey.feedback_text) {
      const event = Array.isArray(survey.events) ? survey.events[0] : survey.events
      const client = event?.clients
        ? Array.isArray(event.clients)
          ? event.clients[0]
          : event.clients
        : null
      feedbackItems.push({
        source: 'survey',
        content: survey.feedback_text,
        clientName: client?.full_name ?? 'Client',
        eventType: event?.occasion ?? 'Private Event',
      })
    }
  }

  if (feedbackItems.length === 0) {
    return {
      topTestimonials: [],
      portfolioReady: [],
      needsEditing: [],
      summary:
        'No client feedback found yet. Collect feedback through AAR forms or client surveys after events.',
      generatedAt: new Date().toISOString(),
    }
  }

  const prompt = `You are a marketing consultant for a private chef. Evaluate these client feedback excerpts and identify the strongest testimonials for portfolio/marketing use.

Score each on:
  - Specificity (does it mention specific dishes or moments?) +30
  - Emotional impact (does it convey genuine delight?) +25
  - Credibility (does it sound authentic, not generic?) +25
  - Marketability (would a prospective client read this and want to book?) +20

Anonymize client names to initials (e.g. "Sarah M." → "S.M.").
Extract the BEST QUOTE from each piece of feedback — sometimes the full text is too long.
Only include quotes that are genuinely compelling.

Feedback items:
${feedbackItems.map((f, i) => `${i + 1}. [${f.eventType} | ${f.clientName}]:\n"${f.content.slice(0, 500)}"`).join('\n\n')}

Return JSON: {
  "topTestimonials": [{
    "clientNameInitial": "F.L.",
    "eventType": "...",
    "quote": "the specific extracted excerpt (2-4 sentences max)",
    "fullContext": "original full text",
    "why": "one sentence why this is compelling",
    "bestPlatform": "website|Instagram|email signature|all",
    "score": 0-100
  }],
  "summary": "2 sentence summary of testimonial collection quality"
}

Only include testimonials with score >= 60. Sort by score descending.
Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.4, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const raw = JSON.parse(text)
    const validated = TestimonialResponseSchema.safeParse(raw)
    if (!validated.success) {
      console.error('[testimonial-selection] Zod validation failed:', validated.error.format())
      throw new Error('Testimonial response did not match expected format. Please try again.')
    }
    const all: TestimonialHighlight[] = validated.data.topTestimonials
    return {
      topTestimonials: all,
      portfolioReady: all.filter((t) => t.score >= 80),
      needsEditing: all.filter((t) => t.score >= 60 && t.score < 80),
      summary: validated.data.summary,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[testimonial-selection] Failed:', err)
    throw new Error('Could not evaluate testimonials. Please try again.')
  }
}
