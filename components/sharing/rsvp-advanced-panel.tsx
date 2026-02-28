'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  draftGuestSegmentMessage,
  logGuestSegmentMessage,
  resolveEventJoinRequest,
  revokeEventShareInvite,
  sendEventRSVPReminders,
  updateEventShareAdvancedSettings,
  updateEventShareInvitePermissions,
} from '@/lib/sharing/actions'

type JoinRequest = {
  id: string
  viewer_name: string
  viewer_email: string
  note: string | null
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

type ShareInvite = {
  id: string
  audience_role: 'viewer' | 'guest'
  status: 'active' | 'consumed' | 'revoked' | 'expired'
  invited_name: string | null
  invited_email: string | null
  single_use: boolean
  allow_join_request: boolean
  allow_book_own: boolean
  expires_at: string | null
  view_count: number
  created_at: string
}

type Analytics = {
  inviteCount: number
  totalViews: number
  viewedInvites: number
  joinRequested: number
  joinApproved: number
  joinDenied: number
  bookOwnRequested: number
  guestInvited: number
}

type CommunicationLog = {
  id: string
  segment: string
  subject: string
  recipient_count: number
  created_at: string
}

const segments = ['pending', 'attending', 'waitlisted', 'allergies'] as const

type Segment = (typeof segments)[number]

export function RSVPAdvancedPanel({
  eventId,
  shareId,
  shareSettings,
  joinRequests,
  invites,
  analytics,
  communicationLogs,
}: {
  eventId: string
  shareId: string | null
  shareSettings?: {
    require_join_approval?: boolean
    rsvp_deadline_at?: string | null
    enforce_capacity?: boolean
    waitlist_enabled?: boolean
    max_capacity?: number | null
  } | null
  joinRequests: JoinRequest[]
  invites: ShareInvite[]
  analytics: Analytics
  communicationLogs: CommunicationLog[]
}) {
  const [isPending, startTransition] = useTransition()
  const [settings, setSettings] = useState({
    requireJoinApproval: shareSettings?.require_join_approval ?? true,
    rsvpDeadlineAt: shareSettings?.rsvp_deadline_at
      ? new Date(shareSettings.rsvp_deadline_at).toISOString().slice(0, 16)
      : '',
    enforceCapacity: shareSettings?.enforce_capacity ?? false,
    waitlistEnabled: shareSettings?.waitlist_enabled ?? true,
    maxCapacity: shareSettings?.max_capacity ? String(shareSettings.max_capacity) : '',
  })
  const [segment, setSegment] = useState<Segment>('pending')
  const [draft, setDraft] = useState<null | {
    subject: string
    body: string
    recipientCount: number
  }>(null)
  const [error, setError] = useState('')
  const activeJoinRequests = useMemo(
    () => joinRequests.filter((request) => request.status === 'pending'),
    [joinRequests]
  )

  async function runAction(fn: () => Promise<void>) {
    setError('')
    try {
      await fn()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  function onSaveSettings() {
    if (!shareId) return
    startTransition(() => {
      runAction(async () => {
        await updateEventShareAdvancedSettings({
          eventShareId: shareId,
          require_join_approval: settings.requireJoinApproval,
          rsvp_deadline_at: settings.rsvpDeadlineAt
            ? new Date(settings.rsvpDeadlineAt).toISOString()
            : null,
          enforce_capacity: settings.enforceCapacity,
          waitlist_enabled: settings.waitlistEnabled,
          max_capacity: settings.maxCapacity ? Number(settings.maxCapacity) : null,
        })
      })
    })
  }

  function onReminder(cadence: '7d' | '3d' | '24h' | 'deadline') {
    startTransition(() => {
      runAction(async () => {
        await sendEventRSVPReminders({ eventId, cadence })
      })
    })
  }

  function onResolveJoinRequest(requestId: string, decision: 'approve' | 'deny') {
    startTransition(() => {
      runAction(async () => {
        await resolveEventJoinRequest({ requestId, decision })
      })
    })
  }

  function onRevokeInvite(inviteId: string) {
    startTransition(() => {
      runAction(async () => {
        await revokeEventShareInvite({ inviteId, reason: 'Revoked by host' })
      })
    })
  }

  function onToggleSingleUse(inviteId: string, nextValue: boolean) {
    startTransition(() => {
      runAction(async () => {
        await updateEventShareInvitePermissions({ inviteId, single_use: nextValue })
      })
    })
  }

  function onToggleJoin(inviteId: string, nextValue: boolean) {
    startTransition(() => {
      runAction(async () => {
        await updateEventShareInvitePermissions({ inviteId, allow_join_request: nextValue })
      })
    })
  }

  function onToggleBookOwn(inviteId: string, nextValue: boolean) {
    startTransition(() => {
      runAction(async () => {
        await updateEventShareInvitePermissions({ inviteId, allow_book_own: nextValue })
      })
    })
  }

  async function onDraftSegmentMessage() {
    setError('')
    try {
      const result = await draftGuestSegmentMessage({ eventId, segment })
      setDraft({
        subject: result.subject,
        body: result.body,
        recipientCount: result.recipientCount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
    }
  }

  async function onLogDraft() {
    if (!draft) return
    setError('')
    try {
      await logGuestSegmentMessage({
        eventId,
        segment,
        subject: draft.subject,
        body: draft.body,
        recipientCount: draft.recipientCount,
      })
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log message')
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-stone-700 bg-stone-900/30 p-4">
      <div>
        <h4 className="text-sm font-semibold text-stone-100">RSVP Operations</h4>
        <p className="mt-1 text-xs text-stone-400">
          Advanced controls: approvals, deadlines, capacity, reminders, invites, analytics, and
          guest communication.
        </p>
      </div>

      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-xs text-red-700">{error}</p>}

      <section className="space-y-3 border border-stone-800 rounded-md p-3">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Invite Analytics
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Metric label="Invites" value={analytics.inviteCount} />
          <Metric label="Views" value={analytics.totalViews} />
          <Metric label="Join Requests" value={analytics.joinRequested} />
          <Metric label="Join Approved" value={analytics.joinApproved} />
          <Metric label="Join Denied" value={analytics.joinDenied} />
          <Metric label="Book Own" value={analytics.bookOwnRequested} />
          <Metric label="Guest Invites" value={analytics.guestInvited} />
          <Metric label="Viewed Invites" value={analytics.viewedInvites} />
        </div>
      </section>

      <section className="space-y-3 border border-stone-800 rounded-md p-3">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Join Requests
        </h5>
        {activeJoinRequests.length === 0 ? (
          <p className="text-xs text-stone-500">No pending join requests.</p>
        ) : (
          <div className="space-y-2">
            {activeJoinRequests.map((request) => (
              <div key={request.id} className="rounded-md border border-stone-700 p-2 text-xs">
                <p className="text-stone-200 font-medium">
                  {request.viewer_name} ({request.viewer_email})
                </p>
                {request.note && <p className="mt-1 text-stone-400">{request.note}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onResolveJoinRequest(request.id, 'approve')}
                    className="rounded-md bg-emerald-700 px-2 py-1 text-white"
                    disabled={isPending}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveJoinRequest(request.id, 'deny')}
                    className="rounded-md bg-red-700 px-2 py-1 text-white"
                    disabled={isPending}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 border border-stone-800 rounded-md p-3">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          RSVP Controls
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 text-stone-300">
            <input
              type="checkbox"
              checked={settings.requireJoinApproval}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, requireJoinApproval: e.target.checked }))
              }
            />
            Require host approval for join requests
          </label>
          <label className="flex items-center gap-2 text-stone-300">
            <input
              type="checkbox"
              checked={settings.enforceCapacity}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, enforceCapacity: e.target.checked }))
              }
            />
            Enforce guest capacity
          </label>
          <label className="flex items-center gap-2 text-stone-300">
            <input
              type="checkbox"
              checked={settings.waitlistEnabled}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, waitlistEnabled: e.target.checked }))
              }
            />
            Enable waitlist when full
          </label>
          <input
            type="number"
            min={1}
            value={settings.maxCapacity}
            onChange={(e) => setSettings((prev) => ({ ...prev, maxCapacity: e.target.value }))}
            placeholder="Max capacity"
            className="rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-stone-100"
          />
          <input
            type="datetime-local"
            value={settings.rsvpDeadlineAt}
            onChange={(e) => setSettings((prev) => ({ ...prev, rsvpDeadlineAt: e.target.value }))}
            className="rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-stone-100 sm:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={onSaveSettings}
          disabled={isPending || !shareId}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Save RSVP Controls
        </button>
      </section>

      <section className="space-y-3 border border-stone-800 rounded-md p-3">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Reminder Queue
        </h5>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onReminder('7d')}
            className="rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-200 hover:border-stone-600"
            disabled={isPending}
          >
            Queue 7d Reminder
          </button>
          <button
            type="button"
            onClick={() => onReminder('3d')}
            className="rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-200 hover:border-stone-600"
            disabled={isPending}
          >
            Queue 3d Reminder
          </button>
          <button
            type="button"
            onClick={() => onReminder('24h')}
            className="rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-200 hover:border-stone-600"
            disabled={isPending}
          >
            Queue 24h Reminder
          </button>
          <button
            type="button"
            onClick={() => onReminder('deadline')}
            className="rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-200 hover:border-stone-600"
            disabled={isPending}
          >
            Queue Deadline Reminder
          </button>
        </div>
      </section>

      <section className="space-y-3 border border-stone-800 rounded-md p-3">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Invite Controls
        </h5>
        {invites.length === 0 ? (
          <p className="text-xs text-stone-500">No invite records yet.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-md border border-stone-700 p-2 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-stone-200">
                    {invite.audience_role} - {invite.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRevokeInvite(invite.id)}
                    className="rounded-md bg-red-900 px-2 py-1 text-red-200"
                    disabled={isPending || invite.status !== 'active'}
                  >
                    Revoke
                  </button>
                </div>
                <p className="text-stone-400">
                  {invite.invited_name || 'Unnamed'}{' '}
                  {invite.invited_email ? `(${invite.invited_email})` : ''}
                </p>
                <div className="flex flex-wrap gap-3 text-stone-300">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={invite.single_use}
                      onChange={(e) => onToggleSingleUse(invite.id, e.target.checked)}
                      disabled={isPending}
                    />
                    Single-use
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={invite.allow_join_request}
                      onChange={(e) => onToggleJoin(invite.id, e.target.checked)}
                      disabled={isPending}
                    />
                    Allow Join
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={invite.allow_book_own}
                      onChange={(e) => onToggleBookOwn(invite.id, e.target.checked)}
                      disabled={isPending}
                    />
                    Allow Book Own
                  </label>
                </div>
                <p className="text-stone-500">Views: {invite.view_count || 0}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 border border-stone-800 rounded-md p-3">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Guest Messaging
        </h5>
        <div className="flex items-center gap-2">
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as Segment)}
            className="rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-100"
          >
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onDraftSegmentMessage}
            className="rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-200 hover:border-stone-600"
          >
            Draft Message
          </button>
        </div>

        {draft && (
          <div className="space-y-2 rounded-md border border-stone-700 p-2 text-xs">
            <p className="text-stone-200 font-medium">{draft.subject}</p>
            <p className="whitespace-pre-wrap text-stone-400">{draft.body}</p>
            <p className="text-stone-500">Recipients: {draft.recipientCount}</p>
            <button
              type="button"
              onClick={onLogDraft}
              className="rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-200 hover:border-stone-600"
            >
              Log Message Draft
            </button>
          </div>
        )}

        {communicationLogs.length > 0 && (
          <div className="space-y-1 text-xs text-stone-400">
            {communicationLogs.slice(0, 5).map((log) => (
              <p key={log.id}>
                {new Date(log.created_at).toLocaleString()} - {log.segment} - {log.subject} (
                {log.recipient_count})
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-700 bg-stone-950 p-2">
      <p className="text-stone-500">{label}</p>
      <p className="text-sm font-semibold text-stone-100">{value}</p>
    </div>
  )
}
