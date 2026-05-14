'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, Loader2, UserCog } from 'lucide-react'
import * as circleDetailActions from '@/lib/hub/circle-detail-actions'
import type { CircleDetail, CircleMemberDetail } from '@/lib/hub/circle-detail-actions'

type ActionResult = { success: boolean; error?: string }
type ManageableRole = 'admin' | 'member' | 'viewer'
type PermissionKey = 'can_post' | 'can_invite' | 'can_pin'

type CircleDetailActionModule = typeof circleDetailActions & {
  updateCircleMemberRole?: (
    circleId: string,
    membershipId: string,
    role: ManageableRole
  ) => Promise<ActionResult | void>
  updateCircleMemberPermissions?: (
    circleId: string,
    membershipId: string,
    permissions: Partial<Record<PermissionKey, boolean>>
  ) => Promise<ActionResult | void>
}

export type ChefCircleManageableMember = Pick<
  CircleMemberDetail,
  | 'profile_id'
  | 'id'
  | 'display_name'
  | 'avatar_url'
  | 'email'
  | 'client_id'
  | 'client_name'
  | 'role'
  | 'joined_at'
> & {
  role: CircleMemberDetail['role'] | ManageableRole | 'owner' | 'chef'
  can_post: boolean
  can_invite: boolean
  can_pin: boolean
}

type ChefCircleMemberControlsProps = {
  circle: Pick<CircleDetail, 'id'> & { members: ChefCircleManageableMember[] }
  className?: string
  onMembersChange?: (members: ChefCircleManageableMember[]) => void
}

const roleOptions: { value: ManageableRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
]

const permissionLabels: Record<PermissionKey, string> = {
  can_post: 'Post',
  can_invite: 'Invite',
  can_pin: 'Pin',
}

export function ChefCircleMemberControls({
  circle,
  className = '',
  onMembersChange,
}: ChefCircleMemberControlsProps) {
  const [members, setMembers] = useState(circle.members)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setMembers(circle.members)
  }, [circle.members])

  const manageableMembers = useMemo(
    () => members.filter((member) => member.role !== 'owner' && member.role !== 'chef'),
    [members]
  )

  function commitMembers(nextMembers: ChefCircleManageableMember[]) {
    setMembers(nextMembers)
    onMembersChange?.(nextMembers)
  }

  function flashSaved(key: string) {
    setSavedKey(key)
    window.setTimeout(() => setSavedKey((current) => (current === key ? null : current)), 2000)
  }

  function updateRole(membershipId: string, role: ManageableRole) {
    setError(null)
    setSavedKey(null)
    setPendingKey(`${membershipId}:role`)

    startTransition(async () => {
      try {
        const updateCircleMemberRole = (circleDetailActions as unknown as CircleDetailActionModule)
          .updateCircleMemberRole

        if (typeof updateCircleMemberRole !== 'function') {
          throw new Error('Circle member role action is not available yet.')
        }

        const result = await updateCircleMemberRole(circle.id, membershipId, role)
        if (result && result.success === false) {
          throw new Error(result.error ?? 'Failed to update member role.')
        }

        const nextMembers = members.map((member) =>
          member.id === membershipId ? { ...member, role } : member
        )
        commitMembers(nextMembers)
        flashSaved(`${membershipId}:role`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update member role.')
      } finally {
        setPendingKey(null)
      }
    })
  }

  function updatePermission(membershipId: string, permission: PermissionKey, checked: boolean) {
    setError(null)
    setSavedKey(null)
    setPendingKey(`${membershipId}:${permission}`)

    startTransition(async () => {
      try {
        const updateCircleMemberPermissions = (
          circleDetailActions as unknown as CircleDetailActionModule
        ).updateCircleMemberPermissions

        if (typeof updateCircleMemberPermissions !== 'function') {
          throw new Error('Circle member permissions action is not available yet.')
        }

        const result = await updateCircleMemberPermissions(circle.id, membershipId, {
          [permission]: checked,
        })
        if (result && result.success === false) {
          throw new Error(result.error ?? 'Failed to update member permissions.')
        }

        const nextMembers = members.map((member) =>
          member.id === membershipId ? { ...member, [permission]: checked } : member
        )
        commitMembers(nextMembers)
        flashSaved(`${membershipId}:${permission}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update member permissions.')
      } finally {
        setPendingKey(null)
      }
    })
  }

  return (
    <section
      className={`space-y-4 rounded-xl border border-stone-700 bg-stone-900/80 p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">Member controls</h2>
          <p className="mt-1 text-xs text-stone-500">
            Manage roles and posting permissions for non-owner members.
          </p>
        </div>
        {isPending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Updating
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        {manageableMembers.map((member) => (
          <MemberControlRow
            key={member.profile_id}
            member={member}
            pendingKey={pendingKey}
            savedKey={savedKey}
            onRoleChange={updateRole}
            onPermissionChange={updatePermission}
          />
        ))}
      </div>

      {manageableMembers.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-8 text-center">
          <UserCog className="mx-auto h-5 w-5 text-stone-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-stone-300">No manageable members</p>
          <p className="mt-1 text-xs text-stone-500">
            Owner and chef roles are intentionally excluded from these controls.
          </p>
        </div>
      ) : null}
    </section>
  )
}

function MemberControlRow({
  member,
  pendingKey,
  savedKey,
  onRoleChange,
  onPermissionChange,
}: {
  member: ChefCircleManageableMember
  pendingKey: string | null
  savedKey: string | null
  onRoleChange: (membershipId: string, role: ManageableRole) => void
  onPermissionChange: (membershipId: string, permission: PermissionKey, checked: boolean) => void
}) {
  const initials = member.display_name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-full bg-stone-800 text-xs font-semibold text-stone-300">
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials || '?'
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-100">
              {member.client_name || member.display_name}
            </p>
            {member.email ? (
              <p className="truncate text-xs text-stone-500">{member.email}</p>
            ) : null}
          </div>
        </div>

        <label className="grid min-w-40 gap-1">
          <span className="text-xs font-medium text-stone-500">Role</span>
          <select
            value={isManageableRole(member.role) ? member.role : 'member'}
            onChange={(event) => onRoleChange(member.id, event.target.value as ManageableRole)}
            disabled={pendingKey !== null}
            className="h-9 rounded-lg border border-stone-700 bg-stone-900 px-2 text-sm text-stone-100 outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-800 pt-3">
        {(['can_post', 'can_invite', 'can_pin'] as PermissionKey[]).map((permission) => {
          const key = `${member.id}:${permission}`
          const checked = member[permission]
          const pending = pendingKey === key
          const saved = savedKey === key

          return (
            <button
              key={permission}
              type="button"
              onClick={() => onPermissionChange(member.id, permission, !checked)}
              disabled={pendingKey !== null}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                checked
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600 hover:text-stone-200'
              }`}
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              {saved ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : null}
              {permissionLabels[permission]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function isManageableRole(role: string): role is ManageableRole {
  return role === 'admin' || role === 'member' || role === 'viewer'
}
