'use client'

import Link from 'next/link'
import type { NetworkNode } from '@/lib/support-network/types'
import { Badge } from '@/components/ui/badge'

function roleColor(role: string): string {
  switch (role) {
    case 'household_member': return 'bg-blue-500/20 text-blue-400'
    case 'referrer': return 'bg-green-500/20 text-green-400'
    case 'referred': return 'bg-emerald-500/20 text-emerald-400'
    case 'event_guest': return 'bg-purple-500/20 text-purple-400'
    case 'vendor': return 'bg-amber-500/20 text-amber-400'
    case 'partner': return 'bg-orange-500/20 text-orange-400'
    case 'staff': return 'bg-cyan-500/20 text-cyan-400'
    case 'planner': return 'bg-pink-500/20 text-pink-400'
    case 'venue': return 'bg-teal-500/20 text-teal-400'
    case 'connection': return 'bg-stone-500/20 text-stone-400'
    default: return 'bg-stone-500/20 text-stone-400'
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case 'household_member': return 'Household'
    case 'referrer': return 'Referrer'
    case 'referred': return 'Referred'
    case 'event_guest': return 'Event'
    case 'vendor': return 'Vendor'
    case 'partner': return 'Partner'
    case 'staff': return 'Staff'
    case 'planner': return 'Planner'
    case 'venue': return 'Venue'
    case 'connection': return 'Connection'
    default: return role
  }
}

export function SupportContactCard({ node }: { node: NetworkNode }) {
  const content = (
    <div className="group flex items-start gap-3 rounded-lg border border-stone-700 bg-stone-800/50 p-3 hover:border-stone-600 hover:bg-stone-800 transition-colors">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-700 text-sm font-medium text-stone-300">
        {node.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-200 group-hover:text-white truncate">
            {node.name}
          </span>
          <Badge className={`shrink-0 text-[10px] ${roleColor(node.role)}`}>
            {roleLabel(node.role)}
          </Badge>
        </div>
        {node.context && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">{node.context}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-stone-500">
          {node.email && <span>{node.email}</span>}
          {node.phone && <span>{node.phone}</span>}
          {node.lastInteraction && (
            <span>Last: {new Date(node.lastInteraction).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )

  if (node.href) {
    return <Link href={node.href}>{content}</Link>
  }
  return content
}
