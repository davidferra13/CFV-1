// Contract/Proposal Template - Fill-in-the-Blank
// Standard private chef service agreement with variable substitution.
// Every catering business uses essentially this same structure.
// AI can optionally personalize - but the template always works.

// ── Types (match the AI version exactly) ───────────────────────────────────

export type GeneratedContract = {
  title: string
  sections: Array<{ heading: string; content: string }>
  fullMarkdown: string
  disclaimer: string
  generatedAt: string
}

// ── Input types ────────────────────────────────────────────────────────────

export type ContractVars = {
  chefName: string
  businessName?: string
  chefEmail?: string
  chefPhone?: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  occasion: string
  eventDate: string
  serveTime?: string
  arrivalTime?: string
  guestCount: number
  locationAddress?: string
  serviceStyle?: string
  dietaryRestrictions?: string[]
  allergies?: string[]
  specialRequests?: string
  quotedPriceCents: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLong(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatCents(cents: number): string {
  return (
    '$' +
    (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

// ── Template ───────────────────────────────────────────────────────────────

/**
 * Generates a professional service agreement from event data.
 * Pure template - no AI, no network, deterministic.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function generateContractTemplate(v: ContractVars): GeneratedContract {
  const deposit = Math.round(v.quotedPriceCents * 0.5)
  const balance = v.quotedPriceCents - deposit

  const sections: Array<{ heading: string; content: string }> = [
    {
      heading: 'Parties',
      content: `This agreement is between **${v.chefName}**${v.businessName ? ' (' + v.businessName + ')' : ''} ("Chef") and **${v.clientName}** ("Client").`,
    },
    {
      heading: 'Event Details',
      content: [
        `- **Event:** ${v.occasion}`,
        `- **Date:** ${formatDateLong(v.eventDate)}`,
        v.serveTime ? `- **Service Time:** ${v.serveTime}` : null,
        v.arrivalTime ? `- **Chef Arrival:** ${v.arrivalTime}` : null,
        `- **Guest Count:** ${v.guestCount}`,
        v.locationAddress ? `- **Location:** ${v.locationAddress}` : null,
        v.serviceStyle ? `- **Service Style:** ${v.serviceStyle}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    },
    {
      heading: 'Services Provided',
      content: `Chef will provide the following services for the event:
- Menu planning and customization
- Grocery shopping and ingredient sourcing
- Food preparation and cooking
- Plating and service
- Kitchen cleanup after service

${v.dietaryRestrictions && v.dietaryRestrictions.length > 0 ? '**Dietary Accommodations:** ' + v.dietaryRestrictions.join(', ') : ''}
${v.allergies && v.allergies.length > 0 ? '**Allergy Accommodations:** ' + v.allergies.join(', ') : ''}
${v.specialRequests ? '**Special Requests:** ' + v.specialRequests : ''}`.trim(),
    },
    {
      heading: 'Pricing & Payment',
      content: `- **Total Fee:** ${formatCents(v.quotedPriceCents)}
- **Deposit (50%):** ${formatCents(deposit)} - due upon signing
- **Balance (50%):** ${formatCents(balance)} - due on or before the event date

Payment may be made by bank transfer, credit card, or check. The deposit is required to confirm the booking.`,
    },
    {
      heading: 'Cancellation Policy',
      content: `- **14+ days before event:** Full deposit refund
- **7–13 days before event:** 50% deposit refund
- **Less than 7 days:** Deposit is non-refundable

If Chef must cancel due to emergency, a full refund will be issued.`,
    },
    {
      heading: 'Liability & Allergen Disclosure',
      content: `Client is responsible for informing Chef of all dietary restrictions and allergies for all guests. Chef will take all reasonable precautions but cannot guarantee a completely allergen-free environment.

Chef maintains appropriate food handler certifications and follows food safety best practices per FDA Food Code guidelines.`,
    },
    {
      heading: 'Guest Count Changes',
      content: `Final guest count is due 5 business days before the event. Increases of 10% or more may incur additional charges at the same per-person rate. Decreases after the final count do not reduce the total fee.`,
    },
    {
      heading: 'Agreement',
      content: `By signing below, both parties agree to the terms of this service agreement.

**Chef:** ${v.chefName}
Date: _______________
Signature: _______________

**Client:** ${v.clientName}
Date: _______________
Signature: _______________`,
    },
  ]

  const title = `Private Chef Service Agreement - ${v.occasion}`

  const fullMarkdown = [
    `# ${title}`,
    '',
    ...sections.map((s) => `## ${s.heading}\n\n${s.content}`),
    '',
    '---',
    '*This document was generated by ChefFlow. It is a template and should be reviewed by both parties before signing. For complex events or unique circumstances, consider consulting a legal professional.*',
  ].join('\n\n')

  return {
    title,
    sections,
    fullMarkdown,
    disclaimer:
      'This is a template service agreement. Review all terms before signing. For complex events, consult a legal professional.',
    generatedAt: new Date().toISOString(),
  }
}
