'use client'

// Support Network Map - Main UI Component
// Displays the support network as a grouped list organized by role.

import type { SupportNetwork, NetworkRole } from '@/lib/support-network/types'
import { SupportContactCard } from './support-contact-card'

const ROLE_ORDER: NetworkRole[] = [
  'household_member',
  'referrer',
  'referred',
  'connection',
  'event_guest',
  'vendor',
  'venue',
  'staff',
  'partner',
  'planner',
]

const ROLE_GROUP_LABELS: Record<string, string> = {
  household_member: 'Household Members',
  referrer: 'Referred By',
  referred: 'Referred Clients',
  connection: 'Connections',
  event_guest: 'Events',
  vendor: 'Vendors',
  venue: 'Venues',
  staff: 'Staff',
  partner: 'Partners',
  planner: 'Planners',
}

export function SupportNetworkMap({ network }: { network: SupportNetwork }) {
  if (network.nodes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-stone-400">
          No support network connections found yet.
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Connections, referrals, events, and vendor relationships will appear here as they are recorded.
        </p>
      </div>
    )
  }

  // Group nodes by role
  const groups = new Map<string, typeof network.nodes>()
  for (const node of network.nodes) {
    const existing = groups.get(node.role) || []
    existing.push(node)
    groups.set(node.role, existing)
  }

  // Sort groups by the defined order
  const orderedGroups = ROLE_ORDER
    .filter((role) => groups.has(role))
    .map((role) => ({
      role,
      label: ROLE_GROUP_LABELS[role] || role,
      nodes: groups.get(role)!,
    }))

  // Add any roles not in the predefined order
  for (const [role, nodes] of groups) {
    if (!ROLE_ORDER.includes(role as NetworkRole)) {
      orderedGroups.push({
        role: role as NetworkRole,
        label: ROLE_GROUP_LABELS[role] || role,
        nodes,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-2 text-xs text-stone-500">
        <span>{network.nodes.length} connections</span>
        <span>{network.edges.length} relationships</span>
      </div>

      {/* Grouped list */}
      {orderedGroups.map((group) => (
        <div key={group.role}>
          <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
            {group.label} ({group.nodes.length})
          </h3>
          <div className="space-y-2">
            {group.nodes.map((node) => (
              <SupportContactCard key={node.id} node={node} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
