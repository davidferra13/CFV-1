import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const navConfig = require('../components/navigation/nav-config.tsx')
const routeInventory = require('../lib/interface/route-inventory.ts')
const navGroups = (navConfig.navGroups ?? navConfig.default?.navGroups ?? []) as any[]
const standaloneTop = (navConfig.standaloneTop ?? navConfig.default?.standaloneTop ?? []) as any[]
const standaloneBottom = (navConfig.standaloneBottom ??
  navConfig.default?.standaloneBottom ??
  []) as any[]
const getStaticPageRouteEntriesForRole =
  routeInventory.getStaticPageRouteEntriesForRole ??
  routeInventory.default?.getStaticPageRouteEntriesForRole

type Visibility = 'primary' | 'secondary' | 'advanced'

type NavEntry = {
  href: string
  normalizedHref: string
  visibility: Visibility
  source: string
}

const placeholderPattern =
  /currently being built|coming soon|under construction|work in progress/i
const prototypePattern = /const\s+mock[A-Za-z0-9_]*\s*=|will be here\.|TODO:\s*replace mock/i
const MAX_TOP_LEVEL_VISIBLE = 16

function normalizeHref(href: string) {
  return href.split('?')[0]
}

function collectNavEntries(): NavEntry[] {
  const entries: NavEntry[] = []

  for (const item of standaloneTop) {
    entries.push({
      href: item.href,
      normalizedHref: normalizeHref(item.href),
      visibility: 'primary',
      source: `standaloneTop:${item.label}`,
    })
  }

  for (const group of navGroups) {
    for (const item of group.items) {
      entries.push({
        href: item.href,
        normalizedHref: normalizeHref(item.href),
        visibility: 'primary',
        source: `group:${group.id}:${item.label}`,
      })

      for (const child of item.children ?? []) {
        entries.push({
          href: child.href,
          normalizedHref: normalizeHref(child.href),
          visibility: child.visibility === 'advanced' ? 'advanced' : 'secondary',
          source: `group:${group.id}:${item.label}:${child.label}`,
        })
      }
    }
  }

  for (const item of standaloneBottom) {
    entries.push({
      href: item.href,
      normalizedHref: normalizeHref(item.href),
      visibility: 'primary',
      source: `standaloneBottom:${item.label}`,
    })
  }

  return entries
}

function isPlaceholderOrPrototype(route: string, staticRouteToFile: Map<string, string>): boolean {
  const file = staticRouteToFile.get(route)
  if (!file) return false
  const content = fs.readFileSync(file, 'utf8')
  return placeholderPattern.test(content) || prototypePattern.test(content)
}

function printList(title: string, lines: string[]) {
  if (lines.length === 0) return
  console.error(`\n${title}`)
  for (const line of lines) console.error(`- ${line}`)
}

function main() {
  const failures: string[] = []

  const navEntries = collectNavEntries()

  const topLevelCount = standaloneTop.length + navGroups.length + standaloneBottom.length
  if (topLevelCount > MAX_TOP_LEVEL_VISIBLE) {
    failures.push(
      `Top-level visible count is ${topLevelCount}; expected <= ${MAX_TOP_LEVEL_VISIBLE}`
    )
  }

  const byHref = new Map<string, NavEntry[]>()
  for (const entry of navEntries) {
    const arr = byHref.get(entry.href) ?? []
    arr.push(entry)
    byHref.set(entry.href, arr)
  }

  const duplicateHrefs = Array.from(byHref.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([href, arr]) => `${href} (${arr.length} entries)`)

  if (duplicateHrefs.length > 0) {
    failures.push(`Found duplicate nav hrefs (${duplicateHrefs.length})`)
  }

  const pageEntries = getStaticPageRouteEntriesForRole('chef')
  const allRoutes = new Set<string>()
  const staticRouteToFile = new Map<string, string>()

  for (const entry of pageEntries) {
    allRoutes.add(entry.route)
    staticRouteToFile.set(entry.route, entry.filePath)
  }

  const navMissingRoutes = navEntries
    .map((entry) => entry.normalizedHref)
    .filter((route, idx, arr) => arr.indexOf(route) === idx)
    .filter((route) => !allRoutes.has(route))

  if (navMissingRoutes.length > 0) {
    failures.push(`Found nav hrefs without a matching route (${navMissingRoutes.length})`)
  }

  const primaryRoutes = navEntries
    .filter((entry) => entry.visibility === 'primary')
    .map((entry) => entry.normalizedHref)

  const primaryPlaceholderRoutes = primaryRoutes
    .filter((route, idx, arr) => arr.indexOf(route) === idx)
    .filter((route) => isPlaceholderOrPrototype(route, staticRouteToFile))

  if (primaryPlaceholderRoutes.length > 0) {
    failures.push(
      `Primary nav contains placeholder/prototype routes (${primaryPlaceholderRoutes.length})`
    )
  }

  const secondaryPlaceholderRoutes = navEntries
    .filter((entry) => entry.visibility === 'secondary')
    .map((entry) => entry.normalizedHref)
    .filter((route, idx, arr) => arr.indexOf(route) === idx)
    .filter((route) => isPlaceholderOrPrototype(route, staticRouteToFile))

  if (secondaryPlaceholderRoutes.length > 0) {
    failures.push(
      `Secondary nav contains placeholder/prototype routes; move them to advanced (${secondaryPlaceholderRoutes.length})`
    )
  }

  const navRoutes = new Set(navEntries.map((entry) => entry.normalizedHref))

  const discoverabilityExcludePrefixes = ['/settings/']

  const discoverableRoutes = Array.from(allRoutes)
    .filter((route) => route !== '/')
    .filter((route) => !discoverabilityExcludePrefixes.some((prefix) => route.startsWith(prefix)))
    .filter((route) => !isPlaceholderOrPrototype(route, staticRouteToFile))

  const missingDiscoverableRoutes = discoverableRoutes
    .filter((route) => !navRoutes.has(route))
    .sort()

  if (missingDiscoverableRoutes.length > 0) {
    failures.push(
      `Implemented non-placeholder static routes missing from nav (${missingDiscoverableRoutes.length})`
    )
  }

  if (failures.length > 0) {
    console.error('Chef nav audit FAILED')
    printList('Failures', failures)
    printList('Duplicate hrefs', duplicateHrefs)
    printList('Nav hrefs with no route', navMissingRoutes)
    printList('Primary placeholder/prototype routes', primaryPlaceholderRoutes)
    printList('Secondary placeholder/prototype routes', secondaryPlaceholderRoutes)
    printList('Missing discoverable routes', missingDiscoverableRoutes)
    process.exit(1)
  }

  console.log('Chef nav audit passed')
  console.log(`Top-level visible count: ${topLevelCount}`)
  console.log(`Total unique nav hrefs: ${byHref.size}`)
  console.log(`Discoverable static routes covered: ${discoverableRoutes.length}`)
}

main()
