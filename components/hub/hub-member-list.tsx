/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useTransition } from 'react'
import type { HubGroupMember, HubMemberRole } from '@/lib/hub/types'
import {
  updateMemberRole,
  updateMemberPermissions,
  removeMember,
  leaveGroup,
} from '@/lib/hub/group-actions'
import { getCircleHouseholdSummary, type HouseholdMember } from '@/lib/hub/household-actions'
import { CircleInviteCard } from '@/components/hub/circle-invite-card'

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: 'Host', color: 'bg-amber-500/20 text-amber-400' },
  admin: { label: 'Admin', color: 'bg-brand-500/20 text-brand-400' },
  chef: {
    label: 'Chef',
    color: 'bg-[var(--hub-primary,#e88f47)]/20 text-[var(--hub-primary,#e88f47)]',
  },
  host: { label: 'Host', color: 'bg-amber-500/20 text-amber-400' },
  member: { label: '', color: '' },
  viewer: { label: 'Viewer', color: 'bg-stone-500/20 text-stone-400' },
  delegate: { label: 'Delegate', color: 'bg-sky-500/20 text-sky-400' },
}

type AssignableRole = 'admin' | 'host' | 'member' | 'viewer' | 'delegate'
type CurrentViewerRole = Extract<HubMemberRole, 'owner' | 'admin' | 'chef' | 'host'>

const ASSIGNABLE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'host', label: 'Host' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'delegate', label: 'Delegate' },
]

const HOST_MANAGEABLE_ROLES = new Set<HubMemberRole>(['member', 'viewer', 'delegate'])
const PROTECTED_MEMBER_ROLES = new Set<HubMemberRole>(['owner', 'chef'])
const HOUSEHOLD_SUMMARY_ROLES = new Set<HubMemberRole>(['owner', 'admin', 'chef'])

function getAssignableRolesForViewer(role: CurrentViewerRole): AssignableRole[] {
  if (role === 'host') return ['member', 'viewer', 'delegate']
  if (role === 'admin') return ['host', 'member', 'viewer', 'delegate']
  return ['admin', 'host', 'member', 'viewer', 'delegate']
}

function canManageTarget(
  viewerRole: HubMemberRole | undefined,
  targetRole: HubMemberRole,
  isCurrentUser: boolean
) {
  if (isCurrentUser || !viewerRole) return false
  if (!['owner', 'admin', 'chef', 'host'].includes(viewerRole)) return false
  if (PROTECTED_MEMBER_ROLES.has(targetRole)) return false
  if (viewerRole === 'host') return HOST_MANAGEABLE_ROLES.has(targetRole)
  return true
}

interface HubMemberListProps {
  members: HubGroupMember[]
  groupId: string
  groupToken: string
  currentProfileId?: string | null
  profileToken?: string | null
  isOwnerOrAdmin?: boolean
  canInvite?: boolean
}

export function HubMemberList({
  members,
  groupId,
  groupToken,
  currentProfileId,
  profileToken,
  isOwnerOrAdmin,
  canInvite,
}: HubMemberListProps) {
  const [localMembers, setLocalMembers] = useState(members)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [householdSummary, setHouseholdSummary] = useState<{
    members: HouseholdMember[]
    allAllergies: string[]
    allDietary: string[]
  } | null>(null)
  const currentViewer = localMembers.find((member) => member.profile_id === currentProfileId)
  const currentViewerRole = currentViewer?.role
  const isCurrentViewerManager =
    currentViewerRole === 'owner' ||
    currentViewerRole === 'admin' ||
    currentViewerRole === 'chef' ||
    currentViewerRole === 'host'
  const currentViewerAssignableRoles = isCurrentViewerManager
    ? getAssignableRolesForViewer(currentViewerRole)
    : []
  const canViewHouseholdSummary =
    isOwnerOrAdmin === true &&
    currentViewerRole !== undefined &&
    HOUSEHOLD_SUMMARY_ROLES.has(currentViewerRole)
  const inviteRole =
    currentViewer?.role === 'chef'
      ? 'chef'
      : currentViewer?.profile?.client_id
        ? 'client'
        : currentViewer?.profile?.auth_user_id
          ? 'chef'
          : 'member'
  const inviteCardCopy =
    inviteRole === 'chef'
      ? {
          title: 'Invite the table',
          description:
            'Copy the chef link or drop it into a text. Guests land in the Dinner Circle fast, with the plan and dietary notes in one place.',
        }
      : inviteRole === 'client'
        ? {
            title: 'Bring your table in',
            description:
              'Share one clean link with guests so the host side, chef, and table stay aligned in the same Dinner Circle.',
          }
        : {
            title: 'Bring someone into the circle',
            description:
              'Copy the join link or drop it into a text. New guests can get into the Dinner Circle in seconds.',
          }

  // Load household dietary summary only for owner/admin/chef viewers.
  useEffect(() => {
    if (!canViewHouseholdSummary) {
      setHouseholdSummary(null)
      return
    }

    let isActive = true
    getCircleHouseholdSummary(groupId, groupToken)
      .then((summary) => {
        if (isActive) setHouseholdSummary(summary)
      })
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [canViewHouseholdSummary, groupId, groupToken])

  const handleRoleChange = (memberId: string, newRole: AssignableRole) => {
    if (!profileToken) return
    setError(null)
    startTransition(async () => {
      try {
        await updateMemberRole({
          groupId,
          profileToken,
          targetMemberId: memberId,
          newRole,
        })
        setLocalMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        )
        setMenuOpen(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update role')
      }
    })
  }

  const handleRemove = (memberId: string) => {
    if (!profileToken) return
    setError(null)
    startTransition(async () => {
      try {
        await removeMember({
          groupId,
          profileToken,
          targetMemberId: memberId,
        })
        setLocalMembers((prev) => prev.filter((m) => m.id !== memberId))
        setMenuOpen(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove member')
      }
    })
  }

  const handlePermissionToggle = (
    memberId: string,
    perm: 'can_post' | 'can_invite' | 'can_pin',
    currentValue: boolean
  ) => {
    if (!profileToken) return
    setError(null)
    startTransition(async () => {
      try {
        await updateMemberPermissions({
          groupId,
          profileToken,
          targetMemberId: memberId,
          [perm]: !currentValue,
        })
        setLocalMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, [perm]: !currentValue } : m))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update permissions')
      }
    })
  }

  const handleLeave = () => {
    if (!profileToken) return
    setError(null)
    startTransition(async () => {
      try {
        await leaveGroup({ groupId, profileToken })
        const isChefRole = currentViewer?.role === 'chef' || currentViewer?.role === 'owner'
        window.location.href = isChefRole ? '/circles' : '/my-hub'
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to leave group')
      }
    })
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-300">Members ({localMembers.length})</h3>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-900/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {canInvite && (
        <div className="mb-4">
          <CircleInviteCard
            groupToken={groupToken}
            profileToken={profileToken}
            inviteRole={inviteRole}
            title={inviteCardCopy.title}
            description={inviteCardCopy.description}
            showOpenButton={false}
          />
        </div>
      )}

      {/* Household Dietary Summary */}
      {canViewHouseholdSummary &&
        householdSummary &&
        (householdSummary.allAllergies.length > 0 || householdSummary.allDietary.length > 0) && (
          <div
            className={`mb-4 rounded-xl border p-3 ${
              householdSummary.allAllergies.length > 0
                ? 'border-amber-800/50 bg-amber-950/20'
                : 'border-stone-700 bg-stone-900/50'
            }`}
          >
            <h4 className="text-xs font-semibold text-stone-300 mb-2">Household Dietary Summary</h4>
            {householdSummary.allAllergies.length > 0 && (
              <div className="mb-1.5">
                <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">
                  Allergies
                </span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {householdSummary.allAllergies.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-400"
                    >
                      ⚠ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {householdSummary.allDietary.length > 0 && (
              <div>
                <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide">
                  Dietary
                </span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {householdSummary.allDietary.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-400"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {householdSummary.members.length > 0 && (
              <div className="mt-2 border-t border-stone-700/50 pt-2">
                <span className="text-[10px] text-stone-500">
                  {householdSummary.members.length} household member
                  {householdSummary.members.length !== 1 ? 's' : ''} tracked
                </span>
              </div>
            )}
          </div>
        )}

      <div className="space-y-2">
        {localMembers.map((member) => {
          const profile = member.profile
          const isCurrentUser = member.profile_id === currentProfileId
          const badge = ROLE_BADGES[member.role]
          const canManage =
            (isOwnerOrAdmin || currentViewerRole === 'host') &&
            canManageTarget(currentViewerRole, member.role, isCurrentUser)
          const assignableRoles = currentViewerAssignableRoles.filter(
            (role) => role !== member.role
          )
          const initials = (profile?.display_name ?? '?')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          return (
            <div
              key={member.id}
              className="group relative flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-stone-800/50"
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
                {(profile?.known_allergies?.length ?? 0) > 0 ||
                (profile?.known_dietary?.length ?? 0) > 0 ? (
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

              {/* Manage button for server-authorized managers only. */}
              {canManage && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                    className="rounded p-1 text-stone-500 opacity-0 transition-opacity hover:bg-stone-700 hover:text-stone-300 group-hover:opacity-100"
                    title="Manage member"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>

                  {menuOpen === member.id && (
                    <div className="absolute right-0 top-full z-page-bar mt-1 w-48 rounded-lg border border-stone-700 bg-stone-800 py-1 shadow-xl">
                      {/* Role options */}
                      {ASSIGNABLE_ROLES.filter((r) => assignableRoles.includes(r.value)).map(
                        (r) => (
                          <button
                            key={r.value}
                            onClick={() => handleRoleChange(member.id, r.value)}
                            disabled={isPending}
                            className="w-full px-3 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-700 disabled:opacity-50"
                          >
                            Make {r.label}
                          </button>
                        )
                      )}
                      <div className="my-1 border-t border-stone-700" />
                      {/* Permission toggles */}
                      <div className="px-3 py-1.5">
                        <span className="text-xs font-medium text-stone-500">Permissions</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(['can_post', 'can_invite', 'can_pin'] as const).map((perm) => (
                            <button
                              key={perm}
                              onClick={() => handlePermissionToggle(member.id, perm, member[perm])}
                              disabled={isPending}
                              className={`rounded-full px-2 py-0.5 text-xs transition-colors disabled:opacity-50 ${
                                member[perm]
                                  ? 'bg-green-500/15 text-green-400'
                                  : 'bg-stone-700 text-stone-500'
                              }`}
                            >
                              {perm === 'can_post'
                                ? 'Post'
                                : perm === 'can_invite'
                                  ? 'Invite'
                                  : 'Pin'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="my-1 border-t border-stone-700" />
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={isPending}
                        className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-stone-700 disabled:opacity-50"
                      >
                        Remove from circle
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Leave button for current user */}
              {isCurrentUser && member.role !== 'owner' && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to leave this group?')) {
                      handleLeave()
                    }
                  }}
                  disabled={isPending}
                  className="rounded-full px-2.5 py-1 text-xs text-red-500/70 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                >
                  Leave
                </button>
              )}

              {/* Joined date (when no manage button or on non-manageable members) */}
              {!canManage && !isCurrentUser && (
                <span className="text-xs text-stone-600">
                  {new Date(member.joined_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
