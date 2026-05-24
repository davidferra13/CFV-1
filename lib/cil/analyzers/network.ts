import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeNetwork(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client: any = createServerClient({ admin: true })
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    const { data: connections } = await client
      .from('chef_connections')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${tenantId},addressee_id.eq.${tenantId}`)
      .eq('status', 'accepted')

    if (!connections || connections.length === 0) return []

    const connectedIds = connections.map((c: any) =>
      c.requester_id === tenantId ? c.addressee_id : c.requester_id
    )

    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: snapshots } = await client
      .from('chef_activity_snapshots')
      .select('chef_id, upcoming_event_count, avg_weekly_events, streak_weeks, updated_at')
      .in('chef_id', connectedIds)
      .gte('updated_at', sevenDaysAgo)

    if (!snapshots || snapshots.length === 0) return []

    const { data: ownSnapshot } = await client
      .from('chef_activity_snapshots')
      .select('upcoming_event_count, avg_weekly_events')
      .eq('chef_id', tenantId)
      .maybeSingle()

    const ownUpcoming = ownSnapshot?.upcoming_event_count ?? 0
    const ownAvg = Number(ownSnapshot?.avg_weekly_events) || 0

    const { data: chefs } = await client
      .from('chefs')
      .select('id, display_name, business_name')
      .in(
        'id',
        snapshots.map((s: any) => s.chef_id)
      )

    const nameMap = new Map<string, string>(
      (chefs ?? []).map((c: any) => [c.id, c.display_name || c.business_name || 'A chef'])
    )

    if (snapshots.length >= 3) {
      analyzeNetworkTrend(snapshots, signals, now)
    }

    analyzeReferralWindows(snapshots, ownUpcoming, ownAvg, nameMap, signals, now)
    analyzeCapacityAvailable(snapshots, ownUpcoming, ownAvg, signals, now)
    analyzeStreakMilestones(snapshots, nameMap, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/network] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

function analyzeNetworkTrend(snapshots: any[], signals: ProactiveSignal[], now: number): void {
  let totalUpcoming = 0
  let totalAvg = 0

  for (const s of snapshots) {
    totalUpcoming += s.upcoming_event_count
    totalAvg += Number(s.avg_weekly_events) || 0
  }

  if (totalAvg <= 0) return

  const ratio = totalUpcoming / totalAvg

  if (ratio > 1.3) {
    signals.push({
      id: generateId(),
      domain: 'network',
      urgency: 2,
      confidence: Math.min(ratio / 2, 1),
      title: 'Your network is heating up',
      detail: `Your connections have ${totalUpcoming} upcoming events, ${Math.round((ratio - 1) * 100)}% above their usual pace. Good time to reach out for referrals.`,
      suggestedAction: 'Check your network activity for referral opportunities',
      actionType: 'navigate',
      actionPayload: { href: '/network' },
      entityIds: [],
      source: 'network_pulse',
      createdAt: now,
    })
  } else if (ratio < 0.7 && totalAvg > 0) {
    signals.push({
      id: generateId(),
      domain: 'network',
      urgency: 1,
      confidence: Math.min(1 - ratio, 1),
      title: 'Network slowing down',
      detail: `Your connections have ${totalUpcoming} upcoming events, ${Math.round((1 - ratio) * 100)}% below their usual pace. Consider proactive outreach.`,
      suggestedAction: 'Reach out to connections about availability',
      actionType: 'navigate',
      actionPayload: { href: '/network' },
      entityIds: [],
      source: 'network_pulse',
      createdAt: now,
    })
  }
}

function analyzeReferralWindows(
  snapshots: any[],
  ownUpcoming: number,
  ownAvg: number,
  nameMap: Map<string, string>,
  signals: ProactiveSignal[],
  now: number
): void {
  if (ownAvg <= 0 || ownUpcoming <= ownAvg * 1.5) return

  for (const s of snapshots) {
    const connAvg = Number(s.avg_weekly_events) || 0
    if (connAvg > 0 && s.upcoming_event_count < connAvg * 0.5) {
      const name = nameMap.get(s.chef_id) ?? 'A connection'
      signals.push({
        id: generateId(),
        domain: 'network',
        urgency: 3,
        confidence: 0.8,
        title: `Referral window: ${name}`,
        detail: `You're booked solid. ${name} has availability; refer a client?`,
        suggestedAction: `Send ${name} a referral`,
        actionType: 'navigate',
        actionPayload: { href: '/network', connectionChefId: s.chef_id },
        entityIds: [s.chef_id],
        source: 'network_pulse',
        createdAt: now,
      })
    }
  }
}

function analyzeCapacityAvailable(
  snapshots: any[],
  ownUpcoming: number,
  ownAvg: number,
  signals: ProactiveSignal[],
  now: number
): void {
  if (ownAvg <= 0 || ownUpcoming >= ownAvg * 0.5) return

  const busyConnections = snapshots.filter((s: any) => {
    const connAvg = Number(s.avg_weekly_events) || 0
    return connAvg > 0 && s.upcoming_event_count > connAvg * 1.5
  })

  if (busyConnections.length > 0) {
    signals.push({
      id: generateId(),
      domain: 'network',
      urgency: 2,
      confidence: 0.7,
      title: 'You have availability',
      detail: `You have availability and ${busyConnections.length} connection${busyConnections.length === 1 ? ' is' : 's are'} busy. Let them know you can take referrals.`,
      suggestedAction: 'Let your network know about your availability',
      actionType: 'navigate',
      actionPayload: { href: '/network' },
      entityIds: [],
      source: 'network_pulse',
      createdAt: now,
    })
  }
}

function analyzeStreakMilestones(
  snapshots: any[],
  nameMap: Map<string, string>,
  signals: ProactiveSignal[],
  now: number
): void {
  const milestones = [4, 8, 12]

  for (const s of snapshots) {
    if (milestones.includes(s.streak_weeks)) {
      const name = nameMap.get(s.chef_id) ?? 'A connection'
      signals.push({
        id: generateId(),
        domain: 'network',
        urgency: 1,
        confidence: 1.0,
        title: `Streak milestone: ${name}`,
        detail: `Congrats to ${name} on a ${s.streak_weeks}-week booking streak!`,
        suggestedAction: `Send ${name} a congratulations`,
        actionType: 'navigate',
        actionPayload: { href: '/network' },
        entityIds: [s.chef_id],
        source: 'network_pulse',
        createdAt: now,
      })
    }
  }
}
