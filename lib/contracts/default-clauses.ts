// Default contract clause library for new chefs.
// Professional, readable contract language covering all standard categories.

export type ClauseCategory =
  | 'cancellation'
  | 'reschedule'
  | 'liability'
  | 'kitchen'
  | 'ip'
  | 'confidentiality'
  | 'force_majeure'
  | 'dispute'
  | 'payment'
  | 'scope'
  | 'custom'

export type DefaultClause = {
  slug: string
  title: string
  body: string
  category: ClauseCategory
  sort_order: number
}

export const DEFAULT_CLAUSES: DefaultClause[] = [
  {
    slug: 'force-majeure',
    title: 'Force Majeure',
    body: `## Force Majeure

Neither party shall be liable for failure to perform obligations under this Agreement if such failure results from circumstances beyond reasonable control, including but not limited to:

- Natural disasters (earthquakes, floods, hurricanes, severe storms)
- Pandemic or epidemic declarations by health authorities
- Government orders, quarantine requirements, or travel restrictions
- Chef illness or injury that prevents safe food preparation
- Utility failures at the event venue

In the event of force majeure, the affected party shall notify the other party as soon as reasonably possible. Both parties agree to work in good faith to reschedule or adjust the service terms. If rescheduling is not feasible, deposits will be refunded in full.`,
    category: 'force_majeure',
    sort_order: 1,
  },
  {
    slug: 'intellectual-property',
    title: 'Intellectual Property',
    body: `## Intellectual Property

Chef retains all intellectual property rights to recipes, techniques, plating designs, menu concepts, and proprietary methods used in the preparation and execution of services under this Agreement.

Client may not reproduce, distribute, publish, or commercially exploit any recipes, preparation methods, or culinary techniques without prior written consent from Chef.

Photographs of plated dishes for personal use (social media, personal albums) are permitted unless otherwise restricted by a confidentiality clause in this Agreement.`,
    category: 'ip',
    sort_order: 2,
  },
  {
    slug: 'dispute-resolution',
    title: 'Dispute Resolution',
    body: `## Dispute Resolution

In the event of any dispute arising from this Agreement, the parties agree to the following resolution process:

1. **Good Faith Discussion.** Both parties shall first attempt to resolve the dispute through direct communication within fourteen (14) days of written notice.

2. **Mediation.** If direct discussion does not resolve the dispute, both parties agree to participate in mediation conducted by a mutually agreed-upon mediator. Mediation costs shall be split equally.

3. **Binding Arbitration.** If mediation is unsuccessful within thirty (30) days, the dispute shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitrator's decision shall be final and enforceable in any court of competent jurisdiction.

Each party shall bear its own legal costs unless the arbitrator determines otherwise.`,
    category: 'dispute',
    sort_order: 3,
  },
  {
    slug: 'kitchen-requirements',
    title: 'Kitchen Requirements',
    body: `## Kitchen and Workspace Requirements

Client agrees to provide Chef with access to a clean, safe, and functional kitchen that meets the following minimum requirements:

- **Working appliances:** Oven, stovetop with at least four burners, refrigerator with adequate space for event ingredients
- **Running water:** Hot and cold water supply at the kitchen sink
- **Counter space:** Minimum six (6) linear feet of clear counter workspace
- **Electrical outlets:** At least two accessible outlets for portable equipment
- **Ventilation:** Working range hood or adequate ventilation
- **Cleanliness:** Kitchen cleaned and cleared of personal items prior to Chef's arrival

If the kitchen does not meet these requirements upon arrival, Chef reserves the right to adjust the menu, delay service, or, in cases where food safety cannot be maintained, cancel the service with full payment due.

Client is responsible for disclosing any known kitchen issues (broken appliances, pest concerns, renovation work) at least 48 hours before the event.`,
    category: 'kitchen',
    sort_order: 4,
  },
  {
    slug: 'cancellation-policy',
    title: 'Cancellation Policy',
    body: `## Cancellation Policy

Cancellation fees are determined by the notice period provided before the scheduled event date, as outlined in the chef's fee schedule:

- **30+ days before event:** Deposit forfeited; no additional fee
- **15 to 29 days before event:** 50% of total quoted price
- **7 to 14 days before event:** 75% of total quoted price
- **Less than 7 days before event:** 100% of total quoted price

Cancellation must be communicated in writing (email or through the client portal). The cancellation date is determined by when written notice is received, not when it is sent.

If Chef cancels for reasons other than force majeure, Client will receive a full refund of all payments made, including the deposit.`,
    category: 'cancellation',
    sort_order: 5,
  },
  {
    slug: 'reschedule-policy',
    title: 'Reschedule Policy',
    body: `## Reschedule Policy

Client may request to reschedule the event subject to the following terms:

- **First reschedule:** No fee if requested 14+ days before the original event date and the new date is within 90 days
- **Subsequent reschedules:** A reschedule fee of $150 applies per occurrence
- **Maximum reschedules:** A maximum of two (2) reschedules are permitted per event. After the second reschedule, any further date change will be treated as a cancellation and new booking.

All reschedule requests must be made in writing. Chef will confirm availability for the proposed new date within 48 hours. If Chef is unavailable on the requested date, Client may propose an alternative date or cancel under the cancellation policy terms.

The original deposit and any payments made will be applied to the rescheduled event.`,
    category: 'reschedule',
    sort_order: 6,
  },
  {
    slug: 'limitation-of-liability',
    title: 'Limitation of Liability',
    body: `## Limitation of Liability

Chef's total liability under this Agreement shall not exceed the total service fee paid by Client for the specific event in question.

Chef shall not be liable for any indirect, incidental, consequential, or punitive damages, including but not limited to lost profits, emotional distress, or event disruption costs.

**Food Safety:** Chef follows industry-standard food safety practices (proper temperature control, allergen awareness, sanitary preparation). Client is responsible for disclosing all known food allergies and dietary restrictions for all guests prior to menu finalization. Chef is not liable for allergic reactions caused by undisclosed allergens.

**Third-Party Actions:** Chef is not liable for damages caused by venue conditions, other vendors, guest behavior, or circumstances outside Chef's direct control.

Client acknowledges that private dining involves inherent risks and agrees to hold Chef harmless for incidents not caused by Chef's negligence.`,
    category: 'liability',
    sort_order: 7,
  },
  {
    slug: 'confidentiality',
    title: 'Confidentiality and Non-Disclosure',
    body: `## Confidentiality and Non-Disclosure

Chef agrees to maintain strict confidentiality regarding:

- Client's identity, address, and personal information
- Guest list and attendee identities
- Event details, themes, and private conversations
- Any information observed or overheard during service

Chef shall not disclose, photograph, or reference the Client or event on social media, marketing materials, or any public forum without prior written consent.

This confidentiality obligation survives the termination of this Agreement and remains in effect indefinitely.

Exceptions: Chef may disclose information if required by law, court order, or government regulation, and will notify Client promptly in such cases where legally permitted.`,
    category: 'confidentiality',
    sort_order: 8,
  },
  {
    slug: 'payment-terms',
    title: 'Payment Terms',
    body: `## Payment Terms

- **Deposit:** A non-refundable deposit of {{deposit_amount}} is due upon signing this Agreement to secure the event date. The event is not confirmed until the deposit is received.
- **Final Payment:** The remaining balance of {{quoted_price}} (less deposit) is due no later than 48 hours before the scheduled event date.
- **Payment Methods:** Payment may be made via credit card, bank transfer, or other method agreed upon in writing.
- **Late Payment:** Payments received after the due date will incur a late fee of $50 or 5% of the outstanding balance (whichever is greater) per week until paid in full.
- **Returned Payments:** A fee of $35 applies to any returned check or failed payment.

If final payment is not received by the due date, Chef reserves the right to suspend preparation and, if payment remains outstanding 24 hours before the event, cancel the service with the deposit forfeited.`,
    category: 'payment',
    sort_order: 9,
  },
  {
    slug: 'scope-of-service',
    title: 'Scope of Service',
    body: `## Scope of Service

### Included in Service:
- Menu planning and consultation
- Ingredient sourcing and procurement
- On-site food preparation and cooking
- Plating and service as agreed (plated, family-style, or buffet)
- Kitchen cleanup: all cooking surfaces, equipment used, and dishware washed/loaded

### Not Included (unless separately agreed):
- Tableware, linens, glassware, or serving equipment rental
- Dining room setup, table setting, or decoration
- Beverage service, bar setup, or alcohol procurement
- Wait staff or additional service personnel
- Grocery delivery to venue (Chef sources and transports)
- Post-event leftover packaging beyond basic containers

Any additions to the scope must be agreed upon in writing at least 7 days before the event and may incur additional charges.

Guest count changes of more than 20% from the original agreement may result in a revised quote.`,
    category: 'scope',
    sort_order: 10,
  },
]

/**
 * Seed default clauses for a chef who has no clauses yet.
 * Idempotent: only inserts if chef has zero existing clauses.
 */
export async function seedDefaultClauses(
  chefId: string
): Promise<{ seeded: boolean; count: number }> {
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()

  // Check if chef already has clauses
  const { data: existing, error: checkError } = await db
    .from('contract_clauses')
    .select('id')
    .eq('chef_id', chefId)
    .limit(1)

  if (checkError) {
    console.error('[seedDefaultClauses] Check error:', checkError)
    return { seeded: false, count: 0 }
  }

  if (existing && existing.length > 0) {
    return { seeded: false, count: 0 }
  }

  // Insert all defaults
  const rows = DEFAULT_CLAUSES.map((clause) => ({
    chef_id: chefId,
    slug: clause.slug,
    title: clause.title,
    body: clause.body,
    category: clause.category,
    is_default: true,
    sort_order: clause.sort_order,
  }))

  const { error: insertError } = await db.from('contract_clauses').insert(rows)

  if (insertError) {
    console.error('[seedDefaultClauses] Insert error:', insertError)
    return { seeded: false, count: 0 }
  }

  return { seeded: true, count: rows.length }
}
