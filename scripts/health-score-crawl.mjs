#!/usr/bin/env node

/**
 * ChefFlow Health Score Crawler
 *
 * Crawls every page as Chef Bob (chef), Client Joy (client), and anonymous (public).
 * Captures 7 signals per page. Outputs a scored JSON + markdown report.
 *
 * Usage:
 *   node scripts/health-score-crawl.mjs
 *   node scripts/health-score-crawl.mjs --role=chef
 *   node scripts/health-score-crawl.mjs --role=client
 *   node scripts/health-score-crawl.mjs --role=chef,client,public
 *   node scripts/health-score-crawl.mjs --headed --max-routes=20
 *   node scripts/health-score-crawl.mjs --screenshots    # capture every page, not just failures
 *   node scripts/health-score-crawl.mjs --baseline       # save as baseline for future diffs
 *   node scripts/health-score-crawl.mjs --compare        # compare against last baseline
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { discoverSiteAuditRoutes } from './site-audit-manifest.mjs'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = process.cwd()
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || process.env.CHEFFLOW_BASE_URL || 'http://127.0.0.1:3000'
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-')
const DEFAULT_OUT_DIR = path.join(ROOT, 'reports', `health-score-${TIMESTAMP}`)
const BASELINE_PATH = path.join(ROOT, 'reports', 'health-score-baseline.json')
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_CONCURRENCY = 3
const BLANK_THRESHOLD = 20

const CONSOLE_IGNORE = [
  /webpack-hmr/i,
  /WebSocket connection to 'ws:\/\/.*_next\/webpack-hmr/i,
  /Warning: Extra attributes from the server/i,
  /Failed to load resource: the server responded with a status of 401/i,
  /Failed to load resource: the server responded with a status of 403/i,
  /Failed to load resource: the server responded with a status of 429/i,
  /violates the following Content Security Policy directive/i,
  /Download the React DevTools/i,
  /Failed to fetch RSC payload .* Falling back to browser navigation/i,
  /Hydration failed/i,
  /There was an error while hydrating/i,
]

// Patterns that indicate a page is showing fake/zero data instead of an error state
const ZERO_HALLUCINATION_PATTERNS = [
  /\$0\.00/,
  /\$0/,
  /0 events/i,
  /0 clients/i,
  /0 inquiries/i,
  /0 recipes/i,
  /NaN/,
  /undefined/,
  /null/,
]

const ROLE_CREDS = {
  chef: { file: '.auth/chef-bob.json', fallback: { email: 'chef-bob@chefflow.test', password: 'ChefBobFlow!2026' } },
  client: { file: '.auth/client.json', fallback: { email: 'emma@northandpine.co', password: 'E2eClientTest!2026' } },
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    outDir: DEFAULT_OUT_DIR,
    maxRoutes: Infinity,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
    roles: ['chef', 'client', 'public'],
    headed: false,
    screenshots: false,
    baseline: false,
    compare: false,
    paths: [],
  }
  for (const arg of argv) {
    if (arg === '--headed') opts.headed = true
    if (arg === '--screenshots') opts.screenshots = true
    if (arg === '--baseline') opts.baseline = true
    if (arg === '--compare') opts.compare = true
    if (arg.startsWith('--out-dir=')) opts.outDir = path.resolve(ROOT, arg.slice(10))
    if (arg.startsWith('--max-routes=')) opts.maxRoutes = Number(arg.slice(13)) || Infinity
    if (arg.startsWith('--timeout-ms=')) opts.timeoutMs = Number(arg.slice(13)) || DEFAULT_TIMEOUT_MS
    if (arg.startsWith('--concurrency=')) opts.concurrency = Number(arg.slice(14)) || DEFAULT_CONCURRENCY
    if (arg.startsWith('--role=')) opts.roles = arg.slice(7).split(',').map(s => s.trim()).filter(Boolean)
    if (arg.startsWith('--path=')) opts.paths.push(arg.slice(7))
  }
  return opts
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }) }

function slugify(v) {
  return (v.replace(/^\/+/, '').replace(/[^a-zA-Z0-9._/-]/g, '-').replace(/\//g, '__').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'root')
}

function shouldIgnore(msg) { return CONSOLE_IGNORE.some(p => p.test(msg)) }
function isAuthRedirect(url) { return /\/auth\/signin|\/staff-login|\/unauthorized/i.test(url) }
function pathOf(url) { try { return new URL(url).pathname } catch { return url } }

function loadCreds(role) {
  const cfg = ROLE_CREDS[role]
  if (!cfg) return null
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, cfg.file), 'utf8'))
  } catch {
    return cfg.fallback
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function authenticate(context, creds, timeoutMs) {
  for (let i = 1; i <= 3; i++) {
    const res = await context.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email: creds.email, password: creds.password },
      timeout: Math.max(timeoutMs, 60_000),
    })
    if (res.ok()) return
    if (i === 3) throw new Error(`Auth failed: ${res.status()} ${await res.text().catch(() => '')}`)
    await new Promise(r => setTimeout(r, 3000))
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classify(route, r) {
  const fp = pathOf(r.currentUrl)
  if (r.navigationError) {
    return { status: /timeout/i.test(r.navigationError) ? 'timeout' : 'nav_error', fail: true, detail: r.navigationError }
  }
  if (route.expected?.type === 'redirect-ok' && route.expected.pattern?.test(fp)) {
    return { status: 'ok', fail: false, detail: route.expected.reason || '' }
  }
  if (r.httpStatus >= 500) return { status: 'http_5xx', fail: true, detail: `HTTP ${r.httpStatus}` }
  if (isAuthRedirect(r.currentUrl)) return { status: 'auth_redirect', fail: true, detail: fp }
  if (r.jsErrors.length > 0) return { status: 'js_error', fail: true, detail: r.jsErrors[0] }
  if (r.bodyLength < BLANK_THRESHOLD && route.expected?.type !== 'not-found-ok') {
    return { status: 'blank', fail: true, detail: `body ${r.bodyLength} chars` }
  }
  if (r.httpStatus === 404) {
    return { status: route.expected?.type === 'not-found-ok' ? 'expected_404' : 'not_found', fail: false, detail: '' }
  }
  if (fp !== route.path && route.expected?.type !== 'redirect-ok') {
    return { status: 'redirect', fail: false, detail: fp }
  }
  return { status: 'ok', fail: false, detail: '' }
}

// ---------------------------------------------------------------------------
// Core: Audit a single page (7 signals)
// ---------------------------------------------------------------------------

async function auditPage(page, route, opts, runDir) {
  const url = `${BASE_URL}${route.path}`
  const consoleErrors = []
  const consoleWarnings = []
  const pageErrors = []
  const networkFailures = []

  // Signal 1+2: Console + Page errors
  const onConsole = msg => {
    const text = msg.text()
    if (msg.type() === 'error' && !shouldIgnore(text)) consoleErrors.push(text)
    else if (msg.type() === 'warning') consoleWarnings.push(text)
  }
  const onPageError = err => pageErrors.push(err.message)

  // Signal 3: Network failures (4xx/5xx API calls)
  const onResponse = res => {
    const s = res.status()
    const u = res.url()
    if (s >= 400 && !u.includes('_next/') && !u.includes('webpack') && !u.includes('favicon')) {
      networkFailures.push({ url: u, status: s })
    }
  }

  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('response', onResponse)

  const startMs = Date.now()
  const result = {
    role: route.role,
    path: route.path,
    template: route.template,
    sourceFile: route.sourceFile,
    url,
    currentUrl: url,
    httpStatus: 0,
    title: '',
    bodyLength: 0,
    bodySample: '',
    headings: [],
    controls: { links: 0, buttons: 0, enabledButtons: 0, forms: 0, inputs: 0 },
    topActions: [],
    // Signal 1: Console errors
    jsErrors: [],
    // Signal 2: Network failures
    networkFailures: [],
    // Signal 3: Load time
    loadTimeMs: 0,
    // Signal 4: Screenshot path
    screenshotPath: '',
    // Signal 5: Accessibility (basic)
    a11y: { missingLabels: 0, missingAlt: 0, emptyButtons: 0, emptyLinks: 0 },
    // Signal 6: Dead clicks (buttons with no handler)
    deadElements: { disabledButtons: 0, emptyOnClick: 0 },
    // Signal 7: Zero hallucination (suspicious zeros/NaN)
    zeroHallucination: [],
    // Classification
    status: '',
    fail: false,
    detail: '',
    navigationError: '',
    warnings: consoleWarnings,
  }

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeoutMs })
    result.httpStatus = response?.status() || 0
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})
    result.loadTimeMs = Date.now() - startMs
    result.currentUrl = page.url()
    result.title = await page.title().catch(() => '')

    // Capture all 7 signals in one evaluate
    const snapshot = await page.evaluate((zeroPatterns) => {
      const clean = v => String(v || '').replace(/\s+/g, ' ').trim()
      const bodyText = clean(document.body?.innerText || '')
      const headings = Array.from(document.querySelectorAll('h1,h2'))
        .map(n => clean(n.textContent)).filter(Boolean).slice(0, 8)
      const allButtons = Array.from(document.querySelectorAll('button'))
      const topActions = Array.from(document.querySelectorAll('button,a[href]'))
        .map(n => clean(n.textContent || n.getAttribute('aria-label') || n.getAttribute('title') || ''))
        .filter(Boolean).slice(0, 20)

      // Signal 5: Basic accessibility
      const missingLabels = document.querySelectorAll('input:not([aria-label]):not([id]), select:not([aria-label]):not([id]), textarea:not([aria-label]):not([id])').length
      const inputsWithId = document.querySelectorAll('input[id], select[id], textarea[id]')
      let unlabeled = missingLabels
      inputsWithId.forEach(el => {
        if (!document.querySelector(`label[for="${el.id}"]`) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
          unlabeled++
        }
      })
      const missingAlt = document.querySelectorAll('img:not([alt])').length
      const emptyButtons = allButtons.filter(b => !clean(b.textContent) && !b.getAttribute('aria-label') && !b.getAttribute('title')).length
      const emptyLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => !clean(a.textContent) && !a.getAttribute('aria-label') && !a.getAttribute('title')).length

      // Signal 6: Dead elements
      const disabledButtons = allButtons.filter(b => b.disabled).length
      // Check for onClick="" or onclick that's empty/noop
      const emptyOnClick = Array.from(document.querySelectorAll('[onclick]')).filter(el => {
        const handler = el.getAttribute('onclick')
        return !handler || handler.trim() === '' || handler.trim() === 'void(0)' || handler.trim() === 'return false'
      }).length

      // Signal 7: Zero hallucination scan
      const zeroHits = []
      for (const pattern of zeroPatterns) {
        const re = new RegExp(pattern, 'i')
        // Only flag if the body text matches AND the page seems to have loaded data sections
        if (re.test(bodyText) && bodyText.length > 200) {
          // Find the context around the match
          const match = bodyText.match(re)
          if (match) {
            const idx = match.index || 0
            const context = bodyText.slice(Math.max(0, idx - 30), idx + match[0].length + 30)
            zeroHits.push({ pattern: match[0], context })
          }
        }
      }

      return {
        bodyLength: bodyText.length,
        bodySample: bodyText.slice(0, 500),
        headings,
        controls: {
          links: document.querySelectorAll('a[href]').length,
          buttons: allButtons.length,
          enabledButtons: allButtons.filter(b => !b.disabled).length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input,select,textarea').length,
        },
        topActions,
        a11y: { missingLabels: unlabeled, missingAlt, emptyButtons, emptyLinks },
        deadElements: { disabledButtons, emptyOnClick },
        zeroHallucination: zeroHits,
      }
    }, ZERO_HALLUCINATION_PATTERNS.map(p => p.source))

    Object.assign(result, snapshot)
  } catch (err) {
    result.navigationError = err instanceof Error ? err.message : String(err)
    result.currentUrl = page.url() || url
    result.loadTimeMs = Date.now() - startMs
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
    page.off('response', onResponse)
  }

  result.jsErrors = [...consoleErrors, ...pageErrors]
  result.networkFailures = networkFailures

  const cls = classify(route, result)
  result.status = cls.status
  result.fail = cls.fail
  result.detail = cls.detail

  // Screenshot on failure, or always if --screenshots
  if (result.fail || opts.screenshots) {
    const dir = path.join(runDir, result.fail ? 'failure-screenshots' : 'screenshots')
    ensureDir(dir)
    const fp = path.join(dir, `${slugify(route.path)}.png`)
    await page.screenshot({ path: fp, fullPage: true, timeout: 10_000 }).catch(() => {})
    result.screenshotPath = path.relative(ROOT, fp).replace(/\\/g, '/')
  }

  return result
}

// ---------------------------------------------------------------------------
// Scoring Engine
// ---------------------------------------------------------------------------

function scorePage(r) {
  let score = 100
  let deductions = []

  // Hard failures
  if (r.fail) { score -= 40; deductions.push(`-40 hard failure (${r.status})`) }
  if (r.httpStatus >= 500) { score -= 30; deductions.push('-30 server error') }

  // Console/JS errors
  if (r.jsErrors.length > 0) {
    const d = Math.min(r.jsErrors.length * 5, 20)
    score -= d; deductions.push(`-${d} JS errors (${r.jsErrors.length})`)
  }

  // Network failures
  if (r.networkFailures.length > 0) {
    const d = Math.min(r.networkFailures.length * 3, 15)
    score -= d; deductions.push(`-${d} network failures (${r.networkFailures.length})`)
  }

  // Slow load
  if (r.loadTimeMs > 10000) { score -= 10; deductions.push(`-10 very slow (${r.loadTimeMs}ms)`) }
  else if (r.loadTimeMs > 5000) { score -= 5; deductions.push(`-5 slow (${r.loadTimeMs}ms)`) }

  // Accessibility
  const a11yIssues = (r.a11y?.missingLabels || 0) + (r.a11y?.missingAlt || 0) + (r.a11y?.emptyButtons || 0) + (r.a11y?.emptyLinks || 0)
  if (a11yIssues > 10) { score -= 10; deductions.push(`-10 many a11y issues (${a11yIssues})`) }
  else if (a11yIssues > 3) { score -= 5; deductions.push(`-5 a11y issues (${a11yIssues})`) }

  // Zero hallucination
  if (r.zeroHallucination?.length > 0) {
    const d = Math.min(r.zeroHallucination.length * 5, 15)
    score -= d; deductions.push(`-${d} suspicious zeros (${r.zeroHallucination.length})`)
  }

  // Blank page
  if (r.bodyLength < BLANK_THRESHOLD && !r.fail) { score -= 20; deductions.push('-20 blank page') }

  return { score: Math.max(0, score), deductions }
}

function computeDomainScores(results) {
  const domains = {}
  for (const r of results) {
    const p = r.path || ''
    let domain = 'other'
    if (p.startsWith('/dashboard') || p === '/') domain = 'Dashboard'
    else if (p.startsWith('/events') || p.startsWith('/event')) domain = 'Events'
    else if (p.startsWith('/clients') || p.startsWith('/client')) domain = 'Clients'
    else if (p.startsWith('/inquiries') || p.startsWith('/quotes') || p.startsWith('/leads') || p.startsWith('/calls') || p.startsWith('/partners') || p.startsWith('/prospecting') || p.startsWith('/guest-leads') || p.startsWith('/proposals') || p.startsWith('/testimonials') || p.startsWith('/rate-card')) domain = 'Pipeline'
    else if (p.startsWith('/finance') || p.startsWith('/financials') || p.startsWith('/expenses') || p.startsWith('/goals')) domain = 'Financials'
    else if (p.startsWith('/culinary') || p.startsWith('/menus') || p.startsWith('/recipes') || p.startsWith('/inventory') || p.startsWith('/culinary-board')) domain = 'Culinary'
    else if (p.startsWith('/calendar') || p.startsWith('/schedule') || p.startsWith('/waitlist') || p.startsWith('/production')) domain = 'Calendar'
    else if (p.startsWith('/inbox') || p.startsWith('/chat')) domain = 'Messaging'
    else if (p.startsWith('/staff') || p.startsWith('/tasks') || p.startsWith('/stations')) domain = 'Staff & Ops'
    else if (p.startsWith('/analytics') || p.startsWith('/intelligence')) domain = 'Analytics'
    else if (p.startsWith('/daily') || p.startsWith('/briefing')) domain = 'Daily Ops'
    else if (p.startsWith('/settings')) domain = 'Settings'
    else if (p.startsWith('/marketing') || p.startsWith('/social') || p.startsWith('/content')) domain = 'Marketing'
    else if (p.startsWith('/network') || p.startsWith('/community') || p.startsWith('/circles')) domain = 'Network'
    else if (p.startsWith('/loyalty') || p.startsWith('/rewards')) domain = 'Loyalty'
    else if (p.startsWith('/safety') || p.startsWith('/reputation') || p.startsWith('/operations')) domain = 'Safety & Ops'
    else if (p.startsWith('/my-')) domain = 'Client Portal'
    else if (p.startsWith('/book') || p.startsWith('/chef/') || p.startsWith('/chefs') || p.startsWith('/nearby') || p.startsWith('/ingredients') || p.startsWith('/ingredient') || p.startsWith('/discover') || p.startsWith('/hub') || p.startsWith('/compare') || p.startsWith('/for-operators') || p.startsWith('/marketplace') || p.startsWith('/about') || p.startsWith('/faq') || p.startsWith('/how-it-works') || p.startsWith('/pricing') || p.startsWith('/trust') || p.startsWith('/contact') || p.startsWith('/services') || p.startsWith('/customers') || p.startsWith('/blog') || p.startsWith('/gift-cards')) domain = 'Public Pages'
    else if (p.startsWith('/cannabis')) domain = 'Cannabis'
    else if (p.startsWith('/travel') || p.startsWith('/aar') || p.startsWith('/reviews') || p.startsWith('/charity')) domain = 'Reviews & Ops'
    else if (p.startsWith('/onboarding') || p.startsWith('/import') || p.startsWith('/help')) domain = 'Onboarding'
    else if (p.startsWith('/documents') || p.startsWith('/contracts')) domain = 'Documents'
    else if (p.startsWith('/commerce')) domain = 'Commerce'
    else if (p.startsWith('/remy') || p.startsWith('/commands')) domain = 'Remy AI'

    if (!domains[domain]) domains[domain] = { pages: [], scores: [], failures: 0, total: 0 }
    const { score, deductions } = scorePage(r)
    r._score = score
    r._deductions = deductions
    domains[domain].pages.push(r)
    domains[domain].scores.push(score)
    domains[domain].total++
    if (r.fail) domains[domain].failures++
  }

  const domainScores = {}
  for (const [name, data] of Object.entries(domains)) {
    const avg = data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0
    domainScores[name] = {
      score: avg,
      pages: data.total,
      failures: data.failures,
      worst: data.pages.sort((a, b) => (a._score || 0) - (b._score || 0)).slice(0, 3).map(p => ({ path: p.path, score: p._score, reason: p._deductions?.[0] || '' })),
    }
  }
  return domainScores
}

function computeOverallScore(domainScores) {
  const all = Object.values(domainScores)
  if (all.length === 0) return 0
  // Weighted by page count
  let totalWeight = 0
  let weightedSum = 0
  for (const d of all) {
    weightedSum += d.score * d.pages
    totalWeight += d.pages
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function generateReport(opts, results, domainScores, overall, baseline) {
  const lines = []
  const grade = overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F'
  const bar = (score) => {
    const filled = Math.round(score / 100 * 30)
    return '[' + '='.repeat(filled) + '-'.repeat(30 - filled) + ']'
  }

  lines.push('# ChefFlow Health Score Report')
  lines.push('')
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push(`**Base URL:** ${BASE_URL}`)
  lines.push(`**Roles:** ${opts.roles.join(', ')}`)
  lines.push(`**Pages crawled:** ${results.length}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(`## Overall Score: ${overall}/100 (${grade})`)
  lines.push('')
  lines.push(`\`\`\``)
  lines.push(`HEALTH ${bar(overall)} ${overall}/100`)
  lines.push(`\`\`\``)
  lines.push('')

  if (baseline) {
    const delta = overall - (baseline.overall || 0)
    const arrow = delta > 0 ? '+' : delta < 0 ? '' : ''
    lines.push(`**vs baseline:** ${arrow}${delta} (was ${baseline.overall}/100 on ${baseline.date || 'unknown'})`)
    lines.push('')
  }

  lines.push('## Domain Scores')
  lines.push('')
  lines.push('| Domain | Score | Pages | Failures | Worst Page |')
  lines.push('|--------|-------|-------|----------|------------|')

  const sorted = Object.entries(domainScores).sort((a, b) => a[1].score - b[1].score)
  for (const [name, data] of sorted) {
    const worst = data.worst[0]
    const worstStr = worst ? `${worst.path} (${worst.score}) ${worst.reason}` : '-'
    const deltaStr = baseline?.domains?.[name] ? ` (${data.score - baseline.domains[name].score >= 0 ? '+' : ''}${data.score - baseline.domains[name].score})` : ''
    lines.push(`| ${name} | ${data.score}/100${deltaStr} | ${data.pages} | ${data.failures} | ${worstStr} |`)
  }

  // Failures section
  const failures = results.filter(r => r.fail)
  lines.push('')
  lines.push(`## Failures (${failures.length})`)
  lines.push('')
  if (failures.length === 0) {
    lines.push('No hard failures.')
  } else {
    for (const f of failures.slice(0, 50)) {
      lines.push(`- **${f.path}** [${f.role}] ${f.status}: ${f.detail || '-'}`)
    }
    if (failures.length > 50) lines.push(`... and ${failures.length - 50} more`)
  }

  // JS Errors section
  const jsErrorPages = results.filter(r => r.jsErrors.length > 0 && !r.fail)
  lines.push('')
  lines.push(`## JS Errors (non-failing pages: ${jsErrorPages.length})`)
  lines.push('')
  for (const p of jsErrorPages.slice(0, 20)) {
    lines.push(`- **${p.path}**: ${p.jsErrors[0].slice(0, 120)}`)
  }

  // Network failures section
  const netFailPages = results.filter(r => r.networkFailures.length > 0)
  lines.push('')
  lines.push(`## Network Failures (${netFailPages.length} pages)`)
  lines.push('')
  for (const p of netFailPages.slice(0, 20)) {
    for (const nf of p.networkFailures.slice(0, 3)) {
      lines.push(`- **${p.path}**: ${nf.status} ${nf.url.slice(0, 100)}`)
    }
  }

  // Zero hallucination section
  const zeroPages = results.filter(r => r.zeroHallucination?.length > 0)
  lines.push('')
  lines.push(`## Zero Hallucination Warnings (${zeroPages.length} pages)`)
  lines.push('')
  for (const p of zeroPages.slice(0, 20)) {
    for (const z of p.zeroHallucination.slice(0, 2)) {
      lines.push(`- **${p.path}**: \`${z.pattern}\` in "...${z.context}..."`)
    }
  }

  // Accessibility section
  const a11yPages = results.filter(r => {
    const total = (r.a11y?.missingLabels || 0) + (r.a11y?.missingAlt || 0) + (r.a11y?.emptyButtons || 0) + (r.a11y?.emptyLinks || 0)
    return total > 5
  })
  lines.push('')
  lines.push(`## Accessibility Issues (${a11yPages.length} pages with 5+ issues)`)
  lines.push('')
  for (const p of a11yPages.slice(0, 20)) {
    lines.push(`- **${p.path}**: labels=${p.a11y.missingLabels} alt=${p.a11y.missingAlt} empty-btn=${p.a11y.emptyButtons} empty-link=${p.a11y.emptyLinks}`)
  }

  // Slowest pages
  const slowest = [...results].sort((a, b) => b.loadTimeMs - a.loadTimeMs).slice(0, 15)
  lines.push('')
  lines.push('## Slowest Pages')
  lines.push('')
  for (const p of slowest) {
    lines.push(`- ${p.loadTimeMs}ms **${p.path}** [${p.role}]`)
  }

  // Interactive coverage
  const interactive = results.filter(r => r.controls.forms > 0 || r.controls.inputs > 0)
  const readOnly = results.filter(r => r.controls.forms === 0 && r.controls.inputs === 0)
  lines.push('')
  lines.push('## Coverage')
  lines.push('')
  lines.push(`- Interactive pages (forms/inputs): ${interactive.length}`)
  lines.push(`- Read-only pages: ${readOnly.length}`)
  lines.push(`- Total controls: ${results.reduce((s, r) => s + r.controls.buttons + r.controls.inputs + r.controls.links, 0)}`)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  ensureDir(opts.outDir)

  console.log(`[health-score] Starting crawl: roles=${opts.roles.join(',')} base=${BASE_URL}`)

  // Discover routes
  const manifest = await discoverSiteAuditRoutes(ROOT)
  const roleSet = new Set(opts.roles)
  const pathSet = new Set(opts.paths)
  const routes = manifest.routes
    .filter(r => roleSet.has(r.role))
    .filter(r => pathSet.size === 0 || pathSet.has(r.path))
    .slice(0, opts.maxRoutes === Infinity ? undefined : opts.maxRoutes)
  const skipped = manifest.skipped.filter(r => roleSet.has(r.role))

  console.log(`[health-score] ${routes.length} routes selected, ${skipped.length} skipped`)

  // Group routes by role for auth
  const byRole = {}
  for (const r of routes) {
    if (!byRole[r.role]) byRole[r.role] = []
    byRole[r.role].push(r)
  }

  const browser = await chromium.launch({ headless: !opts.headed })
  const allResults = []

  for (const [role, roleRoutes] of Object.entries(byRole)) {
    console.log(`[health-score] Crawling ${roleRoutes.length} ${role} routes...`)

    // Authenticate
    let storageState = undefined
    const creds = loadCreds(role)
    if (creds) {
      const authCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      await authenticate(authCtx, creds, opts.timeoutMs)
      storageState = await authCtx.storageState()
      await authCtx.close()
      console.log(`[health-score] Authenticated as ${role} (${creds.email})`)
    }

    // Crawl with worker pool
    const queue = [...roleRoutes]
    const results = []
    let completed = 0
    const startMs = Date.now()

    async function worker(wid) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        ...(storageState ? { storageState } : {}),
      })
      const page = await ctx.newPage()
      page.setDefaultTimeout(opts.timeoutMs)
      page.setDefaultNavigationTimeout(opts.timeoutMs)

      while (queue.length > 0) {
        const route = queue.shift()
        if (!route) break
        completed++
        if (completed % 10 === 0 || completed === 1) {
          const elapsed = Math.round((Date.now() - startMs) / 1000)
          console.log(`[health-score] [${role}] ${completed}/${roleRoutes.length} (${elapsed}s)`)
        }
        const result = await auditPage(page, route, opts, opts.outDir)
        results.push(result)

        if (result.fail) {
          console.log(`[health-score] FAIL ${route.path}: ${result.status} ${result.detail?.slice(0, 80)}`)
        }
      }

      await ctx.close()
    }

    await Promise.all(
      Array.from({ length: Math.min(opts.concurrency, roleRoutes.length) }, (_, i) => worker(i))
    )

    allResults.push(...results)
    const elapsed = Math.round((Date.now() - startMs) / 1000)
    const fails = results.filter(r => r.fail).length
    console.log(`[health-score] [${role}] Done: ${results.length} pages, ${fails} failures, ${elapsed}s`)
  }

  await browser.close()

  // Score
  const domainScores = computeDomainScores(allResults)
  const overall = computeOverallScore(domainScores)

  // Load baseline for comparison
  let baseline = null
  if (opts.compare && fs.existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
  }

  // Write reports
  const report = generateReport(opts, allResults, domainScores, overall, baseline)
  const reportPath = path.join(opts.outDir, 'report.md')
  fs.writeFileSync(reportPath, report)

  const scorecard = {
    date: new Date().toISOString(),
    baseUrl: BASE_URL,
    roles: opts.roles,
    overall,
    domains: domainScores,
    stats: {
      totalPages: allResults.length,
      failures: allResults.filter(r => r.fail).length,
      jsErrorPages: allResults.filter(r => r.jsErrors.length > 0).length,
      networkFailPages: allResults.filter(r => r.networkFailures.length > 0).length,
      zeroHallucinationPages: allResults.filter(r => r.zeroHallucination?.length > 0).length,
      a11yIssuePages: allResults.filter(r => ((r.a11y?.missingLabels || 0) + (r.a11y?.missingAlt || 0) + (r.a11y?.emptyButtons || 0) + (r.a11y?.emptyLinks || 0)) > 3).length,
      avgLoadTimeMs: Math.round(allResults.reduce((s, r) => s + r.loadTimeMs, 0) / (allResults.length || 1)),
      slowestPage: [...allResults].sort((a, b) => b.loadTimeMs - a.loadTimeMs)[0]?.path || '',
      interactivePages: allResults.filter(r => r.controls.forms > 0 || r.controls.inputs > 0).length,
      totalControls: allResults.reduce((s, r) => s + r.controls.buttons + r.controls.inputs + r.controls.links, 0),
    },
    skipped: skipped.length,
  }

  const scorecardPath = path.join(opts.outDir, 'scorecard.json')
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2))

  // Full results (large file)
  const fullPath = path.join(opts.outDir, 'full-results.json')
  fs.writeFileSync(fullPath, JSON.stringify({ scorecard, results: allResults }, null, 2))

  // Save as baseline if requested
  if (opts.baseline) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(scorecard, null, 2))
    console.log(`[health-score] Saved as baseline: ${BASELINE_PATH}`)
  }

  // Print summary
  console.log('')
  console.log('='.repeat(60))
  console.log(`  CHEFFLOW HEALTH SCORE: ${overall}/100`)
  console.log('='.repeat(60))
  console.log('')
  for (const [name, data] of Object.entries(domainScores).sort((a, b) => a[1].score - b[1].score)) {
    const bar = '='.repeat(Math.round(data.score / 100 * 20))
    const gap = '-'.repeat(20 - bar.length)
    const delta = baseline?.domains?.[name] ? ` (${data.score - baseline.domains[name].score >= 0 ? '+' : ''}${data.score - baseline.domains[name].score})` : ''
    console.log(`  ${name.padEnd(20)} [${bar}${gap}] ${data.score}/100${delta}  (${data.pages} pages, ${data.failures} fail)`)
  }
  console.log('')
  console.log(`  Report:    ${reportPath}`)
  console.log(`  Scorecard: ${scorecardPath}`)
  console.log(`  Full data: ${fullPath}`)
  if (baseline) {
    const delta = overall - (baseline.overall || 0)
    console.log(`  vs baseline: ${delta >= 0 ? '+' : ''}${delta}`)
  }
  console.log('')

  if (scorecard.stats.failures > 0) process.exitCode = 1
}

main().catch(err => {
  console.error('[health-score] Fatal:', err)
  process.exitCode = 1
})
