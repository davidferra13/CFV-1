/* eslint-disable @next/next/no-img-element */
'use client'

import type { HubGroupMember } from '@/lib/hub/types'

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: 'Host', color: 'bg-amber-500/20 text-amber-400' },
  admin: { label: 'Admin', color: 'bg-blue-500/20 text-blue-400' },
  chef: {
    label: 'Chef',
    color: 'bg-[var(--hub-primary,#e88f47)]/20 text-[var(--hub-primary,#e88f47)]',
  },
  member: { label: '', color: '' },
  viewer: { label: 'Viewer', color: 'bg-stone-500/20 text-stone-400' },
}

interface HubMemberListProps {
  members: HubGroupMember[]
  currentProfileId?: string | null
}

export function HubMemberList({ members, currentProfileId }: HubMemberListProps) {
  return (
    <div className="p-4">
      <h3 className="mb-4 text-sm font-semibold text-stone-300">ðŸ‘¥ Members ({members.length})</h3>

      <div className="space-y-2">
        {members.map((member) => {
          const profile = member.profile
          const isCurrentUser = member.profile_id === currentProfileId
          const badge = ROLE_BADGES[member.role]
          const initials = (profile?.display_name ?? '?')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-stone-800/50"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-medium text-stone-300">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-stone-200">
                    {profile?.display_name ?? 'Guest'}
                  </span>
                  {isCurrentUser && <span className="text-xs text-stone-600">(you)</span>}
                  {badge?.label && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                {profile?.bio && <p className="truncate text-xs text-stone-500">{profile.bio}</p>}
                {/* Dietary info */}
                {profile?.known_allergies?.length || profile?.known_dietary?.length ? (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {(profile?.known_allergies ?? []).map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400"
                      >
                        {a}
                      </span>
                    ))}
                    {(profile?.known_dietary ?? []).map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Joined date */}
              <span className="text-xs text-stone-600">
                {new Date(member.joined_at).toLocaleDateString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
