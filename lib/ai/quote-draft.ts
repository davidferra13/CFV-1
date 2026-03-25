'use server'

// Quote Draft Generator
// PRIVACY: Sends dietary restrictions, budget, client event history - must stay local.
// Output is DRAFT ONLY - chef reviews and adjusts before sending.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

export interface QuoteDraftResult {
  title: string
  description: string
  lineItems: { description: string; quantity: number; unit_price_cents: number }[]
  totalCents: number
  notes: string
}

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(1),
  unit_price_cents: z.number().min(0),
})

const QuoteDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  lineItems: z.array(LineItemSchema).min(1),
  notes: z.string(),
})

const SYSTEM_PROMPT = `You are a private chef drafting a professional quote for a client event.

RULES:
- All monetary amounts in CENTS (e.g. $150 = 15000)
- Line items should include: chef services (per person), ingredients/groceries, and any relevant extras (travel, equipment rental, staff)
- Price per person should align with the chef's historical average (provided in the data)
- If a client budget is given, aim to meet it while keeping the quote realistic
- Description should be 1-2 sentences capturing the event vision
- Notes should include payment terms, what's included, and any caveats
- Be specific in line item descriptions - "Private chef services for 8-guest Valentine's dinner" not "Chef services"

EXAMPLE OUTPUT:
{
  "title": "Valentine's Dinner for 8",
  "description": "An intimate multi-course Valentine's dinner featuring seasonal ingredients with wine pairing suggestions.",
  "lineItems": [
    { "description": "Private chef services - 4-course dinner (8 guests)", "quantity": 8, "unit_price_cents": 17500 },
    { "description": "Premium ingredients & groceries", "quantity": 1, "unit_price_cents": 45000 },
    { "description": "Tableware & presentation supplies", "quantity": 1, "unit_price_cents": 8500 }
  ],
  "notes": "Quote includes menu planning, shopping, preparation, cooking, plating, and kitchen cleanup. Dietary accommodations included at no extra charge. 50% deposit required to confirm booking, balance due day of event."
}

Return ONLY valid JSON matching this structure.`

export async function generateQuoteDraft(inquiryId: string): Promise<QuoteDraftResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: inquiry } = await db
    .from('inquiries')
    .select(
      'confirmed_occasion, confirmed_date, confirmed_guest_count, confirmed_budget_cents, confirmed_dietary_restrictions, confirmed_service_expectations, client:clients(full_name)'
    )
    .eq('id', inquiryId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!inquiry) throw new Error('Inquiry not found')

  // Get chef's recent completed event pricing for reference
  const { data: recentEvents } = await db
    .from('events')
    .select('quoted_price_cents, guest_count, occasion')
    .eq('tenant_id', user.entityId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10)

  const avgPerGuest =
    recentEvents && recentEvents.length > 0
      ? Math.round(
          recentEvents.reduce(
            (sum: any, e: any) =>
              sum + (e.quoted_price_cents || 0) / Math.max(e.guest_count || 1, 1),
            0
          ) / recentEvents.length
        )
      : 15000 // $150/person default

  const guestCount = inquiry.confirmed_guest_count || 8

  const userContent = `Generate a professional quote for this private chef event.

Event: ${inquiry.confirmed_occasion || 'Private Dinner'}
Date: ${inquiry.confirmed_date || 'TBD'}
Guests: ${guestCount}
Budget: ${inquiry.confirmed_budget_cents ? '$' + (inquiry.confirmed_budget_cents / 100).toFixed(0) : 'Not specified'}
Dietary restrictions: ${inquiry.confirmed_dietary_restrictions?.join(', ') || 'None'}
Service expectations: ${inquiry.confirmed_service_expectations || 'Full service (menu planning through cleanup)'}
Chef's average per-person rate (from history): $${(avgPerGuest / 100).toFixed(0)}`

  try {
    const parsed = await parseWithOllama(SYSTEM_PROMPT, userContent, QuoteDraftSchema, {
      modelTier: 'standard',
      maxTokens: 1024,
    })
    const totalCents = parsed.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price_cents,
      0
    )
    return { ...parsed, totalCents }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[quote-draft] Error:', err)
    throw new Error('Could not generate quote draft. Please try again.')
  }
}
