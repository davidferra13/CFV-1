import Link from 'next/link'

export type AdminAuditLogEntry = {
  id?: unknown
  ts?: unknown
  actor_email?: unknown
  action_type?: unknown
  target_type?: unknown
  target_id?: unknown
  details?: unknown
}

function formatTime(value: unknown) {
  if (!value) return '-'

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString()
}

function formatTarget(entry: AdminAuditLogEntry) {
  const targetType = entry.target_type ? String(entry.target_type) : null
  const targetId = entry.target_id ? String(entry.target_id) : null

  if (!targetType && !targetId) return '-'
  if (!targetId) return targetType

  const visibleId = targetId.length > 12 ? `${targetId.slice(0, 12)}...` : targetId
  return targetType ? `${targetType}: ${visibleId}` : visibleId
}

function getDetailsObject(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null
  return details as Record<string, unknown>
}

function getDetailsString(details: unknown, key: string) {
  const detailsObject = getDetailsObject(details)
  const value = detailsObject?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getTargetHref(entry: AdminAuditLogEntry) {
  const targetType = entry.target_type ? String(entry.target_type) : null
  const targetId = entry.target_id ? String(entry.target_id) : null
  if (!targetType || !targetId) return null

  if (targetType === 'chef') return `/admin/users/${targetId}`
  if (targetType === 'conversation') return `/admin/conversations/${targetId}`
  if (targetType === 'hub_group') return `/admin/hub/groups/${targetId}`
  if (targetType === 'social_post') return `/admin/social?q=${encodeURIComponent(targetId)}`
  if (targetType === 'chat_message') {
    const conversationId = getDetailsString(entry.details, 'conversationId')
    return conversationId
      ? `/admin/conversations/${conversationId}?q=${encodeURIComponent(targetId)}&includeDeleted=1`
      : null
  }
  if (targetType === 'hub_message') {
    const groupId = getDetailsString(entry.details, 'groupId')
    return groupId
      ? `/admin/hub/groups/${groupId}?q=${encodeURIComponent(targetId)}&includeDeleted=1`
      : null
  }

  return null
}

function formatDetails(details: unknown) {
  if (!details) return '-'
  if (typeof details === 'string') return details

  try {
    return JSON.stringify(details)
  } catch {
    return '[unreadable details]'
  }
}

export function AdminAuditLog({ entries }: { entries: AdminAuditLogEntry[] }) {
  if (entries.length === 0) {
    return <div className="py-12 text-center text-slate-400 text-sm">No audit log entries yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-800 bg-stone-800">
            <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Time
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Actor
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Action
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Target
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800">
          {entries.map((entry, index) => (
            <tr key={entry.id ? String(entry.id) : index} className="hover:bg-stone-800">
              <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                {formatTime(entry.ts)}
              </td>
              <td className="px-4 py-2.5 text-xs text-stone-400">
                {entry.actor_email ? String(entry.actor_email) : '-'}
              </td>
              <td className="px-4 py-2.5">
                <span className="text-xs font-medium text-stone-300 bg-stone-800 px-1.5 py-0.5 rounded font-mono">
                  {entry.action_type ? String(entry.action_type) : '-'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-400">
                {getTargetHref(entry) ? (
                  <Link href={getTargetHref(entry)!} className="text-brand-500 hover:underline">
                    {formatTarget(entry)}
                  </Link>
                ) : (
                  formatTarget(entry)
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[320px] truncate">
                {formatDetails(entry.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
