#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildProfessionalReadinessMarkdown,
  evaluateProfessionalReadiness,
  parseBuildState,
  summarizeLoadProof,
  summarizeMobileAudit,
  summarizeSync,
} from './lib/professional-readiness-core.mjs'

const ROOT = process.cwd()
const REPORT_JSON_PATH = 'reports/professional-readiness.json'
const REPORT_MD_PATH = 'docs/professional-readiness.md'
const LIVE_TIMEOUT_MS = 2500

const RUNTIME_TARGETS = [
  { key: 'development', port: 3100 },
  { key: 'beta', port: 3200 },
  { key: 'production', port: 3300 },
]

const LOAD_PROOF_CANDIDATES = [
  'reports/load/latest.json',
  'reports/k6/latest.json',
  'tests/load/reports/latest.json',
]

function hasArg(name) {
  return process.argv.slice(2).includes(name)
}

async function readText(relativePath, warnings, optional = true) {
  try {
    return await readFile(join(ROOT, relativePath), 'utf8')
  } catch (error) {
    if (optional || error?.code === 'ENOENT') {
      warnings.push(`Missing evidence file: ${relativePath}`)
      return ''
    }
    throw error
  }
}

async function readJson(relativePath, warnings) {
  const text = await readText(relativePath, warnings)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    warnings.push(`Could not parse ${relativePath}: ${error.message}`)
    return null
  }
}

async function readFirstJson(paths, warnings) {
  for (const relativePath of paths) {
    if (!existsSync(join(ROOT, relativePath))) continue
    const json = await readJson(relativePath, warnings)
    if (json) {
      return { ...json, source: relativePath }
    }
  }
  warnings.push(`Missing evidence file: ${paths.join(' or ')}`)
  return null
}

async function checkRuntimeTarget(target, skipLive) {
  const url = `http://127.0.0.1:${target.port}/api/health/readiness?strict=1`
  if (skipLive) {
    return {
      checked: false,
      ok: false,
      url,
      port: target.port,
      reason: 'live checks skipped',
    }
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    })
    return {
      checked: true,
      ok: response.ok,
      status: response.status,
      url,
      port: target.port,
      elapsedMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      checked: true,
      ok: false,
      url,
      port: target.port,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function summarizeTopology(cloudflareReport) {
  const report = cloudflareReport && typeof cloudflareReport === 'object' ? cloudflareReport : {}
  const ingress = Array.isArray(report?.tunnelConfig?.ingress) ? report.tunnelConfig.ingress : []
  const hostnames = ingress
    .map((entry) => (typeof entry?.hostname === 'string' ? entry.hostname : ''))
    .filter(Boolean)

  return {
    betaIngressPresent: hostnames.includes('beta.cheflowhq.com'),
    productionIngressPresent: hostnames.includes('app.cheflowhq.com'),
    hostnames,
  }
}

function summarizeObservability(packageJson) {
  const dependencies = {
    ...((packageJson && packageJson.dependencies) || {}),
    ...((packageJson && packageJson.devDependencies) || {}),
  }

  return {
    healthRoutes:
      existsSync(join(ROOT, 'app/api/health/route.ts')) &&
      existsSync(join(ROOT, 'app/api/health/readiness/route.ts')),
    sentryDependency: Boolean(dependencies['@sentry/nextjs']),
    releaseReports:
      existsSync(join(ROOT, 'reports/codex-readiness.json')) ||
      existsSync(join(ROOT, 'reports/cloudflare-readiness-report.json')),
  }
}

function summarizeEnvironment() {
  return {
    separateDatabases: process.env.CHEFFLOW_ENV_SEPARATION_CONFIRMED === '1',
    productionDataProtected: process.env.CHEFFLOW_PROD_DATA_PROTECTED === '1',
    proof:
      process.env.CHEFFLOW_ENV_SEPARATION_CONFIRMED === '1' &&
      process.env.CHEFFLOW_PROD_DATA_PROTECTED === '1'
        ? 'operator environment flags confirmed'
        : 'operator environment flags not set',
  }
}

async function buildFacts() {
  const warnings = []
  const skipLive = hasArg('--skip-live')
  const generatedAt = new Date().toISOString()
  const [
    packageJson,
    syncJson,
    mobileJson,
    loadJson,
    cloudflareJson,
    buildStateMarkdown,
  ] = await Promise.all([
    readJson('package.json', warnings),
    readJson('docs/sync-status.json', warnings),
    readJson('reports/mobile-audit/latest.json', warnings),
    readFirstJson(LOAD_PROOF_CANDIDATES, warnings),
    readJson('reports/cloudflare-readiness-report.json', warnings),
    readText('docs/build-state.md', warnings),
  ])

  const runtimeEntries = await Promise.all(
    RUNTIME_TARGETS.map(async (target) => [target.key, await checkRuntimeTarget(target, skipLive)])
  )
  const runtime = Object.fromEntries(runtimeEntries)
  const scripts = Object.keys((packageJson && packageJson.scripts) || {})

  return {
    generatedAt,
    runtime,
    build: parseBuildState(buildStateMarkdown),
    sync: summarizeSync(syncJson),
    mobile: summarizeMobileAudit(mobileJson),
    load: summarizeLoadProof(loadJson),
    environment: summarizeEnvironment(),
    topology: summarizeTopology(cloudflareJson),
    observability: summarizeObservability(packageJson),
    release: { scripts },
    warnings,
  }
}

async function main() {
  const facts = await buildFacts()
  const evaluation = evaluateProfessionalReadiness(facts)
  const report = {
    ...evaluation,
    evidence: facts,
  }

  await mkdir(join(ROOT, 'reports'), { recursive: true })
  await writeFile(join(ROOT, REPORT_JSON_PATH), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(join(ROOT, REPORT_MD_PATH), buildProfessionalReadinessMarkdown(report), 'utf8')

  console.log(`Wrote ${REPORT_JSON_PATH}`)
  console.log(`Wrote ${REPORT_MD_PATH}`)
  console.log(`Professional readiness: ${report.status} (${report.score}%)`)

  if (hasArg('--strict') && report.status !== 'ready') {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
