// Admin Chef List — all chefs across the platform

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformChefList, type PlatformChefRow } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, TrendingUp, AlertCircle } from 'lucide-react'
import { ChefHealthBadge } from '@/components/admin/chef-health-badge'

function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function ChefBadge({
  chef,
}: {
  chef: { eventCount: number; gmvCents: number; created_at: string }
}) {
  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(chef.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceSignup < 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-700">
        New
      </span>
    )
  }
  if (chef.eventCount === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-500">
        No Events
      </span>
    )
  }
  return null
}

export default async function AdminChefListPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let chefs: PlatformChefRow[] = []
  let error: string | null = null
  try {
    chefs = await getPlatformChefList()
  } catch (err) {
    error = 'Failed to load chef list'
    console.error('[Admin] Chef list error:', err)
  }

  const totalGMV = chefs.reduce((s, c) => s + c.gmvCents, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-950 rounded-lg">
          <Users size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chefs</h1>
          <p className="text-sm text-stone-500">
            {chefs.length} chef account{chefs.length !== 1 ? 's' : ''} · {formatCents(totalGMV)}{' '}
            total GMV
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {chefs.length === 0 && !error ? (
          <div className="py-12 text-center text-slate-400 text-sm">No chefs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Events
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Clients
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    GMV
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Health
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chefs.map((chef) => (
                  <tr key={chef.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {chef.business_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{chef.email ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{chef.eventCount}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{chef.clientCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCents(chef.gmvCents)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(chef.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ChefBadge chef={chef} />
                    </td>
                    <td className="px-4 py-3">
                      <ChefHealthBadge
                        eventCount={chef.eventCount}
                        clientCount={chef.clientCount}
                        gmvCents={chef.gmvCents}
                        daysSinceSignup={Math.floor(
                          (Date.now() - new Date(chef.created_at).getTime()) / 86400000
                        )}
                        hasBusinessName={!!chef.business_name}
                        showScore
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${chef.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
