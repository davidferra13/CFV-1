import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROUTE_POLICY_FILE = 'lib/auth/route-policy.ts'
const OUTPUT_FILE = 'docs/security/route-protection-matrix.md'
const ROUTE_FILE_PATTERN = /^(?:page|route)\.(?:t|j)sx?$/
const API_ROUTE_FILE_PATTERN = /^route\.(?:t|j)sx?$/

const POLICY_ARRAYS = {
  admin: 'ADMIN_PATHS',
  apiSkipAuth: 'API_SKIP_AUTH_PREFIXES',
  chef: 'CHEF_PROTECTED_PATHS',
  client: 'CLIENT_PROTECTED_PATHS',
  partner: 'PARTNER_PROTECTED_PATHS',
  public: 'PUBLIC_UNAUTHENTICATED_PATHS',
  staff: 'STAFF_PROTECTED_PATHS',
  vendor: 'VENDOR_PROTECTED_PATHS',
}

const POLICY_ORDER = ['admin', 'staff', 'partner', 'vendor', 'client', 'chef', 'public']

function slashPath(value) {
  return value.replaceAll(path.sep, '/')
}

export function normalizeAppRoute(filePath) {
  const normalized = slashPath(filePath)
  const appIndex = normalized.split('/').lastIndexOf('app')
  const relative = appIndex >= 0 ? normalized.split('/').slice(appIndex + 1) : normalized.split('/')
  const routeFile = relative.at(-1)
  const segments = relative.slice(0, -1)
  const visibleSegments = []

  for (const segment of segments) {
    if (!segment || (segment.startsWith('(') && segment.endsWith(')'))) continue
    if (segment.startsWith('@')) continue
    if (segment.startsWith('_')) continue

    if (/^\[\[\.\.\..+\]\]$/.test(segment)) {
      visibleSegments.push(`:${segment.slice(5, -2)}*`)
      continue
    }

    if (/^\[\.\.\..+\]$/.test(segment)) {
      visibleSegments.push(`:${segment.slice(4, -1)}*`)
      continue
    }

    if (/^\[.+\]$/.test(segment)) {
      visibleSegments.push(`:${segment.slice(1, -1)}`)
      continue
    }

    visibleSegments.push(segment)
  }

  return {
    file: normalized,
    kind: API_ROUTE_FILE_PATTERN.test(routeFile) ? 'api' : 'page',
    path: visibleSegments.length === 0 ? '/' : `/${visibleSegments.join('/')}`,
  }
}

export function parseRoutePolicySource(source) {
  const uncommentedSource = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
  const policy = {}

  for (const [key, arrayName] of Object.entries(POLICY_ARRAYS)) {
    const match = uncommentedSource.match(
      new RegExp(`export\\s+const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as\\s+const`, 'm')
    )
    const arrayBody = (match?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    policy[key] = [...arrayBody.matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1])
  }

  return policy
}

function matchesPathOrChild(routePath, policyPath) {
  return routePath === policyPath || routePath.startsWith(`${policyPath}/`)
}

function matchesPrefix(routePath, prefix) {
  return routePath.startsWith(prefix)
}

function firstPathMatch(routePath, policyPaths) {
  return policyPaths.find((policyPath) => matchesPathOrChild(routePath, policyPath)) ?? null
}

export function classifyRoute(route, policy) {
  if (route.kind === 'api') {
    const skipPrefix =
      (policy.apiSkipAuth ?? []).find((prefix) => matchesPrefix(route.path, prefix)) ?? null
    const adminMatch = firstPathMatch(route.path, policy.admin ?? [])

    if (adminMatch) {
      return {
        coverage: 'admin',
        matchedPolicy: `ADMIN_PATHS:${adminMatch}`,
        review: 'Admin route handler; verify runtime admin guard or equivalent server-side auth.',
      }
    }

    if (skipPrefix) {
      return {
        coverage: 'technical-skip',
        matchedPolicy: `API_SKIP_AUTH_PREFIXES:${skipPrefix}`,
        review:
          'Skip-auth API namespace; verify endpoint is intentionally public, webhook-signed, cron-authenticated, or self-authenticated.',
      }
    }

    return {
      coverage: 'unknown',
      matchedPolicy: '',
      review: route.path.startsWith('/api')
        ? 'API route not listed in skip-auth prefixes; verify middleware or explicit handler auth coverage.'
        : 'Non-API route handler; verify public intent or explicit handler auth.',
    }
  }

  for (const key of POLICY_ORDER) {
    const match = firstPathMatch(route.path, policy[key] ?? [])
    if (!match) continue

    return {
      coverage: key,
      matchedPolicy: `${POLICY_ARRAYS[key]}:${match}`,
      review:
        key === 'admin'
          ? 'Admin page; page must call requireAdmin() in addition to middleware runtime gate.'
          : '',
    }
  }

  return {
    coverage: 'unknown',
    matchedPolicy: '',
    review:
      'Page route is not classified by route-policy.ts; add policy coverage or document intentional public access.',
  }
}

async function collectRouteFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectRouteFiles(fullPath)))
      continue
    }

    if (ROUTE_FILE_PATTERN.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

function countBy(routes, selector) {
  return routes.reduce((counts, route) => {
    const key = selector(route)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function renderTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`
  const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`
  const rowLines = rows.map(
    (row) => `| ${row.map((cell) => escapeMarkdown(cell || '')).join(' | ')} |`
  )
  return [headerLine, dividerLine, ...rowLines].join('\n')
}

function renderCountTable(title, counts) {
  const rows = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => [key, count])

  return [`## ${title}`, '', renderTable(['Bucket', 'Count'], rows), ''].join('\n')
}

export function renderRouteProtectionMatrix(routes, policy, generatedAt = new Date()) {
  const classifiedRoutes = routes
    .map((route) => ({ ...route, ...classifyRoute(route, policy) }))
    .sort(
      (a, b) =>
        a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path) || a.file.localeCompare(b.file)
    )

  const pages = classifiedRoutes.filter((route) => route.kind === 'page')
  const routeHandlers = classifiedRoutes.filter((route) => route.kind === 'api')
  const unknownRoutes = classifiedRoutes.filter((route) => route.coverage === 'unknown')
  const adminRoutes = classifiedRoutes.filter(
    (route) =>
      route.coverage === 'admin' || route.path === '/admin' || route.path.startsWith('/admin/')
  )
  const apiReviewRoutes = routeHandlers.filter(
    (route) => route.coverage === 'unknown' || route.coverage === 'technical-skip'
  )

  const summaryRows = [
    ['Total routes', classifiedRoutes.length],
    ['Page routes', pages.length],
    ['Route handlers', routeHandlers.length],
    ['Unknown routes', unknownRoutes.length],
    ['Admin routes flagged', adminRoutes.length],
    ['API/route handlers needing review', apiReviewRoutes.length],
  ]

  const matrixRows = classifiedRoutes.map((route) => [
    route.kind,
    route.path,
    route.coverage,
    route.matchedPolicy,
    route.review,
    route.file,
  ])

  const unknownRows = unknownRoutes.map((route) => [
    route.kind,
    route.path,
    route.file,
    route.review,
  ])
  const adminRows = adminRoutes.map((route) => [
    route.kind,
    route.path,
    route.matchedPolicy,
    route.review,
    route.file,
  ])
  const apiRows = apiReviewRoutes.map((route) => [
    route.path,
    route.coverage,
    route.matchedPolicy,
    route.review,
    route.file,
  ])

  return [
    '# Route Protection Matrix',
    '',
    `Generated: ${generatedAt.toISOString()}`,
    '',
    'Source of truth: `lib/auth/route-policy.ts`. This report is generated evidence only and does not change auth behavior.',
    '',
    '## Summary',
    '',
    renderTable(['Metric', 'Count'], summaryRows),
    '',
    renderCountTable(
      'Coverage Counts',
      countBy(classifiedRoutes, (route) => route.coverage)
    ),
    renderCountTable(
      'Route Kind Counts',
      countBy(classifiedRoutes, (route) => route.kind)
    ),
    '## Unknown Routes',
    '',
    unknownRows.length
      ? renderTable(['Kind', 'Path', 'File', 'Review'], unknownRows)
      : 'No routes are currently unknown/unclassified.',
    '',
    '## Admin Routes Flagged',
    '',
    adminRows.length
      ? renderTable(['Kind', 'Path', 'Matched Policy', 'Review', 'File'], adminRows)
      : 'No admin routes found.',
    '',
    '## API And Route Handler Review',
    '',
    apiRows.length
      ? renderTable(['Path', 'Coverage', 'Matched Policy', 'Review', 'File'], apiRows)
      : 'No API or route handlers require review.',
    '',
    '## Full Matrix',
    '',
    renderTable(['Kind', 'Path', 'Coverage', 'Matched Policy', 'Review', 'File'], matrixRows),
    '',
  ].join('\n')
}

export async function generateRouteProtectionMatrix({
  rootDir = process.cwd(),
  generatedAt = new Date(),
} = {}) {
  const policySource = await readFile(path.join(rootDir, ROUTE_POLICY_FILE), 'utf8')
  const policy = parseRoutePolicySource(policySource)
  const routeFiles = await collectRouteFiles(path.join(rootDir, 'app'))
  const routes = routeFiles.map((file) => normalizeAppRoute(path.relative(rootDir, file)))
  const markdown = renderRouteProtectionMatrix(routes, policy, generatedAt)
  const outputPath = path.join(rootDir, OUTPUT_FILE)

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, markdown, 'utf8')

  return { outputPath, routes, markdown }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  generateRouteProtectionMatrix()
    .then(({ outputPath, routes }) => {
      console.log(`Wrote ${slashPath(path.relative(process.cwd(), outputPath))}`)
      console.log(`Routes accounted for: ${routes.length}`)
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
