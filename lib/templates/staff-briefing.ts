// Staff Briefing Template - Structured Document
// Standard pre-event briefing document for kitchen/service staff.
// Every catering operation uses a briefing document - it's just data in sections.

// ── Types (match the AI version exactly) ───────────────────────────────────

export type StaffBriefingDocument = {
  subject: string
  openingParagraph: string
  serviceProtocol: string
  menuNarrative: string
  clientVibeNotes: string
  allergenAlerts: string
  keyTimings: string
  dresscodeAndPresentation: string
  cleanupProtocol: string
  closingNote: string
  fullDocument: string
  generatedAt: string
}

// ── Input types ────────────────────────────────────────────────────────────

export type BriefingVars = {
  chefName: string
  businessName?: string
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
  notes?: string
  menuItems: Array<{
    name: string
    courseType?: string
    description?: string
    allergenTags?: string[]
  }>
  guests?: Array<{ name: string; dietaryRestrictions?: string[]; allergies?: string[] }>
  staff?: Array<{ name: string; role: string }>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Template ───────────────────────────────────────────────────────────────

/**
 * Generates a structured staff briefing document.
 * Pure template - no AI, no network, deterministic.
 */
export function generateStaffBriefingTemplate(v: BriefingVars): StaffBriefingDocument {
  const subject = `Staff Briefing: ${v.occasion} - ${formatDate(v.eventDate)}`

  const openingParagraph = `Team - here's your briefing for ${v.occasion} on ${formatDate(v.eventDate)}. We're serving ${v.guestCount} guests${v.locationAddress ? ' at ' + v.locationAddress : ''}. Service style: ${v.serviceStyle ?? 'plated'}. Read this fully before service begins.`

  // Service protocol
  const serviceProtocol = [
    `**Service Style:** ${v.serviceStyle ?? 'Plated'}`,
    `**Guest Count:** ${v.guestCount}`,
    v.arrivalTime ? `**Team Arrival:** ${v.arrivalTime}` : null,
    v.serveTime ? `**Service Time:** ${v.serveTime}` : null,
    '',
    'Standard service flow:',
    '1. Arrive and set up kitchen workspace',
    '2. Confirm all ingredients and equipment',
    '3. Begin prep according to timeline',
    '4. Final quality check before plating',
    '5. Service - plate and deliver each course',
    '6. Clear between courses',
    '7. Dessert and final service',
    '8. Kitchen cleanup and pack-out',
  ]
    .filter(Boolean)
    .join('\n')

  // Menu narrative
  const courseGroups = new Map<string, typeof v.menuItems>()
  for (const item of v.menuItems) {
    const course = item.courseType ?? 'Main'
    if (!courseGroups.has(course)) courseGroups.set(course, [])
    courseGroups.get(course)!.push(item)
  }

  const menuNarrative =
    v.menuItems.length > 0
      ? Array.from(courseGroups.entries())
          .map(
            ([course, items]) =>
              `**${course}:**\n${items.map((i) => `- ${i.name}${i.description ? ' - ' + i.description : ''}`).join('\n')}`
          )
          .join('\n\n')
      : 'Menu not yet finalized - check with Chef before service.'

  // Client vibe notes
  const clientVibeNotes =
    v.specialRequests || v.notes
      ? `**Special Requests:** ${v.specialRequests ?? 'None'}\n**Notes:** ${v.notes ?? 'None'}`
      : 'No special notes from the client. Standard service - be warm, professional, and attentive.'

  // Allergen alerts
  const allAllergens = new Set<string>()
  const allRestrictions = new Set<string>()

  if (v.dietaryRestrictions) v.dietaryRestrictions.forEach((r) => allRestrictions.add(r))
  if (v.allergies) v.allergies.forEach((a) => allAllergens.add(a))
  if (v.guests) {
    for (const g of v.guests) {
      if (g.dietaryRestrictions) g.dietaryRestrictions.forEach((r) => allRestrictions.add(r))
      if (g.allergies) g.allergies.forEach((a) => allAllergens.add(a))
    }
  }

  let allergenAlerts: string
  if (allAllergens.size > 0 || allRestrictions.size > 0) {
    const parts: string[] = ['⚠️ **ALLERGEN ALERT - READ CAREFULLY** ⚠️', '']
    if (allAllergens.size > 0) {
      parts.push(`**Allergies:** ${Array.from(allAllergens).join(', ')}`)
    }
    if (allRestrictions.size > 0) {
      parts.push(`**Dietary Restrictions:** ${Array.from(allRestrictions).join(', ')}`)
    }
    if (v.guests && v.guests.some((g) => (g.allergies?.length ?? 0) > 0)) {
      parts.push('')
      parts.push('**Per-guest breakdown:**')
      for (const g of v.guests) {
        if ((g.allergies?.length ?? 0) > 0 || (g.dietaryRestrictions?.length ?? 0) > 0) {
          parts.push(
            `- ${g.name}: ${[...(g.allergies ?? []), ...(g.dietaryRestrictions ?? [])].join(', ')}`
          )
        }
      }
    }
    parts.push('')
    parts.push(
      '**Protocol:** Use dedicated cutting boards. Sanitize utensils between allergen/non-allergen prep. Brief all staff on severity.'
    )
    allergenAlerts = parts.join('\n')
  } else {
    allergenAlerts =
      'No allergens or dietary restrictions noted for this event. Standard food safety protocols apply.'
  }

  // Key timings
  const keyTimings = [
    v.arrivalTime
      ? `- **${v.arrivalTime}** - Team arrival, setup begins`
      : '- **T-2h** - Team arrival, setup begins',
    '- **T-1h** - All prep complete, begin final cook',
    '- **T-30m** - Quality check, taste everything',
    '- **T-15m** - Plates ready, final plating prep',
    v.serveTime
      ? `- **${v.serveTime}** - Service begins`
      : '- **Service time** - First course goes out',
    '- **+30m per course** - Course intervals (adjust as needed)',
    '- **Post-service** - Kitchen cleanup, pack-out, debrief',
  ].join('\n')

  // Dress code
  const dresscodeAndPresentation = `**Dress Code:** Clean chef coat (or all black if no coat), clean apron, closed-toe non-slip shoes, hair tied back.
**Presentation:** Professional, warm, and attentive. No phones during service. Greet guests with a smile.
**Hygiene:** Wash hands before and between every major task. Gloves for plating.`

  // Cleanup protocol
  const cleanupProtocol = `1. All food properly stored or discarded (label leftovers with date/time)
2. All surfaces sanitized
3. All dishes washed and dried
4. Floor swept and mopped
5. Trash bagged and taken out
6. Equipment packed and accounted for
7. Walk-through: leave the kitchen cleaner than you found it
8. Check-out with venue contact (if applicable)`

  // Closing note
  const closingNote = `Thank you for being part of this team. Let's make ${v.occasion} an incredible experience for our guests. If you have questions, ask before service starts - not during.

- Chef ${v.chefName}`

  // Assemble full document
  const fullDocument = [
    `# ${subject}`,
    '',
    openingParagraph,
    '',
    `## Service Protocol`,
    serviceProtocol,
    '',
    `## Menu`,
    menuNarrative,
    '',
    `## Client Notes`,
    clientVibeNotes,
    '',
    `## Allergen Alerts`,
    allergenAlerts,
    '',
    `## Key Timings`,
    keyTimings,
    '',
    `## Dress Code & Presentation`,
    dresscodeAndPresentation,
    '',
    `## Cleanup Protocol`,
    cleanupProtocol,
    '',
    '---',
    closingNote,
  ].join('\n')

  return {
    subject,
    openingParagraph,
    serviceProtocol,
    menuNarrative,
    clientVibeNotes,
    allergenAlerts,
    keyTimings,
    dresscodeAndPresentation,
    cleanupProtocol,
    closingNote,
    fullDocument,
    generatedAt: new Date().toISOString(),
  }
}
