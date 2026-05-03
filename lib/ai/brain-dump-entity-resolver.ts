'use server'

// Brain Dump Entity Resolver
// Fuzzy-matches names from brain dump extraction to existing DB records.
// Uses existing Remy context (clients, events, recipes) - no new queries.
// PRIVACY: Client names matched locally - must stay local.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResolvedEntity {
  type: 'client' | 'event' | 'recipe' | 'menu'
  id: string
  name: string
  confidence: number // 0-1
  matchedFrom: string // original text that matched
}

export interface ResolutionResult {
  resolved: ResolvedEntity[]
  unresolved: string[] // names that didn't match anything
  ambiguous: Array<{
    query: string
    candidates: ResolvedEntity[]
  }>
}

// ─── Fuzzy Matching ─────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/['']/g, "'").replace(/\s+/g, ' ')
}

function fuzzyScore(query: string, target: string): number {
  const q = normalize(query)
  const t = normalize(target)

  // Exact match
  if (q === t) return 1.0

  // Target contains query (e.g., "Johnson" matches "Sarah Johnson")
  if (t.includes(q)) return 0.9

  // Query contains target (e.g., "the Johnsons" matches "Johnson")
  if (q.includes(t)) return 0.85

  // Last name match (e.g., "Johnson" matches "Sarah Johnson")
  const targetParts = t.split(' ')
  const queryParts = q.split(' ')
  if (targetParts.some((p) => queryParts.includes(p) && p.length > 2)) return 0.75

  // Starts with same prefix (3+ chars)
  if (q.length >= 3 && t.startsWith(q.slice(0, 3))) return 0.5

  return 0
}

// ─── Client Resolution ──────────────────────────────────────────────────────

export async function resolveClients(names: string[]): Promise<ResolutionResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, email, status')
    .eq('tenant_id', user.tenantId!)
    .limit(500)

  const allClients = (clients || []) as Array<{
    id: string
    full_name: string
    email: string
    status: string
  }>

  const result: ResolutionResult = { resolved: [], unresolved: [], ambiguous: [] }

  for (const name of names) {
    const scored = allClients
      .map((c) => ({
        type: 'client' as const,
        id: c.id,
        name: c.full_name,
        confidence: fuzzyScore(name, c.full_name),
        matchedFrom: name,
      }))
      .filter((s) => s.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)

    if (scored.length === 0) {
      result.unresolved.push(name)
    } else if (scored.length === 1 || scored[0].confidence >= 0.9) {
      result.resolved.push(scored[0])
    } else if (scored[0].confidence - scored[1].confidence < 0.1) {
      // Ambiguous: top two are too close
      result.ambiguous.push({ query: name, candidates: scored.slice(0, 3) })
    } else {
      result.resolved.push(scored[0])
    }
  }

  return result
}

// ─── Event Resolution ───────────────────────────────────────────────────────

export async function resolveEvents(descriptors: string[]): Promise<ResolutionResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load recent/upcoming events
  const today = new Date().toISOString().split('T')[0]
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(50)

  const allEvents = (events || []) as Array<{
    id: string
    occasion: string
    event_date: string
    status: string
    client: { full_name: string } | null
  }>

  const result: ResolutionResult = { resolved: [], unresolved: [], ambiguous: [] }

  for (const desc of descriptors) {
    const normalized = normalize(desc)

    const scored = allEvents
      .map((e) => {
        let score = 0
        const eventLabel = `${e.client?.full_name || ''} ${e.occasion || ''} ${e.event_date || ''}`

        // Date match (strongest signal)
        if (
          normalized.includes('saturday') ||
          normalized.includes('sunday') ||
          normalized.includes('tomorrow') ||
          normalized.includes('tonight')
        ) {
          // Day-of-week or relative date matching
          const eventDay = new Date(e.event_date)
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toLowerCase()
          if (normalized.includes(eventDay)) score += 0.6
        }

        // Client name in descriptor
        if (e.client?.full_name && fuzzyScore(desc, e.client.full_name) > 0.5) {
          score += 0.4
        }

        // Occasion match
        if (e.occasion && normalize(e.occasion).includes(normalized)) {
          score += 0.3
        }

        return {
          type: 'event' as const,
          id: e.id,
          name: eventLabel.trim(),
          confidence: Math.min(score, 1.0),
          matchedFrom: desc,
        }
      })
      .filter((s) => s.confidence >= 0.3)
      .sort((a, b) => b.confidence - a.confidence)

    if (scored.length === 0) {
      result.unresolved.push(desc)
    } else if (scored.length === 1 || scored[0].confidence >= 0.7) {
      result.resolved.push(scored[0])
    } else {
      result.ambiguous.push({ query: desc, candidates: scored.slice(0, 3) })
    }
  }

  return result
}

// ─── Recipe Resolution ──────────────────────────────────────────────────────

export async function resolveRecipes(names: string[]): Promise<ResolutionResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: recipes } = await db
    .from('recipes')
    .select('id, title')
    .eq('tenant_id', user.tenantId!)
    .limit(500)

  const allRecipes = (recipes || []) as Array<{ id: string; title: string }>

  const result: ResolutionResult = { resolved: [], unresolved: [], ambiguous: [] }

  for (const name of names) {
    const scored = allRecipes
      .map((r) => ({
        type: 'recipe' as const,
        id: r.id,
        name: r.title,
        confidence: fuzzyScore(name, r.title),
        matchedFrom: name,
      }))
      .filter((s) => s.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)

    if (scored.length === 0) {
      result.unresolved.push(name)
    } else if (scored.length === 1 || scored[0].confidence >= 0.85) {
      result.resolved.push(scored[0])
    } else {
      result.ambiguous.push({ query: name, candidates: scored.slice(0, 3) })
    }
  }

  return result
}

// ─── Full Resolution (all entity types) ─────────────────────────────────────

export async function resolveAllEntities(extraction: {
  clientNames: string[]
  eventDescriptors: string[]
  recipeNames: string[]
}): Promise<{
  clients: ResolutionResult
  events: ResolutionResult
  recipes: ResolutionResult
}> {
  const [clients, events, recipes] = await Promise.all([
    extraction.clientNames.length > 0
      ? resolveClients(extraction.clientNames)
      : { resolved: [], unresolved: [], ambiguous: [] },
    extraction.eventDescriptors.length > 0
      ? resolveEvents(extraction.eventDescriptors)
      : { resolved: [], unresolved: [], ambiguous: [] },
    extraction.recipeNames.length > 0
      ? resolveRecipes(extraction.recipeNames)
      : { resolved: [], unresolved: [], ambiguous: [] },
  ])

  return { clients, events, recipes }
}
