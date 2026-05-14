import test from 'node:test'
import assert from 'node:assert/strict'

import {
  auditDiscoveryAccessibilityControls,
  buildDiscoveryLoadingContract,
  evaluateDiscoveryImageQuality,
  evaluateDiscoveryPerformanceBudget,
} from '@/lib/discovery/quality-gates'
import {
  buildDiscoveryMobileBottomSheetContract,
  validateDiscoveryMobileBottomSheetContract,
} from '@/lib/discovery/mobile-control-contract'

test('accessibility audit catches inert, unnamed, keyboard, focus, overflow, and motion risks', () => {
  const report = auditDiscoveryAccessibilityControls([
    {
      id: 'shuffle',
      role: 'button',
      ariaLabel: 'Shuffle discovery rail',
      keyboardReachable: true,
      focusVisible: true,
      reducedMotionSafe: true,
      textOverflowSafe: true,
      activates: true,
    },
    {
      id: 'bad-icon',
      role: 'button',
      keyboardReachable: false,
      focusVisible: false,
      reducedMotionSafe: false,
      textOverflowSafe: false,
      activates: false,
    },
  ])

  assert.equal(report.passed, false)
  assert.ok(report.violations.some((violation) => violation.rule === 'missing-accessible-name'))
  assert.ok(report.violations.some((violation) => violation.rule === 'not-keyboard-reachable'))
  assert.ok(report.violations.some((violation) => violation.rule === 'inert-control'))
})

test('performance budget reports hard discovery limits for render, hydration, images, and mobile', () => {
  const pass = evaluateDiscoveryPerformanceBudget({
    renderTimeMs: 90,
    hydratedCardCount: 40,
    totalCardCount: 90,
    imageBytes: 700_000,
    clientJsKb: 60,
    longestTaskMs: 32,
    mobileFps: 55,
  })
  const fail = evaluateDiscoveryPerformanceBudget({
    renderTimeMs: 180,
    hydratedCardCount: 100,
    totalCardCount: 190,
    imageBytes: 1_800_000,
    clientJsKb: 120,
    longestTaskMs: 80,
    mobileFps: 42,
  })

  assert.equal(pass.passed, true)
  assert.equal(fail.passed, false)
  assert.ok(fail.violations.some((violation) => violation.id === 'mobileFps'))
  assert.ok(fail.violations.some((violation) => violation.id === 'hydratedCardCount'))
})

test('image quality gate flags missing, blurry, cropped, duplicate, and low-confidence visuals', () => {
  const good = evaluateDiscoveryImageQuality({
    id: 'good',
    src: 'https://img.test/chef.jpg',
    width: 960,
    height: 640,
    sharpnessScore: 0.8,
    confidence: 0.9,
    focalCoverage: 0.8,
  })
  const bad = evaluateDiscoveryImageQuality({
    id: 'bad',
    src: null,
    width: 240,
    height: 900,
    sharpnessScore: 0.2,
    confidence: 0.4,
    duplicateOf: 'other',
    focalCoverage: 0.3,
  })

  assert.equal(good.passed, true)
  assert.equal(bad.passed, false)
  assert.ok(bad.violations.some((violation) => violation.rule === 'missing-image-src'))
  assert.ok(bad.violations.some((violation) => violation.rule === 'blurry-image'))
  assert.ok(bad.violations.some((violation) => violation.rule.startsWith('duplicate-of')))
})

test('loading and mobile bottom-sheet contracts reserve stable discovery layouts', () => {
  const loading = buildDiscoveryLoadingContract({
    surface: 'homepage-discovery-rail',
    expectedItems: 12,
    viewportWidth: 390,
  })
  const sheet = buildDiscoveryMobileBottomSheetContract({
    controls: [
      { id: 'filters', kind: 'filter', label: 'Filters', priority: 1 },
      { id: 'shuffle', kind: 'shuffle', label: 'Shuffle', priority: 3 },
      { id: 'favorites', kind: 'favorites', label: 'Favorites', priority: 2 },
      { id: 'filters', kind: 'filter', label: 'Duplicate filters', priority: 4 },
    ],
  })
  const validation = validateDiscoveryMobileBottomSheetContract(sheet)

  assert.equal(loading.reservesAspectRatio, true)
  assert.equal(loading.ariaBusy, true)
  assert.equal(loading.layoutShiftRisk, 'low')
  assert.deepEqual(
    sheet.controls.map((control) => control.id),
    ['filters', 'favorites', 'shuffle']
  )
  assert.equal(validation.passed, true)
})
