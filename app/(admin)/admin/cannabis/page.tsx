// Admin Cannabis Portal Management
// Full control: tier users list, invite approval queue, direct grants.

import { requireAdmin } from '@/lib/auth/admin'
import {
  getAllCannabisUsers,
  getPendingInvites,
  getAllCannabisInvites,
} from '@/lib/admin/cannabis-actions'
import { AdminCannabisClient } from './admin-cannabis-client'

export default async function AdminCannabisPage() {
  await requireAdmin()

  const [users, pendingInvites, allInvites] = await Promise.all([
    getAllCannabisUsers().catch(() => []),
    getPendingInvites().catch(() => []),
    getAllCannabisInvites().catch(() => []),
  ])

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🌿</span>
          <h1 className="text-xl font-semibold text-slate-100">Cannabis Tier</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-900/40 text-green-400 border border-green-700/30">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Control who has access to the cannabis dining portal. All invites require your approval
          before delivery.
        </p>
      </div>

      <AdminCannabisClient users={users} pendingInvites={pendingInvites} allInvites={allInvites} />
    </div>
  )
}
