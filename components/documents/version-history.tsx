'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Clock, User } from 'lucide-react'
import { revertToVersion } from '@/lib/operations/document-version-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Version {
  id: string
  versionNumber: number
  savedBy?: string | null
  createdAt: string
}

interface VersionHistoryProps {
  versions: Version[]
  entityType: string
  entityId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VersionHistory({ versions, entityType, entityId }: VersionHistoryProps) {
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(
    versions.length > 0 ? versions[versions.length - 1].id : null
  )
  const [isPending, startTransition] = useTransition()
  const [revertingId, setRevertingId] = useState<string | null>(null)

  function formatDate(isoString: string): string {
    const date = new Date(isoString)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatTime(isoString: string): string {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function handleRevert(versionId: string, versionNumber: number) {
    setRevertingId(versionId)
    startTransition(async () => {
      try {
        await revertToVersion(versionId)
        setCurrentVersionId(versionId)
        toast.success(`Reverted to version ${versionNumber}`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to revert'
        toast.error(message)
      } finally {
        setRevertingId(null)
      }
    })
  }

  // Sort versions newest first for display
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)
  const latestVersionId = versions.length > 0 ? versions[versions.length - 1].id : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version History</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedVersions.length === 0 ? (
          <p className="text-sm text-stone-400 italic text-center py-8">
            No version history available.
          </p>
        ) : (
          <div className="space-y-1">
            {sortedVersions.map((version, index) => {
              const isLatest = version.id === latestVersionId
              const isCurrent = version.id === currentVersionId

              return (
                <div
                  key={version.id}
                  className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                    isCurrent
                      ? 'bg-brand-50 border border-brand-200'
                      : 'hover:bg-stone-50'
                  }`}
                >
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      isCurrent ? 'bg-brand-600' : 'bg-stone-300'
                    }`} />
                    {index < sortedVersions.length - 1 && (
                      <div className="w-px h-6 bg-stone-200 mt-1" />
                    )}
                  </div>

                  {/* Version info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-900">
                        Version {version.versionNumber}
                      </span>
                      {isLatest && <Badge variant="success">Latest</Badge>}
                      {isCurrent && !isLatest && <Badge variant="info">Current</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(version.createdAt)} at {formatTime(version.createdAt)}
                      </span>
                      {version.savedBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.savedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Revert button */}
                  {!isLatest && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevert(version.id, version.versionNumber)}
                      loading={revertingId === version.id}
                      disabled={isPending}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Revert
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
