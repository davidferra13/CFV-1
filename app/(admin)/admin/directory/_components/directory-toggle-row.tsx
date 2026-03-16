'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { DirectoryCandidate } from '@/lib/directory/admin-actions'
import { approveChefForDirectory, revokeChefFromDirectory } from '@/lib/directory/admin-actions'

export function DirectoryToggleRow({ chef }: { chef: DirectoryCandidate }) {
  const [isPending, startTransition] = useTransition()
  const [approved, setApproved] = useState(chef.directory_approved)

  const toggle = () => {
    const next = !approved
    setApproved(next)
    startTransition(async () => {
      try {
        if (next) {
          await approveChefForDirectory(chef.id)
        } else {
          await revokeChefFromDirectory(chef.id)
        }
      } catch (err) {
        setApproved(!next) // revert on error
        toast.error(err instanceof Error ? err.message : 'Failed to update directory listing')
      }
    })
  }

  const hasSlug = Boolean(chef.slug)

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {/* Avatar */}
      {chef.profile_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chef.profile_image_url}
          alt={chef.display_name || chef.business_name}
          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-800 flex-shrink-0">
          <span className="text-sm font-bold text-stone-500">
            {(chef.display_name || chef.business_name || '?').charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-100 truncate">
          {chef.display_name || chef.business_name}
        </p>
        <p className="text-xs text-stone-400 truncate">{chef.email}</p>
        {!hasSlug && (
          <p className="text-xs text-amber-600 mt-0.5">
            No slug set - won&apos;t appear even if approved
          </p>
        )}
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
          approved ? 'bg-emerald-500' : 'bg-stone-300'
        } ${isPending ? 'opacity-50' : ''}`}
        aria-label={approved ? 'Revoke listing' : 'Approve listing'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-stone-900 shadow transition-transform ${
            approved ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
