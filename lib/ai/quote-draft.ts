'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface QuoteDraftResult {
  title: string
  description: string
  lineItems: { description: string; quantity: number; unit_price_cents: number }[]
  totalCents: number
  notes: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function generateQuoteDraft(inquiryId: string): Promise<QuoteDraftResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select(
      'confirmed_occasion, confirmed_date, confirmed_guest_count, confirmed_budget_cents, confirmed_dietary_restrictions, confirmed_service_expectations, client:clients(full_name)'
    )
    .eq('id', inquiryId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!inquiry) throw new Error('Inquiry not found')

  // Get chef's recent completed event pricing for reference
  const { data: recentEvents } = await supabase
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
            (sum, e) => sum + (e.quoted_price_cents || 0) / Math.max(e.guest_count || 1, 1),
            0
          ) / recentEvents.length
        )
      : 15000 // $150/person default

  const guestCount = inquiry.confirmed_guest_count || 8

  const prompt = `Generate a professional quote for a private chef event:

Event: ${inquiry.confirmed_occasion || 'Private Dinner'}
Date: ${inquiry.confirmed_date || 'TBD'}
Guests: ${guestCount}
Budget: ${inquiry.confirmed_budget_cents ? '$' + (inquiry.confirmed_budget_cents / 100).toFixed(0) : 'Not specified'}
Dietary restrictions: ${inquiry.confirmed_dietary_restrictions?.join(', ') || 'None'}
Service expectations: ${inquiry.confirmed_service_expectations || 'None'}
Chef avg per-person rate (from history): $${(avgPerGuest / 100).toFixed(0)}

Return JSON: { "title": "Quote title", "description": "1-2 sentence event description", "lineItems": [{"description": "item", "quantity": number, "unit_price_cents": number}], "notes": "Terms/notes paragraph" }

Line items should include: chef services (per person), ingredients/groceries, and any extras. All amounts in cents. Return ONLY valid JSON, no markdown.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
        responseMimeType: 'application/json',
      },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const draft = JSON.parse(text) as QuoteDraftResult
    draft.totalCents = draft.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price_cents,
      0
    )
    return draft
  } catch (err) {
    console.error('[quote-draft] Error:', err)
    throw new Error('Could not generate quote draft. Please try again.')
  }
}
