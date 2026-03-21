/**
 * Unit tests for Module Definitions and Visibility Logic
 *
 * Tests the progressive disclosure module system from lib/billing/modules.ts.
 * This is P2 — wrong module visibility = users can't find features or see
 * features they shouldn't.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MODULES,
  DEFAULT_ENABLED_MODULES,
  ALL_MODULE_SLUGS,
  getModule,
  getVisibleNavGroupIds,
} from '../../lib/billing/modules.js'

// ─────────────────────────────────────────────────────────────────────────────
// MODULE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

describe('Module Definitions — registry integrity', () => {
  it('has at least 5 modules defined', () => {
    assert.ok(MODULES.length >= 5, `Expected 5+ modules, got ${MODULES.length}`)
  })

  it('every module has required fields', () => {
    for (const mod of MODULES) {
      assert.ok(mod.slug, `Module missing slug`)
      assert.ok(mod.label, `Module ${mod.slug} missing label`)
      assert.ok(mod.description, `Module ${mod.slug} missing description`)
      assert.ok(mod.tier === 'free' || mod.tier === 'pro', `Module ${mod.slug} has invalid tier`)
      assert.equal(
        typeof mod.defaultEnabled,
        'boolean',
        `Module ${mod.slug} defaultEnabled not boolean`
      )
      assert.equal(
        typeof mod.alwaysVisible,
        'boolean',
        `Module ${mod.slug} alwaysVisible not boolean`
      )
    }
  })

  it('slugs are unique', () => {
    const slugs = MODULES.map((m) => m.slug)
    const unique = new Set(slugs)
    assert.equal(unique.size, slugs.length, 'Duplicate module slugs found')
  })

  it('dashboard module exists and is always-visible', () => {
    const dashboard = getModule('dashboard')
    assert.ok(dashboard, 'Dashboard module must exist')
    assert.equal(dashboard!.tier, 'free')
    assert.equal(dashboard!.alwaysVisible, true)
    assert.equal(dashboard!.defaultEnabled, true)
  })
})

describe('Module Definitions — tier assignment', () => {
  it('free modules include core business features', () => {
    const freeSlugs = MODULES.filter((m) => m.tier === 'free').map((m) => m.slug)
    assert.ok(freeSlugs.includes('dashboard'), 'Dashboard must be free')
    assert.ok(freeSlugs.includes('events'), 'Events must be free')
    assert.ok(freeSlugs.includes('clients'), 'Clients must be free')
    assert.ok(freeSlugs.includes('finance'), 'Finance must be free')
    assert.ok(freeSlugs.includes('pipeline'), 'Pipeline must be free')
    assert.ok(freeSlugs.includes('culinary'), 'Culinary must be free')
  })

  it('all modules are free tier (no Pro gating)', () => {
    const proModules = MODULES.filter((m) => m.tier === 'pro')
    assert.equal(proModules.length, 0, 'All modules should be free tier - no Pro gating')
    const freeModules = MODULES.filter((m) => m.tier === 'free')
    assert.equal(freeModules.length, MODULES.length, 'Every module should be free')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT ENABLED MODULES
// ─────────────────────────────────────────────────────────────────────────────

describe('DEFAULT_ENABLED_MODULES', () => {
  it('includes dashboard', () => {
    assert.ok(DEFAULT_ENABLED_MODULES.includes('dashboard'))
  })

  it('includes core free modules', () => {
    const expected = ['dashboard', 'pipeline', 'events', 'culinary', 'clients', 'finance']
    for (const slug of expected) {
      assert.ok(DEFAULT_ENABLED_MODULES.includes(slug), `${slug} should be default-enabled`)
    }
  })

  it('all default-enabled modules are free tier', () => {
    for (const slug of DEFAULT_ENABLED_MODULES) {
      const mod = getModule(slug)
      assert.ok(mod, `Default-enabled module ${slug} must exist`)
      assert.equal(mod!.tier, 'free', `Default-enabled module ${slug} should be free`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ALL_MODULE_SLUGS
// ─────────────────────────────────────────────────────────────────────────────

describe('ALL_MODULE_SLUGS', () => {
  it('has same count as MODULES', () => {
    assert.equal(ALL_MODULE_SLUGS.length, MODULES.length)
  })

  it('contains every module slug', () => {
    for (const mod of MODULES) {
      assert.ok(ALL_MODULE_SLUGS.includes(mod.slug), `Missing slug: ${mod.slug}`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getModule()
// ─────────────────────────────────────────────────────────────────────────────

describe('getModule', () => {
  it('returns module by slug', () => {
    const mod = getModule('events')
    assert.ok(mod)
    assert.equal(mod!.slug, 'events')
    assert.equal(mod!.tier, 'free')
  })

  it('returns undefined for unknown slug', () => {
    assert.equal(getModule('nonexistent'), undefined)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getVisibleNavGroupIds()
// ─────────────────────────────────────────────────────────────────────────────

describe('getVisibleNavGroupIds', () => {
  it('returns nav groups for enabled modules', () => {
    const enabled = ['dashboard', 'events', 'clients']
    const visible = getVisibleNavGroupIds(enabled, 'free')
    assert.ok(visible.includes('events'))
    assert.ok(visible.includes('clients'))
  })

  it('does NOT include disabled modules', () => {
    const enabled = ['dashboard'] // only dashboard enabled
    const visible = getVisibleNavGroupIds(enabled, 'free')
    assert.ok(!visible.includes('events'))
    assert.ok(!visible.includes('pipeline'))
  })

  it('all modules with navGroupId show when enabled (all free)', () => {
    const moduleWithNav = MODULES.find((m) => m.navGroupId && m.slug !== 'dashboard')
    if (moduleWithNav) {
      const enabled = ['dashboard', moduleWithNav.slug]
      const visible = getVisibleNavGroupIds(enabled, 'free')
      assert.ok(
        visible.includes(moduleWithNav.navGroupId!),
        `Module ${moduleWithNav.slug} should be visible when enabled`
      )
    }
  })

  it('empty enabled list returns no non-always-visible groups', () => {
    const visible = getVisibleNavGroupIds([], 'free')
    // Only always-visible modules with navGroupId would show
    const alwaysVisibleWithNav = MODULES.filter((m) => m.alwaysVisible && m.navGroupId)
    assert.equal(visible.length, alwaysVisibleWithNav.length)
  })

  it('all modules enabled returns all nav group IDs', () => {
    const visible = getVisibleNavGroupIds(ALL_MODULE_SLUGS, 'pro')
    const allNavGroups = MODULES.filter((m) => m.navGroupId).map((m) => m.navGroupId!)
    for (const navGroupId of allNavGroups) {
      assert.ok(visible.includes(navGroupId), `Missing nav group: ${navGroupId}`)
    }
  })
})
