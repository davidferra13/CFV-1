#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const NOW = new Date().toISOString()
const DOCS_MATRIX_DIR = path.join(ROOT, 'docs', 'matrices')
const XRAY_MATRIX_DIR = path.join(ROOT, 'docs', 'xrays', 'matrices')
const QUEUE_ROOT = path.join(ROOT, '.agents', 'build-queue')
const QUEUE_SCRIPT = path.join(ROOT, '.agents', 'skills', 'build-queue', 'scripts', 'build-queue.mjs')
const QUEUE_DIRS = ['active', 'blocked', 'done', 'in-flight', 'rejected']
const SPEC_DIRS = ['docs/specs', 'docs/build-specs']
const MATRIX_TERMS = /\b(matrix|matrices|metric|metrics|optimization|optimized|registry|audit|proof)\b/i

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[`*_()[\]{}"'“”‘’]/g, ' ')
    .replace(/[^a-z0-9/+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleize(value) {
  return String(value || '')
    .replace(/\.md$/i, '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function firstHeading(text, fallback) {
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback
}

function firstLines(text, maxChars = 1200) {
  return text
    .replace(/^---[\s\S]*?---\s*/m, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 24)
    .join(' ')
    .slice(0, maxChars)
}

function markdownTable(headers, rows) {
  const safeRows = rows.map((row) =>
    row.map((cell) =>
      String(cell ?? '')
        .replace(/\r?\n/g, '<br>')
        .replace(/\|/g, '\\|')
    )
  )
  return [
    `| ${headers.join(' |')} |`,
    `| ${headers.map(() => '---').join(' |')} |`,
    ...safeRows.map((row) => `| ${row.join(' |')} |`),
  ].join('\n')
}

async function walk(dir, predicate = () => true) {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue
      files.push(...(await walk(full, predicate)))
      continue
    }
    if (entry.isFile() && predicate(full)) files.push(full)
  }
  return files
}

async function readIfExists(filePath) {
  if (!existsSync(filePath)) return ''
  return readFile(filePath, 'utf8')
}

async function collectQueueItems() {
  const items = []
  for (const status of QUEUE_DIRS) {
    const dir = path.join(QUEUE_ROOT, status)
    const files = await walk(dir, (file) => file.endsWith('.md'))
    for (const file of files) {
      const text = await readFile(file, 'utf8')
      items.push({
        id: path.basename(file, '.md'),
        title: text.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '').trim() || firstHeading(text, path.basename(file, '.md')),
        status,
        path: rel(file),
        text,
        normalizedText: normalize(text),
      })
    }
  }
  return items
}

async function collectSpecs() {
  const specs = []
  for (const dirRel of SPEC_DIRS) {
    const dir = path.join(ROOT, dirRel)
    const files = await walk(dir, (file) => file.endsWith('.md') && path.basename(file) !== '_TEMPLATE.md')
    for (const file of files) {
      const text = await readFile(file, 'utf8')
      const s = await stat(file)
      specs.push({
        path: rel(file),
        title: firstHeading(text, titleize(path.basename(file))),
        summary: firstLines(text),
        bytes: s.size,
        updated: s.mtime.toISOString(),
        text,
      })
    }
  }
  return specs.sort((a, b) => a.path.localeCompare(b.path))
}

async function collectMatrixArtifacts() {
  const candidateRoots = ['docs', 'app', 'components', 'lib', 'scripts', 'tests', '.agents', '.claude']
  const artifacts = []
  for (const rootRel of candidateRoots) {
    const root = path.join(ROOT, rootRel)
    const files = await walk(root, (file) => /\.(md|json|ts|tsx|js|jsx|mjs|cjs)$/i.test(file))
    for (const file of files) {
      const fileRel = rel(file)
      if (fileRel.includes('/node_modules/') || fileRel.includes('/.next/')) continue
      const text = await readFile(file, 'utf8')
      const pathHit = MATRIX_TERMS.test(fileRel)
      const contentMatches = text.match(new RegExp(MATRIX_TERMS.source, 'gi')) || []
      if (!pathHit && contentMatches.length === 0) continue
      const s = await stat(file)
      artifacts.push({
        path: fileRel,
        kind: path.extname(file).slice(1) || 'file',
        pathHit,
        hits: contentMatches.length,
        bytes: s.size,
        updated: s.mtime.toISOString(),
      })
    }
  }
  return artifacts.sort((a, b) => b.hits - a.hits || a.path.localeCompare(b.path))
}

function classifyArtifact(filePath) {
  if (filePath.includes('route-protection')) return 'route protection'
  if (filePath.includes('auth') || filePath.includes('tenant') || filePath.includes('permission')) return 'security / permissions'
  if (filePath.includes('xray') || filePath.includes('surface-registry')) return 'surface / xray'
  if (filePath.includes('pricing') || filePath.includes('pie')) return 'pricing / PIE'
  if (filePath.includes('metric')) return 'metric surface'
  if (filePath.includes('audit')) return 'audit / proof'
  if (filePath.includes('registry')) return 'registry'
  return 'general matrix'
}

function coverageForSpec(spec, queueItems) {
  const normalizedPath = normalize(spec.path)
  const normalizedTitle = normalize(spec.title)
  const matches = queueItems.filter((item) => {
    if (item.normalizedText.includes(normalizedPath)) return true
    if (normalize(item.title) === normalizedTitle) return true
    if (normalize(item.title) === normalize(`Build spec: ${spec.title}`)) return true
    return false
  })
  return {
    queued: matches.length > 0,
    matches,
  }
}

async function addSpecToQueue(spec) {
  const raw = `Imported from ${spec.path}. User requested every build spec be represented in the build queue.`
  const scope = [
    `Preserve the source spec and convert it into fire-ready implementation work at grooming time.`,
    `Source path: ${spec.path}.`,
    spec.summary ? `Spec summary: ${spec.summary}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const acceptance = [
    `Source spec ${spec.path} is reviewed at fire time.`,
    'If the spec is too broad, the lead splits it into independently fireable queue items before implementation.',
    'Any touched route, API, server action, or database query preserves auth, tenant scoping, route policy, and role/privacy boundaries.',
    'Acceptance criteria from the source spec are either satisfied, explicitly rejected as expansion, or moved to follow-up queue items.',
    'Finish-check, focused verification, and proof pack requirements are followed before done.',
  ].join('\n')
  const verification = [
    `Confirm this queue item remains linked to ${spec.path}.`,
    'During firing, run focused tests/type checks/smoke checks for touched surfaces.',
    'For runtime/UI work, verify canonical http://localhost:3100, capture visible proof, and run regression firewall/finish-check according to AGENTS.md.',
  ].join('\n')
  const args = [
    QUEUE_SCRIPT,
    'add',
    '--title',
    `Build spec: ${spec.title}`,
    '--category',
    'Build Queue / Run Control / Proof Packs',
    '--home',
    'Queue Governance / Run Control',
    '--domain',
    'Documentation / Research',
    '--raw',
    raw,
    '--goal',
    `Represent ${spec.title} in the active build queue with a durable source link.`,
    '--scope',
    scope,
    '--acceptance',
    acceptance,
    '--risks',
    'Duplicate or stale spec work may already exist; reconcile before firing. Broad specs may need decomposition into smaller queue items.',
    '--dependencies',
    spec.path,
    '--verification',
    verification,
  ]
  const { stdout } = await execFileAsync(process.execPath, args, {
    cwd: ROOT,
    maxBuffer: 1024 * 1024,
  })
  return stdout.trim()
}

async function main() {
  const apply = process.argv.includes('--apply')
  await mkdir(DOCS_MATRIX_DIR, { recursive: true })
  await mkdir(XRAY_MATRIX_DIR, { recursive: true })

  let queueItems = await collectQueueItems()
  const specs = await collectSpecs()
  const artifacts = await collectMatrixArtifacts()
  const initialCoverage = specs.map((spec) => ({
    spec,
    ...coverageForSpec(spec, queueItems),
  }))
  const uncoveredBefore = initialCoverage.filter((entry) => !entry.queued)
  const imported = []
  const failed = []

  if (apply) {
    for (const entry of uncoveredBefore) {
      try {
        const output = await addSpecToQueue(entry.spec)
        imported.push({ spec: entry.spec.path, title: entry.spec.title, output })
      } catch (error) {
        failed.push({ spec: entry.spec.path, title: entry.spec.title, error: error.message })
      }
    }
    queueItems = await collectQueueItems()
  }

  const finalCoverage = specs.map((spec) => ({
    spec,
    ...coverageForSpec(spec, queueItems),
  }))
  const uncoveredAfter = finalCoverage.filter((entry) => !entry.queued)
  const queueByStatus = QUEUE_DIRS.map((status) => ({
    status,
    count: queueItems.filter((item) => item.status === status).length,
  }))

  const matrixRows = artifacts.map((artifact) => [
    artifact.path,
    classifyArtifact(artifact.path),
    artifact.kind,
    artifact.pathHit ? 'yes' : 'no',
    artifact.hits,
    artifact.bytes,
    artifact.updated,
    'needs owner/proof review',
  ])

  const specRows = finalCoverage.map((entry) => [
    entry.spec.path,
    entry.spec.title,
    entry.queued ? 'queued' : 'not queued',
    entry.matches.map((match) => `${match.id} (${match.status})`).join('<br>') || '',
    entry.spec.bytes,
    entry.spec.updated,
  ])

  const metricSurfaceRows = artifacts
    .filter((artifact) => /(^|\/)(app|components|lib)\//.test(artifact.path) && /metric/i.test(artifact.path + artifact.hits))
    .map((artifact) => [
      artifact.path,
      classifyArtifact(artifact.path),
      artifact.kind,
      artifact.hits,
      artifact.path.includes('/api/') ? 'api/runtime' : artifact.path.endsWith('.tsx') ? 'ui' : 'domain logic',
      'needs optimization proof unless covered by tests/proof pack',
    ])

  const surfaceRegistry = await readIfExists(path.join(ROOT, 'docs', 'surface-registry-summary.md'))
  const routeProtection = await readIfExists(path.join(ROOT, 'docs', 'security', 'route-protection-matrix.md'))
  const defaultWiring = await readIfExists(
    path.join(ROOT, '.agents', 'skills', 'cohesion-control-loop', 'references', 'DEFAULT-WIRING-MATRIX.md')
  )
  const xrayPages = await walk(path.join(ROOT, 'docs', 'xrays', 'pages'), (file) => file.endsWith('.md'))
  const findingsExists = existsSync(path.join(ROOT, 'docs', 'xrays', 'findings', 'findings.json'))

  const index = `# Matrix And Metric Closure Index

Generated: ${NOW}

## Verdict

ChefFlow now has a generated closure pack for matrix and metric work. This does not mean every matrix is optimized; it means every discovered matrix/spec artifact has a current index, queue coverage, and a next proof obligation.

## Counts

${markdownTable(['Area', 'Count'], [
    ['Matrix/metric/proof/registry artifacts discovered', artifacts.length],
    ['Build specs scanned', specs.length],
    ['Build specs already queued before import', initialCoverage.filter((entry) => entry.queued).length],
    ['Build specs imported this run', imported.length],
    ['Build specs still not queued', uncoveredAfter.length],
    ['Queue import failures', failed.length],
    ['X-Ray page scans found', xrayPages.length],
    ['X-Ray findings registry exists', findingsExists ? 'yes' : 'no'],
  ])}

## Matrices Created

- [Matrix artifact inventory](matrix-artifact-inventory.md)
- [Metric surface matrix](metric-surface-matrix.md)
- [Build spec queue coverage matrix](build-spec-queue-coverage-matrix.md)
- [Queue status matrix](queue-status-matrix.md)
- [Surface and route proof gap matrix](surface-and-route-proof-gap-matrix.md)
- [Build spec queue import report](build-spec-queue-import-report.md)
- [Default wiring domain matrix](default-wiring-domain-matrix.md)
- [X-Ray scan matrix](../xrays/matrices/scan-matrix.md)
- [X-Ray domain matrix](../xrays/matrices/domain-matrix.md)
- [X-Ray rail matrix](../xrays/matrices/rail-matrix.md)
- [X-Ray role matrix](../xrays/matrices/role-matrix.md)
- [X-Ray unresolved build matrix](../xrays/matrices/unresolved-build-matrix.md)

## Closure Rule

An item is optimized only after it has an owner/source of truth, documented inputs and outputs, route/action/API/data wiring when relevant, role/privacy policy, tests or runtime proof, and a proof pack or equivalent evidence.
`

  const artifactDoc = `# Matrix Artifact Inventory

Generated: ${NOW}

This inventory is generated from path/content hits for matrix, metric, optimization, registry, audit, and proof terms. It is intentionally broad so unknown matrix work cannot hide outside the obvious docs.

${markdownTable(['Path', 'Class', 'Kind', 'Path hit', 'Term hits', 'Bytes', 'Updated', 'Closure status'], matrixRows)}
`

  const metricDoc = `# Metric Surface Matrix

Generated: ${NOW}

Metric-bearing UI, API, and domain files discovered from current source paths/content. Each row still needs fire-time verification before anyone claims it is optimized.

${markdownTable(['Path', 'Class', 'Kind', 'Term hits', 'Surface type', 'Optimization status'], metricSurfaceRows)}
`

  const specCoverageDoc = `# Build Spec Queue Coverage Matrix

Generated: ${NOW}

This matrix covers \`docs/specs/*.md\` and \`docs/build-specs/*.md\`, excluding \`_TEMPLATE.md\`.

${markdownTable(['Spec path', 'Title', 'Queue status', 'Queue item(s)', 'Bytes', 'Updated'], specRows)}
`

  const queueStatusDoc = `# Queue Status Matrix

Generated: ${NOW}

${markdownTable(['Status', 'Item count'], queueByStatus.map((row) => [row.status, row.count]))}

## Source-Spec Coverage

${markdownTable(['Metric', 'Count'], [
    ['Specs scanned', specs.length],
    ['Queued specs', finalCoverage.filter((entry) => entry.queued).length],
    ['Unqueued specs', uncoveredAfter.length],
    ['Imported this run', imported.length],
    ['Import failures', failed.length],
  ])}
`

  const proofGapDoc = `# Surface And Route Proof Gap Matrix

Generated: ${NOW}

## Surface Registry Extract

${surfaceRegistry ? surfaceRegistry.split(/\r?\n/).slice(0, 80).join('\n') : 'Missing docs/surface-registry-summary.md'}

## Route Protection Extract

${routeProtection ? routeProtection.split(/\r?\n/).slice(0, 80).join('\n') : 'Missing docs/security/route-protection-matrix.md'}

## Closure Reading

- Orphaned routes, unknown routes, and API/route handlers needing review are mandatory proof gaps until reconciled.
- This matrix is a pointer to generated evidence, not a substitute for runtime proof.
`

  const importReport = `# Build Spec Queue Import Report

Generated: ${NOW}

Mode: ${apply ? 'apply' : 'dry-run'}

## Summary

${markdownTable(['Metric', 'Count'], [
    ['Specs scanned', specs.length],
    ['Already queued before import', initialCoverage.filter((entry) => entry.queued).length],
    ['Uncovered before import', uncoveredBefore.length],
    ['Imported', imported.length],
    ['Failed', failed.length],
    ['Uncovered after import', uncoveredAfter.length],
  ])}

## Imported

${imported.length ? markdownTable(['Spec', 'Title', 'Queue output'], imported.map((row) => [row.spec, row.title, row.output])) : 'None.'}

## Failed

${failed.length ? markdownTable(['Spec', 'Title', 'Error'], failed.map((row) => [row.spec, row.title, row.error])) : 'None.'}
`

  const defaultWiringDoc = `# Default Wiring Domain Matrix

Generated: ${NOW}

Source: \`.agents/skills/cohesion-control-loop/references/DEFAULT-WIRING-MATRIX.md\`

${defaultWiring || 'Missing default wiring matrix source.'}
`

  const scanMatrix = `# X-Ray Scan Matrix

Generated: ${NOW}

${markdownTable(['X-Ray page file', 'Status'], xrayPages.map((file) => [rel(file), 'scan exists']))}

## Gaps

- Missing page scan rows should be generated before claiming route-level X-Ray closure.
- This file exists because the Page X-Ray skill expects \`docs/xrays/matrices/scan-matrix.md\`.
`

  const domainRows = []
  const domainMatches = [...surfaceRegistry.matchAll(/^\| ([^|]+?)\s+\| ([0-9]+)\s+\|$/gm)]
  for (const match of domainMatches.slice(0, 80)) {
    const name = match[1].trim()
    if (['Group', 'Type', 'Domain'].includes(name) || /^\-+$/.test(name)) continue
    domainRows.push([name, match[2].trim(), 'from surface registry', 'needs X-Ray/domain proof if route-bearing'])
  }
  const domainMatrix = `# X-Ray Domain Matrix

Generated: ${NOW}

${markdownTable(['Domain/group/type', 'Count', 'Source', 'Closure status'], domainRows)}
`

  const railArtifacts = artifacts.filter((artifact) => /rail/i.test(artifact.path))
  const railMatrix = `# X-Ray Rail Matrix

Generated: ${NOW}

${markdownTable(
    ['Rail artifact', 'Class', 'Term hits', 'Closure status'],
    railArtifacts.map((artifact) => [artifact.path, classifyArtifact(artifact.path), artifact.hits, 'needs rail profile/resolver proof when route-relevant'])
  )}
`

  const roleMatrix = `# X-Ray Role Matrix

Generated: ${NOW}

## Route Protection Summary

${routeProtection ? routeProtection.split(/\r?\n/).slice(0, 40).join('\n') : 'Missing route protection matrix.'}

## Required Role Closure

${markdownTable(['Role area', 'Required proof'], [
    ['Public', 'Public routes expose no tenant data or PII unless intentionally public.'],
    ['Chef', 'Chef routes require chef auth and tenant-scoped data access.'],
    ['Client', 'Client routes require client auth/token policy and client-safe visibility.'],
    ['Staff', 'Staff routes require staff auth and assignment-scoped access.'],
    ['Partner/vendor', 'Partner/vendor routes require explicit external visibility boundaries.'],
    ['Admin', 'Admin pages/actions require runtime admin guards.'],
    ['API routes', 'Middleware, explicit API auth, cron auth, or webhook signature proof.'],
  ])}
`

  const unresolvedRows = queueItems
    .filter((item) => ['active', 'blocked', 'in-flight'].includes(item.status))
    .slice(0, 1000)
    .map((item) => [item.id, item.status, item.title, item.path])
  const unresolvedMatrix = `# X-Ray Unresolved Build Matrix

Generated: ${NOW}

This lists unresolved queue work that can affect route, domain, rail, role, or proof closure.

${markdownTable(['Queue ID', 'Status', 'Title', 'Path'], unresolvedRows)}
`

  await writeFile(path.join(DOCS_MATRIX_DIR, 'matrix-closure-index.md'), index, 'utf8')
  await writeFile(path.join(DOCS_MATRIX_DIR, 'matrix-artifact-inventory.md'), artifactDoc, 'utf8')
  await writeFile(path.join(DOCS_MATRIX_DIR, 'metric-surface-matrix.md'), metricDoc, 'utf8')
  await writeFile(path.join(DOCS_MATRIX_DIR, 'build-spec-queue-coverage-matrix.md'), specCoverageDoc, 'utf8')
  await writeFile(path.join(DOCS_MATRIX_DIR, 'queue-status-matrix.md'), queueStatusDoc, 'utf8')
  await writeFile(path.join(DOCS_MATRIX_DIR, 'surface-and-route-proof-gap-matrix.md'), proofGapDoc, 'utf8')
  await writeFile(path.join(DOCS_MATRIX_DIR, 'build-spec-queue-import-report.md'), importReport, 'utf8')
  await writeFile(path.join(DOCS_MATRIX_DIR, 'default-wiring-domain-matrix.md'), defaultWiringDoc, 'utf8')
  await writeFile(path.join(XRAY_MATRIX_DIR, 'scan-matrix.md'), scanMatrix, 'utf8')
  await writeFile(path.join(XRAY_MATRIX_DIR, 'domain-matrix.md'), domainMatrix, 'utf8')
  await writeFile(path.join(XRAY_MATRIX_DIR, 'rail-matrix.md'), railMatrix, 'utf8')
  await writeFile(path.join(XRAY_MATRIX_DIR, 'role-matrix.md'), roleMatrix, 'utf8')
  await writeFile(path.join(XRAY_MATRIX_DIR, 'unresolved-build-matrix.md'), unresolvedMatrix, 'utf8')

  console.log(
    JSON.stringify(
      {
        generatedAt: NOW,
        apply,
        artifacts: artifacts.length,
        specs: specs.length,
        queuedBefore: initialCoverage.filter((entry) => entry.queued).length,
        uncoveredBefore: uncoveredBefore.length,
        imported: imported.length,
        failed: failed.length,
        uncoveredAfter: uncoveredAfter.length,
        queueCounts: Object.fromEntries(queueByStatus.map((row) => [row.status, row.count])),
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
