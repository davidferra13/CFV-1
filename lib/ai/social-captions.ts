'use server'

// Social Media Caption Generator
// Generates Instagram/social captions from event details, menu, and tone.
// Routed to Gemini (creative marketing copy, not PII).
// Output is DRAFT ONLY - chef picks and edits before posting.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export type CaptionTone = 'warm_personal' | 'elegant_professional' | 'playful_casual'

export interface SocialCaption {
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin'
  tone: CaptionTone
  caption: string
  hashtags: string[]
  characterCount: number
}

export interface SocialCaptionsResult {
  captions: SocialCaption[]
  instagramFirst: string // best caption for IG with hashtags
  shortVersion: string // under 140 chars for Twitter/X
  generatedAt: string
}

interface MenuComponentRow {
  name: string
  course_type: string | null
  description: string | null
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function generateSocialCaptions(
  eventId: string,
  tone: CaptionTone = 'warm_personal'
): Promise<SocialCaptionsResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [eventResult, menuResult, chefResult] = await Promise.all([
    supabase
      .from('events')
      .select('occasion, guest_count, event_date, service_style, location_address')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (supabase as any)
      .from('event_menu_components')
      .select('name, course_type, description')
      .eq('event_id', eventId)
      .limit(8),
    supabase
      .from('chefs')
      .select('display_name, business_name, tagline')
      .eq('id', user.tenantId!)
      .single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menu = (menuResult.data ?? []) as MenuComponentRow[]
  const chef = chefResult.data

  const toneGuide = {
    warm_personal:
      'Warm, personal, storytelling. Use "I" and "my clients". Feel like a handwritten note.',
    elegant_professional: 'Polished, aspirational, elevated. Focus on craft and experience.',
    playful_casual:
      'Fun, approachable, light. Use conversational language. Allowed one emoji per post.',
  }[tone]

  const prompt = `You are a social media strategist for a private chef.
Generate social media captions for a recently completed event.
Do NOT mention the client's name or any identifying information.
Focus on the food, craft, atmosphere, and experience.
Never reveal private event locations or client details.

Chef: ${chef?.display_name ?? 'Chef'}${chef?.business_name ? ' (' + chef.business_name + ')' : ''}
${chef?.tagline ? 'Brand tagline: ' + chef.tagline : ''}

Event:
  Type: ${event.occasion ?? 'Private Dinner'}
  Guests: ${event.guest_count ?? 'a select group'}
  Style: ${event.service_style ?? 'plated dinner'}

Menu highlights:
${menu.map((m) => `  - ${m.name}${m.description ? ': ' + m.description : ''}`).join('\n') || '  - A custom seasonal menu'}

Tone: ${toneGuide}

Generate 3 captions:
1. Instagram (150–300 chars + 8–12 hashtags)
2. Facebook (200–400 chars, no hashtags)
3. Twitter/X (under 140 chars)

Return JSON: {
  "captions": [
    { "platform": "instagram", "tone": "${tone}", "caption": "...", "hashtags": ["#privatechef", ...], "characterCount": number },
    { "platform": "facebook", "tone": "${tone}", "caption": "...", "hashtags": [], "characterCount": number },
    { "platform": "twitter", "tone": "${tone}", "caption": "...", "hashtags": [], "characterCount": number }
  ],
  "instagramFirst": "instagram caption + hashtags as one string",
  "shortVersion": "under 140 chars version"
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.8, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(text)
    return { ...parsed, generatedAt: new Date().toISOString() }
  } catch (err) {
    console.error('[social-captions] Failed:', err)
    throw new Error('Could not generate captions. Please try again.')
  }
}
