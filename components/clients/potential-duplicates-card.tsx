'use client'

import { useState, useTransition } from 'react'
import type { ClientMatch } from '@/lib/clients/cross-platform-matching'
import { mergeClients } from '@/lib/clients/cross-platform-matching'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface PotentialDuplicatesCardProps {
  clientId: string
  clientName: string
  matches: ClientMatch[]
}

export function PotentialDuplicatesCard({
  clientId,
  clientName,
  matches,
}: PotentialDuplicatesCardProps) {
  const router = useRouter()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (matches.length === 0) return null

  const visibleMatches = matches.filter((m) => !mergedIds.has(m.clientId))
  if (visibleMatches.length === 0) return null

  function handleMerge(matchClientId: string) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await mergeClients(clientId, matchClientId)
        if (!result.success) {
          setError(result.error || 'Merge failed')
          setConfirmingId(null)
          return
        }
        setMergedIds((prev) => new Set([...prev, matchClientId]))
        setConfirmingId(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Merge failed unexpectedly')
        setConfirmingId(null)
      }
    })
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-200">Possible Duplicates</h3>
        <span className="text-xs text-stone-500">
          {visibleMatches.length} {visibleMatches.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="space-y-3">
        {visibleMatches.map((match) => (
          <div
            key={match.clientId}
            className="flex items-start justify-between gap-3 rounded-md border border-stone-800 bg-stone-800/50 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-100 truncate">{match.fullName}</p>
              <p className="text-sm text-stone-400 truncate">{match.email}</p>
              {match.phone && <p className="text-xs text-stone-500">{match.phone}</p>}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {match.matchReasons.map((reason) => (
                  <Badge key={reason} variant="info" className="text-xxs px-1.5 py-0">
                    {reason}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {match.inquiryCount} {match.inquiryCount === 1 ? 'inquiry' : 'inquiries'},{' '}
                {match.eventCount} {match.eventCount === 1 ? 'event' : 'events'}
              </p>
            </div>

            <div className="shrink-0">
              {confirmingId === match.clientId ? (
                <div className="text-right space-y-1.5">
                  <p className="text-xs text-stone-300 max-w-[200px]">
                    Keep <span className="font-medium">{clientName}</span> and merge{' '}
                    <span className="font-medium">{match.fullName}</span> into it?
                  </p>
                  <div className="flex gap-1.5 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConfirmingId(null)
                        setError(null)
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleMerge(match.clientId)}
                      loading={isPending}
                    >
                      {isPending ? 'Merging...' : 'Confirm Merge'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setConfirmingId(match.clientId)
                    setError(null)
                  }}
                >
                  Merge
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
