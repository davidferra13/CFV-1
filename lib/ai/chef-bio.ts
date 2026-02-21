// @ts-nocheck
'use server'

// Chef Bio / Tagline Refresh
// AI suggests updated bio copy and tagline based on recent events, specialties, milestones.
// Routed to Gemini (marketing copy, not PII).
// Output is DRAFT ONLY — chef reviews and edits before publishing.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface ChefBioDraft {
  shortBio: string // 2–3 sentences, for social profiles
  longBio: string // 4–6 sentences, for website About page
  tagline: string // single punchy line, under 10 words
  linkedInHeadline: string // professional headline format
  alternativeTaglines: string[] // 2 alternatives to the primary
  generatedAt: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function generateChefBioDraft(): Promise<ChefBioDraft> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [chefResult, eventsResult, recipesResult] = await Promise.all([
    supabase
      .from('chefs')
      .select(
        'full_name, business_name, tagline, bio, years_experience, cuisine_specialties, certifications'
      )
      .eq('id', user.tenantId!)
      .single(),
    supabase
      .from('events')
      .select('occasion, guest_count, event_date, status')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['completed', 'in_progress'])
      .order('event_date', { ascending: false })
      .limit(20),
    supabase
      .from('recipes')
      .select('name, category, dietary_tags')
      .eq('tenant_id', user.tenantId!)
      .limit(20),
  ])

  const chef = chefResult.data
  const events = eventsResult.data ?? []
  const recipes = recipesResult.data ?? []

  const totalEvents = events.length
  const occasions = [...new Set(events.map((e) => e.occasion).filter(Boolean))]
  const avgGuests =
    events.length > 0
      ? Math.round(events.reduce((s, e) => s + (e.guest_count ?? 0), 0) / events.length)
      : 0

  const categories = [...new Set(recipes.map((r) => r.category).filter(Boolean))]
  const dietaryTags = [
    ...new Set(recipes.flatMap((r) => (r.dietary_tags as string[] | null) ?? [])),
  ]

  const prompt = `You are a brand copywriter specializing in personal chef businesses.
Write fresh bio copy and a tagline for this chef.
Write in third person for long bio, first person for short bio.
Focus on what makes this chef distinctive — their cuisine style, client experience, event types.
Be specific, warm, and confidence-inspiring. Avoid clichés like "passionate" and "farm-to-table".

Chef Details:
  Name: ${chef?.full_name ?? 'Chef'}
  Business: ${chef?.business_name ?? ''}
  Current tagline: ${chef?.tagline ?? 'None set'}
  Current bio excerpt: ${chef?.bio ? (chef.bio as string).slice(0, 200) : 'None set'}
  Years of experience: ${(chef as any)?.years_experience ?? 'Not specified'}
  Cuisine specialties: ${(chef as any)?.cuisine_specialties ? ((chef as any).cuisine_specialties as string[]).join(', ') : 'Not specified'}
  Certifications: ${(chef as any)?.certifications ?? 'Not specified'}

Recent Event History:
  Total completed events: ${totalEvents}
  Event types served: ${occasions.slice(0, 8).join(', ') || 'Private dinners, special occasions'}
  Average guest count: ${avgGuests}

Recipe Portfolio (${recipes.length} recipes):
  Categories: ${categories.join(', ') || 'Various'}
  Dietary expertise: ${dietaryTags.join(', ') || 'Not specified'}

Return JSON: {
  "shortBio": "2-3 sentence first-person bio for social profiles",
  "longBio": "4-6 sentence third-person bio for website",
  "tagline": "primary tagline under 10 words",
  "linkedInHeadline": "LinkedIn-style professional headline",
  "alternativeTaglines": ["alternative 1", "alternative 2"]
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.75, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(text)
    return { ...parsed, generatedAt: new Date().toISOString() }
  } catch (err) {
    console.error('[chef-bio] Failed:', err)
    throw new Error('Could not generate bio. Please try again.')
  }
}
