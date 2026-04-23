import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

function findLayouts(relativeDir: string): string[] {
  const absoluteDir = path.join(process.cwd(), relativeDir)
  const layouts: string[] = []

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const childRelativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      layouts.push(...findLayouts(childRelativePath))
      continue
    }
    if (entry.isFile() && entry.name === 'layout.tsx') {
      layouts.push(childRelativePath.replace(/\\/g, '/'))
    }
  }

  return layouts
}

const ROUTE_LAYOUT_ALLOWLIST = new Set<string>([])

test('chef shell background stays independent from public profile theme fields', () => {
  const chefLayout = read('app/(chef)/layout.tsx')

  assert.doesNotMatch(chefLayout, /portal_background_color/)
  assert.doesNotMatch(chefLayout, /portal_background_image_url/)
  assert.match(chefLayout, /bg-\[var\(--surface-0\)\]/)
})

test('expanded desktop chef nav does not hide grouped sections only when focus mode is on', () => {
  const chefNav = read('components/navigation/chef-nav.tsx')

  assert.doesNotMatch(chefNav, /!\s*focusMode\s*&&\s*filteredGroupEntries\.length > 0/)
  assert.match(chefNav, /filteredGroupEntries\.length > 0\s*&&\s*\(/)
})

test('social route header stays page-local instead of becoming a sticky shell bar', () => {
  const socialLayout = read('app/(chef)/social/layout.tsx')

  assert.doesNotMatch(socialLayout, /sticky top-0/)
})

test('navigation settings keep shell diagnostics and reset reachable from settings', () => {
  const navigationSettingsPage = read('app/(chef)/settings/navigation/page.tsx')
  const diagnosticsCard = read('components/settings/shell-diagnostics-card.tsx')

  assert.match(navigationSettingsPage, /ShellDiagnosticsCard/)
  assert.match(diagnosticsCard, /Shell Diagnostics/)
  assert.match(diagnosticsCard, /Reset Shell State/)
})

test('route-level chef layouts keep shell bars and outer shell backgrounds behind an allowlist', () => {
  const routeLayouts = findLayouts('app/(chef)').filter(
    (relativePath) => relativePath !== 'app/(chef)/layout.tsx'
  )

  assert.ok(routeLayouts.length > 0, 'Expected at least one nested chef layout to validate')

  for (const relativePath of routeLayouts) {
    if (ROUTE_LAYOUT_ALLOWLIST.has(relativePath)) continue

    const layoutSource = read(relativePath)
    assert.doesNotMatch(
      layoutSource,
      /\b(?:sticky|fixed)\s+top-0\b/,
      `${relativePath} adds top-pinned shell chrome without allowlisting`
    )
    assert.doesNotMatch(
      layoutSource,
      /portal_background_color|portal_background_image_url|bg-\[var\(--surface-0\)\]/,
      `${relativePath} overrides the outer chef shell background without allowlisting`
    )
  }
})
