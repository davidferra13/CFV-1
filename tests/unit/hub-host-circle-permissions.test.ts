import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

function functionBody(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}`)
  assert.ok(start >= 0, `${name} must exist`)
  const next = src.indexOf('\n/**', start + 1)
  return src.slice(start, next === -1 ? undefined : next)
}

test('host is a narrow server-side circle manager for client-facing group settings', () => {
  const src = readFile('lib/hub/group-actions.ts')
  const updateHubGroup = functionBody(src, 'updateHubGroup')

  assert.ok(
    src.includes(
      "const GROUP_MANAGEMENT_ROLES = new Set<string>(['owner', 'admin', 'chef', 'host'])"
    )
  )
  assert.ok(updateHubGroup.includes('isGroupManagementRole(membership.role)'))
  assert.ok(updateHubGroup.includes(".select('id')"))
  assert.ok(updateHubGroup.includes(".eq('profile_token', input.profileToken)"))
  assert.ok(updateHubGroup.includes(".eq('group_id', input.groupId)"))
  assert.ok(updateHubGroup.includes(".eq('profile_id', profile.id)"))
  assert.ok(!updateHubGroup.includes('tenant_id'))
})

test('host member management cannot change protected circle authority or chef permissions', () => {
  const src = readFile('lib/hub/group-actions.ts')
  const updateMemberRole = functionBody(src, 'updateMemberRole')
  const updateMemberPermissions = functionBody(src, 'updateMemberPermissions')
  const removeMember = functionBody(src, 'removeMember')

  assert.ok(
    src.includes(
      "const HOST_MANAGEABLE_MEMBER_ROLES = new Set<string>(['member', 'viewer', 'delegate'])"
    )
  )
  assert.ok(
    src.includes(
      "const HOST_ASSIGNABLE_MEMBER_ROLES = new Set<string>(['member', 'viewer', 'delegate'])"
    )
  )
  assert.ok(
    src.includes(
      "const HOST_PROTECTED_MEMBER_ROLES = new Set<string>(['owner', 'admin', 'chef', 'host'])"
    )
  )

  assert.ok(updateMemberRole.includes("target.role === 'owner'"))
  assert.ok(updateMemberRole.includes("target.role === 'chef'"))
  assert.ok(updateMemberRole.includes("caller.role === 'host'"))
  assert.ok(updateMemberRole.includes("input.newRole === 'admin'"))
  assert.ok(updateMemberRole.includes('isHostProtectedMemberRole(target.role)'))
  assert.ok(updateMemberRole.includes('!canHostManageMemberRole(target.role)'))
  assert.ok(updateMemberRole.includes('!HOST_ASSIGNABLE_MEMBER_ROLES.has(input.newRole)'))

  assert.ok(updateMemberPermissions.includes("target.role === 'owner' || target.role === 'chef'"))
  assert.ok(updateMemberPermissions.includes("caller.role === 'host'"))
  assert.ok(updateMemberPermissions.includes('isHostProtectedMemberRole(target.role)'))
  assert.ok(updateMemberPermissions.includes('!canHostManageMemberRole(target.role)'))

  assert.ok(removeMember.includes("target.role === 'owner'"))
  assert.ok(removeMember.includes("caller.role === 'host'"))
  assert.ok(removeMember.includes('isHostProtectedMemberRole(target.role)'))
  assert.ok(removeMember.includes('!canHostManageMemberRole(target.role)'))
})

test('sole host cannot leave when no owner admin or other host remains', () => {
  const src = readFile('lib/hub/group-actions.ts')
  const leaveGroup = functionBody(src, 'leaveGroup')

  assert.ok(leaveGroup.includes("membership.role === 'owner' || membership.role === 'host'"))
  assert.ok(leaveGroup.includes("['owner', 'admin', 'host']"))
  assert.ok(leaveGroup.includes('You are the only host'))
})
