'use server'

// AAR (After-Action Report) Generator
// AI drafts the full AAR narrative from event data.
// Extends lib/events/debrief-actions.ts which has only partial AI.
// Routed to LOCAL Ollama (complex tier) - private data never leaves the machine.
// Output is DRAFT ONLY - chef edits and confirms before the AAR is finalized.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'

export interface AARDraft {
  executiveSummary: string // 2–3 sentence high-level summary
  whatWentWell: string[] // specific wins
  whatCouldImprove: string[] // specific areas for improvement
  keyLearnings: string[] // actionable takeaways for future events
  clientExperienceNotes: string // how the client experience felt from available signals
  financialReflection: string // profit vs expectation notes
  nextTimeList: string[] // "Next time I'll..." list
  fullNarrative: string // complete AAR as prose for filing
  generatedAt: string
}

const AARDraftAISchema = z.object({
  executiveSummary: z.string(),
  whatWentWell: z.array(z.string()).min(1),
  whatCouldImprove: z.array(z.string()).min(1),
  keyLearnings: z.array(z.string()).min(1),
  clientExperienceNotes: z.string(),
  financialReflection: z.string(),
  nextTimeList: z.array(z.string()).min(1),
  fullNarrative: z.string(),
})

export async function generateAARDraft(eventId: string): Promise<AARDraft> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const eventResult = await supabase
    .from('events')
    .select(
      `
      occasion, guest_count, event_date, serve_time, status,
      quoted_price_cents, service_style,
      dietary_restrictions, allergies, special_requests, kitchen_notes,
      client_id, clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  // event_menu_components is not in generated types - table exists in DB but not yet in types/database.ts
  const menuResult = (await (supabase.from as Function)('event_menu_components')
    .select('name, course_type, description')
    .eq('event_id', eventId)) as {
    data: Array<{ name: string; course_type: string | null; description: string | null }> | null
  }

  const expensesResult = await supabase
    .from('expenses')
    .select('description, amount_cents, category')
    .eq('event_id', eventId)

  // aars table is not in generated types - table exists in DB but not yet in types/database.ts
  const debrief = (await (supabase.from as Function)('aars')
    .select('chef_notes, client_feedback, rating')
    .eq('event_id', eventId)
    .maybeSingle()) as {
    data: {
      chef_notes: string | null
      client_feedback: string | null
      rating: number | null
    } | null
  }

  // event_temp_logs exists in schema
  const tempLog = await supabase
    .from('event_temp_logs')
    .select('item_description, temp_fahrenheit, phase, logged_at')
    .eq('event_id', eventId)
    .limit(10)

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menu = menuResult.data ?? []
  const expenses = expensesResult.data ?? []
  const existingDebrief = debrief.data
  const temps = tempLog.data ?? []

  const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
  const totalRevenue = event.quoted_price_cents ?? 0
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount_cents ?? 0), 0)
  const grossProfit = totalRevenue - totalExpenses
  const marginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0

  const systemPrompt = `You are a private chef writing your own after-action report for a recently completed event.
Write in first person, honest and reflective. This is for the chef's own records - be candid.
Base your analysis entirely on the data provided. Do not invent details not evidenced.
For areas with no data, note "Not recorded" rather than guessing.

Return JSON with these keys:
  "executiveSummary": 2-3 sentence high-level summary
  "whatWentWell": array of specific wins
  "whatCouldImprove": array of specific areas for improvement
  "keyLearnings": array of actionable takeaways for future events
  "clientExperienceNotes": how the client experience felt from available signals
  "financialReflection": profit vs expectation notes
  "nextTimeList": array of "Next time I'll..." items
  "fullNarrative": complete AAR as 3-4 paragraph prose

Return ONLY valid JSON.`

  const userContent = `EVENT SUMMARY:
  Occasion: ${event.occasion ?? 'Private Event'}
  Client: ${client?.full_name ?? 'Unknown'}
  Date: ${event.event_date ?? 'Unknown'}
  Guests: ${event.guest_count ?? 'Unknown'}
  Service style: ${event.service_style ?? 'Unknown'}
  Status: ${event.status}

MENU (${menu.length} courses):
${menu.map((m) => `  - [${m.course_type ?? 'Course'}] ${m.name}`).join('\n') || '  Not recorded'}

FINANCIALS:
  Revenue: $${(totalRevenue / 100).toFixed(2)}
  Expenses: $${(totalExpenses / 100).toFixed(2)} (${expenses.length} entries)
  Gross profit: $${(grossProfit / 100).toFixed(2)} (${marginPct}% margin)
  Expense breakdown:
${expenses.map((e: any) => `  - ${e.category ?? 'other'}: $${((e.amount_cents ?? 0) / 100).toFixed(2)} - ${e.description}`).join('\n') || '  No expenses logged'}

TEMPERATURE LOG (${temps.length} entries):
${temps.map((t: any) => `  - ${t.item_description}: ${t.temp_fahrenheit}°F at ${t.phase ?? 'unknown phase'}`).join('\n') || '  No temp log'}

EXISTING NOTES:
  Chef notes: ${existingDebrief?.chef_notes ?? event.kitchen_notes ?? 'None'}
  Client feedback: ${existingDebrief?.client_feedback ?? 'Not yet collected'}
  Rating: ${existingDebrief?.rating ?? 'Not rated'}
  Special requests fulfilled: ${event.special_requests ?? 'None noted'}`

  try {
    const parsed = await parseWithOllama(systemPrompt, userContent, AARDraftAISchema, {
      modelTier: 'complex',
      timeoutMs: 90_000,
      maxTokens: 2048,
    })
    return { ...parsed, generatedAt: new Date().toISOString() }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[aar-generator] Failed:', err)
    throw new Error('Could not generate AAR. Please try again.')
  }
}
