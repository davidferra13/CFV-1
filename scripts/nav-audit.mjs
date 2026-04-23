#!/usr/bin/env node
/**
 * nav-audit.mjs - Repeatable chef navigation audit
 *
 * Scans the filesystem and nav-config.tsx to produce:
 *  - Route inventory (static + dynamic)
 *  - Nav coverage (which routes are linked, which are orphaned)
 *  - Broken nav links (hrefs pointing to non-existent routes)
 *  - Hidden / admin-only entries
 *  - Duplicate hrefs
 *  - Route family counts
 *  - Placeholder/prototype detection
 *
 * Zero build deps. Parses nav-config.tsx as text.
 *
 * Usage:
 *   node scripts/nav-audit.mjs              # summary to stdout
 *   node scripts/nav-audit.mjs --full       # full report to stdout
 *   node scripts/nav-audit.mjs --json       # machine-readable JSON
 *   node scripts/nav-audit.mjs --save       # write to docs/nav-audit-report.md
 */

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const chefAppRoot = path.join(projectRoot, 'app', '(chef)')
const navConfigPath = path.join(projectRoot, 'components', 'navigation', 'nav-config.tsx')

const flags = new Set(process.argv.slice(2))
const FULL = flags.has('--full')
const JSON_OUT = flags.has('--json')
const SAVE = flags.has('--save')

// ── 1. Collect all chef routes from filesystem ──────────────────────

function walkPages(dir) {
  const pages = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.name === 'page.tsx') {
        pages.push(full)
      }
    }
  }
  return pages
}

function routeFromFile(filePath) {
  const relative = path.relative(chefAppRoot, filePath).replace(/\\/g, '/')
  const withoutPage = relative.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '')
  return withoutPage ? `/${withoutPage}` : '/'
}

const pageFiles = walkPages(chefAppRoot)
const allRoutes = new Map() // route -> filePath
const staticRoutes = new Set()
const dynamicRoutes = new Set()

for (const file of pageFiles) {
  const route = routeFromFile(file)
  allRoutes.set(route, file)
  if (route.includes('[')) {
    dynamicRoutes.add(route)
  } else {
    staticRoutes.add(route)
  }
}

// ── 2. Parse nav-config.tsx for hrefs and metadata ──────────────────

const navSource = fs.readFileSync(navConfigPath, 'utf8')

// Extract all href values
const hrefPattern = /href:\s*['"]([^'"]+)['"]/g
const allNavHrefs = new Set()
let match
while ((match = hrefPattern.exec(navSource)) !== null) {
  allNavHrefs.add(match[1])
}

// Normalize: strip query params for route matching
function normalizeHref(href) {
  return href.split('?')[0].replace(/\/$/, '') || '/'
}

const normalizedNavHrefs = new Set([...allNavHrefs].map(normalizeHref))

// Extract hidden/adminOnly entries by searching backward from the flag
// for the enclosing object block's href and label
function extractFlaggedEntries(flag) {
  const entries = []
  const lines = navSource.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(`${flag}: true`)) continue
    // Search backward for href and label (within same object block)
    let href = null, label = null
    for (let j = i; j >= Math.max(0, i - 15); j--) {
      if (!href) {
        const hm = lines[j].match(/href:\s*['"]([^'"]+)['"]/)
        if (hm) href = hm[1]
      }
      if (!label) {
        const lm = lines[j].match(/label:\s*['"]([^'"]+)['"]/)
        if (lm) label = lm[1]
      }
      if (href && label) break
    }
    if (href) {
      entries.push({ href, label: label || '(unknown)', line: i + 1 })
    }
  }
  return entries
}

const hiddenEntries = extractFlaggedEntries('hidden')
const adminOnlyEntries = extractFlaggedEntries('adminOnly')

// Extract nav groups
const groupPattern = /id:\s*['"]([^'"]+)['"],\s*\n?\s*label:\s*['"]([^'"]+)['"]/g
const navGroups = []
while ((match = groupPattern.exec(navSource)) !== null) {
  navGroups.push({ id: match[1], label: match[2] })
}

// ── 3. Detect duplicates ────────────────────────────────────────────

const hrefCounts = new Map()
for (const href of allNavHrefs) {
  const n = normalizeHref(href)
  hrefCounts.set(n, (hrefCounts.get(n) || 0) + 1)
}
const duplicateHrefs = [...hrefCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([href, count]) => ({ href, count }))

// ── 4. Cross-reference: orphans and broken links ────────────────────

// Orphaned routes: exist on disk but not in nav config
const orphanedRoutes = [...staticRoutes]
  .filter(r => r !== '/')
  .filter(r => !normalizedNavHrefs.has(r))
  .sort()

// Broken nav links: in nav config but no matching route on disk
const brokenNavLinks = [...normalizedNavHrefs]
  .filter(href => href.startsWith('/'))
  .filter(href => !staticRoutes.has(href))
  .filter(href => !href.includes('${'))  // skip template literals
  .sort()

// ── 5. Placeholder/prototype detection ──────────────────────────────

const placeholderPattern = /currently being built|coming soon|placeholder|under construction|work in progress/i
const prototypePattern = /const\s+mock[A-Za-z0-9_]*\s*=|will be here\.|TODO:\s*replace mock/i

function isPlaceholder(route) {
  const file = allRoutes.get(route)
  if (!file) return false
  try {
    const content = fs.readFileSync(file, 'utf8')
    return placeholderPattern.test(content) || prototypePattern.test(content)
  } catch { return false }
}

const placeholderRoutes = [...staticRoutes].filter(isPlaceholder).sort()
const navLinksToPlaceholders = [...normalizedNavHrefs]
  .filter(href => staticRoutes.has(href) && isPlaceholder(href))
  .sort()

// ── 6. Route family counts ──────────────────────────────────────────

function routeFamily(route) {
  const parts = route.split('/').filter(Boolean)
  return parts[0] || '(root)'
}

const familyCounts = new Map()
for (const route of allRoutes.keys()) {
  if (route === '/') continue
  const family = routeFamily(route)
  familyCounts.set(family, (familyCounts.get(family) || 0) + 1)
}
const sortedFamilies = [...familyCounts.entries()].sort((a, b) => b[1] - a[1])

// ── 7. Settings routes (excluded from orphan count but tracked) ─────

const settingsOrphans = orphanedRoutes.filter(r => r.startsWith('/settings/'))
const nonSettingsOrphans = orphanedRoutes.filter(r => !r.startsWith('/settings/'))

// ── Output ──────────────────────────────────────────────────────────

const results = {
  timestamp: new Date().toISOString(),
  counts: {
    totalRoutes: allRoutes.size,
    staticRoutes: staticRoutes.size,
    dynamicRoutes: dynamicRoutes.size,
    navHrefs: allNavHrefs.size,
    uniqueNavRoutes: normalizedNavHrefs.size,
    navGroups: navGroups.length,
    orphanedRoutes: nonSettingsOrphans.length,
    settingsOrphans: settingsOrphans.length,
    brokenNavLinks: brokenNavLinks.length,
    duplicateHrefs: duplicateHrefs.length,
    hiddenEntries: hiddenEntries.length,
    adminOnlyEntries: adminOnlyEntries.length,
    placeholderRoutes: placeholderRoutes.length,
    navLinksToPlaceholders: navLinksToPlaceholders.length,
  },
  routeFamilies: sortedFamilies,
  orphanedRoutes: nonSettingsOrphans,
  settingsOrphans,
  brokenNavLinks,
  duplicateHrefs,
  hiddenEntries,
  adminOnlyEntries,
  placeholderRoutes,
  navLinksToPlaceholders,
  dynamicRoutes: [...dynamicRoutes].sort(),
}

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2))
  process.exit(results.counts.brokenNavLinks > 0 ? 1 : 0)
}

// ── Markdown output ─────────────────────────────────────────────────

function md() {
  const lines = []
  const p = (...args) => lines.push(args.join(''))

  p('# Chef Nav Audit')
  p(`> Generated ${results.timestamp}`)
  p('')

  // Summary table
  p('## Summary')
  p('')
  p('| Metric | Count |')
  p('|--------|------:|')
  p(`| Total routes (static + dynamic) | ${results.counts.totalRoutes} |`)
  p(`| Static routes | ${results.counts.staticRoutes} |`)
  p(`| Dynamic routes | ${results.counts.dynamicRoutes} |`)
  p(`| Nav hrefs (all, incl. query variants) | ${results.counts.navHrefs} |`)
  p(`| Unique nav routes (normalized) | ${results.counts.uniqueNavRoutes} |`)
  p(`| Nav groups | ${results.counts.navGroups} |`)
  p(`| Orphaned routes (no nav link) | ${results.counts.orphanedRoutes} |`)
  p(`| Settings routes (excluded from orphan) | ${results.counts.settingsOrphans} |`)
  p(`| Broken nav links (no route on disk) | ${results.counts.brokenNavLinks} |`)
  p(`| Duplicate hrefs | ${results.counts.duplicateHrefs} |`)
  p(`| Hidden entries | ${results.counts.hiddenEntries} |`)
  p(`| Admin-only entries | ${results.counts.adminOnlyEntries} |`)
  p(`| Placeholder routes | ${results.counts.placeholderRoutes} |`)
  p(`| Nav links to placeholders | ${results.counts.navLinksToPlaceholders} |`)
  p('')

  // Health
  const issues = []
  if (results.counts.brokenNavLinks > 0) issues.push(`${results.counts.brokenNavLinks} broken nav links`)
  if (results.counts.navLinksToPlaceholders > 0) issues.push(`${results.counts.navLinksToPlaceholders} nav links to placeholders`)
  if (results.counts.duplicateHrefs > 0) issues.push(`${results.counts.duplicateHrefs} duplicate hrefs`)

  if (issues.length === 0) {
    p('**Health: PASS** - no broken links, no placeholder nav targets, no duplicates')
  } else {
    p(`**Health: ${results.counts.brokenNavLinks > 0 ? 'FAIL' : 'WARN'}** - ${issues.join(', ')}`)
  }
  p('')

  // Route families
  p('## Route Families')
  p('')
  p('| Family | Routes |')
  p('|--------|-------:|')
  for (const [family, count] of sortedFamilies) {
    p(`| /${family} | ${count} |`)
  }
  p('')

  // Broken nav links (always show)
  if (results.counts.brokenNavLinks > 0) {
    p('## Broken Nav Links')
    p('These hrefs are in nav-config.tsx but have no matching page.tsx on disk:')
    p('')
    for (const href of brokenNavLinks) p(`- \`${href}\``)
    p('')
  }

  // Nav links to placeholders (always show)
  if (results.counts.navLinksToPlaceholders > 0) {
    p('## Nav Links to Placeholder Pages')
    p('These are in the nav config but the target page is a placeholder/prototype:')
    p('')
    for (const href of navLinksToPlaceholders) p(`- \`${href}\``)
    p('')
  }

  // Duplicates
  if (results.counts.duplicateHrefs > 0) {
    p('## Duplicate Hrefs')
    p('')
    for (const { href, count } of duplicateHrefs) p(`- \`${href}\` (${count}x)`)
    p('')
  }

  // Hidden entries
  if (hiddenEntries.length > 0) {
    p('## Hidden Entries')
    p('')
    for (const e of hiddenEntries) p(`- \`${e.href}\` (${e.label}) line ${e.line}`)
    p('')
  }

  // Admin-only
  if (adminOnlyEntries.length > 0) {
    p('## Admin-Only Entries')
    p('')
    for (const e of adminOnlyEntries) p(`- \`${e.href}\` (${e.label}) line ${e.line}`)
    p('')
  }

  if (FULL || SAVE) {
    // Orphaned routes (full only)
    p('## Orphaned Routes (No Nav Link)')
    p(`${nonSettingsOrphans.length} routes exist on disk but are not directly linked from nav-config.tsx:`)
    p('')
    for (const r of nonSettingsOrphans) p(`- \`${r}\``)
    p('')

    if (settingsOrphans.length > 0) {
      p('### Settings Routes (Not In Sidebar Nav)')
      p('These are reachable from the Settings hub page, not sidebar nav:')
      p('')
      for (const r of settingsOrphans) p(`- \`${r}\``)
      p('')
    }

    // Dynamic routes
    p('## Dynamic Routes')
    p('')
    for (const r of results.dynamicRoutes) p(`- \`${r}\``)
    p('')

    // Placeholder routes
    if (placeholderRoutes.length > 0) {
      p('## All Placeholder/Prototype Routes')
      p('')
      for (const r of placeholderRoutes) p(`- \`${r}\``)
      p('')
    }
  }

  return lines.join('\n')
}

const output = md()

if (SAVE) {
  const outPath = path.join(projectRoot, 'docs', 'nav-audit-report.md')
  fs.writeFileSync(outPath, output, 'utf8')
  console.log(`Wrote ${outPath}`)
} else {
  console.log(output)
}

// Exit code: 1 if broken nav links exist
process.exit(results.counts.brokenNavLinks > 0 ? 1 : 0)
