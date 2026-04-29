import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const pageSource = readFileSync(
  join(process.cwd(), 'app/(admin)/admin/launch-readiness/page.tsx'),
  'utf8'
)
const adminNavSource = readFileSync(
  join(process.cwd(), 'components/navigation/admin-nav-config.ts'),
  'utf8'
)
const chefNavSource = readFileSync(
  join(process.cwd(), 'components/navigation/nav-config.tsx'),
  'utf8'
)

test('launch readiness page is protected by server-side admin auth', () => {
  assert.match(pageSource, /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/)
  assert.match(pageSource, /await\s+requireAdmin\(\)/)
  assert.doesNotMatch(pageSource, /requireChef/)
  assert.doesNotMatch(pageSource, /^['"]use client['"]/m)
})

test('launch readiness is visible only in admin navigation', () => {
  assert.match(adminNavSource, /href:\s*['"]\/admin\/launch-readiness['"]/)
  assert.doesNotMatch(chefNavSource, /\/admin\/launch-readiness/)
})
