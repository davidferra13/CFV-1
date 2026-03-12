// Duplicate Client Detection & Merge Panel
// Shows potential duplicate groups with merge action.
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  findDuplicateClients,
  mergeClients,
  type DuplicateGroup,
} from '@/lib/clients/duplicate-detection'
import { toast } from 'sonner'

export function DuplicateMergePanel() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [mergeTarget, setMergeTarget] = useState<{
    targetId: string
    sourceId: string
    targetName: string
    sourceName: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await findDuplicateClients()
        if (!cancelled) setGroups(data)
      } catch {
        // silent
      }
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleMerge = async () => {
    if (!mergeTarget) return
    const previous = groups
    try {
      const result = await mergeClients(mergeTarget.targetId, mergeTarget.sourceId)
      if (result.success) {
        toast.success(
          `Merged ${mergeTarget.sourceName} into ${mergeTarget.targetName}. Moved ${result.movedEvents} events, ${result.movedInquiries} inquiries.`
        )
        // Refresh
        const updated = await findDuplicateClients()
        setGroups(updated)
      }
    } catch (err) {
      setGroups(previous)
      toast.error('Failed to merge clients')
    }
    setMergeTarget(null)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-stone-500">Scanning for duplicates...</p>
        </CardContent>
      </Card>
    )
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-stone-400">No duplicate clients detected.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-stone-300">
            Potential Duplicates ({groups.length} group{groups.length !== 1 ? 's' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.map((group, gi) => (
            <div key={gi} className="border border-stone-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant={
                    group.matchScore >= 80 ? 'error' : group.matchScore >= 60 ? 'warning' : 'info'
                  }
                >
                  {group.matchScore}% match
                </Badge>
                {group.matchReasons.map((r, ri) => (
                  <span key={ri} className="text-[10px] text-stone-500">
                    {r}
                  </span>
                ))}
              </div>

              {group.clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-stone-800/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-200 truncate">{client.fullName}</p>
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      {client.email && <span>{client.email}</span>}
                      {client.phone && <span>{client.phone}</span>}
                      <span>
                        {client.eventCount} event{client.eventCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {group.clients.length === 2 && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => {
                      // Keep the one with more events (or older one if tied)
                      const [a, b] = group.clients
                      const keepA = a.eventCount >= b.eventCount
                      setMergeTarget({
                        targetId: keepA ? a.id : b.id,
                        sourceId: keepA ? b.id : a.id,
                        targetName: keepA ? a.fullName : b.fullName,
                        sourceName: keepA ? b.fullName : a.fullName,
                      })
                    }}
                  >
                    Merge (keep{' '}
                    {group.clients[0].eventCount >= group.clients[1].eventCount
                      ? group.clients[0].fullName
                      : group.clients[1].fullName}
                    )
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {mergeTarget && (
        <ConfirmModal
          title="Merge Clients"
          description={`This will move all events, inquiries, and financial records from "${mergeTarget.sourceName}" to "${mergeTarget.targetName}", then remove the duplicate. This cannot be undone.`}
          confirmLabel="Merge"
          onConfirm={handleMerge}
          onCancel={() => setMergeTarget(null)}
        />
      )}
    </>
  )
}
