'use server'

// Chef Bio / Tagline Refresh
// AI suggests updated bio copy and tagline based on recent events, specialties, milestones.
// Routed to local Ollama (marketing copy, stays private).
// Output is DRAFT ONLY — chef reviews and edits before publishing.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { dispatchPrivate } from '@/lib/ai/dispatch'
import { OllamaOfflineError } from './ollama-errors'
import { z } from 'zod'

export interface ChefBioDraft {
  shortBio: string // 2–3 sentences, for social profiles
  longBio: string // 4–6 sentences, for website About page
  tagline: string // single punchy line, under 10 words
  linkedInHeadline: string // professional headline format
  alternativeTaglines: string[] // 2 alternatives to the primary
  generatedAt: string
}

const ChefBioDraftSchema = z.object({
  shortBio: z.string(),
  longBio: z.string(),
  tagline: z.string(),
  linkedInHeadline: z.string(),
  alternativeTaglines: z.array(z.string()),
})

export async function generateChefBioDraft(): Promise<ChefBioDraft> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [chefResult, eventsResult, recipesResult] = await Promise.all([
    supabase
      .from('chefs')
      .select('display_name, business_name, tagline, bio')
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
  const dietaryTags = [...new Set(recipes.flatMap((r) => r.dietary_tags ?? []))]

  // Note: chefs table does not have years_experience, cuisine_specialties, or certifications columns
  const systemPrompt = `You are a brand copywriter specializing in personal chef businesses.
Write fresh bio copy and a tagline for a chef.
Write in third person for long bio, first person for short bio.
Focus on what makes this chef distinctive — their cuisine style, client experience, event types.
Be specific, warm, and confidence-inspiring. Avoid cliches like "passionate" and "farm-to-table".

Return JSON with keys: shortBio (2-3 sentence first-person bio for social profiles), longBio (4-6 sentence third-person bio for website), tagline (primary tagline under 10 words), linkedInHeadline (LinkedIn-style professional headline), alternativeTaglines (array of 2 alternative taglines).`

  const userContent = `Chef Details:
  Name: ${chef?.display_name ?? 'Chef'}
  Business: ${chef?.business_name ?? ''}
  Current tagline: ${chef?.tagline ?? 'None set'}
  Current bio excerpt: ${chef?.bio ? chef.bio.slice(0, 200) : 'None set'}

Recent Event History:
  Total completed events: ${totalEvents}
  Event types served: ${occasions.slice(0, 8).join(', ') || 'Private dinners, special occasions'}
  Average guest count: ${avgGuests}

Recipe Portfolio (${recipes.length} recipes):
  Categories: ${categories.join(', ') || 'Various'}
  Dietary expertise: ${dietaryTags.join(', ') || 'Not specified'}`

  try {
    const parsed = (
      await dispatchPrivate(systemPrompt, userContent, ChefBioDraftSchema, {
        modelTier: 'complex',
        timeoutMs: 60_000,
        maxTokens: 1024,
      })
    ).result

    return { ...parsed, generatedAt: new Date().toISOString() }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[chef-bio] Failed:', err)
    throw new Error('Could not generate bio. Please try again.')
  }
}
