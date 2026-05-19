import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CHEF_PORTAL_CONTRAST_ROLE_MAP,
  STATUS_BADGE_CONTRAST_CLASSES,
  contrastRatio,
  parseCssColor,
  resolveReadableForeground,
} from '../../lib/ui/contrast-contract'

test('chef portal contrast role map covers required roles', () => {
  for (const role of [
    'activeSurface',
    'activeForeground',
    'statusInfo',
    'statusWarning',
    'statusSuccess',
    'statusDanger',
    'mutedFunctional',
    'disabledFunctional',
    'ctaForeground',
  ] as const) {
    assert.ok(CHEF_PORTAL_CONTRAST_ROLE_MAP[role], `missing ${role}`)
  }
})

test('status badge classes use explicit light and dark foreground contracts', () => {
  for (const [tone, classes] of Object.entries(STATUS_BADGE_CONTRAST_CLASSES)) {
    assert.match(classes, /text-/, `${tone} missing foreground`)
    assert.match(classes, /bg-/, `${tone} missing background`)
    assert.match(classes, /dark:/, `${tone} missing dark contract`)
  }
})

test('foreground resolver chooses readable text for dynamic colors', () => {
  assert.equal(resolveReadableForeground('#ffffff').color, '#1c1917')
  assert.equal(resolveReadableForeground('#111111').color, '#ffffff')
  assert.equal(resolveReadableForeground('rgb(237, 168, 107)').passes, true)
})

test('contrast ratio follows WCAG ordering', () => {
  const white = parseCssColor('#fff')
  const black = parseCssColor('#000')
  const gray = parseCssColor('#777')
  assert.ok(white && black && gray)
  assert.ok(contrastRatio(white, black) > contrastRatio(white, gray))
})

test('rail renderers do not print raw icon keys', () => {
  for (const file of [
    'components/rail/rail-item-row.tsx',
    'components/rail/rail-intel-card.tsx',
    'components/discovery/universal-rail.tsx',
  ]) {
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(source, />\s*\{item\.icon\}\s*</, `${file} renders raw item.icon`)
  }
})
