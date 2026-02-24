import Link from 'next/link'
import type { ServiceSlotClientMatch } from '@/lib/goals/types'
import { formatDollars } from '@/lib/goals/service-mix-utils'

interface ServiceSlotClientMatchListProps {
  matches: ServiceSlotClientMatch[]
  serviceTypeName: string
}

export function ServiceSlotClientMatchList({
  matches,
  serviceTypeName,
}: ServiceSlotClientMatchListProps) {
  if (matches.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
        Clients who fit {serviceTypeName}
      </p>
      <div className="flex flex-wrap gap-2">
        {matches.map((match) => (
          <Link
            key={match.clientId}
            href={`/clients/${match.clientId}`}
            className="group inline-flex flex-col rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5 hover:border-brand-600 hover:bg-brand-950 transition-colors"
          >
            <span className="text-xs font-medium text-stone-200 group-hover:text-brand-400">
              {match.clientName}
            </span>
            <span className="text-xs text-stone-400">
              {match.avgSpendCents > 0
                ? formatDollars(match.avgSpendCents) + ' avg'
                : match.matchReason}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
