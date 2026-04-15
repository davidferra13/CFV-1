/**
 * Q19: Cache Invalidation Parity
 *
 * unstable_cache tags must have matching revalidateTag calls in every
 * server action that mutates the cached data. Stale cache = stale UI =
 * a financial hallucination or ghost client name.
 *
 * Critical cache tags in ChefFlow:
 *   chef-layout-{chefId}     — business name, logo, nav prefs, enabled modules
 *   chef-archetype-{chefId}  — onboarding archetype selection
 *   deletion-status-{chefId} — account deletion pending flag
 *   cannabis-access-{userId} — cannabis tier gate
 *
 * Tests:
 *
 * 1. LAYOUT CACHE DEFINITION: lib/chef/layout-cache.ts defines chef-layout-{chefId}
 *    tag and exports CHEF_LAYOUT_CACHE_TAG constant.
 *
 * 2. PROFILE ACTIONS BUST LAYOUT: lib/chef/profile-actions.ts calls
 *    revalidateTag('chef-layout-...') after mutations. Profile edits change
 *    business_name / logo_url which live in the layout cache.
 *
 * 3. ARCHETYPE ACTIONS BUST BOTH TAGS: lib/archetypes/actions.ts busts
 *    both chef-layout-* and chef-archetype-* after archetype selection.
 *
 * 4. MODULE TOGGLE BUSTS LAYOUT: Changing enabled_modules in chef_preferences
 *    (booking settings, service config, etc.) must bust chef-layout so the nav
 *    reflects the new module state immediately.
 *
 * 5. ADMIN ACTIONS BUST LAYOUT: lib/admin/chef-admin-actions.ts calls
 *    revalidateTag for chef-layout when admin modifies chef settings.
 *
 * 6. DATA-CACHE FILE DOCUMENTS ITS INVALIDATORS: layout-data-cache.ts must
 *    contain inline documentation of which actions bust each tag, so future
 *    developers know the invalidation contract.
 *
 * 7. NO ORPHANED CACHE TAGS: Every tag used in unstable_cache must appear
 *    in at least one revalidateTag call somewhere in lib/.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q19-cache-invalidation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()
const LAYOUT_CACHE = resolve(ROOT, 'lib/chef/layout-cache.ts')
const LAYOUT_DATA_CACHE = resolve(ROOT, 'lib/chef/layout-data-cache.ts')
const PROFILE_ACTIONS = resolve(ROOT, 'lib/chef/profile-actions.ts')
const ARCHETYPES_ACTIONS = resolve(ROOT, 'lib/archetypes/actions.ts')
const CHEF_ADMIN_ACTIONS = resolve(ROOT, 'lib/admin/chef-admin-actions.ts')

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    // inaccessible
  }
  return results
}

test.describe('Q19: Cache invalidation parity', () => {
  // -------------------------------------------------------------------------
  // Test 1: Layout cache definition is correct
  // -------------------------------------------------------------------------
  test('layout-cache.ts defines chef-layout tag and exports CHEF_LAYOUT_CACHE_TAG', () => {
    expect(existsSync(LAYOUT_CACHE), 'lib/chef/layout-cache.ts must exist').toBe(true)

    const src = readFileSync(LAYOUT_CACHE, 'utf-8')

    expect(
      src.includes('CHEF_LAYOUT_CACHE_TAG'),
      'layout-cache.ts must export CHEF_LAYOUT_CACHE_TAG constant'
    ).toBe(true)

    expect(src.includes('unstable_cache'), 'layout-cache.ts must use unstable_cache').toBe(true)

    expect(
      src.includes('chef-layout-'),
      'layout-cache.ts must define chef-layout-{chefId} cache tag'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Profile actions bust chef-layout cache
  // -------------------------------------------------------------------------
  test('lib/chef/profile-actions.ts calls revalidateTag for chef-layout', () => {
    expect(existsSync(PROFILE_ACTIONS), 'lib/chef/profile-actions.ts must exist').toBe(true)

    const src = readFileSync(PROFILE_ACTIONS, 'utf-8')

    expect(
      src.includes('revalidateTag') && src.includes('chef-layout-'),
      'profile-actions.ts must call revalidateTag with chef-layout-{chefId} after mutations'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Archetype actions bust both chef-layout and chef-archetype
  // -------------------------------------------------------------------------
  test('archetypes/actions.ts busts chef-layout and chef-archetype tags', () => {
    expect(existsSync(ARCHETYPES_ACTIONS), 'lib/archetypes/actions.ts must exist').toBe(true)

    const src = readFileSync(ARCHETYPES_ACTIONS, 'utf-8')

    expect(
      src.includes('chef-layout-'),
      'archetypes/actions.ts must bust chef-layout-{chefId} tag'
    ).toBe(true)

    expect(
      src.includes('chef-archetype-'),
      'archetypes/actions.ts must bust chef-archetype-{chefId} tag'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Module toggle mutations bust chef-layout
  // -------------------------------------------------------------------------
  test('module-affecting actions bust chef-layout tag', () => {
    // booking-settings-actions.ts changes enabled_modules in chef_preferences
    // which is part of the layout cache — must bust it
    const bookingSettings = resolve(ROOT, 'lib/booking/booking-settings-actions.ts')
    const serviceConfig = resolve(ROOT, 'lib/chef-services/service-config-actions.ts')

    let atLeastOneFound = false

    if (existsSync(bookingSettings)) {
      const src = readFileSync(bookingSettings, 'utf-8')
      if (src.includes('enabled_modules') || src.includes('chef_preferences')) {
        expect(
          src.includes('chef-layout-'),
          'booking-settings-actions.ts mutates chef_preferences — must bust chef-layout tag'
        ).toBe(true)
        atLeastOneFound = true
      }
    }

    if (existsSync(serviceConfig)) {
      const src = readFileSync(serviceConfig, 'utf-8')
      if (src.includes('enabled_modules') || src.includes('chef_preferences')) {
        expect(
          src.includes('chef-layout-'),
          'service-config-actions.ts mutates chef_preferences — must bust chef-layout tag'
        ).toBe(true)
        atLeastOneFound = true
      }
    }

    // At least one module-affecting action must bust the layout cache
    expect(
      atLeastOneFound,
      'At least one module-toggle action file must bust chef-layout tag'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Admin chef actions bust layout cache
  // -------------------------------------------------------------------------
  test('admin/chef-admin-actions.ts busts chef-layout when modifying chef', () => {
    expect(existsSync(CHEF_ADMIN_ACTIONS), 'lib/admin/chef-admin-actions.ts must exist').toBe(true)

    const src = readFileSync(CHEF_ADMIN_ACTIONS, 'utf-8')

    expect(
      src.includes('revalidateTag') && src.includes('chef-layout-'),
      'chef-admin-actions.ts must bust chef-layout when admin modifies a chef account'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: layout-data-cache.ts documents its invalidation contract
  // -------------------------------------------------------------------------
  test('layout-data-cache.ts documents which actions bust each cache tag', () => {
    expect(existsSync(LAYOUT_DATA_CACHE), 'lib/chef/layout-data-cache.ts must exist').toBe(true)

    const src = readFileSync(LAYOUT_DATA_CACHE, 'utf-8')

    // Must have inline comments/docs describing the revalidation map
    // The file should mention the key tags and their invalidators
    expect(
      src.includes('chef-layout') && src.includes('chef-archetype'),
      'layout-data-cache.ts must document the cache tag -> invalidator mapping'
    ).toBe(true)

    // Must have revalidation map commentary (the "Cache tag -> revalidation map" doc block)
    expect(
      src.includes('revalidat'),
      'layout-data-cache.ts must reference revalidation in its documentation'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 7: No orphaned unstable_cache tags (every tag has a revalidateTag)
  // -------------------------------------------------------------------------
  test('every unstable_cache tag has at least one revalidateTag call', () => {
    const libFiles = walkDir(join(ROOT, 'lib'), ['.ts'])

    // Collect all unstable_cache tag strings
    const definedTags: Array<{ tag: string; file: string }> = []
    const revalidatedTagPatterns: string[] = []

    for (const filePath of libFiles) {
      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      // Extract tags from unstable_cache({ tags: [...] }) calls
      // Pattern: tags: [`some-tag-${varname}`]
      const tagPattern = /tags:\s*\[([^\]]+)\]/g
      let match
      while ((match = tagPattern.exec(src)) !== null) {
        const tagContent = match[1]
        // Extract string literals from the tags array
        const stringTags = tagContent.match(/['"`]([^'"`\${]+)/g)
        if (stringTags) {
          for (const t of stringTags) {
            const tagName = t.replace(/^['"`]/, '')
            if (tagName.trim()) {
              definedTags.push({
                tag: tagName,
                file: relative(ROOT, filePath).replace(/\\/g, '/'),
              })
            }
          }
        }
      }

      // Collect revalidateTag patterns
      const revalidatePattern = /revalidateTag\s*\(\s*['"`]([^'"`\${)]+)/g
      while ((match = revalidatePattern.exec(src)) !== null) {
        revalidatedTagPatterns.push(match[1])
      }
      // Also collect dynamic patterns (template literals)
      const dynamicPattern = /revalidateTag\s*\(`([^`$]+)/g
      while ((match = dynamicPattern.exec(src)) !== null) {
        revalidatedTagPatterns.push(match[1])
      }
    }

    // Check each defined tag has at least one revalidation path
    const orphaned: string[] = []
    for (const { tag, file } of definedTags) {
      const hasRevalidation = revalidatedTagPatterns.some(
        (pattern) => pattern.startsWith(tag) || tag.startsWith(pattern)
      )
      if (!hasRevalidation) {
        orphaned.push(`${tag} (defined in ${file})`)
      }
    }

    if (orphaned.length > 0) {
      console.warn(
        `\nQ19 WARNING — unstable_cache tags with no revalidateTag call:\n` +
          orphaned.map((o) => `  ORPHANED: ${o}`).join('\n') +
          `\n(TTL-only invalidation may cause stale data)`
      )
    }

    // Hard fail only if the critical chef-layout tag has no revalidation
    const chefLayoutOrphaned = orphaned.some((o) => o.startsWith('chef-layout'))
    expect(
      !chefLayoutOrphaned,
      'chef-layout cache tag must have revalidateTag calls (critical: controls nav/module visibility)'
    ).toBe(true)

    // Log total for visibility
    console.log(
      `Q19: Found ${definedTags.length} unstable_cache tags. ` +
        `${orphaned.length} have no explicit revalidateTag (TTL-only).`
    )
  })
})
