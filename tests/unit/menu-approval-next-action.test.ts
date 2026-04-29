import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('app/(chef)/events/[id]/menu-approval/page.tsx', 'utf8')

test('menu approval empty state links chefs to menu next actions', () => {
  assert.match(source, /No menu is attached to this event yet/)
  assert.match(source, /href=\{`\/events\/\$\{params\.id\}\?tab=money`\}/)
  assert.match(source, /Choose Existing Menu/)
  assert.match(source, /href="\/menus\/new"/)
  assert.match(source, /Build New Menu/)
  assert.match(source, /href=\{`\/events\/\$\{params\.id\}\/edit`\}/)
  assert.match(source, /Edit Event/)
})
