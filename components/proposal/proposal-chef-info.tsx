'use client'

import { ChefHat } from 'lucide-react'

type ProposalChefInfoProps = {
  businessName: string | null
  profileImageUrl: string | null
  logoUrl: string | null
  bio: string | null
  tagline: string | null
}

export function ProposalChefInfo({
  businessName,
  profileImageUrl,
  logoUrl,
  bio,
  tagline,
}: ProposalChefInfoProps) {
  // Don't render if there's nothing to show beyond the name
  if (!bio && !tagline) {
    return null
  }

  const avatarUrl = profileImageUrl || logoUrl

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <ChefHat className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-gray-900">About Your Chef</h2>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={businessName || 'Chef'}
              className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
              <span className="text-amber-200 font-bold text-xl">
                {(businessName || 'C').charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="min-w-0">
            {businessName && <p className="font-semibold text-gray-900 text-lg">{businessName}</p>}
            {tagline && <p className="text-sm text-amber-200 mt-0.5">{tagline}</p>}
            {bio && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed whitespace-pre-line">
                {bio}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
