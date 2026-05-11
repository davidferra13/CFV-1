/**
 * Wiring Audit - Phase 1 & 2
 * Extracts all Next.js routes, counts inbound references, identifies orphans.
 * Output: scripts/wiring-audit-results.json
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const APP_DIR = join(PROJECT_ROOT, 'app')
const SEARCH_DIRS = ['app', 'components', 'lib'].map(d => join(PROJECT_ROOT, d))

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
