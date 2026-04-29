import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { discoverPageRouteEntriesInAppDir } from '@/lib/interface/route-inventory'

export type RouteIntegrityFindingType =
  | 'dead_internal_href'
  | 'non_navigable_href'
  | 'placeholder_handler'
  | 'undefined_handler'
  | 'empty_handler'

export type RouteIntegrityFinding = {
  type: RouteIntegrityFindingType
  severity: 'error' | 'warning'
  file: string
  line: number
  href: string | null
  message: string
}

export type RouteIntegrityReport = {
  generatedAt: string
  appRouteCount: number
  sourceFileCount: number
  findingCount: number
  errorCount: number
  warningCount: number
  findings: RouteIntegrityFinding[]
}

export type RouteIntegrityOptions = {
  appDir?: string
  sourceRoots?: string[]
  limit?: number
}

type RouteMatcher = {
  template: string
  regex: RegExp
}

const DEFAULT_SOURCE_ROOTS = ['app', 'components']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const IGNORED_DIRECTORIES = new Set(['.git', '.next', 'node_modules'])

function normalizePathname(input: string): string | null {
  const value = input.trim()
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  const pathOnly = value.split(/[?#]/)[0] ?? '/'
  const normalized = pathOnly.replace(/\/+/g, '/')
  if (normalized.length > 1 && normalized.endsWith('/')) return normalized.slice(0, -1)
  return normalized || '/'
}

function isExternalOrAssetHref(href: string): boolean {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(href) ||
    href.startsWith('//') ||
    href.startsWith('/api/') ||
    href.startsWith('/_next/') ||
    href.startsWith('/static/')
  )
}

function isNonNavigableHref(href: string): boolean {
  const normalized = href.trim().toLowerCase()
  return normalized === '' || normalized === '#' || normalized === 'javascript:void(0)'
}

function routeTemplateToRegex(template: string): RegExp {
  if (template === '/') return /^\/$/

  const pattern = template
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return '.+'
      if (/^\[\[[^\]]+\]\]$/.test(segment)) return '[^/]*'
      if (/^\[[^\]]+\]$/.test(segment)) return '[^/]+'
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')

  return new RegExp(`^/${pattern}$`)
}

function buildRouteMatchers(appDir: string): RouteMatcher[] {
  return discoverPageRouteEntriesInAppDir(appDir).map((entry) => ({
    template: entry.route ?? entry.template,
    regex: routeTemplateToRegex(entry.route ?? entry.template),
  }))
}

function isCoveredRoute(href: string, matchers: RouteMatcher[]): boolean {
  if (isExternalOrAssetHref(href)) return true
  const pathname = normalizePathname(href)
  if (!pathname) return true
  return matchers.some((matcher) => matcher.regex.test(pathname))
}

function relativeFile(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/')
}

function lineNumberForIndex(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length
}

function walkSourceFiles(root: string): string[] {
  const absoluteRoot = path.resolve(root)
  if (!existsSync(absoluteRoot)) return []

  const stat = statSync(absoluteRoot)
  if (stat.isFile()) {
    return SOURCE_EXTENSIONS.has(path.extname(absoluteRoot)) ? [absoluteRoot] : []
  }
  if (!stat.isDirectory()) return []

  const files: string[] = []
  const stack = [absoluteRoot]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue
      const next = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(next)
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(next)
      }
    }
  }

  return files.sort()
}

function templateHrefProbe(href: string): string {
  return href.replace(/\$\{[^}]+\}/g, 'sample')
}

function addHrefFinding(params: {
  findings: RouteIntegrityFinding[]
  source: string
  file: string
  index: number
  href: string
  matchers: RouteMatcher[]
}) {
  const href = params.href.trim()
  if (isNonNavigableHref(href)) {
    params.findings.push({
      type: 'non_navigable_href',
      severity: 'error',
      file: relativeFile(params.file),
      line: lineNumberForIndex(params.source, params.index),
      href,
      message: `Href is not navigable: ${href || '(empty)'}`,
    })
    return
  }

  const probeHref = templateHrefProbe(href)
  const pathname = normalizePathname(probeHref)
  if (!pathname || isCoveredRoute(probeHref, params.matchers)) return

  params.findings.push({
    type: 'dead_internal_href',
    severity: 'error',
    file: relativeFile(params.file),
    line: lineNumberForIndex(params.source, params.index),
    href,
    message: `Internal href does not match a mounted app route: ${href}`,
  })
}

function scanSourceFile(file: string, matchers: RouteMatcher[]): RouteIntegrityFinding[] {
  const source = readFileSync(file, 'utf8')
  const findings: RouteIntegrityFinding[] = []
  const hrefAttributePattern = /\bhref\s*=\s*["']([^"']*)["']/g
  const hrefPropertyPattern = /\bhref:\s*["']([^"']*)["']/g
  const hrefTemplatePattern = /\bhref\s*=\s*\{\s*`([^`]*)`\s*\}/g
  const emptyHandlerPattern = /\bon[A-Z][A-Za-z0-9]*\s*=\s*\{\s*(?:\(\)\s*=>\s*)?\{\s*\}\s*\}/g
  const undefinedHandlerPattern = /\bon[A-Z][A-Za-z0-9]*\s*=\s*\{\s*undefined\s*\}/g
  const placeholderHandlerPattern =
    /\bon[A-Z][A-Za-z0-9]*\s*=\s*\{\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)?\s*(?:=>)?\s*(?:\{\s*)?(?:\/\/\s*)?(?:todo|noop|no-op|not implemented|placeholder|console\.log\s*\(|alert\s*\()/gi
  let match: RegExpExecArray | null

  while ((match = hrefAttributePattern.exec(source))) {
    addHrefFinding({
      findings,
      source,
      file,
      index: match.index,
      href: match[1] ?? '',
      matchers,
    })
  }

  while ((match = hrefPropertyPattern.exec(source))) {
    addHrefFinding({
      findings,
      source,
      file,
      index: match.index,
      href: match[1] ?? '',
      matchers,
    })
  }

  while ((match = hrefTemplatePattern.exec(source))) {
    addHrefFinding({
      findings,
      source,
      file,
      index: match.index,
      href: match[1] ?? '',
      matchers,
    })
  }

  while ((match = emptyHandlerPattern.exec(source))) {
    findings.push({
      type: 'empty_handler',
      severity: 'warning',
      file: relativeFile(file),
      line: lineNumberForIndex(source, match.index),
      href: null,
      message: 'UI handler is empty and may render non-functional behavior.',
    })
  }

  while ((match = undefinedHandlerPattern.exec(source))) {
    findings.push({
      type: 'undefined_handler',
      severity: 'warning',
      file: relativeFile(file),
      line: lineNumberForIndex(source, match.index),
      href: null,
      message: 'UI handler is explicitly undefined.',
    })
  }

  while ((match = placeholderHandlerPattern.exec(source))) {
    findings.push({
      type: 'placeholder_handler',
      severity: 'warning',
      file: relativeFile(file),
      line: lineNumberForIndex(source, match.index),
      href: null,
      message: 'UI handler appears to be a placeholder.',
    })
  }

  return findings
}

export function getRouteIntegrityReport(options: RouteIntegrityOptions = {}): RouteIntegrityReport {
  const appDir = path.resolve(options.appDir ?? 'app')
  const sourceRoots = options.sourceRoots ?? DEFAULT_SOURCE_ROOTS
  const limit = options.limit ?? 100
  const matchers = buildRouteMatchers(appDir)
  const sourceFiles = [...new Set(sourceRoots.flatMap(walkSourceFiles))].sort()
  const findings = sourceFiles
    .flatMap((file) => scanSourceFile(file, matchers))
    .sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === 'error' ? -1 : 1
      if (left.type !== right.type) return left.type.localeCompare(right.type)
      if (left.file !== right.file) return left.file.localeCompare(right.file)
      return left.line - right.line
    })

  const limitedFindings = findings.slice(0, limit)
  const errorCount = findings.filter((finding) => finding.severity === 'error').length
  const warningCount = findings.length - errorCount

  return {
    generatedAt: new Date().toISOString(),
    appRouteCount: matchers.length,
    sourceFileCount: sourceFiles.length,
    findingCount: findings.length,
    errorCount,
    warningCount,
    findings: limitedFindings,
  }
}
