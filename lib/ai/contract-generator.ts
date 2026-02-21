// @ts-nocheck
'use server'

// Contract / Proposal Generator
// PRIVACY: Sends client PII (name, email, phone, address) + financial data — must stay local.
// Output is DRAFT ONLY — chef reviews and must approve before sending.
// NOTE: Always surfaces disclaimer to consult attorney for binding contracts.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

export interface GeneratedContract {
  title: string
  sections: { heading: string; content: string }[]
  fullMarkdown: string // complete contract as editable markdown
  disclaimer: string // legal disclaimer (always included)
  generatedAt: string
}

const ContractSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })),
  fullMarkdown: z.string(),
})

export async function generateContract(eventId: string): Promise<GeneratedContract> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [eventResult, chefResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        'occasion, guest_count, event_date, serve_time, arrival_time, location_address, service_style, dietary_restrictions, allergies, special_requests, quoted_price_cents, client_id'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase
      .from('chefs')
      .select('full_name, business_name, email, phone')
      .eq('id', user.tenantId!)
      .single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const chef = chefResult.data

  // Fetch client
  const { data: client } = event.client_id
    ? await supabase
        .from('clients')
        .select('full_name, email, phone')
        .eq('id', event.client_id)
        .single()
    : { data: null }

  const quotedPrice = event.quoted_price_cents
    ? '$' + (event.quoted_price_cents / 100).toFixed(2)
    : 'TBD'
  const depositAmount = event.quoted_price_cents
    ? '$' + ((event.quoted_price_cents * 0.5) / 100).toFixed(2) + ' (50%)'
    : 'TBD'

  const systemPrompt = `You are a legal document drafter for a private chef business.
Draft a professional service agreement. Use clear, plain English.
Use placeholders like [SIGNATURE] and [DATE] for signature blocks.
Return ONLY valid JSON.`

  const userContent = `Draft a professional service agreement for the following event.
Include all standard sections a private chef contract should have.

Parties:
  Chef/Service Provider: ${chef?.full_name ?? 'Chef'}, ${chef?.business_name ?? ''}
  Email: ${chef?.email ?? 'TBD'}, Phone: ${chef?.phone ?? 'TBD'}
  Client: ${client?.full_name ?? 'Client Name TBD'}
  Client Email: ${client?.email ?? 'TBD'}

Event Details:
  Occasion: ${event.occasion ?? 'Private Dinner'}
  Date: ${event.event_date ?? 'TBD'}
  Service time: ${event.serve_time ?? 'TBD'}, Arrival: ${event.arrival_time ?? 'TBD'}
  Location: ${event.location_address ?? 'TBD'}
  Guest count: ${event.guest_count ?? 'TBD'}
  Service style: ${event.service_style ?? 'plated'}
  Dietary restrictions/allergies: ${[...((event.dietary_restrictions as string[] | null) ?? []), ...((event.allergies as string[] | null) ?? [])].join(', ') || 'None noted'}
  Special requests: ${event.special_requests ?? 'None'}

Financial:
  Total fee: ${quotedPrice}
  Deposit (due at signing): ${depositAmount}
  Balance due: ${event.quoted_price_cents ? '$' + ((event.quoted_price_cents * 0.5) / 100).toFixed(2) + ' (due 48 hours before event)' : 'TBD'}

Required contract sections:
1. Services Provided
2. Event Details & Schedule
3. Dietary Accommodations & Allergen Policy
4. Payment Terms & Deposit
5. Cancellation & Rescheduling Policy (standard: 14-day cancellation window, deposit non-refundable)
6. Chef's Responsibilities
7. Client's Responsibilities (venue access, parking, kitchen access)
8. Limitation of Liability
9. Force Majeure
10. Signature Block

Return JSON: {
  "title": "Private Chef Services Agreement",
  "sections": [{ "heading": "1. Services Provided", "content": "..." }, ...],
  "fullMarkdown": "# Private Chef Services Agreement\\n\\n[complete markdown contract]"
}`

  try {
    const result = await parseWithOllama(systemPrompt, userContent, ContractSchema)
    return {
      title: result.title ?? 'Private Chef Services Agreement',
      sections: result.sections ?? [],
      fullMarkdown: result.fullMarkdown ?? '',
      disclaimer:
        'This is an AI-generated draft for reference only. Consult a licensed attorney before using as a binding legal document.',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[contract-generator] Failed:', err)
    throw new Error('Could not generate contract. Please try again.')
  }
}
