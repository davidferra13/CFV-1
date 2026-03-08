// Admin Platform Search — Search across everything

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { MagnifyingGlassPlus } from '@/components/ui/icons'
import { AdminSearchForm } from '@/components/admin/admin-search-form'

export default async function AdminSearchPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded-lg">
          <MagnifyingGlassPlus size={18} className="text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Search</h1>
          <p className="text-sm text-stone-500">
            Search across chefs, clients, events, recipes, and inquiries
          </p>
        </div>
      </div>

      <AdminSearchForm />
    </div>
  )
}
