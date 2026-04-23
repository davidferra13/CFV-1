import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as releaseGateManifestNamespace from '../lib/release/release-gate-manifest.js'
import * as releaseAttestationNamespace from '../lib/release/release-attestation.js'
import { resolveBuildSurfaceManifest } from './build-surface-manifest.mjs'

const releaseGateManifestModule = {
  ...(releaseGateManifestNamespace.default ?? {}),
  ...releaseGateManifestNamespace,
}
const releaseAttestationModule = {
  ...(releaseAttestationNamespace.default ?? {}),
  ...releaseAttestationNamespace,
}

const {
  RELEASE_GATE_STEP_CLASSIFICATION,
  RELEASE_GATE_WARNING_SEVERITY,
  evaluateReleaseGateWarnings,
  getReleaseGateManifest,
} = releaseGateManifestModule
const {
  RELEASE_ATTESTATION_CONTRACT_VERSION,
  getCurrentGitSnapshot,
  writeReleaseAttestation,
} = releaseAttestationModule

const RELEASE_GATE_MANIFEST = getReleaseGateManifest()

export const SUPPORTED_RELEASE_PROFILES = Object.freeze(
  Object.keys(RELEASE_GATE_MANIFEST.profiles)
)

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

export function resolveProfile(args = process.argv.slice(2)) {
  let profile = 'full'

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (value === '--profile' && args[index + 1]) {
      profile = args[index + 1]
      index += 1
      continue
    }

    if (value.startsWith('--profile=')) {
      profile = value.slice('--profile='.length)
    }
  }

  if (!SUPPORTED_RELEASE_PROFILES.includes(profile)) {
    throw new Error(
      `Unsupported release profile "${profile}". Expected ${SUPPORTED_RELEASE_PROFILES.map(
        (value) => `"${value}"`
      ).join(' or ')}.`
    )
  }

  return profile
}

export function buildReleaseProfileContext(env = process.env) {
  const runId = env.CF_VERIFY_RUN_ID || `verify-${process.pid}-${Date.now()}`
  const buildDistDir = env.NEXT_BUILD_DIST_DIR || `.next-verify-${runId}`
  const smokeBaseUrl = env.PLAYWRIGHT_BASE_URL || 'http://localhost:3110'
  const smokeServerCommand = env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npx next start -p 3110'
  const webBetaBuildDistDir = env.WEB_BETA_NEXT_BUILD_DIST_DIR || `.next-web-beta-${runId}`
  const webBetaSmokeBaseUrl = env.WEB_BETA_PLAYWRIGHT_BASE_URL || 'http://localhost:3111'
  const webBetaSmokeServerCommand =
    env.WEB_BETA_PLAYWRIGHT_WEB_SERVER_COMMAND || 'npx next start -p 3111'
  const sharedStepEnv = {
    PLAYWRIGHT_RUN_ID: runId,
    PLAYWRIGHT_OUTPUT_DIR: env.PLAYWRIGHT_OUTPUT_DIR || `test-results/${runId}`,
    APP_ENV: env.APP_ENV || 'development',
    NEXT_PUBLIC_APP_ENV: env.NEXT_PUBLIC_APP_ENV || 'development',
  }

  return {
    buildDistDir,
    fullAppUrl: env.NEXT_PUBLIC_APP_URL || smokeBaseUrl,
    fullSiteUrl: env.NEXT_PUBLIC_SITE_URL || smokeBaseUrl,
    playwrightReuseServer: env.PLAYWRIGHT_REUSE_SERVER || 'false',
    runId,
    sharedStepEnv,
    smokeBaseUrl,
    smokeServerCommand,
    webBetaAppUrl: env.NEXT_PUBLIC_APP_URL || webBetaSmokeBaseUrl,
    webBetaBuildDistDir,
    webBetaSiteUrl: env.NEXT_PUBLIC_SITE_URL || webBetaSmokeBaseUrl,
    webBetaSmokeBaseUrl,
    webBetaSmokeServerCommand,
  }
}

function buildScriptStep(name, scriptName, sharedStepEnv, envOverrides, retries = 0) {
  return {
    name,
    args: ['run', scriptName],
    env: {
      ...sharedStepEnv,
      ...envOverrides,
    },
    retries,
    scriptName,
  }
}

function findStepByName(steps, stepName) {
  return steps.find((step) => step.name === stepName) ?? null
}

function toStepCommand(step) {
  return `${npmCommand()} ${step.args.join(' ')}`
}

export function buildReleaseStepCatalog(context = buildReleaseProfileContext()) {
  const {
    buildDistDir,
    fullAppUrl,
    fullSiteUrl,
    playwrightReuseServer,
    sharedStepEnv,
    smokeBaseUrl,
    smokeServerCommand,
    webBetaAppUrl,
    webBetaBuildDistDir,
    webBetaSiteUrl,
    webBetaSmokeBaseUrl,
    webBetaSmokeServerCommand,
  } = context
  const webBetaManifest = resolveBuildSurfaceManifest('web-beta')
  const webBetaReleaseProfile = webBetaManifest?.releaseProfile

  if (!webBetaReleaseProfile) {
    throw new Error('Build surface "web-beta" is missing release profile metadata.')
  }

  const buildStep = {
    name: 'build',
    args: ['run', 'build'],
    env: {
      ...sharedStepEnv,
      NEXT_DIST_DIR: buildDistDir,
      NODE_OPTIONS: '--max-old-space-size=8192',
      NEXT_PUBLIC_SITE_URL: fullSiteUrl,
      NEXT_PUBLIC_APP_URL: fullAppUrl,
    },
    retries: 1,
    scriptName: 'build',
  }

  const smokeStep = buildScriptStep(
    'test:e2e:smoke:release',
    'test:e2e:smoke:release',
    sharedStepEnv,
    {
      NEXT_DIST_DIR: buildDistDir,
      PLAYWRIGHT_BASE_URL: smokeBaseUrl,
      PLAYWRIGHT_WEB_SERVER_COMMAND: smokeServerCommand,
      PLAYWRIGHT_REUSE_SERVER: playwrightReuseServer,
      NEXT_PUBLIC_SITE_URL: fullSiteUrl,
      NEXT_PUBLIC_APP_URL: fullAppUrl,
    },
    1
  )

  const webBetaBuildStep = {
    name: webBetaReleaseProfile.buildStepName,
    args: ['run', 'build'],
    env: {
      ...sharedStepEnv,
      NEXT_DIST_DIR: webBetaBuildDistDir,
      NODE_OPTIONS: '--max-old-space-size=8192',
      ...webBetaReleaseProfile.requiredEnv,
      NEXT_PUBLIC_SITE_URL: webBetaSiteUrl,
      NEXT_PUBLIC_APP_URL: webBetaAppUrl,
    },
    retries: 1,
    scriptName: 'build',
  }

  const webBetaSmokeStep = buildScriptStep(
    webBetaReleaseProfile.e2eScript,
    webBetaReleaseProfile.e2eScript,
    sharedStepEnv,
    {
      PLAYWRIGHT_BASE_URL: webBetaSmokeBaseUrl,
      PLAYWRIGHT_WEB_SERVER_COMMAND: webBetaSmokeServerCommand,
      PLAYWRIGHT_REUSE_SERVER: playwrightReuseServer,
      NEXT_DIST_DIR: webBetaBuildDistDir,
      ...webBetaReleaseProfile.requiredEnv,
      NEXT_PUBLIC_SITE_URL: webBetaSiteUrl,
      NEXT_PUBLIC_APP_URL: webBetaAppUrl,
    },
    1
  )

  return {
    'verify:secrets': buildScriptStep('verify:secrets', 'verify:secrets', sharedStepEnv),
    'audit:completeness:json': buildScriptStep(
      'audit:completeness:json',
      'audit:completeness:json',
      sharedStepEnv
    ),
    'audit:db:contract:json': buildScriptStep(
      'audit:db:contract:json',
      'audit:db:contract:json',
      sharedStepEnv
    ),
    typecheck: buildScriptStep('typecheck', 'typecheck', sharedStepEnv),
    'lint:strict': buildScriptStep('lint:strict', 'lint:strict', sharedStepEnv),
    'test:critical': buildScriptStep('test:critical', 'test:critical', sharedStepEnv),
    'test:unit': buildScriptStep('test:unit', 'test:unit', sharedStepEnv),
    build: buildStep,
    'test:e2e:smoke:release': smokeStep,
    [webBetaReleaseProfile.typecheckScript]: buildScriptStep(
      webBetaReleaseProfile.typecheckScript,
      webBetaReleaseProfile.typecheckScript,
      sharedStepEnv
    ),
    [webBetaReleaseProfile.lintScript]: buildScriptStep(
      webBetaReleaseProfile.lintScript,
      webBetaReleaseProfile.lintScript,
      sharedStepEnv
    ),
    [webBetaReleaseProfile.unitTestScript]: buildScriptStep(
      webBetaReleaseProfile.unitTestScript,
      webBetaReleaseProfile.unitTestScript,
      sharedStepEnv
    ),
    [webBetaReleaseProfile.buildStepName]: webBetaBuildStep,
    [webBetaReleaseProfile.e2eScript]: webBetaSmokeStep,
  }
}

export function buildReleaseProfiles(context = buildReleaseProfileContext()) {
  const stepCatalog = buildReleaseStepCatalog(context)
  const profiles = {}

  for (const [profileId, profileManifest] of Object.entries(RELEASE_GATE_MANIFEST.profiles)) {
    profiles[profileId] = profileManifest.steps.map((stepManifest) => {
      const resolvedStep = stepCatalog[stepManifest.name]
      if (!resolvedStep) {
        throw new Error(
          `Release profile "${profileId}" references step "${stepManifest.name}" without an executor definition.`
        )
      }

      return {
        ...resolvedStep,
        classification: stepManifest.classification,
        command: toStepCommand(resolvedStep),
        gateSeverity: stepManifest.gateSeverity,
        machineReadable: Boolean(stepManifest.machineReadable),
        warningPolicyIds: [...(stepManifest.warningPolicyIds ?? [])],
      }
    })
  }

  return profiles
}

export function resolveReleaseProfile(profile, context = buildReleaseProfileContext()) {
  const profiles = buildReleaseProfiles(context)
  return profiles[profile] ?? null
}

function summarizeOutput(output, maxChars = 4000) {
  const text = typeof output === 'string' ? output : ''
  const lines = text.length === 0 ? [] : text.split(/\r?\n/)
  return {
    charCount: text.length,
    lineCount: lines.length,
    tail: text.length > maxChars ? text.slice(-maxChars) : text,
  }
}

function createReleaseFinding({
  classification = RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
  code,
  count = 1,
  message,
  policyId = null,
  severity,
  stepName,
}) {
  return {
    classification,
    code,
    count,
    message,
    policyId,
    severity,
    stepName,
  }
}

function parseMachineReadableStepOutput(step, output) {
  if (!step.machineReadable) {
    return {
      finding: null,
      parsedOutput: null,
    }
  }

  const trimmed = String(output ?? '').trim()
  if (!trimmed) {
    return {
      finding: createReleaseFinding({
        classification: step.classification,
        code: `step-output:${step.name}:missing_json`,
        message: `Step "${step.name}" is marked machine-readable but emitted no JSON output.`,
        severity: step.gateSeverity,
        stepName: step.name,
      }),
      parsedOutput: null,
    }
  }

  try {
    return {
      finding: null,
      parsedOutput: JSON.parse(trimmed),
    }
  } catch (error) {
    return {
      finding: createReleaseFinding({
        classification: step.classification,
        code: `step-output:${step.name}:invalid_json`,
        message:
          `Step "${step.name}" is marked machine-readable but emitted invalid JSON: ` +
          `${error instanceof Error ? error.message : String(error)}`,
        severity: step.gateSeverity,
        stepName: step.name,
      }),
      parsedOutput: null,
    }
  }
}

function evaluateStepExecution(step, executionResult) {
  const findings = evaluateReleaseGateWarnings(
    executionResult.output,
    step.warningPolicyIds ?? []
  ).map((finding) =>
    createReleaseFinding({
      classification: step.classification,
      code: finding.code,
      count: finding.count,
      message: finding.message,
      policyId: finding.policyId,
      severity: finding.severity,
      stepName: step.name,
    })
  )

  const machineReadableResult = parseMachineReadableStepOutput(step, executionResult.output)
  if (machineReadableResult.finding) {
    findings.push(machineReadableResult.finding)
  }

  if (!executionResult.ok) {
    const detail = executionResult.errorMessage
      ? executionResult.errorMessage
      : `exit code ${executionResult.exitCode ?? 'unknown'}`
    findings.push(
      createReleaseFinding({
        classification: step.classification,
        code: `step-execution:${step.name}`,
        message: `Step "${step.name}" failed with ${detail}.`,
        severity: step.gateSeverity,
        stepName: step.name,
      })
    )
  }

  const blockers = findings.filter(
    (finding) => finding.severity === RELEASE_GATE_WARNING_SEVERITY.BLOCK
  )
  const advisories = findings.filter(
    (finding) => finding.severity === RELEASE_GATE_WARNING_SEVERITY.TRACK
  )
  const ignored = findings.filter(
    (finding) => finding.severity === RELEASE_GATE_WARNING_SEVERITY.IGNORE
  )

  return {
    advisories,
    attempts: executionResult.attempts,
    blockers,
    classification: step.classification,
    command: executionResult.command,
    completedAt: executionResult.completedAt,
    durationMs: executionResult.durationMs,
    exitCode: executionResult.exitCode,
    findings,
    gateSeverity: step.gateSeverity,
    ignoredCount: ignored.length,
    machineReadable: step.machineReadable,
    machineReadableOutput: machineReadableResult.parsedOutput,
    name: step.name,
    outputSummary: executionResult.outputSummary,
    startedAt: executionResult.startedAt,
    status: executionResult.ok && blockers.length === 0 ? 'passed' : 'failed',
    warningPolicyIds: step.warningPolicyIds ?? [],
  }
}

export function buildReleaseReport({
  completedAt,
  fatalError = null,
  profile,
  runId,
  snapshot,
  startedAt,
  stepResults,
}) {
  const profileManifest = RELEASE_GATE_MANIFEST.profiles[profile] ?? null
  const fatalFindings = fatalError
    ? [
        createReleaseFinding({
          code: 'release-executor:fatal',
          message:
            fatalError instanceof Error
              ? fatalError.message
              : `Release executor failed: ${String(fatalError)}`,
          severity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
          stepName: 'release-executor',
        }),
      ]
    : []
  const blockers = [...stepResults.flatMap((step) => step.blockers), ...fatalFindings]
  const advisories = stepResults.flatMap((step) => step.advisories)
  const status = blockers.length === 0 ? 'passed' : 'failed'

  return {
    buildSurface: profileManifest?.buildSurface ?? null,
    completedAt,
    contractVersion: RELEASE_ATTESTATION_CONTRACT_VERSION,
    manifestVersion: RELEASE_GATE_MANIFEST.contractVersion,
    profile,
    profileLabel: profileManifest?.label ?? profile,
    runId,
    snapshot,
    startedAt,
    status,
    steps: stepResults,
    summary: {
      advisoryCount: advisories.length,
      blockerCount: blockers.length,
      failedStepCount: stepResults.filter((step) => step.status === 'failed').length,
      passedStepCount: stepResults.filter((step) => step.status === 'passed').length,
      totalStepCount: stepResults.length,
    },
    advisories,
    blockers,
    verifiedAt: completedAt,
  }
}

function executeStepAttempt(step) {
  const command = npmCommand()
  const startedAt = new Date().toISOString()

  return new Promise((resolve) => {
    const stdoutChunks = []
    const stderrChunks = []
    let settled = false

    const child = spawn(command, step.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        ...step.env,
      },
    })

    const finalize = (payload) => {
      if (settled) return
      settled = true
      const output = [...stdoutChunks, ...stderrChunks].join('')
      const completedAt = new Date().toISOString()
      resolve({
        command: `${command} ${step.args.join(' ')}`,
        completedAt,
        durationMs: Date.parse(completedAt) - Date.parse(startedAt),
        ...payload,
        output,
        outputSummary: summarizeOutput(output),
        startedAt,
      })
    }

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString()
      stdoutChunks.push(text)
      process.stdout.write(text)
    })

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString()
      stderrChunks.push(text)
      process.stderr.write(text)
    })

    child.on('error', (error) => {
      finalize({
        errorMessage: error instanceof Error ? error.message : String(error),
        exitCode: null,
        ok: false,
      })
    })

    child.on('exit', (code) => {
      finalize({
        errorMessage: code === 0 ? null : null,
        exitCode: typeof code === 'number' ? code : null,
        ok: code === 0,
      })
    })
  })
}

async function runStep(step) {
  const maxAttempts = (step.retries ?? 0) + 1
  let attempt = 0
  let lastResult = null

  while (attempt < maxAttempts) {
    attempt += 1
    lastResult = await executeStepAttempt(step)

    if (lastResult.ok) {
      return {
        ...lastResult,
        attempts: attempt,
      }
    }

    if (attempt < maxAttempts) {
      console.warn(
        `[verify:release] Step "${step.name}" failed (attempt ${attempt}/${maxAttempts}); retrying...`
      )
    }
  }

  return {
    ...lastResult,
    attempts: attempt,
  }
}

export async function runReleaseVerification({
  context = buildReleaseProfileContext(),
  cwd = process.cwd(),
  env = process.env,
  profile,
  runner = runStep,
} = {}) {
  const selectedProfile = profile || resolveProfile()
  const webBetaReleaseProfile = resolveBuildSurfaceManifest('web-beta')?.releaseProfile
  const startedAt = new Date().toISOString()
  const snapshot = getCurrentGitSnapshot({ cwd })
  let stepResults = []
  let fatalError = null

  try {
    const steps = resolveReleaseProfile(selectedProfile, context)
    if (!steps) {
      throw new Error(`Release profile "${selectedProfile}" is not defined.`)
    }

    await Promise.all([
      rm(context.buildDistDir, { recursive: true, force: true }),
      rm(context.webBetaBuildDistDir, { recursive: true, force: true }),
    ])

    const webBetaBuildStep = webBetaReleaseProfile
      ? findStepByName(steps, webBetaReleaseProfile.buildStepName)
      : null
    if (
      selectedProfile === 'web-beta' &&
      webBetaBuildStep?.env?.NEXT_BUILD_SURFACE !== 'web-beta'
    ) {
      throw new Error('Web beta build step is missing NEXT_BUILD_SURFACE=web-beta.')
    }

    for (const step of steps) {
      const executionResult = await runner(step)
      const evaluatedStep = evaluateStepExecution(step, executionResult)
      stepResults.push(evaluatedStep)

      if (evaluatedStep.status === 'failed') {
        break
      }
    }
  } catch (error) {
    fatalError = error
  }

  const completedAt = new Date().toISOString()
  const report = buildReleaseReport({
    completedAt,
    fatalError,
    profile: selectedProfile,
    runId: context.runId,
    snapshot,
    startedAt,
    stepResults,
  })
  const attestationPaths = await writeReleaseAttestation(report, { env })

  return {
    attestationPaths,
    report,
  }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  const profile = resolveProfile(args)
  const context = buildReleaseProfileContext(env)

  console.log(`[verify:release] Run ID: ${context.runId}`)
  console.log(`[verify:release] Profile: ${profile}`)
  console.log(`[verify:release] Build dist dir: ${context.buildDistDir}`)
  console.log(`[verify:release] Web beta build dist dir: ${context.webBetaBuildDistDir}`)
  console.log(`[verify:release] Smoke base URL: ${context.smokeBaseUrl}`)
  console.log(`[verify:release] Web beta smoke base URL: ${context.webBetaSmokeBaseUrl}`)
  console.log('[verify:release] Cleaning previous run artifacts...')
  console.log('[verify:release] Starting release verification...')

  const { attestationPaths, report } = await runReleaseVerification({
    context,
    env,
    profile,
  })

  console.log(`[verify:release] Machine-readable report: ${attestationPaths.primaryPath}`)
  console.log(`[verify:release] Latest attestation alias: ${attestationPaths.latestPath}`)

  if (report.status !== 'passed') {
    const firstBlocker = report.blockers[0]?.message ?? 'Release verification failed.'
    throw new Error(firstBlocker)
  }

  if (report.summary.advisoryCount > 0) {
    console.log(
      `[verify:release] Passed with ${report.summary.advisoryCount} tracked advisory` +
        `${report.summary.advisoryCount === 1 ? '' : 'ies'}.`
    )
  }

  console.log('[verify:release] Release verification passed.')
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false
  }

  try {
    return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  } catch {
    return false
  }
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error('[verify:release] FAILED:', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
