// Admin Menus — All menus across every chef

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminMenus } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { UtensilsCrossed } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'

export default async function AdminMenusPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const menus = await getAdminMenus().catch(() => [])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-950 rounded-lg">
          <UtensilsCrossed size={18} className="text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Menus</h1>
          <p className="text-sm text-stone-500">
            {menus.length} menu{menus.length !== 1 ? 's' : ''} across all chefs
          </p>
        </div>
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {menus.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No menus found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Menu
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {menus.map((menu) => (
                  <tr key={menu.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {menu.name ?? 'Untitled'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {menu.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs max-w-xs truncate">
                      {menu.description ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(menu.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={menu.tenant_id} />
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
