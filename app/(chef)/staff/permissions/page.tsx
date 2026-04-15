// Team Permissions Management Page
// Owner and managers can view and modify team member permissions here.
// Each staff member's effective permissions (role defaults + overrides) are shown.

import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/permissions'
import { requirePro } from '@/lib/billing/require-pro'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PermissionMatrixClient } from './permission-matrix-client'

export const metadata: Metadata = { title: 'Team Permissions' }

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: 'Owner',
  manager: 'Manager',
  team_member: 'Team Member',
}

const ROLE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  tenant_owner: 'success',
  manager: 'info',
  team_member: 'default',
}

type TeamMember = {
  authUserId: string
  email: string
  name: string
  tenantRole: string
  staffRole: string | null
}

async function getTeamMembers(tenantId: string): Promise<TeamMember[]> {
  const rows = (await db.execute(sql`
    SELECT
      ur.auth_user_id,
      au.email,
      COALESCE(sm.name, au.email) as name,
      COALESCE(ur.tenant_role,
        CASE WHEN ur.role = 'chef' THEN 'tenant_owner'
             WHEN ur.role = 'staff' THEN 'team_member'
             ELSE ur.role END
      ) as tenant_role,
      sm.role_override as staff_role
    FROM user_roles ur
    JOIN auth.users au ON au.id = ur.auth_user_id
    LEFT JOIN staff_members sm ON sm.auth_user_id = ur.auth_user_id AND sm.chef_id = ${tenantId}
    WHERE (ur.role = 'chef' AND ur.entity_id = ${tenantId})
       OR (ur.role = 'staff' AND sm.chef_id = ${tenantId})
    ORDER BY
      CASE COALESCE(ur.tenant_role, ur.role)
        WHEN 'tenant_owner' THEN 0
        WHEN 'chef' THEN 0
        WHEN 'manager' THEN 1
        ELSE 2
      END,
      COALESCE(sm.name, au.email)
  `)) as any[]

  return rows.map((r: any) => ({
    authUserId: r.auth_user_id,
    email: r.email,
    name: r.name,
    tenantRole: r.tenant_role,
    staffRole: r.staff_role,
  }))
}

async function getOverrides(tenantId: string): Promise<Record<string, Record<string, string[]>>> {
  const rows = (await db.execute(sql`
    SELECT auth_user_id, domain, actions
    FROM user_permission_overrides
    WHERE tenant_id = ${tenantId}
  `)) as any[]

  const result: Record<string, Record<string, string[]>> = {}
  for (const row of rows) {
    if (!result[row.auth_user_id]) result[row.auth_user_id] = {}
    result[row.auth_user_id][row.domain] = row.actions || []
  }
  return result
}

async function getRoleDefaults(): Promise<Record<string, Record<string, string[]>>> {
  const rows = (await db.execute(sql`
    SELECT role, domain, actions FROM role_permissions
  `)) as any[]

  const result: Record<string, Record<string, string[]>> = {}
  for (const row of rows) {
    if (!result[row.role]) result[row.role] = {}
    result[row.role][row.domain] = row.actions || []
  }
  return result
}

export default async function TeamPermissionsPage() {
  await requirePro('staff-management')
  const user = await requirePermission('users', 'view')
  const tenantId = user.tenantId!

  const [members, overrides, roleDefaults] = await Promise.all([
    getTeamMembers(tenantId),
    getOverrides(tenantId),
    getRoleDefaults(),
  ])

  // Only show members other than the current user who are not owners
  const editableMembers = members.filter(
    (m) => m.tenantRole !== 'tenant_owner' && m.authUserId !== user.authUserId
  )

  const canManage =
    members.find((m) => m.authUserId === user.authUserId)?.tenantRole === 'tenant_owner' ||
    members.find((m) => m.authUserId === user.authUserId)?.tenantRole === 'manager'

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Team Permissions</h1>
        <p className="text-stone-400 mt-1">
          Manage what your team members can access. Role defaults are shown as locked. You can grant
          additional permissions per person.
        </p>
      </div>

      {/* Current team overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const count = members.filter((m) => m.tenantRole === role).length
          return (
            <Card key={role} className="bg-stone-900/50 border-stone-800">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-stone-300">{label}s</span>
                <Badge variant={ROLE_VARIANT[role] || 'default'}>{count}</Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {editableMembers.length === 0 ? (
        <EmptyState
          title="No team members to manage"
          description="Add staff members from the Staff page first. Once they have login access, their permissions will appear here."
        />
      ) : (
        <PermissionMatrixClient
          members={editableMembers}
          overrides={overrides}
          roleDefaults={roleDefaults}
          canManage={canManage}
        />
      )}
    </div>
  )
}
