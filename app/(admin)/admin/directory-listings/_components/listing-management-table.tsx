'use client'

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { adminUpdateListingStatus } from '@/lib/discover/actions'
import { getBusinessTypeLabel } from '@/lib/discover/constants'
import type { DirectoryListing } from '@/lib/discover/actions'

type Props = {
  listings: DirectoryListing[]
}

const STATUS_COLORS: Record<string, string> = {
  discovered: 'bg-stone-800 text-stone-400',
  pending_submission: 'bg-amber-900/60 text-amber-300',
  claimed: 'bg-sky-900/60 text-sky-300',
  verified: 'bg-emerald-900/60 text-emerald-300',
  removed: 'bg-red-900/60 text-red-300',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xxs font-semibold ${STATUS_COLORS[status] || 'bg-stone-800 text-stone-400'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function ListingRow({ listing }: { listing: DirectoryListing }) {
  const [isPending, startTransition] = useTransition()
  const location = [listing.city, listing.state].filter(Boolean).join(', ')
  const hasRemovalRequest = !!(listing as any).removal_requested_at

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      try {
        const result = await adminUpdateListingStatus(listing.id, newStatus)
        if (result.success) {
          toast.success(`Status updated to "${newStatus}"`)
        } else {
          toast.error(result.error || 'Failed to update.')
        }
      } catch {
        toast.error('Something went wrong.')
      }
    })
  }

  return (
    <tr className={`border-b border-stone-800 ${hasRemovalRequest ? 'bg-red-950/10' : ''}`}>
      <td className="px-3 py-3">
        <div>
          <a
            href={`/discover/${listing.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-stone-200 hover:text-brand-400"
          >
            {listing.name}
          </a>
          {listing.website_url && (
            <a
              href={listing.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xxs text-stone-500 hover:text-stone-300"
            >
              website
            </a>
          )}
        </div>
        {location && <p className="text-xs-tight text-stone-500">{location}</p>}
      </td>
      <td className="px-3 py-3">
        <span className="text-xs text-stone-400">
          {getBusinessTypeLabel(listing.business_type)}
        </span>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={listing.status} />
        {hasRemovalRequest && (
          <span className="ml-1.5 text-xxs text-red-400">removal requested</span>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-stone-500">{listing.source}</td>
      <td className="px-3 py-3 text-xs text-stone-500">
        {listing.claimed_by_name || (listing as any).claimed_by_email || '-'}
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1">
          {listing.status !== 'verified' && listing.status !== 'removed' && (
            <button
              onClick={() => handleStatusChange('verified')}
              disabled={isPending}
              className="rounded bg-emerald-900/50 px-2 py-1 text-xxs font-medium text-emerald-300 hover:bg-emerald-900/80 disabled:opacity-50"
            >
              Verify
            </button>
          )}
          {listing.status !== 'removed' && (
            <button
              onClick={() => handleStatusChange('removed')}
              disabled={isPending}
              className="rounded bg-red-900/30 px-2 py-1 text-xxs font-medium text-red-300 hover:bg-red-900/60 disabled:opacity-50"
            >
              Remove
            </button>
          )}
          {listing.status === 'removed' && (
            <button
              onClick={() => handleStatusChange('discovered')}
              disabled={isPending}
              className="rounded bg-stone-800 px-2 py-1 text-xxs font-medium text-stone-300 hover:bg-stone-700 disabled:opacity-50"
            >
              Restore
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function ListingManagementTable({ listings }: Props) {
  const [filter, setFilter] = useState<string>('active')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = listings

    if (filter === 'active') {
      result = result.filter((l) => l.status !== 'removed')
    } else if (filter !== 'all') {
      result = result.filter((l) => l.status === filter)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          (l as any).claimed_by_email?.toLowerCase().includes(q)
      )
    }

    return result
  }, [listings, filter, search])

  const removalRequests = listings.filter(
    (l) => (l as any).removal_requested_at && l.status !== 'removed'
  )

  return (
    <div className="space-y-4">
      {/* Alert for pending removal requests */}
      {removalRequests.length > 0 && (
        <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-4">
          <p className="text-xs font-semibold text-red-300">
            {removalRequests.length} pending removal request
            {removalRequests.length !== 1 ? 's' : ''}
          </p>
          <p className="mt-0.5 text-xs-tight text-red-200/60">
            These businesses have asked to be removed. Process within 48 hours.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings..."
          className="h-9 w-64 rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        <div className="flex gap-1 rounded-lg bg-stone-800 p-1">
          {[
            'active',
            'discovered',
            'pending_submission',
            'claimed',
            'verified',
            'removed',
            'all',
          ].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xxs font-medium transition-colors ${
                filter === f ? 'bg-brand-600 text-white' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {f === 'pending_submission' ? 'pending' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-700">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-700 bg-stone-800/60">
              <th className="px-3 py-2 text-left text-xs-tight font-semibold text-stone-300">
                Business
              </th>
              <th className="px-3 py-2 text-left text-xs-tight font-semibold text-stone-300">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs-tight font-semibold text-stone-300">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs-tight font-semibold text-stone-300">
                Source
              </th>
              <th className="px-3 py-2 text-left text-xs-tight font-semibold text-stone-300">
                Claimed by
              </th>
              <th className="px-3 py-2 text-left text-xs-tight font-semibold text-stone-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-stone-500">
                  No listings match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((listing) => (
                <ListingRow key={listing.id} listing={listing as DirectoryListing} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs-tight text-stone-600">
        {filtered.length} of {listings.length} total listings
      </p>
    </div>
  )
}
