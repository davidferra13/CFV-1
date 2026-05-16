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

  assert.ok(src.includes('canManageThread'))
  assert.ok(updateHubGroup.includes('canManageThread('))
  assert.ok(updateHubGroup.includes('buildCircleActor(profile.id, membership)'))
  assert.ok(updateHubGroup.includes('buildCircleAccessContext(groupForPolicy)'))
  assert.ok(updateHubGroup.includes(".select('id')"))
  assert.ok(updateHubGroup.includes(".eq('profile_token', input.profileToken)"))
  assert.ok(updateHubGroup.includes(".eq('group_id', input.groupId)"))
  assert.ok(updateHubGroup.includes(".eq('profile_id', profile.id)"))
})

test('host member management cannot change protected circle authority or chef permissions', () => {
  const src = readFile('lib/hub/group-actions.ts')
  const policy = readFile('lib/hub/circle-access-policy.ts')
  const updateMemberRole = functionBody(src, 'updateMemberRole')
  const updateMemberPermissions = functionBody(src, 'updateMemberPermissions')
  const removeMember = functionBody(src, 'removeMember')

  assert.ok(
    policy.includes(
      "const HOST_MANAGEABLE_MEMBER_ROLES = new Set<CircleActorRole>(['member', 'viewer', 'delegate'])"
    )
  )
  assert.ok(
    policy.includes("const PROTECTED_MEMBER_ROLES = new Set<CircleActorRole>(['owner', 'chef'])")
  )
  assert.ok(
    policy.includes("if (actorRole === 'host') return HOST_MANAGEABLE_MEMBER_ROLES.has(targetRole)")
  )
  assert.ok(
    policy.includes("if (actorRole === 'host') return HOST_MANAGEABLE_MEMBER_ROLES.has(nextRole)")
  )

  assert.ok(updateMemberRole.includes('canAssignCircleMemberRole('))
  assert.ok(updateMemberRole.includes('caller.actor'))
  assert.ok(updateMemberRole.includes('caller.context'))
  assert.ok(updateMemberRole.includes('target.role'))
  assert.ok(updateMemberRole.includes('input.newRole'))

  assert.ok(updateMemberPermissions.includes('canManageCircleMember('))
  assert.ok(updateMemberPermissions.includes('caller.actor'))
  assert.ok(updateMemberPermissions.includes('caller.context'))
  assert.ok(updateMemberPermissions.includes('target.role'))

  assert.ok(removeMember.includes('canManageCircleMember('))
})

test('sole host cannot leave when no owner admin or other host remains', () => {
  const src = readFile('lib/hub/group-actions.ts')
  const leaveGroup = functionBody(src, 'leaveGroup')

  assert.ok(leaveGroup.includes("membership.role === 'owner' || membership.role === 'host'"))
  assert.ok(leaveGroup.includes("['owner', 'admin', 'host']"))
  assert.ok(leaveGroup.includes('You are the only host'))
})
