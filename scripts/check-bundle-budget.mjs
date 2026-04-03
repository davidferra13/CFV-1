#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const buildDir = path.resolve(process.cwd(), process.env.BUNDLE_BUILD_DIR || '.next')

// Budget targets (tightened 2026-04-03 from 2200/1100/700).
// Set to ~10% above current measurements so the check catches regressions
// without failing every build. Reduce further as optimization continues.
const budgets = {
  maxRouteKb: readNumberEnv('BUNDLE_BUDGET_MAX_ROUTE_KB', 1700),
  p95RouteKb: readNumberEnv('BUNDLE_BUDGET_P95_ROUTE_KB', 625),
  maxChunkKb: readNumberEnv('BUNDLE_BUDGET_MAX_CHUNK_KB', 475),
}

function readNumberEnv(name, fallback) {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readJson(relativePath, required = true) {
  const absolutePath = path.join(buildDir, relativePath)
  if (!fs.existsSync(absolutePath)) {
    if (!required) return null
    throw new Error(`Missing required build output: ${absolutePath}`)
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
}

function fileSize(relativePath) {
  const absolutePath = path.join(buildDir, relativePath)
  if (!fs.existsSync(absolutePath)) return 0
  return fs.statSync(absolutePath).size
}

function routeIgnored(route) {
  return (
    route.startsWith('/_') ||
    route === '/404' ||
    route === '/500' ||
    route === '/not-found' ||
    route === '/error' ||
    route === '/global-error'
  )
}

function bytesToKb(bytes) {
  return bytes / 1024
}

function percentile(sortedValues, pct) {
  if (sortedValues.length === 0) return 0
  const index = Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * pct) - 1)
  return sortedValues[index]
}

function collectRouteRows(manifestPages, source) {
  const rows = []
  for (const [route, files] of Object.entries(manifestPages || {})) {
    if (routeIgnored(route)) continue
    const jsFiles = [...new Set(files.filter((file) => file.endsWith('.js')))]
    const totalBytes = jsFiles.reduce((sum, file) => sum + fileSize(file), 0)
    rows.push({ route, source, totalBytes, jsFileCount: jsFiles.length })
  }
  return rows
}

function getLargestChunkBytes() {
  const chunksDir = path.join(buildDir, 'static', 'chunks')
  if (!fs.existsSync(chunksDir)) return 0

  let maxBytes = 0
  const stack = [chunksDir]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolutePath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue
      const size = fs.statSync(absolutePath).size
      if (size > maxBytes) maxBytes = size
    }
  }

  return maxBytes
}

function main() {
  const buildManifest = readJson('build-manifest.json')
  const appBuildManifest = readJson('app-build-manifest.json', false)

  const pageRows = collectRouteRows(buildManifest.pages, 'pages')
  const appRows = collectRouteRows(appBuildManifest?.pages, 'app')
  const routeRows = [...appRows, ...pageRows]

  if (routeRows.length === 0) {
    throw new Error('No route chunks were found in build manifests.')
  }

  const routeBytesSorted = routeRows.map((row) => row.totalBytes).sort((a, b) => a - b)
  const maxRouteRow = routeRows.reduce((max, row) => (row.totalBytes > max.totalBytes ? row : max))
  const p95RouteBytes = percentile(routeBytesSorted, 0.95)
  const largestChunkBytes = getLargestChunkBytes()

  console.log('Bundle budget summary')
  console.log(
    JSON.stringify(
      {
        routesEvaluated: routeRows.length,
        maxRoute: {
          route: maxRouteRow.route,
          source: maxRouteRow.source,
          kb: Number(bytesToKb(maxRouteRow.totalBytes).toFixed(1)),
        },
        p95RouteKb: Number(bytesToKb(p95RouteBytes).toFixed(1)),
        maxChunkKb: Number(bytesToKb(largestChunkBytes).toFixed(1)),
      },
      null,
      2
    )
  )

  const failures = []
  if (bytesToKb(maxRouteRow.totalBytes) > budgets.maxRouteKb) {
    failures.push(
      `max route JS ${bytesToKb(maxRouteRow.totalBytes).toFixed(1)}KB exceeds ${budgets.maxRouteKb}KB (${maxRouteRow.route})`
    )
  }

  if (bytesToKb(p95RouteBytes) > budgets.p95RouteKb) {
    failures.push(
      `p95 route JS ${bytesToKb(p95RouteBytes).toFixed(1)}KB exceeds ${budgets.p95RouteKb}KB`
    )
  }

  if (bytesToKb(largestChunkBytes) > budgets.maxChunkKb) {
    failures.push(
      `largest chunk ${bytesToKb(largestChunkBytes).toFixed(1)}KB exceeds ${budgets.maxChunkKb}KB`
    )
  }

  const heaviest = [...routeRows]
    .sort((a, b) => b.totalBytes - a.totalBytes)
    .slice(0, 10)
    .map((row) => ({
      route: row.route,
      source: row.source,
      kb: Number(bytesToKb(row.totalBytes).toFixed(1)),
      jsFiles: row.jsFileCount,
    }))
  console.log('Top 10 heaviest routes')
  console.table(heaviest)

  if (failures.length > 0) {
    console.error('Bundle budget check failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log('Bundle budget check passed.')
}

main()
