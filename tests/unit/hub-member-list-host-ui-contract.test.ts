import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const ROOT = path.resolve(__dirname, '../..')

function readMemberList(): string {
  return fs.readFileSync(path.join(ROOT, 'components/hub/hub-member-list.tsx'), 'utf-8')
}

test('member list labels host and delegate roles', () => {
  const src = readMemberList()

  assert.match(src, /host:\s*\{\s*label:\s*'Host'/)
  assert.match(src, /delegate:\s*\{\s*label:\s*'Delegate'/)
})

test('member list gives hosts only ordinary member management controls', () => {
  const src = readMemberList()

  assert.match(
    src,
    /const HOST_MANAGEABLE_ROLES = new Set<HubMemberRole>\(\['member', 'viewer', 'delegate'\]\)/
  )
  assert.match(src, /if \(role === 'host'\) return \['member', 'viewer', 'delegate'\]/)
  assert.match(src, /if \(viewerRole === 'host'\) return HOST_MANAGEABLE_ROLES\.has\(targetRole\)/)
})

test('member list does not offer unsupported guest role assignment', () => {
  const src = readMemberList()
  const assignableRolesStart = src.indexOf('const ASSIGNABLE_ROLES')
  const assignableRolesEnd = src.indexOf(']', assignableRolesStart)
  const assignableRolesBlock = src.slice(assignableRolesStart, assignableRolesEnd)

  assert.ok(assignableRolesStart >= 0, 'ASSIGNABLE_ROLES must exist')
  assert.doesNotMatch(assignableRolesBlock, /guest/)
})

test('member list keeps client hosts on the client leave redirect', () => {
  const src = readMemberList()

  assert.match(src, /currentViewer\?\.role === 'chef' \|\| currentViewer\?\.role === 'owner'/)
  assert.doesNotMatch(src, /currentViewer\?\.role === 'host'.*\? '\/circles'/)
})
