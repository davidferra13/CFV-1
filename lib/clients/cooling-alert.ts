// Relationship Cooling Alert - pure computation, no server action.
// Identifies clients whose relationships may be going cold based on inactivity.

export type CoolingClient = {
  clientId: string
  name: string
  lastEventDate: string | null
  daysSinceLastEvent: number
  tier: string
  suggestedAction: string
}

export function findCoolingClients(
  clients: Array<{
    id: string
    name: string
    last_event_date: string | null
    tier?: string | null
    intentionally_inactive?: boolean
  }>
): CoolingClient[] {
  const now = new Date()
  const cooling: CoolingClient[] = []

  for (const client of clients) {
    // Skip intentionally inactive clients
    if (client.intentionally_inactive) continue

    const tier = client.tier || 'standard'
    const threshold = tier === 'vip' ? 90 : 180

    let daysSinceLastEvent: number
    if (client.last_event_date) {
      const lastEvent = new Date(client.last_event_date)
      const diffMs = now.getTime() - lastEvent.getTime()
      daysSinceLastEvent = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } else {
      // Never had an event - use account age as proxy
      daysSinceLastEvent = threshold + 1 // treat as cooling
    }

    if (daysSinceLastEvent >= threshold) {
      const suggestedAction =
        tier === 'vip' ? 'Invite to exclusive dinner' : 'Send a personal check-in message'

      cooling.push({
        clientId: client.id,
        name: client.name,
        lastEventDate: client.last_event_date,
        daysSinceLastEvent,
        tier,
        suggestedAction,
      })
    }
  }

  // Sort by most overdue first
  return cooling.sort((a, b) => b.daysSinceLastEvent - a.daysSinceLastEvent)
}
