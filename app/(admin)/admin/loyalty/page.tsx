// Admin Loyalty — Per-chef loyalty program overview

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminLoyalty } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Gift } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'

export default async function AdminLoyaltyPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const loyalty = await getAdminLoyalty().catch(() => [])
  const totalPoints = loyalty.reduce((s, l) => s + l.totalPointsIssued, 0)
  const totalRedeemed = loyalty.reduce((s, l) => s + l.totalRedemptions, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-950 rounded-lg">
          <Gift size={18} className="text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Loyalty Overview</h1>
          <p className="text-sm text-stone-500">
            {loyalty.length} chef{loyalty.length !== 1 ? 's' : ''} with loyalty activity ·{' '}
            {totalPoints.toLocaleString()} points issued · {totalRedeemed.toLocaleString()} redeemed
          </p>
        </div>
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {loyalty.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No loyalty activity found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Points Issued
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Redeemed
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Outstanding
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loyalty.map((l) => (
                  <tr key={l.chefId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {l.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {l.totalPointsIssued.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {l.totalRedemptions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {(l.totalPointsIssued - l.totalRedemptions).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={l.chefId} />
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
