'use server'

// Contract / Proposal Generator
// PRIVACY: Sends client PII (name, email, phone, address) + financial data - must stay local.
// Output is DRAFT ONLY - chef reviews and must approve before sending.
// NOTE: Always surfaces disclaimer to consult attorney for binding contracts.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { withAiFallback } from '@/lib/ai/with-ai-fallback'
import { generateContractTemplate } from '@/lib/templates/contract'

export interface GeneratedContract {
  title: string
  sections: { heading: string; content: string }[]
  fullMarkdown: string // complete contract as editable markdown
  disclaimer: string // legal disclaimer (always included)
  generatedAt: string
  _aiSource?: string
}

const ContractSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })),
  fullMarkdown: z.string(),
})

export async function generateContract(eventId: string): Promise<GeneratedContract> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [eventResult, chefResult] = await Promise.all([
    db
      .from('events')
      .select(
        'occasion, guest_count, event_date, serve_time, arrival_time, location_address, service_style, dietary_restrictions, allergies, special_requests, quoted_price_cents, deposit_amount_cents, client_id'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    db
      .from('chefs')
      .select('full_name, business_name, email, phone')
      .eq('id', user.tenantId!)
      .single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const chef = chefResult.data

  // Fetch client + collaborators
  const [clientResult, collabResult] = await Promise.all([
    event.client_id
      ? db.from('clients').select('full_name, email, phone').eq('id', event.client_id).single()
      : Promise.resolve({ data: null }),
    db
      .from('event_collaborators')
      .select('role, chef:chefs!event_collaborators_chef_id_fkey(full_name, business_name)')
      .eq('event_id', eventId)
      .eq('status', 'accepted'),
  ])
  const client = clientResult.data
  const coHosts = (collabResult.data ?? [])
    .map((c: any) => c.chef?.full_name || c.chef?.business_name)
    .filter(Boolean) as string[]

  const quotedPrice = event.quoted_price_cents
    ? '$' + (event.quoted_price_cents / 100).toFixed(2)
    : 'TBD'
  // Use event's deposit_amount_cents if set, otherwise default to 50%
  const depositCents =
    event.deposit_amount_cents ??
    (event.quoted_price_cents ? Math.round(event.quoted_price_cents * 0.5) : null)
  const depositPercent =
    event.quoted_price_cents && depositCents
      ? Math.round((depositCents / event.quoted_price_cents) * 100)
      : 50
  const depositAmount = depositCents
    ? '$' + (depositCents / 100).toFixed(2) + ` (${depositPercent}%)`
    : 'TBD'
  const balanceCents =
    event.quoted_price_cents && depositCents ? event.quoted_price_cents - depositCents : null

  const systemPrompt = `You are a legal document drafter for a private chef business.
Draft a professional service agreement. Use clear, plain English.
Use placeholders like [SIGNATURE] and [DATE] for signature blocks.
Return ONLY valid JSON.`

  const userContent = `Draft a professional service agreement for the following event.
Include all standard sections a private chef contract should have.

Parties:
  Chef/Service Provider: ${chef?.full_name ?? 'Chef'}, ${chef?.business_name ?? ''}
  Email: ${chef?.email ?? 'TBD'}, Phone: ${chef?.phone ?? 'TBD'}${coHosts.length > 0 ? `\n  Co-hosting Chef(s): ${coHosts.join(', ')}` : ''}
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
  Balance due: ${balanceCents ? '$' + (balanceCents / 100).toFixed(2) + ' (due 48 hours before event)' : 'TBD'}

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

  const { result, source } = await withAiFallback(
    // Template: standard contract sections with variable substitution - deterministic
    () =>
      generateContractTemplate({
        chefName: chef?.full_name ?? 'Chef',
        businessName: chef?.business_name ?? undefined,
        chefEmail: chef?.email ?? undefined,
        chefPhone: chef?.phone ?? undefined,
        clientName: client?.full_name ?? 'Client Name TBD',
        clientEmail: client?.email ?? undefined,
        occasion: event.occasion ?? 'Private Dinner',
        eventDate: event.event_date ?? 'TBD',
        serveTime: event.serve_time ?? undefined,
        arrivalTime: event.arrival_time ?? undefined,
        guestCount: event.guest_count ?? 0,
        locationAddress: event.location_address ?? undefined,
        serviceStyle: event.service_style ?? undefined,
        dietaryRestrictions: (event.dietary_restrictions as string[] | null) ?? undefined,
        allergies: (event.allergies as string[] | null) ?? undefined,
        specialRequests: event.special_requests ?? undefined,
        quotedPriceCents: event.quoted_price_cents ?? 0,
        depositAmountCents: event.deposit_amount_cents ?? undefined,
      }),
    // AI: enhanced contract with personalized language (when Ollama is online)
    async () => {
      const aiResult = await parseWithOllama(systemPrompt, userContent, ContractSchema)
      return {
        title: aiResult.title ?? 'Private Chef Services Agreement',
        sections: aiResult.sections ?? [],
        fullMarkdown: aiResult.fullMarkdown ?? '',
        disclaimer:
          'This is an AI-generated draft for reference only. Consult a licensed attorney before using as a binding legal document.',
        generatedAt: new Date().toISOString(),
      }
    }
  )

  return { ...result, _aiSource: source }
}
