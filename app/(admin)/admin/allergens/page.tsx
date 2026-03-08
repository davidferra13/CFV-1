// Admin Allergens — Cross-platform dietary restrictions and allergies (SAFETY-CRITICAL)

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminAllergens } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { AlertTriangle } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'

export default async function AdminAllergensPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const allergens = await getAdminAllergens().catch(() => [])
  const withAllergies = allergens.filter((a) => a.allergies)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-950 rounded-lg">
          <AlertTriangle size={18} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dietary & Allergens</h1>
          <p className="text-sm text-stone-500">
            {allergens.length} client{allergens.length !== 1 ? 's' : ''} with dietary data ·{' '}
            {withAllergies.length} with allergies
          </p>
        </div>
      </div>

      {withAllergies.length > 0 && (
        <div className="bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 text-sm text-red-400">
          <strong>
            {withAllergies.length} client{withAllergies.length !== 1 ? 's' : ''} with documented
            allergies.
          </strong>{' '}
          These require special attention during event prep.
        </div>
      )}

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {allergens.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No dietary data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Allergies
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Dietary Restrictions
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allergens.map((a, i) => (
                  <tr
                    key={`${a.tenant_id}-${i}`}
                    className={`hover:bg-slate-50 transition-colors ${a.allergies ? 'bg-red-950/20' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 text-xs">
                        {a.clientName ?? 'Unknown'}
                      </p>
                      <p className="text-stone-500 text-xs">{a.clientEmail ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {a.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      {a.allergies ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-400">
                          {a.allergies}
                        </span>
                      ) : (
                        <span className="text-stone-600 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs max-w-xs">
                      {a.dietaryRestrictions ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={a.tenant_id} />
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
