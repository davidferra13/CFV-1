#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  parseArgs,
  relative,
  repoRoot,
  splitCsv,
} from './agent-skill-utils.mjs'

const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const IGNORE_DIRS = new Set(['.git', '.next', 'node_modules'])

function usage() {
  console.log(`Usage:
  node devtools/workflow-gap-scanner.mjs [--paths a,b] [--app-dir app] [--json]

Scans UI source for obvious workflow gaps: dead internal hrefs, empty handlers, and public marketplace links without attribution.`)
}

function normalizePathname(input) {
  const value = String(input || '').trim()
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  const pathOnly = value.split(/[?#]/)[0]
  return pathOnly.length > 1 ? pathOnly.replace(/\/+$/g, '') : '/'
}

function walkFiles(root, predicate = () => true) {
  const absolute = path.resolve(root)
  if (!fs.existsSync(absolute)) return []
  const stat = fs.statSync(absolute)
  if (stat.isFile()) return predicate(absolute) ? [absolute] : []
  if (!stat.isDirectory()) return []

  const files = []
  const stack = [absolute]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const next = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(next)
      } else if (entry.isFile() && predicate(next)) {
        files.push(next)
      }
    }
  }
  return files.sort()
}

function fileToRoute(file, appDir) {
  const relativeFile = path.relative(appDir, file).replace(/\\/g, '/')
  const parts = relativeFile.split('/')
  const leaf = parts.pop()
  if (!leaf || !['page.tsx', 'page.ts', 'route.ts', 'route.tsx'].includes(leaf)) return null
  const routeParts = parts.filter((part) => !part.startsWith('(') && !part.endsWith(')'))
  const route = `/${routeParts.join('/')}`.replace(/\/+/g, '/')
  return normalizePathname(route || '/')
}

function routeToRegex(route) {
  if (route === '/') return /^\/$/
  const pattern = route
    .split('/')
    .filter(Boolean)
    .map((part) => {
      if (/^\[\.\.\.[^\]]+\]$/.test(part)) return '.+'
      if (/^\[\[[^\]]+\]\]$/.test(part)) return '[^/]*'
      if (/^\[[^\]]+\]$/.test(part)) return '[^/]+'
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return new RegExp(`^/${pattern}$`)
}

function buildRouteInventory(appDir) {
  const routes = walkFiles(appDir, (file) => ['.ts', '.tsx'].includes(path.extname(file)))
    .map((file) => fileToRoute(file, path.resolve(appDir)))
    .filter(Boolean)
  return [...new Set(routes)].sort().map((route) => ({
    route,
    regex: routeToRegex(route),
  }))
}

function isCoveredRoute(href, inventory) {
  const pathname = normalizePathname(href)
  if (!pathname) return true
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/')
  ) {
    return true
  }
  return inventory.some((entry) => entry.regex.test(pathname))
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

function scanFile(file, inventory) {
  const text = fs.readFileSync(file, 'utf8')
  const findings = []
  const hrefPattern = /\bhref\s*=\s*["']([^"']+)["']/g
  const emptyHandlerPattern = /\bon[A-Z][A-Za-z0-9]*\s*=\s*\{\s*(?:\(\)\s*=>\s*)?\{\s*\}\s*\}/g
  let match

  while ((match = hrefPattern.exec(text))) {
    const href = match[1]
    const pathname = normalizePathname(href)
    if (!pathname) continue
    if (!isCoveredRoute(pathname, inventory)) {
      findings.push({
        type: 'dead_internal_href',
        file: relative(file),
        line: lineNumberForIndex(text, match.index),
        href,
        message: `Internal href does not match a mounted app route: ${href}`,
      })
    }
    if (pathname === '/marketplace-chefs' && !href.includes('source_page=')) {
      findings.push({
        type: 'missing_public_attribution',
        file: relative(file),
        line: lineNumberForIndex(text, match.index),
        href,
        message: 'Marketplace CTA is missing source_page attribution.',
      })
    }
  }

  while ((match = emptyHandlerPattern.exec(text))) {
    findings.push({
      type: 'empty_handler',
      file: relative(file),
      line: lineNumberForIndex(text, match.index),
      message: 'UI handler is empty and may render non-functional behavior.',
    })
  }

  return findings
}

function selectedFiles(pathsArg) {
  const paths = splitCsv(pathsArg)
  const roots = paths.length ? paths : ['app', 'components']
  return roots.flatMap((entry) =>
    walkFiles(entry, (file) => DEFAULT_EXTENSIONS.has(path.extname(file))),
  )
}

try {
  const args = parseArgs()
  if (args.help) {
    usage()
    process.exit(0)
  }
  const appDir = path.resolve(String(args['app-dir'] || 'app'))
  const inventory = buildRouteInventory(appDir)
  const files = selectedFiles(args.paths)
  const findings = files.flatMap((file) => scanFile(file, inventory))
  const result = {
    ok: findings.length === 0,
    scanned_files: files.length,
    route_count: inventory.length,
    finding_count: findings.length,
    findings,
  }

  if (args.json || args.stdout) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length) {
    for (const finding of findings) {
      console.log(`${finding.file}:${finding.line} ${finding.type} ${finding.message}`)
    }
  } else {
    console.log('No workflow gaps found.')
  }
  process.exit(result.ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
