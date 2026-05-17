'use client'

// Admin Cannabis Client - interactive management panel

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  approveInvite,
  rejectInvite,
  revokeCannabisTier,
  adminGrantTierByEmail,
} from '@/lib/admin/cannabis-actions'
import {
  reviewCannabisRequest,
  convertCannabisRequestToEvent,
} from '@/lib/admin/cannabis-request-actions'
import type { CannabisRequest } from '@/lib/admin/cannabis-request-actions'

interface CannabisUser {
  id: string
  auth_user_id: string
  user_type: string
  entity_id: string
  tenant_id: string | null
  granted_by_admin_email: string
  granted_at: string
  status: string
  notes: string | null
}

interface PendingInvite {
  id: string
  invited_by_auth_user_id: string
  invited_by_user_type: string
  invitee_email: string
  invitee_name: string | null
  personal_note: string | null
  admin_approval_status: string
  created_at: string
}

interface AllInvite extends PendingInvite {
  approved_by_admin_email: string | null
  approved_at: string | null
  rejection_reason: string | null
  token: string | null
  sent_at: string | null
  claimed_at: string | null
  expires_at: string | null
}

interface Props {
  users: CannabisUser[]
  pendingInvites: PendingInvite[]
  allInvites: AllInvite[]
  dinnerRequests: CannabisRequest[]
}

export function AdminCannabisClient({ users, pendingInvites, allInvites, dinnerRequests }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'queue' | 'users' | 'grant' | 'history' | 'requests'>('queue')
  const [loading, setLoading] = useState<string | null>(null)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const [localPending, setLocalPending] = useState(pendingInvites)
  const [localUsers, setLocalUsers] = useState(users)
  const [localRequests, setLocalRequests] = useState(dinnerRequests)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantNotes, setGrantNotes] = useState('')
  const [grantMsg, setGrantMsg] = useState('')
  const [requestMsg, setRequestMsg] = useState('')

  async function handleApprove(inviteId: string) {
    setLoading(inviteId)
    try {
      await approveInvite(inviteId)
      setLocalPending((prev) => prev.filter((i) => i.id !== inviteId))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleReject(inviteId: string) {
    const reason = prompt('Rejection reason (optional):') ?? undefined
    setLoading(inviteId)
    try {
      await rejectInvite(inviteId, reason)
      setLocalPending((prev) => prev.filter((i) => i.id !== inviteId))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  function handleRevoke(authUserId: string) {
    setRevokeTargetId(authUserId)
    setShowRevokeConfirm(true)
  }

  async function handleConfirmedRevoke() {
    if (!revokeTargetId) return
    setShowRevokeConfirm(false)
    setLoading(revokeTargetId)
    try {
      await revokeCannabisTier(revokeTargetId)
      setLocalUsers((prev) =>
        prev.map((u) => (u.auth_user_id === revokeTargetId ? { ...u, status: 'suspended' } : u))
      )
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleDirectGrant(e: React.FormEvent) {
    e.preventDefault()
    if (!grantEmail.trim()) return
    setLoading('grant')
    setGrantMsg('')
    try {
      await adminGrantTierByEmail({
        email: grantEmail.trim(),
        notes: grantNotes.trim() || undefined,
      })
      setGrantMsg('✓ Cannabis tier granted successfully.')
      setGrantEmail('')
      setGrantNotes('')
    } catch (err: any) {
      setGrantMsg('Error: ' + err.message)
    } finally {
      setLoading(null)
    }
  }

  const pendingRequestCount = localRequests.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review'
  ).length

  async function handleReviewRequest(requestId: string, decision: 'approved' | 'declined') {
    const adminNotes =
      decision === 'declined' ? (prompt('Decline reason (optional):') ?? undefined) : undefined
    setLoading(requestId)
    setRequestMsg('')
    try {
      await reviewCannabisRequest({ requestId, decision, adminNotes })
      setLocalRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: decision, admin_notes: adminNotes ?? r.admin_notes }
            : r
        )
      )
      setRequestMsg(`Request ${decision} successfully.`)
    } catch (err: any) {
      setRequestMsg('Error: ' + err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleConvertToEvent(requestId: string) {
    setLoading(requestId)
    setRequestMsg('')
    try {
      const result = await convertCannabisRequestToEvent({ requestId })
      setLocalRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: 'converted' as const, converted_event_id: result.eventId ?? null }
            : r
        )
      )
      setRequestMsg(
        result.eventId
          ? `Event created successfully. View at /inquiries/${result.eventId}`
          : 'Event created successfully.'
      )
      router.refresh()
    } catch (err: any) {
      setRequestMsg('Error: ' + err.message)
    } finally {
      setLoading(null)
    }
  }

  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-green-900/40 text-green-300 border border-green-700/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`

  return (
    <div>
      {/* Tab Bar */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex w-max min-w-full gap-2">
          <button
            className={`${tabClass('queue')} whitespace-nowrap`}
            onClick={() => setTab('queue')}
          >
            Invite Queue{' '}
            {localPending.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-amber-900/50 text-amber-400">
                {localPending.length}
              </span>
            )}
          </button>
          <button
            className={`${tabClass('users')} whitespace-nowrap`}
            onClick={() => setTab('users')}
          >
            Tier Users ({localUsers.length})
          </button>
          <button
            className={`${tabClass('grant')} whitespace-nowrap`}
            onClick={() => setTab('grant')}
          >
            Direct Grant
          </button>
          <button
            className={`${tabClass('requests')} whitespace-nowrap`}
            onClick={() => setTab('requests')}
          >
            Requests{' '}
            {pendingRequestCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-amber-900/50 text-amber-400">
                {pendingRequestCount}
              </span>
            )}
          </button>
          <button
            className={`${tabClass('history')} whitespace-nowrap`}
            onClick={() => setTab('history')}
          >
            All Invites ({allInvites.length})
          </button>
        </div>
      </div>

      {/* Invite Queue */}
      {tab === 'queue' && (
        <div className="space-y-3">
          {localPending.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No pending invitations. The queue is clear.
            </p>
          ) : (
            localPending.map((invite) => (
              <div
                key={invite.id}
                className="rounded-xl p-4 bg-slate-800/60 border border-slate-700/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100">{invite.invitee_email}</p>
                    {invite.invitee_name && (
                      <p className="text-xs text-slate-400">{invite.invitee_name}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Invited by {invite.invited_by_user_type} ·{' '}
                      {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                    {invite.personal_note && (
                      <p className="text-xs text-slate-400 mt-2 italic">
                        &ldquo;{invite.personal_note}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={loading === invite.id}
                      onClick={() => handleApprove(invite.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-900/50 text-green-300 border border-green-700/30 hover:bg-green-900/70 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={loading === invite.id}
                      onClick={() => handleReject(invite.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tier Users */}
      {tab === 'users' && (
        <div className="space-y-2">
          {localUsers.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No cannabis tier users yet.</p>
          ) : (
            localUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-lg p-3 bg-slate-800/60 border border-slate-700/40 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-100 font-medium truncate">{u.auth_user_id}</p>
                  <p className="text-xs text-slate-500">
                    {u.user_type} · Granted {new Date(u.granted_at).toLocaleDateString()} · by{' '}
                    {u.granted_by_admin_email}
                  </p>
                  {u.notes && <p className="text-xs text-slate-400 italic mt-0.5">{u.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.status === 'active'
                        ? 'bg-green-900/30 text-green-400 border border-green-700/30'
                        : 'bg-red-900/30 text-red-400 border border-red-700/30'
                    }`}
                  >
                    {u.status}
                  </span>
                  {u.status === 'active' && (
                    <button
                      type="button"
                      disabled={loading === u.auth_user_id}
                      onClick={() => handleRevoke(u.auth_user_id)}
                      className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Direct Grant */}
      {tab === 'grant' && (
        <div className="max-w-md">
          <p className="text-sm text-slate-400 mb-4">
            Grant cannabis tier directly to any existing platform user by email.
          </p>
          <form onSubmit={handleDirectGrant} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Notes (optional)
              </label>
              <input
                type="text"
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="e.g. Returning cannabis dining client"
                className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-green-600"
              />
            </div>
            {grantMsg && (
              <p
                className={`text-sm ${grantMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}
              >
                {grantMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={loading === 'grant'}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-green-900/50 text-green-300 border border-green-700/30 hover:bg-green-900/70 disabled:opacity-50 transition-colors"
            >
              {loading === 'grant' ? 'Granting...' : 'Grant Cannabis Tier'}
            </button>
          </form>
        </div>
      )}

      {/* Dinner Requests */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requestMsg && (
            <p
              className={`text-sm mb-2 ${requestMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}
            >
              {requestMsg}
            </p>
          )}
          {localRequests.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No cannabis dinner requests yet.
            </p>
          ) : (
            localRequests.map((req) => {
              const isPending = req.status === 'submitted' || req.status === 'under_review'
              const isApproved = req.status === 'approved'
              const statusColors: Record<string, string> = {
                submitted: 'bg-amber-900/30 text-amber-400 border border-amber-700/30',
                under_review: 'bg-blue-900/30 text-blue-400 border border-blue-700/30',
                approved: 'bg-green-900/30 text-green-400 border border-green-700/30',
                declined: 'bg-red-900/30 text-red-400 border border-red-700/30',
                converted: 'bg-purple-900/30 text-purple-400 border border-purple-700/30',
              }
              return (
                <div
                  key={req.id}
                  className="rounded-xl p-4 bg-slate-800/60 border border-slate-700/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Client info + status badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-100">
                          {req.client_name ?? 'Unknown Client'}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] ?? 'bg-slate-700 text-slate-300'}`}
                        >
                          {req.status}
                        </span>
                      </div>
                      {req.client_email && (
                        <p className="text-xs text-slate-400">{req.client_email}</p>
                      )}

                      {/* Request details grid */}
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                        {req.preferred_date && (
                          <p className="text-xs text-slate-400">
                            <span className="text-slate-500">Date:</span>{' '}
                            {new Date(req.preferred_date + 'T00:00:00').toLocaleDateString()}
                          </p>
                        )}
                        {req.guest_count && (
                          <p className="text-xs text-slate-400">
                            <span className="text-slate-500">Guests:</span> {req.guest_count}
                          </p>
                        )}
                        {req.desired_intensity && (
                          <p className="text-xs text-slate-400">
                            <span className="text-slate-500">Intensity:</span>{' '}
                            {req.desired_intensity}
                          </p>
                        )}
                        {req.format_preference && (
                          <p className="text-xs text-slate-400">
                            <span className="text-slate-500">Format:</span> {req.format_preference}
                          </p>
                        )}
                      </div>

                      {/* Experience goal */}
                      {req.cannabis_experience_goal && (
                        <p className="text-xs text-slate-400 mt-2">
                          <span className="text-slate-500">Goal:</span>{' '}
                          {req.cannabis_experience_goal}
                        </p>
                      )}

                      {/* Location */}
                      {req.location_notes && (
                        <p className="text-xs text-slate-400 mt-1">
                          <span className="text-slate-500">Location:</span> {req.location_notes}
                        </p>
                      )}

                      {/* Menu preferences */}
                      {req.menu_preferences && (
                        <p className="text-xs text-slate-400 mt-1">
                          <span className="text-slate-500">Menu notes:</span> {req.menu_preferences}
                        </p>
                      )}

                      {/* Notes */}
                      {req.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          &ldquo;{req.notes}&rdquo;
                        </p>
                      )}

                      {/* Admin notes (if reviewed) */}
                      {req.admin_notes && (
                        <p className="text-xs text-slate-500 mt-1">Admin: {req.admin_notes}</p>
                      )}

                      {/* Submission date + reviewer */}
                      <p className="text-xs text-slate-500 mt-2">
                        Submitted {new Date(req.created_at).toLocaleDateString()}
                        {req.reviewed_by && (
                          <span>
                            {' · '}Reviewed by {req.reviewed_by}
                            {req.reviewed_at &&
                              ` on ${new Date(req.reviewed_at).toLocaleDateString()}`}
                          </span>
                        )}
                      </p>

                      {/* Converted event link */}
                      {req.status === 'converted' && req.converted_event_id && (
                        <a
                          href={`/inquiries/${req.converted_event_id}`}
                          className="inline-block text-xs text-green-400 hover:text-green-300 mt-1 underline"
                        >
                          View created event
                        </a>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={loading === req.id}
                            onClick={() => handleReviewRequest(req.id, 'approved')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-900/50 text-green-300 border border-green-700/30 hover:bg-green-900/70 disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={loading === req.id}
                            onClick={() => handleReviewRequest(req.id, 'declined')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {isApproved && (
                        <button
                          type="button"
                          disabled={loading === req.id}
                          onClick={() => handleConvertToEvent(req.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-900/50 text-purple-300 border border-purple-700/30 hover:bg-purple-900/70 disabled:opacity-50 transition-colors"
                        >
                          {loading === req.id ? 'Converting...' : 'Convert to Event'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* All Invites History */}
      {tab === 'history' && (
        <div className="space-y-2">
          {allInvites.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No invitations yet.</p>
          ) : (
            allInvites.map((inv) => (
              <div
                key={inv.id}
                className="rounded-lg p-3 bg-slate-800/40 border border-slate-700/30 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">{inv.invitee_email}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(inv.created_at).toLocaleDateString()} · {inv.invited_by_user_type}
                    {inv.claimed_at ? ' · Claimed' : ''}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                    inv.admin_approval_status === 'approved'
                      ? inv.claimed_at
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-brand-900/30 text-brand-400'
                      : inv.admin_approval_status === 'rejected'
                        ? 'bg-red-900/30 text-red-400'
                        : 'bg-amber-900/30 text-amber-400'
                  }`}
                >
                  {inv.admin_approval_status === 'approved' && inv.claimed_at
                    ? 'Claimed'
                    : inv.admin_approval_status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
      <ConfirmModal
        open={showRevokeConfirm}
        title="Revoke cannabis tier access?"
        description="Revoke cannabis tier access for this user?"
        confirmLabel="Revoke"
        variant="danger"
        loading={loading !== null}
        onConfirm={handleConfirmedRevoke}
        onCancel={() => setShowRevokeConfirm(false)}
      />
    </div>
  )
}
