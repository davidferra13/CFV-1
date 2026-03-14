'use client'

// Admin Cannabis Client — interactive management panel

import { useState } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  approveInvite,
  rejectInvite,
  revokeCannabisTier,
  adminGrantTierByEmail,
} from '@/lib/admin/cannabis-actions'

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
}

export function AdminCannabisClient({ users, pendingInvites, allInvites }: Props) {
  const [tab, setTab] = useState<'queue' | 'users' | 'grant' | 'history'>('queue')
  const [loading, setLoading] = useState<string | null>(null)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const [localPending, setLocalPending] = useState(pendingInvites)
  const [localUsers, setLocalUsers] = useState(users)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantNotes, setGrantNotes] = useState('')
  const [grantMsg, setGrantMsg] = useState('')

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
                        : 'bg-blue-900/30 text-blue-400'
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
