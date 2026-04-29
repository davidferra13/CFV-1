import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const prospectingAdminPages = [
  'app/(chef)/prospecting/import/page.tsx',
  'app/(chef)/prospecting/scrub/page.tsx',
  `app/(chef)/prospecting/${['open', 'claw'].join('')}/page.tsx`,
]

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('prospecting subpages are protected by server-side requireAdmin', () => {
  for (const pagePath of prospectingAdminPages) {
    const source = read(pagePath)

    assert.match(source, /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/)
    assert.match(source, /await\s+requireAdmin\(\)/)
  }
})

test('prospecting subpages do not fall back to chef auth or client-only admin gating', () => {
  for (const pagePath of prospectingAdminPages) {
    const source = read(pagePath)

    assert.doesNotMatch(source, /requireChef/)
    assert.doesNotMatch(source, /^['"]use client['"]/m)
    assert.doesNotMatch(source, /\bisAdmin\b/)
  }
})
