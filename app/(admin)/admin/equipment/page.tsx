// Admin Equipment — All equipment across every chef

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminEquipment } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Toolbox } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

function formatCents(cents: number | null): string {
  if (!cents) return '-'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default async function AdminEquipmentPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const equipment = await getAdminEquipment().catch(() => [])
  const totalValue = equipment.reduce((s, e) => s + (e.current_value_cents ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-950 rounded-lg">
          <Toolbox size={18} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Equipment</h1>
          <p className="text-sm text-stone-500">
            {equipment.length} item{equipment.length !== 1 ? 's' : ''} · {formatCents(totalValue)}{' '}
            current value
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={equipment}
          filename="admin-equipment"
          columns={[
            { header: 'Item', accessor: (e) => e.name },
            { header: 'Chef', accessor: (e) => e.chefBusinessName },
            { header: 'Category', accessor: (e) => e.category },
            { header: 'Status', accessor: (e) => e.status },
            {
              header: 'Purchase ($)',
              accessor: (e) =>
                e.purchase_price_cents ? (e.purchase_price_cents / 100).toFixed(2) : '',
            },
            {
              header: 'Current ($)',
              accessor: (e) =>
                e.current_value_cents ? (e.current_value_cents / 100).toFixed(2) : '',
            },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {equipment.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No equipment found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Item
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Purchase
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Current
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipment.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {item.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs capitalize">{item.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.status === 'owned' ? 'bg-green-900 text-green-200' : 'bg-stone-800 text-stone-500'}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCents(item.purchase_price_cents)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCents(item.current_value_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={item.chef_id} />
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
