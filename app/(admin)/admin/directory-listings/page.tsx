// Admin: External Directory Listings Management
// Manage discovered, claimed, and submitted food business listings.

import { requireAdmin } from '@/lib/auth/admin'
import { adminGetAllListings, adminGetNominations } from '@/lib/discover/actions'
import { ListingManagementTable } from './_components/listing-management-table'

export default async function AdminDirectoryListingsPage() {
  await requireAdmin()

  const [listings, nominations] = await Promise.all([adminGetAllListings(), adminGetNominations()])

  const pendingNominations = nominations.filter((n) => n.status === 'pending')

  const stats = {
    total: listings.length,
    discovered: listings.filter((l) => l.status === 'discovered').length,
    claimed: listings.filter((l) => l.status === 'claimed').length,
    verified: listings.filter((l) => l.status === 'verified').length,
    pendingSubmissions: listings.filter((l) => l.status === 'pending_submission').length,
    removed: listings.filter((l) => l.status === 'removed').length,
    removalRequests: listings.filter((l) => l.removal_requested_at && l.status !== 'removed')
      .length,
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">External Directory</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage food business listings on the public{' '}
          <a href="/discover" target="_blank" className="font-medium text-brand-600 underline">
            /discover
          </a>{' '}
          directory. These are external businesses (not ChefFlow platform users).
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Total', value: stats.total, color: 'text-stone-100' },
          { label: 'Discovered', value: stats.discovered, color: 'text-stone-300' },
          { label: 'Pending', value: stats.pendingSubmissions, color: 'text-amber-300' },
          { label: 'Claimed', value: stats.claimed, color: 'text-sky-300' },
          { label: 'Verified', value: stats.verified, color: 'text-emerald-300' },
          { label: 'Removed', value: stats.removed, color: 'text-red-300' },
          {
            label: 'Removal Requests',
            value: stats.removalRequests,
            color: stats.removalRequests > 0 ? 'text-red-400' : 'text-stone-500',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-stone-700 bg-stone-900 p-3">
            <p className="text-[11px] font-medium text-stone-500">{stat.label}</p>
            <p className={`mt-0.5 text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pending nominations */}
      {pendingNominations.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-800/40 bg-amber-950/20 p-5">
          <h2 className="text-sm font-semibold text-amber-300">
            {pendingNominations.length} pending nomination
            {pendingNominations.length !== 1 ? 's' : ''}
          </h2>
          <div className="mt-3 space-y-2">
            {pendingNominations.slice(0, 5).map((nom) => (
              <div
                key={nom.id}
                className="flex items-center justify-between rounded-lg bg-stone-900/50 p-3"
              >
                <div>
                  <p className="text-xs font-medium text-stone-200">{nom.business_name}</p>
                  <p className="text-[11px] text-stone-500">
                    {nom.business_type} {nom.city && `in ${nom.city}`}
                    {nom.nominator_email && ` - nominated by ${nom.nominator_email}`}
                  </p>
                  {nom.reason && (
                    <p className="mt-0.5 text-[11px] text-stone-400 italic">"{nom.reason}"</p>
                  )}
                </div>
                {nom.website_url && (
                  <a
                    href={nom.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-brand-400 hover:text-brand-300"
                  >
                    website
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <ListingManagementTable listings={listings} />
    </div>
  )
}
