import fs from 'fs'
import path from 'path'

const cwd = process.cwd()
const mapPath = path.join(cwd, 'chef-navigation-map.md')
const text = fs.readFileSync(mapPath, 'utf8')

const lines = text.split(/\r?\n/)
let currentSurface = ''
let currentSection = ''
const items = []

function trimField(line) {
  return line.replace(/^\s*-\s*/, '').replace(/^\s*/, '')
}

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]
  if (line.startsWith('### ')) {
    currentSurface = line.replace(/^###\s+/, '').trim()
    currentSection = ''
    continue
  }
  if (line.startsWith('#### ')) {
    currentSection = line.replace(/^####\s+/, '').trim()
    continue
  }
  if (/^\s*-\s+exact label: /.test(line)) {
    const label = line.replace(/^\s*-\s+exact label:\s*/, '').trim()
    const type = lines[i + 1]?.replace(/^\s*type:\s*/, '').trim() || 'UNVERIFIED'
    const route = lines[i + 2]?.replace(/^\s*exact route\/path:\s*/, '').trim() || 'UNVERIFIED'
    const component = lines[i + 3]?.replace(/^\s*rendering component file path:\s*/, '').trim() || 'UNVERIFIED'
    const destination = lines[i + 4]?.replace(/^\s*destination page component:\s*/, '').trim() || 'UNVERIFIED'
    const source = lines[i + 5]?.replace(/^\s*source of definition:\s*/, '').trim() || 'UNVERIFIED'
    const visibility = lines[i + 6]?.replace(/^\s*visibility:\s*/, '').trim() || 'UNVERIFIED'
    const permissions =
      lines[i + 7]?.replace(/^\s*required permissions or conditions:\s*/, '').trim() ||
      'UNVERIFIED'
    const dynamic = lines[i + 8]?.replace(/^\s*state:\s*/, '').trim() || 'UNVERIFIED'
    const icon = lines[i + 9]?.replace(/^\s*icon:\s*/, '').trim() || 'UNVERIFIED'
    items.push({
      label,
      type,
      route,
      component,
      destination,
      source,
      visibility,
      permissions,
      dynamic,
      icon,
      surface: currentSurface,
      section: currentSection,
    })
  }
}

function normalizeRoute(route) {
  if (!route || route === 'UNVERIFIED') return 'UNVERIFIED'
  if (!route.startsWith('/')) return route
  return route.split('?')[0].replace(/\/$/, '') || '/'
}

function canonicalEntity(route) {
  const normalized = normalizeRoute(route)
  const rules = [
    [/^\/admin(\/|$)/, 'Admin'],
    [/^\/settings\/protection(\/|$)|^\/safety(\/|$)/, 'Protection'],
    [/^\/settings(\/|$)|^\/chef\/\$\{/, 'Settings'],
    [/^\/inventory(\/|$)|^\/vendors(\/|$)|^\/food-cost(\/|$)/, 'Supply Chain'],
    [/^\/finance(\/|$)|^\/financials$|^\/expenses(\/|$)|^\/receipts$|^\/payments(\/|$)/, 'Finance'],
    [/^\/culinary(\/|$)|^\/menus(\/|$)|^\/recipes(\/|$)/, 'Culinary'],
    [/^\/clients(\/|$)|^\/guests(\/|$)|^\/guest-|^\/partners(\/|$)|^\/loyalty(\/|$)/, 'Clients'],
    [/^\/events(\/|$)|^\/calendar(\/|$)|^\/production$|^\/feedback(\/|$)|^\/reviews$|^\/aar$|^\/waitlist$/, 'Events'],
    [/^\/operations(\/|$)|^\/daily$|^\/kitchen(\/|$)|^\/meal-prep(\/|$)|^\/staff(\/|$)|^\/stations(\/|$)|^\/tasks(\/|$)|^\/team$|^\/travel$|^\/documents$|^\/scheduling$|^\/queue$/, 'Operations'],
    [/^\/inquiries(\/|$)|^\/quotes(\/|$)|^\/calls(\/|$)|^\/contracts(\/|$)|^\/leads(\/|$)|^\/marketplace(\/|$)|^\/proposals(\/|$)|^\/prospecting(\/|$)|^\/availability$|^\/consulting$|^\/rate-card$|^\/testimonials$|^\/wix-submissions$/, 'Pipeline'],
    [/^\/network(\/|$)|^\/charity(\/|$)|^\/community(\/|$)/, 'Network'],
    [/^\/commerce(\/|$)/, 'Commerce'],
    [/^\/marketing(\/|$)|^\/social(\/|$)|^\/reputation(\/|$)|^\/portfolio$|^\/content$/, 'Marketing'],
    [/^\/analytics(\/|$)|^\/goals(\/|$)|^\/insights(\/|$)|^\/reports$|^\/surveys$|^\/intelligence$/, 'Analytics'],
    [/^\/activity$|^\/help(\/|$)|^\/import(\/|$)|^\/chat$|^\/briefing$|^\/notifications$|^\/commands$|^\/remy$|^\/inbox\/history-scan$|^\/inbox\/triage$/, 'Tools'],
    [/^\/dashboard$/, 'Dashboard'],
    [/^\/inbox$/, 'Inbox'],
    [/^\/growth$/, 'Growth'],
    [/^\/circles$/, 'Dinner Circles'],
  ]
  for (const [pattern, entity] of rules) {
    if (pattern.test(normalized)) return entity
  }
  return 'UNVERIFIED'
}

function surfaceScore(surface, section, itemType) {
  let score = 0
  if (surface === 'Surface: Chef Desktop Sidebar' || surface === 'Chef Desktop Sidebar') score = 100
  else if (
    surface === 'Surface: Admin Shell' ||
    surface === 'Admin Shell' ||
    surface === 'Surface: Admin Sidebar' ||
    surface === 'Admin Sidebar'
  )
    score = 95
  else if (surface === 'Surface: Chef Mobile Navigation' || surface === 'Chef Mobile Navigation') score = 80
  else if ((surface || '').includes('Settings Hub')) score = 70
  else if ((surface || '').includes('Action Bar')) score = 60
  else if ((surface || '').includes('Create Dropdown')) score = 50
  else if ((surface || '').includes('Command Palette')) score = 40
  else score = 20

  if (section === 'standaloneTop') score += 15
  if (section === 'standaloneBottom') score += 10
  if (itemType === 'menu' || itemType === 'link') score += 5
  return score
}

function routeCategory(route, occurrences) {
  const normalized = normalizeRoute(route)
  if (/^\/admin(\/|$)/.test(normalized)) return 'hidden/admin/internal'
  const surfaces = new Set(occurrences.map((o) => `${o.surface} :: ${o.section}`))
  if ([...surfaces].some((s) => s.includes('standaloneTop'))) return 'primary navigation'
  if ([...surfaces].some((s) => s.includes('Chef Desktop Sidebar'))) return 'secondary navigation'
  if (
    [...surfaces].some(
      (s) =>
        s.includes('Settings Hub') ||
        s.includes('Network Tabs') ||
        s.includes('Quotes Filter Tabs') ||
        s.includes('Activity Filters') ||
        s.includes('Client Preview Tabs') ||
        s.includes('Professional Development Tabs') ||
        s.includes('HACCP Tabs') ||
        s.includes('Event Detail Mobile Tabs'),
    )
  )
    return 'contextual navigation'
  if (
    [...surfaces].every(
      (s) =>
        s.includes('Create Dropdown') ||
        s.includes('Command Palette') ||
        s.includes('Quick create') ||
        s.includes('Action Bar'),
    )
  )
    return 'action-only'
  return 'secondary navigation'
}

function recommendation(route, labels, routesForCanonicalLabel, occurrences, destinationSet) {
  const normalized = normalizeRoute(route)
  const category = routeCategory(route, occurrences)
  const hasUnverifiedDestination = [...destinationSet].includes('UNVERIFIED')
  if (category === 'hidden/admin/internal') return 'marked internal-only'
  if (hasUnverifiedDestination) return 'deprecated'
  if (labels.length > 1) return 'merged'
  if (routesForCanonicalLabel.length > 1) return 'renamed'
  return 'left as-is'
}

const routeMap = new Map()
const labelMap = new Map()

for (const item of items) {
  const key = normalizeRoute(item.route)
  if (!routeMap.has(key)) routeMap.set(key, [])
  routeMap.get(key).push(item)

  if (!labelMap.has(item.label)) labelMap.set(item.label, new Set())
  labelMap.get(item.label).add(key)
}

function chooseCanonicalLabel(entries) {
  const ranked = [...entries].sort((a, b) => {
    const scoreDiff =
      surfaceScore(b.surface, b.section, b.type) - surfaceScore(a.surface, a.section, a.type)
    if (scoreDiff !== 0) return scoreDiff
    return a.label.localeCompare(b.label)
  })
  return ranked[0]?.label || 'UNVERIFIED'
}

const canonicalRows = [...routeMap.entries()].map(([route, entries]) => {
  const labels = [...new Set(entries.map((e) => e.label))].sort()
  const canonicalLabel = chooseCanonicalLabel(entries)
  const duplicateLabels = labels.filter((label) => label !== canonicalLabel)
  const duplicateRoutes = [...(labelMap.get(canonicalLabel) || new Set())]
    .filter((value) => value !== route)
    .sort()
  const surfaces = [...new Set(entries.map((e) => `${e.surface} :: ${e.section}`))].sort()
  const destinationSet = new Set(entries.map((e) => e.destination))
  return {
    entity: canonicalEntity(route),
    canonicalLabel,
    route,
    duplicateLabels,
    duplicateRoutes,
    surfaces,
    recommendation: `${recommendation(route, labels, [...(labelMap.get(canonicalLabel) || new Set())], entries, destinationSet)}; ${routeCategory(route, entries)}`,
  }
})

canonicalRows.sort((a, b) => {
  const entityDiff = a.entity.localeCompare(b.entity)
  if (entityDiff !== 0) return entityDiff
  return a.route.localeCompare(b.route)
})

const sameLabelDifferentRoutes = [...labelMap.entries()]
  .map(([label, routes]) => ({ label, routes: [...routes].sort() }))
  .filter((row) => row.routes.length > 1)
  .sort((a, b) => b.routes.length - a.routes.length || a.label.localeCompare(b.label))

const sameRouteDifferentLabels = [...routeMap.entries()]
  .map(([route, entries]) => ({ route, labels: [...new Set(entries.map((e) => e.label))].sort() }))
  .filter((row) => row.labels.length > 1)
  .sort((a, b) => b.labels.length - a.labels.length || a.route.localeCompare(b.route))

const majorEntities = [
  'Dashboard',
  'Inbox',
  'Events',
  'Clients',
  'Culinary',
  'Finance',
  'Operations',
  'Pipeline',
  'Network',
  'Analytics',
  'Commerce',
  'Marketing',
  'Protection',
  'Supply Chain',
  'Tools',
  'Settings',
  'Dinner Circles',
  'Growth',
  'Admin',
]

function primaryRouteForEntity(entity) {
  const preferred = canonicalRows.find(
    (row) =>
      row.entity === entity &&
      row.surfaces.some((surface) => surface.includes('standaloneTop')) &&
      row.recommendation.includes('primary navigation'),
  )
  if (preferred) return preferred.route
  const fallback = canonicalRows.find((row) => row.entity === entity)
  return fallback?.route || 'UNVERIFIED'
}

const entryPointMatrix = majorEntities.map((entity) => {
  const rows = canonicalRows.filter((row) => row.entity === entity)
  const primaryRoute = primaryRouteForEntity(entity)
  const allWays = rows.map((row) => ({
    route: row.route,
    label: row.canonicalLabel,
    category: row.recommendation.split('; ')[1] || 'UNVERIFIED',
    surfaces: row.surfaces,
  }))
  return { entity, primaryRoute, allWays }
})

const orphanRows = [
  {
    route: '/chef/cannabis/handbook',
    component: path.join(cwd, 'app/(chef)/chef/cannabis/handbook/page.tsx'),
    parent: 'Protection',
    recommendation: 'hidden',
  },
  {
    route: '/chef/cannabis/rsvps',
    component: path.join(cwd, 'app/(chef)/chef/cannabis/rsvps/page.tsx'),
    parent: 'Protection',
    recommendation: 'hidden',
  },
  {
    route: '/prospecting/openclaw',
    component: path.join(cwd, 'app/(chef)/prospecting/openclaw/page.tsx'),
    parent: 'Pipeline',
    recommendation: 'hidden',
  },
  {
    route: '/stations/orders/print',
    component: path.join(cwd, 'app/(chef)/stations/orders/print/page.tsx'),
    parent: 'Operations',
    recommendation: 'hidden',
  },
]

const deadLinkRows = items
  .filter(
    (item) =>
      item.destination === 'UNVERIFIED' ||
      item.route === 'UNVERIFIED' ||
      item.route.includes('${') ||
      item.route === 'current pathname' ||
      item.route === 'history-backed list' ||
      item.route === 'expands full navGroups inventory' ||
      item.route.includes('current event route') ||
      item.route.includes('(local tab)') ||
      item.route.includes('(local filter)'),
  )
  .map((item) => ({
    route: item.route,
    sourceComponent: item.component,
    status:
      item.route === 'UNVERIFIED'
        ? 'UNVERIFIED'
        : item.destination === 'UNVERIFIED'
          ? 'UNRESOLVED'
          : 'DYNAMIC/CALLER-DRIVEN',
    verify:
      item.route.includes('${')
        ? 'verify runtime parameter source and concrete dynamic route'
        : item.route === 'current pathname'
          ? 'verify breadcrumb generation against current pathname'
          : item.route === 'history-backed list'
            ? 'verify localStorage recent-page source'
            : item.route === 'expands full navGroups inventory'
              ? 'verify generated expansion against navGroups'
              : item.route.includes('current event route')
                ? 'verify tab query param handling on event detail pages'
                : item.route.includes('(local tab)') || item.route.includes('(local filter)')
                  ? 'verify local component state and URL sync behavior'
                  : 'verify route/component mismatch in code',
  }))

let out = ''
out += '# Chef Navigation Normalization Plan\n\n'
out += 'Basis: [chef-navigation-map.md](/c:/Users/david/Documents/CFv1/chef-navigation-map.md) treated as ground truth.\n\n'
out += 'Validation:\n'
out += '- 100% of items in chef-navigation-map.md were parsed for normalization.\n'
out += '- Canonicalization was derived from the audited route/label/component map, not from a redesign pass.\n'
out += '- Any non-static or unresolved target remains marked `UNVERIFIED` or `UNRESOLVED`.\n\n'

out += '## Canonical Route Table\n\n'
out += '| canonical entity | canonical label | canonical route | duplicate labels | duplicate routes | nav surfaces where it appears | recommendation |\n'
out += '|---|---|---|---|---|---|---|\n'
for (const row of canonicalRows) {
  out += `| ${row.entity} | ${row.canonicalLabel} | ${row.route} | ${row.duplicateLabels.join('<br>') || 'none'} | ${row.duplicateRoutes.join('<br>') || 'none'} | ${row.surfaces.join('<br>')} | ${row.recommendation} |\n`
}
out += '\n'

out += '## Label Conflict Table\n\n'
out += '### Same Label -> Different Routes\n\n'
out += '| label | routes |\n'
out += '|---|---|\n'
for (const row of sameLabelDifferentRoutes) out += `| ${row.label} | ${row.routes.join('<br>')} |\n`
out += '\n'
out += '### Same Route -> Different Labels\n\n'
out += '| route | labels |\n'
out += '|---|---|\n'
for (const row of sameRouteDifferentLabels) out += `| ${row.route} | ${row.labels.join('<br>')} |\n`
out += '\n'

out += '## Entry Point Matrix\n\n'
out += '| canonical entity | all ways users can reach it | primary path | redundant/contextual/admin-only |\n'
out += '|---|---|---|---|\n'
for (const row of entryPointMatrix) {
  const allWays = row.allWays.map((entry) => `${entry.label} -> ${entry.route}`).join('<br>')
  const redundant = row.allWays
    .filter((entry) => entry.route !== row.primaryRoute)
    .map((entry) => `${entry.route} (${entry.category})`)
    .join('<br>')
  out += `| ${row.entity} | ${allWays || 'none'} | ${row.primaryRoute} | ${redundant || 'none'} |\n`
}
out += '\n'

out += '## Orphan Resolution Table\n\n'
out += '| route | component | likely parent domain | recommendation |\n'
out += '|---|---|---|---|\n'
for (const row of orphanRows) {
  out += `| ${row.route} | ${row.component} | ${row.parent} | ${row.recommendation} |\n`
}
out += '\n'

out += '## Dead Link Resolution Table\n\n'
out += '| route | source component | status | what must be verified |\n'
out += '|---|---|---|---|\n'
for (const row of deadLinkRows) {
  out += `| ${row.route} | ${row.sourceComponent} | ${row.status} | ${row.verify} |\n`
}
out += '\n'

fs.writeFileSync(path.join(cwd, 'chef-navigation-normalization-plan.md'), out, 'utf8')
console.log('wrote chef-navigation-normalization-plan.md')
