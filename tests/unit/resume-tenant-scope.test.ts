import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('resume menu dish count query is tenant scoped', () => {
  const source = read('lib/activity/resume.ts')

  assert.match(
    source,
    /from\('dishes'\)\.select\('menu_id'\)\.eq\('tenant_id', tenantId\)\.in\('menu_id', menuIds\)/
  )
})
