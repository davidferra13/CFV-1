import { fetchEntityAuditSummary } from '@/lib/audit-trail/surface-actions'
import type { AuditEntityType } from '@/lib/audit-trail/surface-actions'

type AuditSummaryBadgeProps = {
  entityType: AuditEntityType
  entityId: string
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`
  return new Date(iso).toLocaleDateString()
}

/**
 * Server component that displays a small "Last modified X ago by Y" badge.
 * Renders inline; wrap in Suspense with a fallback for loading state.
 */
export async function AuditSummaryBadge({ entityType, entityId }: AuditSummaryBadgeProps) {
  const summary = await fetchEntityAuditSummary(entityType, entityId)

  if (!summary.lastModified) {
    return null
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs text-stone-500 bg-stone-800/60 px-2.5 py-1 rounded-full"
      title={`${summary.changeCount} total changes`}
    >
      <svg
        className="w-3 h-3 text-stone-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
      <span>
        Modified {relativeTime(summary.lastModified)}
        {summary.lastModifiedBy ? ` by ${summary.lastModifiedBy}` : ''}
      </span>
      {summary.changeCount > 0 && (
        <span className="text-stone-600">
          ({summary.changeCount})
        </span>
      )}
    </div>
  )
}
