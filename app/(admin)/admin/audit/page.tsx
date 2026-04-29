// Admin Audit Log - immutable record of sensitive platform actions

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformAuditLog } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { ScrollText } from '@/components/ui/icons'
import { AdminAuditLog, type AdminAuditLogEntry } from './log'

type SearchParams = Record<string, string | string[] | undefined>

const ACTION_TYPE_OPTIONS = [
  'admin_viewed_live_presence',
  'admin_viewed_conversation_transcript',
  'admin_viewed_hub_transcript',
  'admin_moderated_chat_message',
  'admin_moderated_hub_message',
  'admin_moderated_social_post',
  'admin_moderated_hub_group',
  'admin_viewed_chef',
  'admin_viewed_client',
  'admin_sent_email',
  'admin_broadcast_email',
  'admin_toggled_flag',
  'admin_bulk_flag',
]

const TARGET_TYPE_OPTIONS = [
  'chef',
  'client',
  'conversation',
  'chat_message',
  'hub_group',
  'hub_message',
  'social_post',
]

function firstParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function AdminAuditPage({
  searchParams = {},
}: {
  searchParams?: SearchParams
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const actorEmail = firstParam(searchParams, 'actorEmail')
  const actionType = firstParam(searchParams, 'actionType')
  const targetType = firstParam(searchParams, 'targetType')
  const targetId = firstParam(searchParams, 'targetId')
  const from = firstParam(searchParams, 'from')
  const to = firstParam(searchParams, 'to')
  const activeFilterCount = [actorEmail, actionType, targetType, targetId, from, to].filter(
    Boolean
  ).length

  let entries: AdminAuditLogEntry[] = []
  let note: string | null = null
  try {
    entries = (await getPlatformAuditLog({
      limit: 200,
      actorEmail: actorEmail || undefined,
      actionType: actionType || undefined,
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      from: from || undefined,
      to: to || undefined,
    })) as AdminAuditLogEntry[]
  } catch {
    note =
      'admin_audit_log table not yet created. Apply the admin migrations to enable this feature.'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-stone-800 rounded-lg">
          <ScrollText size={18} className="text-stone-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Audit Log</h1>
          <p className="text-sm text-stone-500">
            Immutable record of every sensitive platform action
          </p>
        </div>
      </div>

      {note && (
        <div className="bg-amber-950 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <form className="rounded-xl border border-stone-700 bg-stone-900 p-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <input
          name="actorEmail"
          defaultValue={actorEmail}
          placeholder="Actor email"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <select
          name="actionType"
          defaultValue={actionType}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        >
          <option value="">All actions</option>
          {ACTION_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          name="targetType"
          defaultValue={targetType}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        >
          <option value="">All targets</option>
          {TARGET_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          name="targetId"
          defaultValue={targetId}
          placeholder="Target ID"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="min-w-0 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Filter
            </button>
            <a
              href="/admin/audit"
              className="rounded-lg border border-stone-700 px-3 py-2 text-center text-sm font-semibold text-stone-300 hover:border-stone-500"
            >
              Clear
            </a>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between text-sm text-stone-500">
        <span>
          Showing {entries.length} entries
          {activeFilterCount > 0 ? ` across ${activeFilterCount} active filters` : ''}
        </span>
      </div>

      <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
        {!note ? <AdminAuditLog entries={entries} /> : null}
      </div>
    </div>
  )
}
