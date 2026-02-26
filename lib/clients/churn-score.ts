'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export interface ChurnRisk {
  clientId: string
  clientName: string
  riskLevel: 'high' | 'medium' | 'low'
  daysSinceLastEvent: number
  factors: string[]
  suggestedAction: string
}

export async function getAtRiskClients(): Promise<ChurnRisk[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: clients } = await supabase
    .from('clients')
    .select(
      `
      id, full_name, status,
      events(event_date, status)
    `
    )
    .eq('chef_id', user.entityId)
    .eq('status', 'active')

  if (!clients) return []

  const risks: ChurnRisk[] = []

  for (const client of clients) {
    const completedEvents = (client.events as any[])?.filter((e) => e.status === 'completed') ?? []
    if (completedEvents.length === 0) continue

    const lastEventDate = completedEvents
      .map((e) => new Date(e.event_date).getTime())
      .sort((a, b) => b - a)[0]

    const daysSince = Math.floor((Date.now() - lastEventDate) / 86400000)
    const factors: string[] = []
    let riskLevel: 'high' | 'medium' | 'low' = 'low'

    if (daysSince > 180) {
      riskLevel = 'high'
      factors.push('6+ months since last event')
    } else if (daysSince > 90) {
      riskLevel = 'medium'
      factors.push('3+ months since last event')
    } else continue // Not at risk

    risks.push({
      clientId: client.id,
      clientName: client.full_name,
      riskLevel,
      daysSinceLastEvent: daysSince,
      factors,
      suggestedAction:
        riskLevel === 'high'
          ? 'Send a personal check-in message'
          : 'Follow up with seasonal menu ideas',
    })
  }

  return risks.sort((a, b) => b.daysSinceLastEvent - a.daysSinceLastEvent).slice(0, 20)
}
