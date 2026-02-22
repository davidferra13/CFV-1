'use server'

// Prospecting Hub — AI Scrub Actions
// Uses local Ollama for lead generation + web search enrichment.
// Admin-only. All prospect data is public.

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { searchWeb, readWebPage } from '@/lib/ai/remy-web-actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import {
  SCRUB_SYSTEM_PROMPT,
  buildScrubUserPrompt,
  APPROACH_SYSTEM_PROMPT,
  buildApproachUserPrompt,
} from './scrub-prompt'

// ── Zod Schema for AI output ─────────────────────────────────────────────────

const ProspectFromAI = z.object({
  name: z.string(),
  prospectType: z.enum(['organization', 'individual']).default('organization'),
  category: z.string().default('other'),
  description: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  region: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  contactTitle: z.string().optional().default(''),
  gatekeeperNotes: z.string().optional().default(''),
  bestTimeToCall: z.string().optional().default(''),
  annualEventsEstimate: z.string().optional().default(''),
  membershipSize: z.string().optional().default(''),
  avgEventBudget: z.string().optional().default(''),
  eventTypesHosted: z.array(z.string()).optional().default([]),
  seasonalNotes: z.string().optional().default(''),
  luxuryIndicators: z.array(z.string()).optional().default([]),
  talkingPoints: z.string().optional().default(''),
  approachStrategy: z.string().optional().default(''),
  competitorsPresent: z.string().optional().default(''),
})

const ProspectArrayFromAI = z.object({
  prospects: z.array(ProspectFromAI),
})

const ApproachFromAI = z.object({
  talkingPoints: z.string(),
  approachStrategy: z.string(),
})

// ── Ollama-safe limits ──────────────────────────────────────────────────────
// Local Ollama — hard limits to prevent maxing out the machine.

const MAX_PROSPECTS_PER_SCRUB = 10 // Max prospects from AI generation
const MAX_WEB_ENRICHMENTS = 5 // Only enrich the first N prospects via web
const MAX_APPROACH_CALLS = 5 // Only generate approach strategies for first N
const APPROACH_COOLDOWN_MS = 3_000 // 3s pause between Ollama calls
const MAX_CONSECUTIVE_FAILURES = 2 // Stop the loop after N consecutive Ollama failures
const TOTAL_SCRUB_TIMEOUT_MS = 3 * 60_000 // 3 minute hard ceiling for entire scrub

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ── Phone/Email extraction ───────────────────────────────────────────────────

const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const SOCIAL_PATTERNS: Record<string, RegExp> = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/gi,
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9_.]+/gi,
  linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi,
}

function extractContactInfo(text: string) {
  const phones = [...new Set(text.match(PHONE_REGEX) ?? [])]
  const emails = [...new Set(text.match(EMAIL_REGEX) ?? [])].filter(
    (e) => !e.includes('example.com') && !e.includes('sentry')
  )
  const social: Record<string, string> = {}
  for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
    const match = text.match(regex)
    if (match?.[0]) social[platform] = match[0]
  }
  return { phones, emails, social }
}

// ── Main Scrub Action ────────────────────────────────────────────────────────

export async function scrubProspects(query: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  if (!query.trim()) throw new Error('Query is required')

  // 1. Create scrub session
  const { data: session, error: sessionError } = await supabase
    .from('prospect_scrub_sessions')
    .insert({
      chef_id: user.tenantId!,
      query: query.trim(),
      status: 'running',
    })
    .select()
    .single()

  if (sessionError || !session) {
    console.error('[scrubProspects] Session creation failed:', sessionError)
    throw new Error('Failed to create scrub session')
  }

  const scrubStart = Date.now()
  function isOverTime() {
    return Date.now() - scrubStart > TOTAL_SCRUB_TIMEOUT_MS
  }

  try {
    // 2. Phase 1 — Ollama generates prospect list
    const wrappedPrompt =
      SCRUB_SYSTEM_PROMPT +
      '\n\nIMPORTANT: Wrap your output in a JSON object with key "prospects" containing the array. Example: { "prospects": [...] }'
    let parsedResult: z.infer<typeof ProspectArrayFromAI>
    try {
      parsedResult = await parseWithOllama(
        wrappedPrompt,
        buildScrubUserPrompt(query),
        ProspectArrayFromAI,
        { timeoutMs: 120_000 }
      )
    } catch (err) {
      await supabase
        .from('prospect_scrub_sessions')
        .update({ status: 'failed', error_message: 'AI returned invalid response' })
        .eq('id', session.id)
      throw new Error('AI returned invalid response. Please try again.')
    }

    // Hard-cap to keep batch manageable for local Ollama
    const prospects = parsedResult.prospects.slice(0, MAX_PROSPECTS_PER_SCRUB)

    if (prospects.length === 0) {
      await supabase
        .from('prospect_scrub_sessions')
        .update({ status: 'failed', error_message: 'No valid prospects generated' })
        .eq('id', session.id)
      throw new Error('AI did not generate any valid prospects. Try a different query.')
    }

    // Deduplicate against existing prospects
    const { data: existing } = await supabase
      .from('prospects')
      .select('name, city')
      .eq('chef_id', user.tenantId!)

    const existingSet = new Set(
      (existing ?? []).map((e) => `${(e.name ?? '').toLowerCase()}|${(e.city ?? '').toLowerCase()}`)
    )

    const newProspects = prospects.filter(
      (p) => !existingSet.has(`${p.name.toLowerCase()}|${(p.city ?? '').toLowerCase()}`)
    )

    // Insert into DB
    const insertRows = newProspects.map((p) => ({
      chef_id: user.tenantId!,
      scrub_session_id: session.id,
      name: p.name,
      prospect_type: p.prospectType,
      category: p.category,
      description: p.description || null,
      address: p.address || null,
      city: p.city || null,
      state: p.state || null,
      zip: p.zip || null,
      region: p.region || null,
      contact_person: p.contactPerson || null,
      contact_title: p.contactTitle || null,
      gatekeeper_notes: p.gatekeeperNotes || null,
      best_time_to_call: p.bestTimeToCall || null,
      annual_events_estimate: p.annualEventsEstimate || null,
      membership_size: p.membershipSize || null,
      avg_event_budget: p.avgEventBudget || null,
      event_types_hosted: p.eventTypesHosted?.length ? p.eventTypesHosted : null,
      seasonal_notes: p.seasonalNotes || null,
      luxury_indicators: p.luxuryIndicators?.length ? p.luxuryIndicators : null,
      talking_points: p.talkingPoints || null,
      approach_strategy: p.approachStrategy || null,
      competitors_present: p.competitorsPresent || null,
      source: 'ai_scrub' as const,
    }))

    if (insertRows.length > 0) {
      const { error: insertError } = await supabase.from('prospects').insert(insertRows)
      if (insertError) {
        console.error('[scrubProspects] Insert error:', insertError)
      }
    }

    // Update session with initial count
    await supabase
      .from('prospect_scrub_sessions')
      .update({ prospect_count: insertRows.length, status: 'enriching' })
      .eq('id', session.id)

    // 3. Phase 2 — Web Enrichment (capped to first N, skip if over time)
    const { data: insertedProspects } = await supabase
      .from('prospects')
      .select('id, name, city, state, region')
      .eq('scrub_session_id', session.id)

    let enrichedCount = 0
    const enrichSlice = (insertedProspects ?? []).slice(0, MAX_WEB_ENRICHMENTS)
    for (const prospect of enrichSlice) {
      if (isOverTime()) {
        console.warn('[scrub-enrich] Hit time limit, skipping remaining enrichments')
        break
      }
      try {
        const searchQuery = `${prospect.name} ${prospect.city ?? ''} ${prospect.state ?? ''} phone contact events`
        const results = await searchWeb(searchQuery, 3)
        if (results.length === 0) continue

        const topUrl = results[0].url
        const enrichUpdates: Record<string, unknown> = {}

        if (topUrl) {
          try {
            const page = await readWebPage(topUrl)
            enrichUpdates.website = topUrl

            const contactInfo = extractContactInfo(page.content)
            if (contactInfo.phones.length > 0) enrichUpdates.phone = contactInfo.phones[0]
            if (contactInfo.phones.length > 1)
              enrichUpdates.contact_direct_phone = contactInfo.phones[1]
            if (contactInfo.emails.length > 0) enrichUpdates.email = contactInfo.emails[0]
            if (contactInfo.emails.length > 1)
              enrichUpdates.contact_direct_email = contactInfo.emails[1]
            if (Object.keys(contactInfo.social).length > 0)
              enrichUpdates.social_profiles = contactInfo.social
          } catch (err) {
            console.warn(`[scrub-enrich] Failed to read ${topUrl}:`, err)
          }
        }

        if (Object.keys(enrichUpdates).length > 0) {
          enrichUpdates.source = 'web_enriched'
          await supabase.from('prospects').update(enrichUpdates).eq('id', prospect.id)
          enrichedCount++
        }
      } catch (err) {
        console.warn(`[scrub-enrich] Failed for ${prospect.name}:`, err)
      }
    }

    // 4. Phase 3 — AI Approach (capped to first N, bail on consecutive failures or time)
    const approachSlice = (insertedProspects ?? []).slice(0, MAX_APPROACH_CALLS)
    let consecutiveFailures = 0
    for (let i = 0; i < approachSlice.length; i++) {
      if (isOverTime()) {
        console.warn('[scrub-approach] Hit time limit, skipping remaining approach calls')
        break
      }
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[scrub-approach] ${consecutiveFailures} consecutive failures, stopping`)
        break
      }

      const prospect = approachSlice[i]
      try {
        if (i > 0) await sleep(APPROACH_COOLDOWN_MS)

        const { data: fullProspect } = await supabase
          .from('prospects')
          .select('*')
          .eq('id', prospect.id)
          .single()

        if (!fullProspect) continue

        const approachResult = await parseWithOllama(
          APPROACH_SYSTEM_PROMPT,
          buildApproachUserPrompt({
            name: fullProspect.name,
            category: fullProspect.category,
            description: fullProspect.description,
            city: fullProspect.city,
            state: fullProspect.state,
            annualEventsEstimate: fullProspect.annual_events_estimate,
            avgEventBudget: fullProspect.avg_event_budget,
            eventTypesHosted: fullProspect.event_types_hosted,
            competitorsPresent: fullProspect.competitors_present,
            luxuryIndicators: fullProspect.luxury_indicators,
          }),
          ApproachFromAI,
          { modelTier: 'fast', timeoutMs: 45_000 }
        )

        await supabase
          .from('prospects')
          .update({
            talking_points: approachResult.talkingPoints,
            approach_strategy: approachResult.approachStrategy,
          })
          .eq('id', prospect.id)

        consecutiveFailures = 0 // reset on success
      } catch (err) {
        consecutiveFailures++
        console.warn(
          `[scrub-approach] Failed for ${prospect.name} (${consecutiveFailures} consecutive):`,
          err
        )
      }
    }

    // 5. Finalize session
    await supabase
      .from('prospect_scrub_sessions')
      .update({ status: 'completed', enriched_count: enrichedCount })
      .eq('id', session.id)

    revalidatePath('/prospecting')
    revalidatePath('/prospecting/scrub')

    return {
      success: true as const,
      sessionId: session.id,
      totalGenerated: insertRows.length,
      duplicatesSkipped: prospects.length - insertRows.length,
      enriched: enrichedCount,
    }
  } catch (err) {
    // Mark session as failed if it errored out
    await supabase
      .from('prospect_scrub_sessions')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('id', session.id)
      .then(() => {}) // ignore update errors

    throw err
  }
}
