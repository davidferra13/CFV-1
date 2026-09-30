#!/usr/bin/env node
/** Execute with: node --import tsx scripts/audit-competitive-registry.mjs */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCompetitiveAudit,
  safeReference,
  validDate,
} from '../lib/capabilities/competitive.mjs'
import {
  renderCompetitiveHtml,
  renderCompetitiveMarkdown,
} from '../lib/capabilities/competitive-report.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
function argument(name, fallback) {
  const index = args.indexOf(name)
  if (index === -1) return fallback
  if (!args[index + 1] || args[index + 1].startsWith('--'))
    throw new Error(`${name} requires a value`)
  return args[index + 1]
}
function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
}
function contained(path) {
  const rel = relative(root, path)
  return rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel)
}
function inspectReference(path) {
  if (!safeReference(path)) return { exists: false, error: 'unsafe reference' }
  try {
    const absolute = resolve(root, path)
    if (!existsSync(absolute)) return { exists: false }
    if (!contained(realpathSync(absolute)))
      return { exists: false, error: 'reference resolves outside repository' }
    const stat = statSync(absolute)
    return { exists: true, kind: stat.isDirectory() ? 'directory signal only' : 'file signal only' }
  } catch {
    return { exists: false, error: 'reference could not be inspected' }
  }
}

async function main() {
  const allowed = new Set(['--as-of', '--out-dir', '--help'])
  for (let index = 0; index < args.length; index += 1) {
    if (!allowed.has(args[index])) throw new Error(`Unknown argument: ${args[index]}`)
    if (args[index] !== '--help') index += 1
  }
  if (args.includes('--help')) {
    console.log(
      'Read-only audit. Options: --as-of YYYY-MM-DD --out-dir <repository-relative folder>'
    )
    return
  }
  const asOf = argument('--as-of', new Date().toISOString().slice(0, 10))
  if (!validDate(asOf)) throw new Error('Invalid --as-of date')
  const outName = argument('--out-dir', 'reports/competitive-registry')
  if (!safeReference(outName))
    throw new Error('--out-dir must be a safe repository-relative directory')
  const outDir = resolve(root, outName)
  if (!contained(outDir)) throw new Error('Output must remain inside this checkout')
  // Prevent writes through an existing symlink/junction outside the checkout.
  let ancestor = outDir
  while (!existsSync(ancestor)) ancestor = dirname(ancestor)
  if (!contained(realpathSync(ancestor)))
    throw new Error('Output ancestor resolves outside repository')
  const catalog = readJson('lib/capabilities/competitive-catalog.json')
  const document = readJson('lib/capabilities/competitive-benchmarks.json')
  if (document.schemaVersion !== 1) throw new Error('Unsupported benchmark document schema')
  const registryModule = await import('../lib/capabilities/registry.ts')
  const proofModule = await import('../lib/capabilities/proof.ts')
  const { CHEFFLOW_CAPABILITY_REGISTRY: registry } = registryModule.default ?? registryModule
  const { evaluateCapabilityProofFile } = proofModule.default ?? proofModule
  if (!Array.isArray(registry) || typeof evaluateCapabilityProofFile !== 'function')
    throw new Error('Canonical capability API unavailable')
  const paths = new Set([
    ...registry.flatMap((item) => item.evidence),
    ...document.benchmarks.flatMap((item) => item.codeReferences),
  ])
  const pathObservations = Object.fromEntries(
    [...paths].map((path) => [path, inspectReference(path)])
  )
  const proofEvaluations = Object.fromEntries(
    registry.map((item) => {
      try {
        return [item.id, evaluateCapabilityProofFile(item, root)]
      } catch {
        return [
          item.id,
          {
            state: 'ERROR',
            reasons: ['Canonical proof evaluation failed; not treated as missing or verified.'],
          },
        ]
      }
    })
  )
  let revision = { commit: 'unavailable', dirty: null }
  try {
    revision = {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 10000,
      }).trim(),
      dirty: !!execFileSync('git', ['status', '--porcelain'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 10000,
      }).trim(),
    }
  } catch {
    /* Report unavailable revision; never fabricate provenance. */
  }
  const audit = buildCompetitiveAudit({
    catalog,
    benchmarks: document.benchmarks,
    canonicalRegistry: registry,
    pathObservations,
    proofEvaluations,
    asOf,
    revision,
  })
  mkdirSync(outDir, { recursive: true })
  const artifacts = {
    'competitive-registry.json': JSON.stringify(audit, null, 2) + '\n',
    'competitive-registry.md': renderCompetitiveMarkdown(audit),
    'competitive-registry.html': renderCompetitiveHtml(audit),
  }
  for (const [name, contents] of Object.entries(artifacts))
    writeFileSync(resolve(outDir, name), contents, 'utf8')
  console.log(
    JSON.stringify(
      {
        status: 'AUDIT_GENERATED',
        asOf,
        revision,
        summary: audit.summary,
        artifacts: Object.keys(artifacts).map((name) => `${outName}/${name}`),
      },
      null,
      2
    )
  )
  if (Object.values(proofEvaluations).some((item) => item.state === 'ERROR')) {
    console.error(
      'Audit generated with canonical proof evaluation errors. Inspect the report before use.'
    )
    process.exitCode = 2
  }
}
main().catch((error) => {
  console.error(`Competitive registry audit failed: ${error.message}`)
  process.exitCode = 1
})
