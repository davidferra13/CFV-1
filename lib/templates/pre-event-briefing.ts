// Pre-Event Briefing Template
// Deterministic (Formula > AI) template for the pre-event client briefing.
// Shared in the Dinner Circle 2-3 days before the event.

export interface PreEventBriefingInput {
  clientName: string
  chefFirstName: string
  eventDate: string
  eventTime: string | null
  arrivalTime: string | null
  location: string | null
  guestCount: number | null
  menuName: string | null
  courseHighlights: string[]
  dietaryConfirmed: string[]
  whatToHaveReady: string[]
}

export function generatePreEventBriefing(input: PreEventBriefingInput): { body: string } {
  const parts: string[] = []
  const clientFirst = input.clientName.split(' ')[0]

  // Opening
  parts.push(`Hi ${clientFirst}! Everything is set for ${input.eventDate}. Here's the plan:`)

  // Timeline section
  parts.push('')
  parts.push('**Timeline**')

  if (input.arrivalTime) {
    parts.push(`- I'll arrive at ${input.arrivalTime} to set up`)
  } else {
    parts.push("- I'll be there with time to set up before service")
  }

  if (input.eventTime) {
    parts.push(`- Dinner service begins at ${input.eventTime}`)
  }

  parts.push('- I handle everything: cooking, plating, serving, and cleanup')

  // Menu section
  if (input.menuName || input.courseHighlights.length > 0) {
    parts.push('')
    if (input.menuName) {
      parts.push(`**Menu: ${input.menuName}**`)
    } else {
      parts.push('**Menu Highlights**')
    }

    if (input.courseHighlights.length > 0) {
      for (const highlight of input.courseHighlights) {
        parts.push(`- ${highlight}`)
      }
    }
  }

  // Dietary section
  parts.push('')
  parts.push('**Dietary**')
  if (input.dietaryConfirmed.length > 0) {
    for (const restriction of input.dietaryConfirmed) {
      parts.push(`- ${restriction}`)
    }
  } else {
    parts.push('- No restrictions noted')
  }

  // What to have ready
  if (input.whatToHaveReady.length > 0) {
    parts.push('')
    parts.push('**Before I arrive**')
    for (const item of input.whatToHaveReady) {
      parts.push(`- ${item}`)
    }
  }

  // Guest count reminder
  if (input.guestCount) {
    parts.push('')
    parts.push(`Currently planning for ${input.guestCount} guests.`)
  }

  // Closing
  parts.push('')
  parts.push(
    'If anything changes (guest count, timing, allergies), just let me know here. Looking forward to it!'
  )
  parts.push('')
  parts.push(input.chefFirstName)

  return { body: parts.join('\n') }
}
