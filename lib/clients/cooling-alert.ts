// Cooling Alert Logic
// Detects clients whose booking frequency has dropped off.

export interface CoolingClient {
  clientId: string
  name: string
  lastEventDate: string | null
  daysSinceLastEvent: number | null
  tier: string | null
  suggestedAction: string
}

interface ClientRecord {
  id: string
  name: string
  last_event_date: string | null
  tier: string | null
  intentionally_inactive: boolean
}

const DEFAULT_COOLING_THRESHOLD_DAYS = 60
const VIP_COOLING_THRESHOLD_DAYS = 45

/**
 * Identify clients whose relationships are cooling.
 * A client is "cooling" if they haven't booked in longer than their expected frequency.
 * VIP clients get a shorter threshold (45 days vs 60).
 */
export function findCoolingClients(clients: ClientRecord[]): CoolingClient[] {
  const now = Date.now()
  const results: CoolingClient[] = []

  for (const c of clients) {
    if (c.intentionally_inactive) continue
    if (!c.last_event_date) continue

    const lastDate = new Date(c.last_event_date).getTime()
    const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))

    const threshold =
      c.tier === 'vip' || c.tier === 'platinum' || c.tier === 'gold'
        ? VIP_COOLING_THRESHOLD_DAYS
        : DEFAULT_COOLING_THRESHOLD_DAYS

    if (daysSince >= threshold) {
      const isVip = c.tier === 'vip' || c.tier === 'platinum' || c.tier === 'gold'
      results.push({
        clientId: c.id,
        name: c.name,
        lastEventDate: c.last_event_date,
        daysSinceLastEvent: daysSince,
        tier: c.tier,
        suggestedAction: isVip ? 'Priority Re-engage' : 'Check In',
      })
    }
  }

  // Sort by days since last event (most overdue first)
  results.sort((a, b) => (b.daysSinceLastEvent ?? 0) - (a.daysSinceLastEvent ?? 0))

  return results
}
