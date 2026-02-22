'use server'

// Analytics Intelligence — Break-Even, Client LTV, Recipe Cost Optimization
// PRIVACY: Handles financial data → local Ollama only (for LLM features).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { z } from 'zod'

// ============================================
// 1. BREAK-EVEN ANALYSIS (pure math — no Ollama)
// ============================================

export interface BreakEvenResult {
  eventName: string
  revenueCents: number
  fixedCostsCents: number
  variableCostPerGuestCents: number
  guestCount: number
  breakEvenGuests: number
  profitCents: number
  marginPct: number
  summary: string
}

export async function analyzeBreakEven(eventName: string): Promise<BreakEvenResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Find event
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, guest_count, quoted_price_cents, food_cost_cents')
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${eventName}%`)
    .order('event_date', { ascending: false })
    .limit(1)

  if (!events || events.length === 0) {
    return {
      eventName,
      revenueCents: 0,
      fixedCostsCents: 0,
      variableCostPerGuestCents: 0,
      guestCount: 0,
      breakEvenGuests: 0,
      profitCents: 0,
      marginPct: 0,
      summary: `No event found matching "${eventName}".`,
    }
  }

  const event = events[0] as any
  const guestCount = event.guest_count ?? 0
  const revenueCents = event.quoted_price_cents ?? 0
  const foodCostCents = event.food_cost_cents ?? 0

  // Load expenses for this event
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_cents, category')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', event.id)

  const totalExpenseCents = (expenses ?? []).reduce(
    (sum: number, e: any) => sum + (e.amount_cents ?? 0),
    0
  )

  // Fixed costs = total expenses minus food costs (food scales with guests)
  const fixedCostsCents = totalExpenseCents - foodCostCents
  const variableCostPerGuestCents = guestCount > 0 ? Math.round(foodCostCents / guestCount) : 0
  const revenuePerGuestCents = guestCount > 0 ? Math.round(revenueCents / guestCount) : 0

  // Break-even: fixed costs / (revenue per guest - variable cost per guest)
  const contributionPerGuest = revenuePerGuestCents - variableCostPerGuestCents
  const breakEvenGuests =
    contributionPerGuest > 0 ? Math.ceil(fixedCostsCents / contributionPerGuest) : 0

  const profitCents = revenueCents - totalExpenseCents
  const marginPct = revenueCents > 0 ? Math.round((profitCents / revenueCents) * 100) : 0

  return {
    eventName: event.occasion ?? eventName,
    revenueCents,
    fixedCostsCents: Math.max(0, fixedCostsCents),
    variableCostPerGuestCents,
    guestCount,
    breakEvenGuests,
    profitCents,
    marginPct,
    summary: `"${event.occasion ?? eventName}": Revenue $${(revenueCents / 100).toFixed(2)}, costs $${(totalExpenseCents / 100).toFixed(2)}, profit $${(profitCents / 100).toFixed(2)} (${marginPct}% margin). Break-even at ${breakEvenGuests} guests (had ${guestCount}).`,
  }
}

// ============================================
// 2. CLIENT LTV (pure math — no Ollama)
// ============================================

export interface ClientLTVResult {
  clientName: string
  totalRevenueCents: number
  eventCount: number
  avgEventRevenueCents: number
  firstEventDate: string | null
  lastEventDate: string | null
  tenureDays: number
  tier: 'platinum' | 'gold' | 'silver' | 'bronze'
  summary: string
}

export async function calculateClientLTV(clientName: string): Promise<ClientLTVResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Find client
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .ilike('full_name', `%${clientName}%`)
    .limit(1)

  if (!clients || clients.length === 0) {
    return {
      clientName,
      totalRevenueCents: 0,
      eventCount: 0,
      avgEventRevenueCents: 0,
      firstEventDate: null,
      lastEventDate: null,
      tenureDays: 0,
      tier: 'bronze',
      summary: `No client found matching "${clientName}".`,
    }
  }

  const client = clients[0]

  // Load completed events with revenue
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', client.id)
    .in('status', ['completed', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: true })

  // Load ledger payments for this client's events
  const eventIds = (events ?? []).map((e) => e.id)
  let totalRevenueCents = 0

  if (eventIds.length > 0) {
    const { data: payments } = await supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('entry_type', 'payment')
      .in('event_id', eventIds)

    totalRevenueCents = (payments ?? []).reduce(
      (sum: number, p: any) => sum + (p.amount_cents ?? 0),
      0
    )
  }

  // Fallback to quoted prices if no ledger payments
  if (totalRevenueCents === 0) {
    totalRevenueCents = (events ?? []).reduce(
      (sum: number, e: any) => sum + (e.quoted_price_cents ?? 0),
      0
    )
  }

  const eventCount = events?.length ?? 0
  const avgEventRevenueCents = eventCount > 0 ? Math.round(totalRevenueCents / eventCount) : 0
  const firstEventDate = events?.[0]?.event_date ?? null
  const lastEventDate = events?.[events.length - 1]?.event_date ?? null
  const tenureDays =
    firstEventDate && lastEventDate
      ? Math.ceil(
          (new Date(lastEventDate).getTime() - new Date(firstEventDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

  // Tier based on total revenue
  let tier: ClientLTVResult['tier'] = 'bronze'
  if (totalRevenueCents >= 1000000)
    tier = 'platinum' // $10k+
  else if (totalRevenueCents >= 500000)
    tier = 'gold' // $5k+
  else if (totalRevenueCents >= 200000) tier = 'silver' // $2k+

  return {
    clientName: client.full_name ?? clientName,
    totalRevenueCents,
    eventCount,
    avgEventRevenueCents,
    firstEventDate,
    lastEventDate,
    tenureDays,
    tier,
    summary: `${client.full_name}: $${(totalRevenueCents / 100).toFixed(2)} total across ${eventCount} events (avg $${(avgEventRevenueCents / 100).toFixed(2)}/event). ${tier.toUpperCase()} tier. Relationship: ${tenureDays} days.`,
  }
}

// ============================================
// 3. RECIPE COST OPTIMIZATION (Ollama-powered)
// ============================================

export interface RecipeCostResult {
  recipeName: string
  currentCostCents: number
  suggestions: Array<{
    ingredient: string
    currentCost: string
    suggestion: string
    estimatedSaving: string
  }>
  summary: string
}

export async function optimizeRecipeCost(recipeName: string): Promise<RecipeCostResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Find recipe
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', `%${recipeName}%`)
    .limit(1)

  if (!recipes || recipes.length === 0) {
    return {
      recipeName,
      currentCostCents: 0,
      suggestions: [],
      summary: `No recipe found matching "${recipeName}".`,
    }
  }

  const recipe = recipes[0]

  // Load ingredients with prices
  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('name, quantity, unit, price_cents')
    .eq('recipe_id', recipe.id)
    .order('sort_order', { ascending: true })

  const totalCostCents = (ingredients ?? []).reduce(
    (sum: number, i: any) => sum + (i.price_cents ?? 0),
    0
  )

  // If no prices or no ingredients, skip Ollama
  if (!ingredients || ingredients.length === 0) {
    return {
      recipeName: recipe.name,
      currentCostCents: 0,
      suggestions: [],
      summary: `Recipe "${recipe.name}" has no ingredients listed.`,
    }
  }

  const ingredientList = ingredients.map(
    (i: any) =>
      `${i.name}: ${i.quantity ?? '?'} ${i.unit ?? ''} ($${((i.price_cents ?? 0) / 100).toFixed(2)})`
  )

  const SuggestionSchema = z.object({
    suggestions: z.array(
      z.object({
        ingredient: z.string(),
        currentCost: z.string(),
        suggestion: z.string(),
        estimatedSaving: z.string(),
      })
    ),
  })

  try {
    const result = await parseWithOllama(
      `You are a cost-optimization advisor for a private chef. Given a recipe's ingredients and their costs, suggest 2-4 substitutions or sourcing changes that could reduce costs without sacrificing quality. Focus on: seasonal alternatives, bulk-buy candidates, comparable cheaper ingredients, and waste reduction. Return JSON: { "suggestions": [{ "ingredient": "...", "currentCost": "...", "suggestion": "...", "estimatedSaving": "..." }] }`,
      `Recipe: ${recipe.name}\nIngredients:\n${ingredientList.join('\n')}\nTotal cost: $${(totalCostCents / 100).toFixed(2)}`,
      SuggestionSchema,
      { modelTier: 'standard', maxTokens: 600 }
    )

    return {
      recipeName: recipe.name,
      currentCostCents: totalCostCents,
      suggestions: result.suggestions,
      summary: `"${recipe.name}" costs $${(totalCostCents / 100).toFixed(2)}. Found ${result.suggestions.length} optimization suggestions.`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return {
      recipeName: recipe.name,
      currentCostCents: totalCostCents,
      suggestions: [],
      summary: `"${recipe.name}" costs $${(totalCostCents / 100).toFixed(2)}. Start Ollama for optimization suggestions.`,
    }
  }
}
