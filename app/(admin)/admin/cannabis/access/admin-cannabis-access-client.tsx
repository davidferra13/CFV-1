'use client'

import { useState } from 'react'
import {
  approveAgePermission,
  rejectAgePermission,
  blockAgePermission,
  revokeCannabisTierWithReason,
} from '@/lib/admin/cannabis-age-actions'

type CombinedUser = {
  auth_user_id: string
  user_type: string
  entity_id: string
  status: string
  granted_at: string
  revoked_at: string | null
  notes: string | null
  agePermission: {
    status: string
    verification_method: string | null
    approved_at: string | null
    expires_at: string | null
  } | null
  canAccessPortal: boolean
}

type Request = {
  id: string
  auth_user_id: string
  client_id: string
  status: string
  created_at: string
}

type Props = {
  data: {
    users: CombinedUser[]
    requests: Request[]
    summary: {
      totalTierUsers: number
      activeTier: number
      ageApproved: number
      agePending: number
      pendingRequests: number
    }
  }
}

export function AdminCannabisAccessClient({ data }: Props) {
  const [tab, setTab] = useState<'overview' | 'age' | 'requests'>('overview')
  const [loading, setLoading] = useState<string | null>(null)

  const tabs = [
    { key: 'overview' as const, label: `Overview (${data.summary.totalTierUsers})` },
    { key: 'age' as const, label: `Age Permissions (${data.summary.agePending} pending)` },
    { key: 'requests' as const, label: `Requests (${data.summary.pendingRequests} new)` },
  ]

  async function handleAgeApprove(authUserId: string) {
    setLoading(authUserId)
    try {
      await approveAgePermission({ authUserId, method: 'admin_manual' })
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleAgeReject(authUserId: string) {
    const reason = prompt('Rejection reason:') ?? undefined
    setLoading(authUserId)
    try {
      await rejectAgePermission({ authUserId, reason })
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleAgeBlock(authUserId: string) {
    const reason = prompt('Block reason:') ?? undefined
    setLoading(authUserId)
    try {
      await blockAgePermission({ authUserId, reason })
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleRevokeTier(authUserId: string) {
    const reason = prompt('Revocation reason:') ?? undefined
    if (!confirm('Revoke cannabis access for this user?')) return
    setLoading(authUserId)
    try {
      await revokeCannabisTierWithReason({ authUserId, reason })
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Tier Users" value={data.summary.totalTierUsers} />
        <SummaryCard label="Active" value={data.summary.activeTier} />
        <SummaryCard label="Age Approved" value={data.summary.ageApproved} />
        <SummaryCard label="Age Pending" value={data.summary.agePending} />
        <SummaryCard label="Pending Requests" value={data.summary.pendingRequests} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && (
        <div className="space-y-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-3">User ID</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Tier Status</th>
                <th className="py-2 px-3">Age Status</th>
                <th className="py-2 px-3">Portal Access</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.auth_user_id} className="border-b">
                  <td className="py-2 px-3 font-mono text-xs">
                    {user.auth_user_id.slice(0, 8)}...
                  </td>
                  <td className="py-2 px-3">{user.user_type}</td>
                  <td className="py-2 px-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge status={user.agePermission?.status ?? 'none'} />
                  </td>
                  <td className="py-2 px-3">
                    {user.canAccessPortal ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-red-600">No</span>
                    )}
                  </td>
                  <td className="py-2 px-3 flex gap-1">
                    {user.status === 'active' && (
                      <button
                        onClick={() => handleRevokeTier(user.auth_user_id)}
                        disabled={loading === user.auth_user_id}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'age' && (
        <div className="space-y-2">
          {data.users.filter((u) => u.agePermission).length === 0 && (
            <p className="text-muted-foreground text-sm">No age permission records yet.</p>
          )}
          {data.users
            .filter((u) => u.agePermission)
            .map((user) => (
              <div
                key={user.auth_user_id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div>
                  <p className="font-mono text-xs">{user.auth_user_id.slice(0, 8)}...</p>
                  <p className="text-sm text-muted-foreground">
                    Method: {user.agePermission!.verification_method ?? 'none'} | Status:{' '}
                    <StatusBadge status={user.agePermission!.status} />
                  </p>
                </div>
                <div className="flex gap-1">
                  {['not_submitted', 'pending', 'self_attested'].includes(
                    user.agePermission!.status
                  ) && (
                    <button
                      onClick={() => handleAgeApprove(user.auth_user_id)}
                      disabled={loading === user.auth_user_id}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Approve
                    </button>
                  )}
                  {!['blocked', 'rejected'].includes(user.agePermission!.status) && (
                    <button
                      onClick={() => handleAgeReject(user.auth_user_id)}
                      disabled={loading === user.auth_user_id}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Reject
                    </button>
                  )}
                  {user.agePermission!.status !== 'blocked' && (
                    <button
                      onClick={() => handleAgeBlock(user.auth_user_id)}
                      disabled={loading === user.auth_user_id}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Block
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-2">
          {data.requests.length === 0 && (
            <p className="text-muted-foreground text-sm">No cannabis dinner requests.</p>
          )}
          {data.requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="text-sm font-medium">Client: {req.client_id.slice(0, 8)}...</p>
                <p className="text-xs text-muted-foreground">
                  Submitted: {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={req.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    manually_verified: 'bg-green-100 text-green-800',
    self_attested: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
    not_submitted: 'bg-gray-100 text-gray-600',
    suspended: 'bg-orange-100 text-orange-800',
    revoked: 'bg-red-100 text-red-800',
    blocked: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-amber-100 text-amber-800',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-blue-100 text-blue-800',
    converted: 'bg-purple-100 text-purple-800',
    declined: 'bg-red-100 text-red-800',
    none: 'bg-gray-100 text-gray-500',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
