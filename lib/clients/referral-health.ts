// Referral Chain Health - pure computation, no server action.
// Analyzes the health of a chef's client referral network.

export type ReferralHealthScore = {
  totalNodes: number
  activeNodes: number // clients who have booked in last 12 months
  dormantNodes: number // clients who haven't booked in 12+ months
  newNodesLast90d: number // new referrals in last 90 days
  chainDepth: number // max referral depth
  healthLevel: 'thriving' | 'stable' | 'cooling'
}

export function computeReferralHealth(
  clients: Array<{
    id: string
    referred_by_client_id: string | null
    created_at: string
    last_event_date?: string | null
  }>
): ReferralHealthScore {
  const now = new Date()
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  let activeNodes = 0
  let dormantNodes = 0
  let newNodesLast90d = 0

  for (const client of clients) {
    // Count new referral nodes in the last 90 days
    const createdAt = new Date(client.created_at)
    if (createdAt >= ninetyDaysAgo && client.referred_by_client_id !== null) {
      newNodesLast90d++
    }

    // Active vs dormant based on last event date
    if (client.last_event_date) {
      const lastEvent = new Date(client.last_event_date)
      if (lastEvent >= twelveMonthsAgo) {
        activeNodes++
      } else {
        dormantNodes++
      }
    } else {
      // No events ever - count as dormant
      dormantNodes++
    }
  }

  // Compute max referral chain depth via BFS/DFS
  const childMap = new Map<string | null, string[]>()
  for (const client of clients) {
    const parentId = client.referred_by_client_id
    if (!childMap.has(parentId)) childMap.set(parentId, [])
    childMap.get(parentId)!.push(client.id)
  }

  function maxDepth(
    nodeId: string | null,
    currentDepth: number,
    visited: Set<string> = new Set()
  ): number {
    const children = childMap.get(nodeId) || []
    if (children.length === 0) return currentDepth
    return Math.max(
      ...children.map((childId) => {
        if (visited.has(childId)) return currentDepth // cycle detected, stop
        visited.add(childId)
        return maxDepth(childId, currentDepth + 1, visited)
      })
    )
  }

  const chainDepth = maxDepth(null, 0, new Set())

  // Determine health level
  let healthLevel: 'thriving' | 'stable' | 'cooling'
  if (newNodesLast90d >= 2) {
    healthLevel = 'thriving'
  } else if (dormantNodes > activeNodes) {
    healthLevel = 'cooling'
  } else {
    healthLevel = 'stable'
  }

  return {
    totalNodes: clients.length,
    activeNodes,
    dormantNodes,
    newNodesLast90d,
    chainDepth,
    healthLevel,
  }
}
