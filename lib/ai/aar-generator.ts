'use server'

// AAR (After-Action Report) Generator
// AI drafts the full AAR narrative from event data.
// Extends lib/events/debrief-actions.ts which has only partial AI.
// Routed to Gemini (quality-critical post-event analysis).
// Output is DRAFT ONLY — chef edits and confirms before the AAR is finalized.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface AARDraft {
  executiveSummary: string       // 2–3 sentence high-level summary
  whatWentWell: string[]         // specific wins
  whatCouldImprove: string[]     // specific areas for improvement
  keyLearnings: string[]         // actionable takeaways for future events
  clientExperienceNotes: string  // how the client experience felt from available signals
  financialReflection: string    // profit vs expectation notes
  nextTimeList: string[]         // "Next time I'll..." list
  fullNarrative: string          // complete AAR as prose for filing
  generatedAt: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function generateAARDraft(eventId: string): Promise<AARDraft> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [eventResult, menuResult, expensesResult, debrief, tempLog] = await Promise.all([
    supabase
      .from('events')
      .select(`
        occasion, guest_count, event_date, serve_time, status,
        quoted_price_cents, amount_paid_cents, service_style,
        dietary_restrictions, allergies, special_requests, notes,
        client_id, clients(full_name)
      `)
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase
      .from('event_menu_components')
      .select('name, course_type, description')
      .eq('event_id', eventId),
    supabase
      .from('expenses')
      .select('description, amount_cents, category')
      .eq('event_id', eventId),
    supabase
      .from('aars')
      .select('chef_notes, client_feedback, rating')
      .eq('event_id', eventId)
      .maybeSingle(),
    supabase
      .from('temp_logs')
      .select('food_item, temp_f, stage, logged_at')
      .eq('event_id', eventId)
      .limit(10),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menu = menuResult.data ?? []
  const expenses = expensesResult.data ?? []
  const existingDebrief = debrief.data
  const temps = tempLog.data ?? []

  const client = Array.isArray(event.clients) ? event.clients[0] : event.clients
  const totalRevenue = event.amount_paid_cents ?? event.quoted_price_cents ?? 0
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0)
  const grossProfit = totalRevenue - totalExpenses
  const marginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0

  const prompt = `You are a private chef writing your own after-action report for a recently completed event.
Write in first person, honest and reflective. This is for the chef's own records — be candid.
Base your analysis entirely on the data provided. Do not invent details not evidenced.
For areas with no data, note "Not recorded" rather than guessing.

EVENT SUMMARY:
  Occasion: ${event.occasion ?? 'Private Event'}
  Client: ${(client as any)?.full_name ?? 'Unknown'}
  Date: ${event.event_date ?? 'Unknown'}
  Guests: ${event.guest_count ?? 'Unknown'}
  Service style: ${event.service_style ?? 'Unknown'}
  Status: ${event.status}

MENU (${menu.length} courses):
${menu.map(m => `  - [${m.course_type ?? 'Course'}] ${m.name}`).join('\n') || '  Not recorded'}

FINANCIALS:
  Revenue: $${(totalRevenue / 100).toFixed(2)}
  Expenses: $${(totalExpenses / 100).toFixed(2)} (${expenses.length} entries)
  Gross profit: $${(grossProfit / 100).toFixed(2)} (${marginPct}% margin)
  Expense breakdown:
${expenses.map(e => `  - ${e.category ?? 'other'}: $${((e.amount_cents ?? 0) / 100).toFixed(2)} — ${e.description}`).join('\n') || '  No expenses logged'}

TEMPERATURE LOG (${temps.length} entries):
${temps.map(t => `  - ${t.food_item}: ${t.temp_f}°F at ${t.stage ?? 'unknown stage'}`).join('\n') || '  No temp log'}

EXISTING NOTES:
  Chef notes: ${existingDebrief?.chef_notes ?? event.notes ?? 'None'}
  Client feedback: ${existingDebrief?.client_feedback ?? 'Not yet collected'}
  Rating: ${existingDebrief?.rating ?? 'Not rated'}
  Special requests fulfilled: ${event.special_requests ?? 'None noted'}

Return JSON: {
  "executiveSummary": "...",
  "whatWentWell": ["specific bullet", ...],
  "whatCouldImprove": ["specific bullet", ...],
  "keyLearnings": ["actionable takeaway", ...],
  "clientExperienceNotes": "...",
  "financialReflection": "...",
  "nextTimeList": ["Next time I'll...", ...],
  "fullNarrative": "complete AAR as 3-4 paragraph prose"
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.5, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(text)
    return { ...parsed, generatedAt: new Date().toISOString() }
  } catch (err) {
    console.error('[aar-generator] Failed:', err)
    throw new Error('Could not generate AAR. Please try again.')
  }
}
