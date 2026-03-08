export interface DraftClientProfile {
  fullName?: string | null
  firstName?: string | null
  vibeNotes?: string | null
  dietaryRestrictions?: string[] | null
  allergies?: string[] | null
  loyaltyTier?: string | null
  loyaltyPoints?: number | null
}

export interface DraftEventSummary {
  occasion?: string | null
  eventDate?: string | null
  guestCount?: number | null
  status?: string | null
  location?: string | null
  paymentStatus?: string | null
  outstandingBalanceCents?: number | null
}

export function formatDraftDate(value?: string | null): string {
  if (!value) return 'Unknown date'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

export function formatDraftCurrency(cents?: number | null): string {
  if (cents == null) return 'Unknown amount'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function buildDraftClientProfileBlock(profile: DraftClientProfile): string {
  const lines = ['CLIENT PROFILE:']
  if (profile.fullName) lines.push(`- Name: ${profile.fullName}`)
  if (profile.firstName) lines.push(`- First name: ${profile.firstName}`)
  if (profile.loyaltyTier || profile.loyaltyPoints != null) {
    const tier = profile.loyaltyTier ? profile.loyaltyTier : 'no tier set'
    const points =
      profile.loyaltyPoints != null
        ? `${profile.loyaltyPoints.toLocaleString()} points`
        : 'points unknown'
    lines.push(`- Loyalty: ${tier} (${points})`)
  }
  if (profile.vibeNotes) lines.push(`- Vibe notes: ${profile.vibeNotes}`)
  if (profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0) {
    lines.push(`- Dietary restrictions: ${profile.dietaryRestrictions.join(', ')}`)
  }
  if (profile.allergies && profile.allergies.length > 0) {
    lines.push(`- Allergies: ${profile.allergies.join(', ')}`)
  }
  return lines.join('\n')
}

export function buildDraftEventBlock(title: string, event?: DraftEventSummary | null): string {
  if (!event) return `${title}:\n- No event context found.`

  const lines = [title + ':']
  if (event.occasion) lines.push(`- Occasion: ${event.occasion}`)
  if (event.eventDate) lines.push(`- Date: ${formatDraftDate(event.eventDate)}`)
  if (event.guestCount != null) lines.push(`- Guests: ${event.guestCount}`)
  if (event.location) lines.push(`- Location: ${event.location}`)
  if (event.status) lines.push(`- Event status: ${event.status}`)
  if (event.paymentStatus) lines.push(`- Payment status: ${event.paymentStatus}`)
  if (event.outstandingBalanceCents != null) {
    lines.push(`- Outstanding balance: ${formatDraftCurrency(event.outstandingBalanceCents)}`)
  }
  return lines.join('\n')
}

export function buildDraftRelationshipBlock(input: {
  totalEvents?: number | null
  recentEvents?: DraftEventSummary[]
}): string {
  const recentEvents = input.recentEvents?.filter(Boolean) ?? []
  const lines = ['RELATIONSHIP CONTEXT:']

  if (input.totalEvents != null) {
    lines.push(`- Total non-cancelled events together: ${input.totalEvents}`)
  }

  if (recentEvents.length === 0) {
    lines.push('- No recent event history found.')
    return lines.join('\n')
  }

  lines.push('- Recent events:')
  for (const event of recentEvents.slice(0, 3)) {
    const parts: string[] = []
    parts.push(event.occasion ?? 'Untitled event')
    if (event.eventDate) parts.push(formatDraftDate(event.eventDate))
    if (event.guestCount != null) parts.push(`${event.guestCount} guests`)
    if (event.status) parts.push(event.status)
    lines.push(`  - ${parts.join(' | ')}`)
  }

  return lines.join('\n')
}

export function buildDraftContextSections(input: {
  client: DraftClientProfile
  targetEvent?: DraftEventSummary | null
  targetEventTitle?: string
  recentEvents?: DraftEventSummary[]
  totalEvents?: number | null
}): string {
  const sections = [buildDraftClientProfileBlock(input.client)]

  if (input.targetEvent !== undefined) {
    sections.push(
      buildDraftEventBlock(input.targetEventTitle ?? 'EVENT CONTEXT', input.targetEvent)
    )
  }

  sections.push(
    buildDraftRelationshipBlock({
      totalEvents: input.totalEvents,
      recentEvents: input.recentEvents,
    })
  )

  return sections.filter(Boolean).join('\n\n')
}
