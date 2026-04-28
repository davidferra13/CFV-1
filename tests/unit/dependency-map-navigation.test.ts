import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPrimaryShortcutOptions, navGroups } from '@/components/navigation/nav-config'

function collectNavGroupHrefs() {
  const hrefs: string[] = []

  for (const group of navGroups) {
    for (const item of group.items) {
      hrefs.push(item.href)
      for (const child of item.children ?? []) {
        hrefs.push(child.href)
      }
    }
  }

  return hrefs
}

test('dependency map is discoverable from chef navigation', () => {
  assert.equal(collectNavGroupHrefs().includes('/dependencies'), true)
  assert.equal(
    getPrimaryShortcutOptions().some((item) => item.href === '/dependencies'),
    true
  )
})
