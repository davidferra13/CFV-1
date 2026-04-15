/**
 * Q83: unstable_cache Tag Pairing Verification
 *
 * For every unstable_cache in the codebase, there must be matching
 * revalidateTag calls in EVERY server action that mutates the cached data.
 *
 * revalidatePath does NOT bust unstable_cache tags. Only revalidateTag does.
 * Missing pairings = stale data served indefinitely after mutations.
 *
 * Known cache tags (from lib/chef/layout-data-cache.ts and layout-cache.ts):
 *   - cannabis-access-{authUserId}
 *   - chef-archetype-{chefId}
 *   - deletion-status-{chefId}
 *   - is-admin-{authUserId}
 *   - chef-layout-{chefId}
 *   - survey-{token} (from lib/beta-survey/survey-cache.ts)
 *   + any others found by scan
 *
 * What we check:
 *   1. Every unstable_cache tag has at least one revalidateTag caller
 *   2. The revalidateTag calls use the same tag format string
 *   3. No cache tag is orphaned (created but never invalidated)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q83-unstable-cache-tag-pairing.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.'))
        continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}

/**
 * Extract cache tag patterns from unstable_cache calls.
 * Returns the tag string template (e.g., "chef-layout-${chefId}" -> "chef-layout-")
 */
function extractCacheTags(
  src: string,
  filePath: string
): Array<{ tag: string; prefix: string; line: number }> {
  const tags: Array<{ tag: string; prefix: string; line: number }> = []

  // Pattern: tags: [`tag-name-${var}`] or tags: ['static-tag']
  const tagPattern = /tags:\s*\[\s*[`'"]([\w-]+)/g
  let match
  while ((match = tagPattern.exec(src)) !== null) {
    const tag = match[1]
    const line = src.slice(0, match.index).split('\n').length
    tags.push({ tag: match[0], prefix: tag, line })
  }

  return tags
}

/**
 * Check if a file contains revalidateTag calls for a given tag prefix.
 */
function hasRevalidateForTag(src: string, tagPrefix: string): boolean {
  // revalidateTag(`chef-layout-${chefId}`) or revalidateTag('chef-layout-' + chefId)
  return (
    src.includes(`revalidateTag(\`${tagPrefix}`) ||
    src.includes(`revalidateTag('${tagPrefix}`) ||
    src.includes(`revalidateTag("${tagPrefix}`)
  )
}

test.describe('Q83: unstable_cache tag pairing', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Every unstable_cache tag has at least one revalidateTag caller
  // ---------------------------------------------------------------------------
  test('every cache tag has matching revalidateTag calls', () => {
    // Step 1: Find all files with unstable_cache
    const libDir = resolve(ROOT, 'lib')
    const appDir = resolve(ROOT, 'app')
    const allFiles = [...walkDir(libDir, ['.ts', '.tsx']), ...walkDir(appDir, ['.ts', '.tsx'])]

    const cacheFiles = allFiles.filter((f) => {
      try {
        return readFileSync(f, 'utf-8').includes('unstable_cache')
      } catch {
        return false
      }
    })

    expect(cacheFiles.length).toBeGreaterThan(0)

    // Step 2: Extract all cache tag prefixes
    const cacheTags: Array<{ prefix: string; file: string; line: number }> = []
    for (const file of cacheFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')
      const tags = extractCacheTags(src, relPath)
      for (const tag of tags) {
        cacheTags.push({ prefix: tag.prefix, file: relPath, line: tag.line })
      }
    }

    expect(cacheTags.length).toBeGreaterThan(0)

    // Step 3: For each cache tag, find at least one file that calls revalidateTag with it
    const orphanedTags: string[] = []
    const TTL_ONLY_TAGS = ['is-admin'] // Documented: no server action, TTL-only

    for (const cacheTag of cacheTags) {
      // Skip tags documented as TTL-only
      if (TTL_ONLY_TAGS.some((t) => cacheTag.prefix.startsWith(t))) continue

      let hasRevalidation = false
      for (const file of allFiles) {
        try {
          const src = readFileSync(file, 'utf-8')
          if (hasRevalidateForTag(src, cacheTag.prefix)) {
            hasRevalidation = true
            break
          }
        } catch {
          /* skip */
        }
      }

      if (!hasRevalidation) {
        orphanedTags.push(
          `${cacheTag.file}:${cacheTag.line} tag "${cacheTag.prefix}" has NO revalidateTag caller`
        )
      }
    }

    if (orphanedTags.length > 0) {
      console.warn(
        `\nQ83 VIOLATIONS - Orphaned cache tags (never invalidated):\n` +
          orphanedTags.map((v) => `  STALE CACHE: ${v}`).join('\n')
      )
    }

    expect(
      orphanedTags,
      `Cache tags created by unstable_cache but never invalidated by revalidateTag.\n` +
        `Mutations to this data will serve stale cache indefinitely:\n` +
        orphanedTags.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Documented revalidation map matches actual code
  // ---------------------------------------------------------------------------
  test('layout-data-cache.ts documented revalidation map is accurate', () => {
    const cacheFile = resolve(ROOT, 'lib/chef/layout-data-cache.ts')
    if (!existsSync(cacheFile)) return

    const src = readFileSync(cacheFile, 'utf-8')

    // Documented revalidation targets from the file header comments:
    const documentedPairings: Array<{ tag: string; files: string[] }> = [
      {
        tag: 'cannabis-access-',
        files: ['lib/cannabis/invitation-actions.ts'],
      },
      {
        tag: 'chef-archetype-',
        files: ['lib/archetypes/actions.ts'],
      },
      {
        tag: 'deletion-status-',
        files: ['lib/compliance/account-deletion-actions.ts'],
      },
      {
        tag: 'chef-layout-',
        files: ['lib/archetypes/actions.ts', 'lib/profile/actions.ts'],
      },
    ]

    const mismatches: string[] = []

    for (const pairing of documentedPairings) {
      for (const targetFile of pairing.files) {
        const fullPath = resolve(ROOT, targetFile)
        if (!existsSync(fullPath)) {
          mismatches.push(
            `${targetFile} documented as revalidating "${pairing.tag}" but file does not exist`
          )
          continue
        }

        const targetSrc = readFileSync(fullPath, 'utf-8')
        if (!hasRevalidateForTag(targetSrc, pairing.tag)) {
          mismatches.push(
            `${targetFile} documented as revalidating "${pairing.tag}" but no revalidateTag call found`
          )
        }
      }
    }

    expect(
      mismatches,
      `Documented cache revalidation map in layout-data-cache.ts is out of date:\n` +
        mismatches.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Inventory all cache tags for reference
  // ---------------------------------------------------------------------------
  test('complete cache tag inventory', () => {
    const libDir = resolve(ROOT, 'lib')
    const appDir = resolve(ROOT, 'app')
    const allFiles = [...walkDir(libDir, ['.ts', '.tsx']), ...walkDir(appDir, ['.ts', '.tsx'])]

    const cacheFiles = allFiles.filter((f) => {
      try {
        return readFileSync(f, 'utf-8').includes('unstable_cache')
      } catch {
        return false
      }
    })

    console.log(`\nQ83 cache tag inventory:`)
    console.log(`  Files using unstable_cache: ${cacheFiles.length}`)

    for (const file of cacheFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')
      const tags = extractCacheTags(src, relPath)
      for (const tag of tags) {
        console.log(`    ${relPath}:${tag.line} -> "${tag.prefix}..."`)
      }
    }

    // Count total revalidateTag calls for reference
    let revalidateCount = 0
    for (const file of allFiles) {
      try {
        const src = readFileSync(file, 'utf-8')
        const matches = src.match(/revalidateTag\(/g)
        if (matches) revalidateCount += matches.length
      } catch {
        /* skip */
      }
    }

    console.log(`  Total revalidateTag calls across codebase: ${revalidateCount}`)
  })
})
