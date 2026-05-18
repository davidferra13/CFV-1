/**
 * Wiring Audit - Phase 1 & 2
 * Extracts all Next.js routes, counts inbound references, identifies orphans.
 * Output: scripts/wiring-audit-results.json
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const APP_DIR = join(PROJECT_ROOT, 'app')
const SEARCH_DIRS = ['app', 'components', 'lib'].map(d => join(PROJECT_ROOT, d))

const DOMAIN_RULES = [
  {
    id: 'page_xray',
    label: 'Page X-Ray',
    alwaysWhen: file => /^app\//.test(file) || /^components\//.test(file),
    path: [/^app\//, /^components\//],
    text: [/page\.tsx/, /route\b/, /metadata\b/],
    checks: [
      'Run /page-xray --delta for every affected route, or --quick for a newly created route.',
      'Update docs/xrays findings and developer notes when the page shape changed.'
    ]
  },
  {
    id: 'universal_rail',
    label: 'Universal Rail Intelligence',
    alwaysWhen: file => /^app\//.test(file) || /^components\//.test(file),
    path: [/^lib\/discovery\//, /rail/i, /^components\/rail\//],
    text: [/RailProfile/, /resolver/i, /ContextualRail/, /UniversalRail/, /intel/i],
    checks: [
      'Verify lib/discovery/rail-profiles.ts has a matching surface profile.',
      'Verify relevant resolvers exist in lib/discovery/resolvers and produce contextual cards.'
    ]
  },
  {
    id: 'dinner_circles',
    label: 'Dinner Circles',
    path: [/circle/i, /^lib\/hub\//, /^lib\/dinner-circles\//, /^app\/.*hub\//],
    text: [/ensure[A-Za-z0-9_]*Circle/, /Dinner Circle/i, /groupToken/, /hub_groups/, /guest/i],
    checks: [
      'If two parties interact around an event, inquiry, recurring client, staff assignment, or community group, verify an ensure*Circle or create*Circle path.',
      'Verify important lifecycle updates post to the relevant Circle feed when user-visible.'
    ]
  },
  {
    id: 'priority_queue',
    label: 'Priority Queue and Action Graph',
    path: [/queue/i, /action-graph/i, /^lib\/actions\//, /^lib\/queue\//, /^lib\/decision-queue\//],
    text: [/Priority Queue/i, /next_action/i, /ActionGraph/i, /urgency/i, /snooze/i],
    checks: [
      'Verify new waiting work, blockers, overdue work, or next actions appear in Priority Queue or Action Graph.',
      'Verify actions have source, urgency, due state, and deep links.'
    ]
  },
  {
    id: 'commitment',
    label: 'Commitment UI and Completion',
    path: [/commitment/i, /^lib\/completion\//, /^lib\/confirm\//, /^lib\/lifecycle\//],
    text: [/commitment/i, /completion/i, /readiness/i, /confirmed/i, /accepted/i, /deposit/i],
    checks: [
      'Verify the feature updates readiness, commitment, or completion state when it changes booking confidence.',
      'Verify the UI distinguishes draft, proposed, committed, paid, confirmed, and complete states.'
    ]
  },
  {
    id: 'client_intelligence',
    label: 'Client Intelligence',
    path: [/client-intelligence/i, /^lib\/clients\//, /^lib\/client-/],
    text: [/Client Intelligence/i, /client_id/, /repeat client/i, /preference/i, /household/i, /dietary/i],
    checks: [
      'Verify client-facing or client-derived facts feed the client intelligence ledger or summary.',
      'Verify sensitive client intelligence is role-gated and tenant-scoped.'
    ]
  },
  {
    id: 'menu_intelligence',
    label: 'Menu Intelligence',
    path: [/menu/i, /recipe/i, /culinary/i, /dish/i],
    text: [/menu intelligence/i, /menu/i, /recipe/i, /dish/i, /ingredient/i, /dietary/i],
    checks: [
      'Verify menu, recipe, dish, dietary, and approval changes feed menu intelligence surfaces.',
      'Verify menu intelligence cards or panels appear where chefs make menu decisions.'
    ]
  },
  {
    id: 'pie',
    label: 'PIE and Pricing Intelligence',
    path: [/pricing/i, /^lib\/pricing\//, /^components\/pricing\//, /costing/i, /ingredient/i],
    text: [/PIE\b/, /pricing/i, /cost/i, /ingredient/i, /quote/i, /margin/i],
    checks: [
      'Verify pricing, ingredient, recipe, quote, and procurement work uses PIE or records why PIE is not applicable.',
      'Verify pricing outputs do not hide failures as zeros or stale certainty.'
    ]
  },
  {
    id: 'communications',
    label: 'Communications and Notifications',
    path: [/message/i, /email/i, /sms/i, /notification/i, /inbox/i, /^lib\/comms?\//],
    text: [/message/i, /email/i, /sms/i, /notification/i, /inbox/i, /reply/i],
    checks: [
      'Verify user-visible state changes notify the right party or appear in the correct inbox/feed.',
      'Verify communications are threaded, tenant-scoped, and do not duplicate notifications.'
    ]
  },
  {
    id: 'event_lifecycle',
    label: 'Event Lifecycle and FSM',
    path: [/^lib\/events\//, /^app\/.*events/, /transition/i, /lifecycle/i],
    text: [/event_status/, /transition/i, /lifecycle/i, /FSM/i, /event_id/],
    checks: [
      'Verify event mutations use the canonical transition path where lifecycle state changes.',
      'Verify dependent surfaces update after lifecycle transitions.'
    ]
  },
  {
    id: 'ledger_finance',
    label: 'Ledger, Finance, Payments',
    path: [/ledger/i, /finance/i, /payment/i, /invoice/i, /stripe/i, /billing/i],
    text: [/ledger/i, /payment/i, /invoice/i, /Stripe/i, /balance/i, /revenue/i],
    checks: [
      'Verify money movement creates immutable ledger/payment records and avoids destructive changes.',
      'Verify finance and rail summaries reflect payment, invoice, and revenue changes.'
    ]
  },
  {
    id: 'remy_command_surface',
    label: 'Remy, Navigation, Command Surface',
    path: [/remy/i, /navigation/i, /command-surface/i, /^components\/navigation\//],
    text: [/Remy/i, /nav/i, /command/i, /shortcut/i, /href=/],
    checks: [
      'Verify new pages/actions are discoverable through nav, command surface, Remy, or a justified local entry point.',
      'Verify no functional route is stranded without an inbound path.'
    ]
  },
  {
    id: 'automation_cil',
    label: 'Automation and CIL',
    path: [/automation/i, /^lib\/cil\//, /intelligence/i, /signals/i],
    text: [/CIL\b/, /continuous intelligence/i, /signal/i, /automation/i, /insight/i],
    checks: [
      'Verify durable signals, automation hooks, and intelligence outputs are emitted where the feature creates new evidence.',
      'Verify signal freshness and suppression rules are respected.'
    ]
  }
]

// Phase 1: Extract all page routes
function extractRoutes() {
  const pages = []
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
        walk(full)
      } else if (entry.name === 'page.tsx') {
        pages.push(full)
      }
    }
  }
  walk(APP_DIR)
  return pages.map(p => {
    let route = relative(APP_DIR, p).replace(/\\/g, '/').replace(/\/page\.tsx$/, '')
    // Remove route groups
    route = route.replace(/\([^)]*\)\/?/g, '')
    // Ensure leading slash
    route = '/' + route
    if (route === '/') return { file: p, route: '/', static_prefix: '/', dynamic: false }
    // Clean trailing slash
    route = route.replace(/\/$/, '')
    // Get static prefix (before first [param])
    const bracketIdx = route.indexOf('[')
    const static_prefix = bracketIdx > 0 ? route.substring(0, bracketIdx).replace(/\/$/, '') : route
    return { file: p, route, static_prefix, dynamic: bracketIdx > 0 }
  })
}

function gitList(command) {
  try {
    return execSync(command, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function changedFiles() {
  const tracked = gitList('git diff --name-only HEAD')
  const untracked = gitList('git ls-files --others --exclude-standard')
  return Array.from(new Set([...tracked, ...untracked])).filter(file =>
    /^(app|components|lib|database|middleware\.ts|scripts|tests|docs|\.claude)\//.test(file) ||
    file === 'CLAUDE.md' ||
    file === 'AGENTS.md'
  )
}

function routeFromPageFile(file) {
  if (!/^app\//.test(file) || !file.endsWith('/page.tsx')) return null
  let route = file.replace(/^app\//, '').replace(/\/page\.tsx$/, '')
  route = route.replace(/\([^)]*\)\/?/g, '')
  route = '/' + route
  return route.replace(/\/$/, '') || '/'
}

function readProjectFile(file) {
  const full = join(PROJECT_ROOT, file)
  if (!existsSync(full)) return ''
  try {
    return readFileSync(full, 'utf8')
  } catch {
    return ''
  }
}

function buildDomainMatrix(files) {
  const entries = DOMAIN_RULES.map(rule => {
    const evidence = []
    let score = 0

    for (const file of files) {
      let matched = false
      if (rule.alwaysWhen?.(file)) {
        score += 2
        matched = true
      }
      if (rule.path?.some(rx => rx.test(file))) {
        score += 3
        matched = true
      }

      const content = readProjectFile(file)
      const textMatches = rule.text?.filter(rx => rx.test(content)) ?? []
      if (textMatches.length > 0) {
        score += Math.min(4, textMatches.length)
        matched = true
      }

      if (matched && evidence.length < 8) evidence.push(file)
    }

    let relevance = 'not-detected'
    if (score >= 8) relevance = 'high'
    else if (score >= 4) relevance = 'medium'
    else if (score > 0) relevance = 'low'

    return {
      id: rule.id,
      label: rule.label,
      relevance,
      score,
      evidence,
      checks: rule.checks
    }
  })

  return {
    changed_files: files,
    affected_routes: files.map(routeFromPageFile).filter(Boolean),
    domains: entries
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
  }
}

// Phase 2: Build searchable corpus
function buildCorpus() {
  const files = []
  function walk(dir) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.next') continue
          walk(full)
        } else if (/\.(tsx?|js|jsx)$/.test(entry.name)) {
          files.push(full)
        }
      }
    } catch { /* skip unreadable dirs */ }
  }
  SEARCH_DIRS.forEach(walk)
  return files
}

// Phase 3: Count refs for each route
function countRefs(routes, corpusFiles) {
  console.log(`Scanning ${corpusFiles.length} source files for references...`)

  // Read all files into memory once
  const fileContents = new Map()
  for (const f of corpusFiles) {
    try {
      fileContents.set(f, readFileSync(f, 'utf8'))
    } catch { /* skip */ }
  }

  const NAV_DIR = join(PROJECT_ROOT, 'components', 'navigation')
  const results = []
  let orphanCount = 0

  for (let i = 0; i < routes.length; i++) {
    const r = routes[i]

    if (r.route === '/') {
      results.push({ route: '/', dynamic: false, refs: -1, nav_refs: 0, status: 'SKIP', ref_files: [] })
      continue
    }

    const searchTerm = r.dynamic ? r.static_prefix : r.route
    if (searchTerm.length < 4) {
      results.push({ route: r.route, dynamic: r.dynamic, refs: -1, nav_refs: 0, status: 'SKIP', ref_files: [] })
      continue
    }

    const refFiles = []
    let navRefs = 0
    for (const [filePath, content] of fileContents) {
      if (filePath === r.file) continue
      if (content.includes(searchTerm)) {
        const rel = relative(PROJECT_ROOT, filePath).replace(/\\/g, '/')
        refFiles.push(rel)
        if (filePath.startsWith(NAV_DIR)) navRefs++
      }
    }

    let status = 'WIRED'
    if (refFiles.length === 0) {
      status = 'ORPHAN'
      orphanCount++
    } else if (refFiles.length === 1 && navRefs === 0) {
      status = 'WEAK'
    }

    results.push({
      route: r.route,
      dynamic: r.dynamic,
      refs: refFiles.length,
      nav_refs: navRefs,
      status,
      ref_files: refFiles.slice(0, 5)
    })

    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${routes.length} (orphans: ${orphanCount})`)
    }
  }

  return { results, orphanCount }
}

// Main
console.log('=== ChefFlow Wiring Audit ===')
const routes = extractRoutes()
console.log(`Extracted ${routes.length} routes`)

const corpusFiles = buildCorpus()
console.log(`Built corpus: ${corpusFiles.length} source files`)

const { results, orphanCount } = countRefs(routes, corpusFiles)
const domainMatrix = buildDomainMatrix(changedFiles())

const orphans = results.filter(r => r.status === 'ORPHAN')
const weak = results.filter(r => r.status === 'WEAK')
const wired = results.filter(r => r.status === 'WIRED')

const output = {
  generated: new Date().toISOString(),
  summary: {
    total: routes.length,
    wired: wired.length,
    weak: weak.length,
    orphans: orphanCount,
    skipped: results.filter(r => r.status === 'SKIP').length
  },
  post_build_domain_matrix: domainMatrix,
  orphans: orphans.map(r => ({ route: r.route, dynamic: r.dynamic })),
  weak: weak.map(r => ({ route: r.route, dynamic: r.dynamic, refs: r.refs, ref_files: r.ref_files })),
  all_routes: results
}

writeFileSync(join(PROJECT_ROOT, 'scripts', 'wiring-audit-results.json'), JSON.stringify(output, null, 2))

console.log('\n=== COMPLETE ===')
console.log(`Total routes: ${routes.length}`)
console.log(`Wired (2+ refs): ${wired.length}`)
console.log(`Weak (1 ref, no nav): ${weak.length}`)
console.log(`Orphans (0 refs): ${orphanCount}`)
console.log(`Skipped: ${results.filter(r => r.status === 'SKIP').length}`)
console.log('\nOrphans:')
orphans.forEach(r => console.log(`  ${r.route}`))
console.log('\nWeak:')
weak.forEach(r => console.log(`  ${r.route} (${r.refs} ref: ${r.ref_files[0]})`))
console.log('\nPost-build domain matrix:')
if (domainMatrix.domains.length === 0) {
  console.log('  No changed app domains detected')
} else {
  domainMatrix.domains.forEach(domain => {
    console.log(`  ${domain.relevance.toUpperCase()} ${domain.label} (score ${domain.score})`)
    domain.evidence.slice(0, 3).forEach(file => console.log(`    - ${file}`))
  })
}
if (domainMatrix.affected_routes.length > 0) {
  console.log('\nAffected routes:')
  domainMatrix.affected_routes.forEach(route => console.log(`  ${route}`))
}
