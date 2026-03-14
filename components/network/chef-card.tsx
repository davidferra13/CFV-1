// Chef Card - Reusable profile card for network discovery and friends list
'use client'

import { MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

interface ChefCardProps {
  displayName: string | null
  businessName: string
  bio: string | null
  profileImageUrl: string | null
  city: string | null
  state: string | null
  actions?: ReactNode
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function ChefCard({
  displayName,
  businessName,
  bio,
  profileImageUrl,
  city,
  state,
  actions,
}: ChefCardProps) {
  const name = displayName || businessName
  const location = [city, state].filter(Boolean).join(', ')

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-stone-200 hover:bg-stone-50/50 transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profileImageUrl} alt={name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-brand-900 flex items-center justify-center">
            <span className="text-sm font-semibold text-brand-700">{getInitials(name)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900 truncate">{name}</p>
        {displayName && displayName !== businessName && (
          <p className="text-xs text-stone-500 truncate">{businessName}</p>
        )}
        {location && (
          <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {location}
          </p>
        )}
        {bio && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{bio}</p>}
      </div>

      {/* Actions slot */}
      {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  )
}
