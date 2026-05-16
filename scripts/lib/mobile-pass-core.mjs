const APP_ROUTE_PREFIX = /^app[\\/](?:\(([^)]+)\)[\\/])?(.+)$/
const ROUTE_FILE_PATTERN = /(?:^|[\\/])(page|layout|template)\.(tsx|ts|jsx|js)$/

const ROLE_GROUPS = new Map([
  ['chef', 'chef'],
  ['client', 'client'],
  ['admin', 'admin'],
  ['staff', 'staff'],
  ['partner', 'partner'],
  ['public', 'public'],
])

const ROUTELESS_GROUPS = new Set(['public', 'chef', 'client', 'admin', 'staff', 'partner'])

export function splitChangedFiles(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((file) => file.trim())
    .filter(Boolean)
}

function normalizePath(file) {
  return String(file || '').replace(/\\/g, '/').replace(/^\.\//, '')
}

function routeFromAppFile(file) {
  const normalized = normalizePath(file)
  if (!ROUTE_FILE_PATTERN.test(normalized)) return null
  const match = normalized.match(APP_ROUTE_PREFIX)
  if (!match) return null

  const group = match[1] || ''
  const role = ROLE_GROUPS.get(group) || 'public'
  const routeParts = match[2]
    .replace(/(?:^|\/)(page|layout|template)\.(tsx|ts|jsx|js)$/, '')
    .split('/')
    .filter((part) => part && !part.startsWith('_') && !part.startsWith('@'))
    .filter((part) => !ROUTELESS_GROUPS.has(part))
    .map((part) => part.replace(/^\((.+)\)$/, '').replace(/^\[(.+)\]$/, ':$1'))
    .filter(Boolean)

  const route = `/${routeParts.join('/')}`.replace(/\/+/g, '/')
  return {
    role,
    path: route === '/' ? '/' : route.replace(/\/$/, ''),
    source: normalized,
  }
}

function componentRouteHints(file) {
  const normalized = normalizePath(file)
  if (/^app[\\/]\(public\)[\\/]/.test(normalized)) return [{ role: 'public', path: '/' }]
  if (/^components[\\/]navigation[\\/]public-header/.test(normalized)) return [{ role: 'public', path: '/' }]
  if (/^components[\\/]public[\\/]/.test(normalized)) return [{ role: 'public', path: '/' }]
  if (/^components[\\/]clients[\\/]/.test(normalized)) return [{ role: 'chef', path: '/clients' }]
  if (/^components[\\/]client-intelligence[\\/]/.test(normalized)) {
    return [{ role: 'chef', path: '/clients/intelligence' }]
  }
  if (/^components[\\/]remy[\\/]/.test(normalized) || /^lib[\\/]remy[\\/]/.test(normalized)) {
    return [{ role: 'chef', path: '/remy' }]
  }
  if (
    /^components[\\/]imports[\\/]/.test(normalized) ||
    /^lib[\\/]business-history-import[\\/]/
      .test(normalized)
  ) {
    return [{ role: 'chef', path: '/imports/business-history' }]
  }
  if (/^app[\\/]globals\.css$/.test(normalized)) {
    return [
      { role: 'public', path: '/' },
      { role: 'chef', path: '/dashboard' },
      { role: 'client', path: '/client' },
    ]
  }
  return []
}

export function inferRoutesFromChangedFiles(files) {
  const seen = new Set()
  const routes = []
  for (const file of files) {
    const explicit = routeFromAppFile(file)
    const hints = explicit ? [explicit] : componentRouteHints(file)
    for (const hint of hints) {
      const key = `${hint.role}:${hint.path}`
      if (seen.has(key)) continue
      seen.add(key)
      routes.push({ ...hint, source: hint.source || normalizePath(file) })
    }
  }
  return routes
}

export function classifyMobileFailure(failure) {
  const reason = String(failure?.reason || '')
  const details = String(failure?.details || '')
  if (/http_5xx|navigation_exception|page_error|missing_storage_state|no_matching_routes/i.test(reason)) {
    return 'blocking'
  }
  if (/console_error|horizontal_overflow/i.test(reason)) {
    const overflow = Number(details.match(/overflowX=(\d+)/)?.[1] || 0)
    return overflow > 120 ? 'blocking' : 'serious'
  }
  return 'polish'
}

export function renderContactSheetMarkdown(summary) {
  const executed = Array.isArray(summary?.executed) ? summary.executed : []
  if (executed.length === 0) return 'No screenshots captured.'
  const rows = executed
    .map((item) => {
      const label = `${item.role} ${item.path} ${item.viewport} ${item.state}`
      const screenshot = String(item.screenshot || '').replace(/\\/g, '/')
      return `| ${label} | ${item.overflowX ?? 0}px | ![${label}](${screenshot}) |`
    })
    .join('\n')
  return `| Route | Overflow | Screenshot |
| --- | ---: | --- |
${rows}`
}

export function isUiQueueItem({ title = '', domain = '', scope = '', acceptance = '' } = {}) {
  const haystack = `${title}\n${domain}\n${scope}\n${acceptance}`.toLowerCase()
  if (/\b(api|cron|database|migration|schema|auth inventory|script-only|backend-only)\b/.test(haystack)) {
    return false
  }
  return /\b(ui|route|page|nav|navigation|dashboard|portal|public|homepage|client|mobile|screenshot|browser|form|modal|card|layout|theme|landing)\b/.test(
    haystack
  )
}

export function appendMobileQueueCriteria({ acceptance = '', verification = '' } = {}) {
  const mobileAcceptance = [
    'Mobile layout works at 390px and 430px widths without horizontal overflow, clipped controls, or overlapping text.',
    'Touch targets, navigation, loading, empty, and error states remain usable on mobile.',
  ]
  const mobileVerification = [
    'Run `node scripts/mobile-pass.mjs --queue-id <ID> --infer-changed-routes --append-proof-pack` for UI changes.',
    'For UI queue items, run `build-queue.mjs finish-check --require-mobile` before moving done.',
  ]

  const nextAcceptance = String(acceptance || '')
  const nextVerification = String(verification || '')
  return {
    acceptance: /mobile layout|mobile/i.test(nextAcceptance)
      ? nextAcceptance
      : `${nextAcceptance.trim()}\n${mobileAcceptance.map((line) => `- ${line}`).join('\n')}`.trim(),
    verification: /mobile-pass|mobile/i.test(nextVerification)
      ? nextVerification
      : `${nextVerification.trim()}\n${mobileVerification.map((line) => `- ${line}`).join('\n')}`.trim(),
  }
}
