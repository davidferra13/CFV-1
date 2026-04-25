#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import {
  buildMarkdownBrief,
  extractProgressBlock,
  extractUncheckedChecklistItems,
  parseGitStatusLines,
  selectExistingPackageScripts,
  summarizeGitignoreNoise,
  summarizeSyncStatus,
} from './lib/codex-readiness-core.mjs'

const execFileAsync = promisify(execFile)

const ROOT = process.cwd()
const PRODUCT_SCOPE_PATH = 'docs/project-definition-and-scope.md'
const PRODUCT_BLUEPRINT_PATH = 'docs/product-blueprint.md'
const SYNC_STATUS_PATH = 'docs/sync-status.json'
const LIVE_OPS_PATH = 'logs/live-ops-guardian-latest.json'
const GITIGNORE_PATH = '.gitignore'
const PACKAGE_PATH = 'package.json'
const BRIEF_PATH = 'docs/.codex-workspace-brief.md'
const REPORT_PATH = 'reports/codex-readiness.json'
const DESIRED_VERIFICATION_SCRIPTS = [
  'typecheck',
  'typecheck:scripts',
  'test:unit',
  'test:e2e:smoke',
  'verify:release',
  'sync:audit',
]

async function readText(relativePath, warnings, { optional = false } = {}) {
  try {
    return await readFile(join(ROOT, relativePath), 'utf8')
  } catch (error) {
    if (optional || error?.code === 'ENOENT') {
      warnings.push(`Missing local file: ${relativePath}`)
      return ''
    }

    throw error
  }
}

async function readOptionalJson(relativePath, warnings) {
  const text = await readText(relativePath, warnings, { optional: true })
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    warnings.push(`Could not parse ${relativePath}: ${error.message}`)
    return null
  }
}

async function readPackageJson(warnings) {
  const text = await readText(PACKAGE_PATH, warnings)

  try {
    return JSON.parse(text)
  } catch (error) {
    const parseError = new Error(`Malformed package.json: ${error.message}`)
    parseError.exitCode = 1
    throw parseError
  }
}

async function getGitOutput(args, warnings) {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: ROOT,
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 50 * 1024 * 1024,
    })
    return stdout.trimEnd()
  } catch (error) {
    warnings.push(`Git unavailable for "git ${args.join(' ')}": ${error.message}`)
    return null
  }
}

function filterLaunchChecklistItems(items) {
  return items.filter((item) => {
    const headings = item.headingPath ?? []
    return (
      headings.includes('V1 Exit Criteria') &&
      (item.section === 'Must-Have (Blocks Launch)' ||
        item.section === 'Should-Have (Ship Without, Fix Fast)')
    )
  })
}

function summarizeLiveOpsGuardian(liveOpsJson) {
  if (!liveOpsJson || typeof liveOpsJson !== 'object' || Array.isArray(liveOpsJson)) {
    return { present: false }
  }

  return {
    present: true,
    runId: liveOpsJson.runId ?? null,
    ranAt: liveOpsJson.ranAt ?? liveOpsJson.runTime ?? null,
    changedPathCount: liveOpsJson.changedPathCount ?? null,
    newChangesDetected: liveOpsJson.newChangesDetected ?? null,
    status: liveOpsJson.status ?? null,
    failureCount: liveOpsJson.failureCount ?? null,
  }
}

function buildOperationalAttention(sync, liveOpsGuardian) {
  const attention = [...(Array.isArray(sync.attentionRequired) ? sync.attentionRequired : [])]

  if (String(liveOpsGuardian.status ?? '').toLowerCase().includes('attention')) {
    attention.push('live ops guardian status needs attention')
  }

  return [...new Set(attention)]
}

function buildRecommendation(launch, sync) {
  const progress = launch.progress ?? {}
  const buildPercent = progress.buildCompleteness?.percent
  const validationPercent = progress.validation?.percent
  const launchReadinessPercent = progress.launchReadiness?.percent
  const syncEvidence =
    sync?.lastError || sync?.elapsedSeconds
      ? `docs/sync-status.json:7 shows "${sync.lastError}" with elapsed seconds ${sync.elapsedSeconds}`
      : 'docs/sync-status.json records current sync health'

  return {
    title: 'Prioritize launch validation and operational health',
    rationale:
      `ChefFlow appears substantially built${buildPercent ? ` (${buildPercent}% build completeness)` : ''}, ` +
      `but validation${validationPercent ? ` (${validationPercent}%)` : ''} and launch readiness${
        launchReadinessPercent ? ` (${launchReadinessPercent}%)` : ''
      } lag behind, while the latest sync needs attention. Do not spend the next pass on new user-facing AI.`,
    evidence: [
      'docs/product-blueprint.md:31 shows build, validation, and launch-readiness progress.',
      'docs/product-blueprint.md:197 lists V1 exit criteria centered on real-chef use and non-developer booking testing.',
      'docs/product-blueprint.md:203 lists survey and onboarding validation as should-have launch work.',
      syncEvidence,
    ],
  }
}

async function buildReport() {
  const warnings = []
  const [
    productScopeMarkdown,
    productBlueprintMarkdown,
    syncJson,
    liveOpsJson,
    gitignoreText,
    packageJson,
  ] = await Promise.all([
    readText(PRODUCT_SCOPE_PATH, warnings, { optional: true }),
    readText(PRODUCT_BLUEPRINT_PATH, warnings, { optional: true }),
    readOptionalJson(SYNC_STATUS_PATH, warnings),
    readOptionalJson(LIVE_OPS_PATH, warnings),
    readText(GITIGNORE_PATH, warnings, { optional: true }),
    readPackageJson(warnings),
  ])

  const [branchOutput, statusOutput] = await Promise.all([
    getGitOutput(['branch', '--show-current'], warnings),
    getGitOutput(['status', '--short'], warnings),
  ])
  const parsedGitStatus = parseGitStatusLines(statusOutput ? statusOutput.split(/\r?\n/) : [])
  const sync = summarizeSyncStatus(syncJson)
  const liveOpsGuardian = summarizeLiveOpsGuardian(liveOpsJson)
  const launch = {
    progress: extractProgressBlock(productBlueprintMarkdown),
    uncheckedItems: filterLaunchChecklistItems(
      extractUncheckedChecklistItems(productBlueprintMarkdown)
    ),
  }
  const operationalHealth = {
    sync,
    liveOpsGuardian,
    attentionRequired: buildOperationalAttention(sync, liveOpsGuardian),
  }

  if (!productScopeMarkdown) {
    warnings.push(`Product truth source was unavailable: ${PRODUCT_SCOPE_PATH}`)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    productTruth: {
      operatorFirst: true,
      source: PRODUCT_SCOPE_PATH,
      supportingSurfaces: [
        'public discovery',
        'client portal',
        'staff',
        'partner',
        'admin',
        'API',
      ],
      internalOnly: true,
      userFacingOpenAIAdded: false,
    },
    launch,
    workspace: {
      branch: branchOutput || null,
      statusCounts: parsedGitStatus.statusCounts,
      changedPathsSample: parsedGitStatus.changedPaths.slice(0, 40),
      changedPathsRemaining: Math.max(parsedGitStatus.changedPaths.length - 40, 0),
    },
    operationalHealth,
    verificationCommands: selectExistingPackageScripts(
      packageJson,
      DESIRED_VERIFICATION_SCRIPTS
    ),
    artifactNoise: summarizeGitignoreNoise(gitignoreText),
    recommendation: buildRecommendation(launch, sync),
    warnings,
  }

  return report
}

async function main() {
  const report = await buildReport()
  const brief = buildMarkdownBrief(report)

  await mkdir(join(ROOT, 'reports'), { recursive: true })
  await writeFile(join(ROOT, BRIEF_PATH), brief, 'utf8')
  await writeFile(join(ROOT, REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${BRIEF_PATH}`)
  console.log(`Wrote ${REPORT_PATH}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(error.exitCode ?? 1)
})
