#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  classifyMobileFailure,
  inferRoutesFromChangedFiles,
  renderContactSheetMarkdown,
  splitChangedFiles,
} from './lib/mobile-pass-core.mjs'

const ROOT = process.cwd()

function parseArgs(argv) {
  const args = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      args._.push(token)
      continue
    }
    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    index += 1
  }
  return args
}

function usage() {
  console.log(`Usage:
  node scripts/mobile-pass.mjs --routes "/,/chefs" [--scope public|all] [--mode quick|full]
  node scripts/mobile-pass.mjs --queue-id BQ-... --routes "/dashboard,/clients" --append-proof-pack
  node scripts/mobile-pass.mjs --infer-changed-routes --changed-files "app/(public)/page.tsx"

Options:
  --routes              Comma-separated route paths, or role:path entries such as chef:/dashboard.
  --infer-changed-routes Infer route filters from changed app/component files.
  --changed-files       Comma/newline-separated changed files. Defaults to git diff when inferring.
  --mode                quick or full. Default: quick.
  --scope               public or all. Default: all.
  --base-url            Playwright base URL. Default: http://localhost:3100.
  --queue-id            Build queue item ID for proof-pack linking.
  --run-id              Queue run ID for report metadata.
  --append-proof-pack   Append mobile proof to .agents/build-queue/proof-packs/<queue-id>.md.
  --skip-auth-bootstrap Pass through PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP=true.
  --dry-run             Print the Playwright command without running it.
`)
}

function slugify(value) {
  return String(value || 'mobile-pass')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function timestampTag() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function splitRoutes(value) {
  return String(value || '')
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean)
}

function latestSummaryPath(runTag) {
  return resolve(ROOT, 'reports', 'mobile-audit', runTag, 'summary.json')
}

function gitChangedFiles() {
  const child = spawnSync('git diff --name-only HEAD', {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  })
  return splitChangedFiles(child.stdout || '')
}

function renderReport({ args, runTag, summary, status }) {
  const queueLine = args['queue-id'] ? `- Queue Item: ${args['queue-id']}\n` : ''
  const runLine = args['run-id'] ? `- Run ID: ${args['run-id']}\n` : ''
  const routes = summary.routeFilter?.length
    ? summary.routeFilter.map((route) => `  - ${route}`).join('\n')
    : '  - harvested route catalog'
  const failures =
    summary.failures.length === 0
      ? '- None'
      : summary.failures
          .map(
            (failure) =>
              `- [${classifyMobileFailure(failure)}] ${failure.role} ${failure.path} ${failure.viewport} ${failure.state}: ${failure.reason}${
                failure.details ? ` - ${failure.details}` : ''
              }`
          )
          .join('\n')
  const failureCounts = summary.failures.reduce(
    (counts, failure) => {
      counts[classifyMobileFailure(failure)] += 1
      return counts
    },
    { blocking: 0, serious: 0, polish: 0 }
  )
  const screenshots =
    summary.executed.length === 0
      ? '- None captured'
      : summary.executed
          .slice(0, 40)
          .map(
            (item) =>
              `- ${item.role} ${item.path} ${item.viewport} ${item.state}: ${item.screenshot}`
          )
          .join('\n')
  const screenshotNote =
    summary.executed.length > 40
      ? `\n- ${summary.executed.length - 40} additional screenshots omitted from this report; see ${summary.runDir}.`
      : ''

  return `# Mobile Pass Report

${queueLine}${runLine}- Generated At: ${summary.generatedAt}
- Status: ${status === 0 && summary.failures.length === 0 ? 'PASS' : 'FAIL'}
- Mode: ${summary.mode}
- Scope: ${summary.scope}
- Base URL: ${args['base-url'] || 'http://localhost:3100'}
- Audit Run: ${runTag}
- Audit Directory: ${summary.runDir}

## Routes

${routes}

## Results

- Routes Matched: ${summary.totals.routes}
- Executions: ${summary.totals.executions}
- Failures: ${summary.totals.failures}
- Blocking Failures: ${failureCounts.blocking}
- Serious Failures: ${failureCounts.serious}
- Polish Failures: ${failureCounts.polish}

## Failures

${failures}

## Runtime Proof

Screenshots:
${screenshots}${screenshotNote}

## Screenshot Contact Sheet

${renderContactSheetMarkdown(summary)}

## Verification Output

\`npx playwright test --project=mobile-audit\` exited with status ${status}.
`
}

function appendToProofPack(queueId, reportPath, summary) {
  const proofPath = resolve(ROOT, '.agents', 'build-queue', 'proof-packs', `${queueId}.md`)
  if (!existsSync(proofPath)) {
    throw new Error(`Proof pack does not exist: ${proofPath}`)
  }

  const status = summary.failures.length === 0 ? 'PASS' : 'FAIL'
  appendFileSync(
    proofPath,
    `

## Mobile Pass

- Status: ${status}
- Report: ${reportPath}
- Audit Directory: ${summary.runDir}
- Routes Matched: ${summary.totals.routes}
- Executions: ${summary.totals.executions}
- Failures: ${summary.totals.failures}
`,
    'utf8'
  )
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  usage()
  process.exit(0)
}

const mode = args.mode || 'quick'
const scope = args.scope || 'all'
let routes = splitRoutes(args.routes || args._.join(','))

if (args['infer-changed-routes']) {
  const files = args['changed-files'] ? splitChangedFiles(args['changed-files']) : gitChangedFiles()
  const inferred = inferRoutesFromChangedFiles(files)
  if (inferred.length > 0) {
    routes = inferred.map((route) => `${route.role}:${route.path}`)
    console.log('[mobile-pass] inferred routes:')
    for (const route of inferred) {
      console.log(`[mobile-pass] - ${route.role}:${route.path} from ${route.source}`)
    }
  } else {
    console.log('[mobile-pass] no changed route hints found')
  }
}

if (!['quick', 'full'].includes(mode)) {
  console.error('[mobile-pass] --mode must be quick or full')
  process.exit(1)
}

if (!['public', 'all'].includes(scope)) {
  console.error('[mobile-pass] --scope must be public or all')
  process.exit(1)
}

if (routes.length === 0 && !args.all) {
  console.error('[mobile-pass] Provide --routes or --all.')
  usage()
  process.exit(1)
}

const runTag = `${timestampTag()}-${slugify(args['queue-id'] || args['run-id'] || 'focused')}`
const env = {
  ...process.env,
  MOBILE_AUDIT_MODE: mode,
  MOBILE_AUDIT_SCOPE: scope,
  MOBILE_AUDIT_RUN_TAG: runTag,
  PLAYWRIGHT_BASE_URL:
    args['base-url'] || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100',
}

if (routes.length > 0) {
  env.MOBILE_AUDIT_ROUTES = routes.join(',')
}

if (args['skip-auth-bootstrap']) {
  env.PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP = 'true'
}

const command = 'npx playwright test --project=mobile-audit'

if (args['dry-run']) {
  console.log(`[mobile-pass] ${command}`)
  console.log(`[mobile-pass] MOBILE_AUDIT_MODE=${mode}`)
  console.log(`[mobile-pass] MOBILE_AUDIT_SCOPE=${scope}`)
  console.log(`[mobile-pass] MOBILE_AUDIT_ROUTES=${routes.join(',') || '(all harvested routes)'}`)
  process.exit(0)
}

const child = spawnSync(command, {
  stdio: 'inherit',
  env,
  shell: true,
})

if (child.error) {
  console.error(`[mobile-pass] Failed to launch Playwright: ${child.error.message}`)
}

const status = typeof child.status === 'number' ? child.status : 1
const summaryPath = latestSummaryPath(runTag)

if (!existsSync(summaryPath)) {
  console.error(`[mobile-pass] Missing audit summary: ${summaryPath}`)
  process.exit(status || 1)
}

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
const reportDir = resolve(ROOT, 'reports', 'mobile-pass')
mkdirSync(reportDir, { recursive: true })

const reportPath = join(reportDir, `${runTag}.md`)
writeFileSync(reportPath, renderReport({ args, runTag, summary, status }), 'utf8')
writeFileSync(join(reportDir, 'latest.md'), readFileSync(reportPath, 'utf8'), 'utf8')

console.log(`[mobile-pass] Report written: ${reportPath}`)

if (args['append-proof-pack']) {
  if (!args['queue-id']) {
    console.error('[mobile-pass] --append-proof-pack requires --queue-id')
    process.exit(1)
  }
  try {
    appendToProofPack(args['queue-id'], reportPath, summary)
    console.log(`[mobile-pass] Appended proof pack for ${args['queue-id']}`)
  } catch (error) {
    console.error(`[mobile-pass] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

process.exit(status)
