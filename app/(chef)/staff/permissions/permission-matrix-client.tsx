'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  grantPermissionOverride,
  revokePermissionOverride,
  changeTenantRole,
} from '@/lib/auth/permission-actions'
import type { PermissionDomain, PermissionAction } from '@/lib/auth/permissions'

const DOMAINS: { key: PermissionDomain; label: string }[] = [
  { key: 'events', label: 'Events' },
  { key: 'clients', label: 'Clients' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'financial', label: 'Financial' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'staff', label: 'Staff' },
  { key: 'documents', label: 'Documents' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'comms', label: 'Communications' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'settings', label: 'Settings' },
  { key: 'ai', label: 'AI / Remy' },
  { key: 'users', label: 'User Management' },
  { key: 'data', label: 'Import / Export' },
  { key: 'integrations', label: 'Integrations' },
]

const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'manage']

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  team_member: 'Team Member',
}

type Member = {
  authUserId: string
  email: string
  name: string
  tenantRole: string
  staffRole: string | null
}

export function PermissionMatrixClient({
  members,
  overrides,
  roleDefaults,
  canManage,
}: {
  members: Member[]
  overrides: Record<string, Record<string, string[]>>
  roleDefaults: Record<string, Record<string, string[]>>
  canManage: boolean
}) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(members[0] ?? null)
  const [isPending, startTransition] = useTransition()
  const [localOverrides, setLocalOverrides] = useState(overrides)
  const [localMembers, setLocalMembers] = useState(members)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function getEffectiveActions(
    member: Member,
    domain: string
  ): { action: string; source: 'role' | 'override' }[] {
    const roleActions = roleDefaults[member.tenantRole]?.[domain] ?? []
    const overrideActions = localOverrides[member.authUserId]?.[domain] ?? []
    const combined = new Map<string, 'role' | 'override'>()

    for (const a of roleActions) combined.set(a, 'role')
    for (const a of overrideActions) {
      if (!combined.has(a)) combined.set(a, 'override')
    }

    return Array.from(combined.entries()).map(([action, source]) => ({ action, source }))
  }

  function handleToggleAction(member: Member, domain: PermissionDomain, action: PermissionAction) {
    if (!canManage) return
    const roleActions = roleDefaults[member.tenantRole]?.[domain] ?? []
    if (roleActions.includes(action)) return // Cannot remove role defaults

    const currentOverrides = localOverrides[member.authUserId]?.[domain] ?? []
    const isCurrentlyGranted = currentOverrides.includes(action)

    // Optimistic update
    const previousOverrides = { ...localOverrides }
    const newOverrides = { ...localOverrides }
    if (!newOverrides[member.authUserId]) newOverrides[member.authUserId] = {}

    if (isCurrentlyGranted) {
      newOverrides[member.authUserId][domain] = currentOverrides.filter((a) => a !== action)
    } else {
      newOverrides[member.authUserId][domain] = [...currentOverrides, action]
    }
    setLocalOverrides(newOverrides)

    startTransition(async () => {
      try {
        if (isCurrentlyGranted) {
          const newActions = currentOverrides.filter((a) => a !== action)
          if (newActions.length === 0) {
            const result = await revokePermissionOverride({
              targetAuthUserId: member.authUserId,
              domain,
            })
            if (!result.success) throw new Error(result.error)
          } else {
            const result = await grantPermissionOverride({
              targetAuthUserId: member.authUserId,
              domain,
              actions: newActions as PermissionAction[],
            })
            if (!result.success) throw new Error(result.error)
          }
        } else {
          const result = await grantPermissionOverride({
            targetAuthUserId: member.authUserId,
            domain,
            actions: [...currentOverrides, action] as PermissionAction[],
          })
          if (!result.success) throw new Error(result.error)
        }
        showToast('success', `Updated ${domain} permissions for ${member.name}`)
      } catch (err: any) {
        setLocalOverrides(previousOverrides) // rollback
        showToast('error', err.message || 'Failed to update permission')
      }
    })
  }

  function handleRoleChange(member: Member, newRole: 'manager' | 'team_member') {
    if (!canManage) return
    const previousMembers = [...localMembers]
    setLocalMembers((prev) =>
      prev.map((m) => (m.authUserId === member.authUserId ? { ...m, tenantRole: newRole } : m))
    )
    if (selectedMember?.authUserId === member.authUserId) {
      setSelectedMember({ ...member, tenantRole: newRole })
    }

    startTransition(async () => {
      try {
        const result = await changeTenantRole({
          targetAuthUserId: member.authUserId,
          newRole,
        })
        if (!result.success) throw new Error(result.error)
        showToast('success', `Changed ${member.name} to ${ROLE_LABELS[newRole]}`)
      } catch (err: any) {
        setLocalMembers(previousMembers) // rollback
        showToast('error', err.message || 'Failed to change role')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-800 text-emerald-100' : 'bg-red-800 text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Member list */}
      <div className="flex gap-2 flex-wrap">
        {localMembers.map((member) => (
          <button
            key={member.authUserId}
            onClick={() => setSelectedMember(member)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedMember?.authUserId === member.authUserId
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span className="font-medium">{member.name}</span>
            <Badge variant="default" className="ml-2 text-xs">
              {ROLE_LABELS[member.tenantRole] ?? member.tenantRole}
            </Badge>
          </button>
        ))}
      </div>

      {/* Selected member detail */}
      {selectedMember && (
        <Card className="bg-stone-900/50 border-stone-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-stone-100">{selectedMember.name}</CardTitle>
                <p className="text-stone-400 text-sm mt-0.5">{selectedMember.email}</p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button
                    variant={selectedMember.tenantRole === 'manager' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleRoleChange(selectedMember, 'manager')}
                    disabled={isPending || selectedMember.tenantRole === 'manager'}
                  >
                    Manager
                  </Button>
                  <Button
                    variant={selectedMember.tenantRole === 'team_member' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleRoleChange(selectedMember, 'team_member')}
                    disabled={isPending || selectedMember.tenantRole === 'team_member'}
                  >
                    Team Member
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left text-stone-400 font-medium py-2 pr-4">Domain</th>
                    {ACTIONS.map((action) => (
                      <th
                        key={action}
                        className="text-center text-stone-400 font-medium py-2 px-2 capitalize"
                      >
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DOMAINS.map(({ key, label }) => {
                    const effective = getEffectiveActions(selectedMember, key)
                    return (
                      <tr key={key} className="border-b border-stone-800/50">
                        <td className="py-2 pr-4 text-stone-300 font-medium">{label}</td>
                        {ACTIONS.map((action) => {
                          const entry = effective.find((e) => e.action === action)
                          const hasManage = effective.some((e) => e.action === 'manage')
                          const isGranted = !!entry || (hasManage && action !== 'manage')
                          const isFromRole =
                            entry?.source === 'role' ||
                            (hasManage &&
                              !entry &&
                              effective.some((e) => e.action === 'manage' && e.source === 'role'))
                          const isFromOverride = entry?.source === 'override'
                          const roleHasAction = (
                            roleDefaults[selectedMember.tenantRole]?.[key] ?? []
                          ).includes(action)

                          return (
                            <td key={action} className="py-2 px-2 text-center">
                              <button
                                onClick={() =>
                                  canManage && !roleHasAction
                                    ? handleToggleAction(selectedMember, key, action)
                                    : undefined
                                }
                                disabled={isPending || roleHasAction || !canManage}
                                className={`w-6 h-6 rounded border inline-flex items-center justify-center transition-colors ${
                                  isGranted
                                    ? isFromRole
                                      ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400 cursor-default'
                                      : 'bg-blue-900/50 border-blue-700 text-blue-400 hover:bg-blue-800/50'
                                    : canManage && !roleHasAction
                                      ? 'border-stone-700 text-stone-600 hover:border-stone-500'
                                      : 'border-stone-800 text-stone-700 cursor-default'
                                }`}
                                title={
                                  isFromRole
                                    ? `Included in ${ROLE_LABELS[selectedMember.tenantRole]} role`
                                    : isFromOverride
                                      ? 'Custom override (click to remove)'
                                      : canManage
                                        ? 'Click to grant'
                                        : 'View only'
                                }
                              >
                                {isGranted ? '✓' : ''}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-4 text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-900/50 border border-emerald-700 inline-block" />
                Role default (locked)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-900/50 border border-blue-700 inline-block" />
                Custom override
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-stone-700 inline-block" />
                Not granted
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
