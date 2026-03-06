'use client'
import { useState, useTransition } from 'react'
import { History, ChevronDown, ChevronUp, RotateCcw } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getVersionHistory,
  type DocumentVersion,
  type SnapshotEntityType,
} from '@/lib/versioning/snapshot'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface VersionHistoryPanelProps {
  entityType: SnapshotEntityType
  entityId: string
  onRestore?: (snapshot: Record<string, unknown>) => void
}

export function VersionHistoryPanel({ entityType, entityId, onRestore }: VersionHistoryPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    setExpanded(!expanded)
    if (!loaded) {
      startTransition(async () => {
        try {
          const data = await getVersionHistory(entityType, entityId)
          setVersions(data)
          setLoaded(true)
        } catch (err: any) {
          toast.error(err.message)
        }
      })
    }
  }

  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-800 hover:bg-stone-700 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-stone-300">
          <History className="h-4 w-4" />
          Version History
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-stone-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400" />
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-stone-800">
          {isPending && <div className="px-4 py-3 text-sm text-stone-500">Loading history...</div>}
          {!isPending && versions.length === 0 && (
            <div className="px-4 py-3 text-sm text-stone-500">No version history yet.</div>
          )}
          {versions.map((v, i) => (
            <div key={v.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={i === 0 ? 'success' : 'default'}>v{v.version_number}</Badge>
                  {i === 0 && <span className="text-xs text-green-600 font-medium">Current</span>}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {format(new Date(v.created_at), 'MMM d, yyyy h:mm a')}
                </p>
                {v.change_summary && (
                  <p className="text-xs text-stone-400 mt-0.5">{v.change_summary}</p>
                )}
              </div>
              {onRestore && i > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onRestore(v.snapshot)
                    toast.success(`Restored to v${v.version_number}`)
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
