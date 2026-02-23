// Admin Directory Management
// Approve or revoke chefs from the public /chefs directory.

import { requireAdmin } from '@/lib/auth/admin'
import { getDirectoryCandidates } from '@/lib/directory/admin-actions'
import { DirectoryToggleRow } from './_components/directory-toggle-row'

export default async function AdminDirectoryPage() {
  await requireAdmin()
  const candidates = await getDirectoryCandidates()

  const approved = candidates.filter((c) => c.directory_approved)
  const pending = candidates.filter((c) => !c.directory_approved)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Public Directory</h1>
        <p className="mt-1 text-sm text-stone-500">
          Control which chefs appear on the public{' '}
          <a href="/chefs" target="_blank" className="font-medium text-brand-600 underline">
            Find a Chef
          </a>{' '}
          page. Only approved chefs are visible to the public.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-2xl font-bold text-emerald-600">{approved.length}</p>
          <p className="text-sm text-stone-500">Listed publicly</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-2xl font-bold text-stone-400">{pending.length}</p>
          <p className="text-sm text-stone-500">Not listed</p>
        </div>
      </div>

      {/* Approved chefs */}
      {approved.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 mb-3">
            Listed ({approved.length})
          </h2>
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white overflow-hidden">
            {approved.map((chef) => (
              <DirectoryToggleRow key={chef.id} chef={chef} />
            ))}
          </div>
        </div>
      )}

      {/* Pending chefs */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 mb-3">
            Not Listed ({pending.length})
          </h2>
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white overflow-hidden">
            {pending.map((chef) => (
              <DirectoryToggleRow key={chef.id} chef={chef} />
            ))}
          </div>
        </div>
      )}

      {candidates.length === 0 && (
        <p className="text-center text-stone-400 py-12">No chefs registered yet.</p>
      )}
    </div>
  )
}
