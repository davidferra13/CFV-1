const DAY_MS = 86_400_000

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function parseTime(value) {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

function ageHours(value, nowMs) {
  const thenMs = parseTime(value)
  if (thenMs === null || nowMs < thenMs) return null
  return Math.floor((nowMs - thenMs) / 3_600_000)
}

function freshWithin(value, maxHours, nowMs) {
  const hours = ageHours(value, nowMs)
  return hours !== null && hours <= maxHours
}

function pass(key, label, evidence, details = {}) {
  return { key, label, status: 'pass', severity: 'info', evidence, details }
}

function warn(key, label, evidence, details = {}) {
  return { key, label, status: 'warn', severity: 'warning', evidence, details }
}

function fail(key, label, evidence, details = {}) {
  return { key, label, status: 'fail', severity: 'blocker', evidence, details }
}

function countStatuses(gates) {
  return gates.reduce(
    (counts, gate) => {
      counts[gate.status] += 1
      return counts
    },
    { pass: 0, warn: 0, fail: 0 }
  )
}

export function parseBuildState(markdown) {
  const text = String(markdown ?? '')
  const typeRow = text.match(
    /\|\s*`npx tsc --noEmit --skipLibCheck`\s*\|\s*(\w+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/
  )
  const buildRow = text.match(
    /\|\s*`npm run build -- --no-lint`[^|]*\|\s*(\w+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/
  )

  return {
    present: text.trim().length > 0,
    typecheckGreen: typeRow?.[1]?.trim() === 'green',
    buildGreen: buildRow?.[1]?.trim() === 'green',
    lastVerified: buildRow?.[2]?.trim() || typeRow?.[2]?.trim() || null,
    commit: buildRow?.[3]?.trim() || typeRow?.[3]?.trim() || null,
  }
}

export function summarizeMobileAudit(value) {
  const audit = asObject(value)
  const totals = asObject(audit.totals)
  const failures = Number(totals.failures ?? audit.failures?.length ?? 0)

  return {
    present: Object.keys(audit).length > 0,
    generatedAt: audit.generatedAt ?? null,
    mode: audit.mode ?? null,
    scope: audit.scope ?? null,
    executions: Number(totals.executions ?? 0),
    failures: Number.isFinite(failures) ? failures : 0,
  }
}

export function summarizeLoadProof(value) {
  const proof = asObject(value)
  const metrics = asObject(proof.metrics)
  const failed = asObject(metrics.http_req_failed)
  const duration = asObject(metrics.http_req_duration)
  const thresholdResult = proof.thresholdsPassed ?? proof.thresholds_passed ?? null
  const errorRate = typeof failed.rate === 'number' ? failed.rate : null
  const p95 =
    typeof duration['p(95)'] === 'number'
      ? duration['p(95)']
      : typeof duration.p95 === 'number'
        ? duration.p95
        : null

  return {
    present: Object.keys(proof).length > 0,
    generatedAt: proof.generatedAt ?? proof.generated_at ?? null,
    profile: proof.profile ?? null,
    thresholdsPassed: thresholdResult === null ? null : Boolean(thresholdResult),
    errorRate,
    p95,
    source: proof.source ?? null,
  }
}

export function summarizeSync(value) {
  const sync = asObject(value)
  const summary = asObject(sync.summary)
  const steps = Array.isArray(summary.steps) ? summary.steps.map(asObject) : []
  const failedStepNames = [
    ...(Array.isArray(summary.failedStepNames) ? summary.failedStepNames : []),
    ...steps.filter((step) => step.status === 'failed').map((step) => step.name),
  ].filter(Boolean)

  return {
    present: Object.keys(sync).length > 0,
    status: sync.status ?? null,
    lastSuccessAt: sync.last_success_at ?? sync.lastSuccessAt ?? null,
    lastFailureAt: sync.last_failure_at ?? sync.lastFailureAt ?? null,
    lastError: sync.last_error ?? sync.lastError ?? null,
    failedStepNames: [...new Set(failedStepNames)],
  }
}

export function evaluateProfessionalReadiness(input) {
  const facts = asObject(input)
  const nowMs = parseTime(facts.generatedAt) ?? Date.now()
  const runtime = asObject(facts.runtime)
  const build = asObject(facts.build)
  const sync = asObject(facts.sync)
  const mobile = asObject(facts.mobile)
  const load = asObject(facts.load)
  const environment = asObject(facts.environment)
  const release = asObject(facts.release)
  const observability = asObject(facts.observability)
  const topology = asObject(facts.topology)

  const gates = []
  const beta = asObject(runtime.beta)
  const production = asObject(runtime.production)
  const requiredRuntime = [beta, production]
  const runtimeChecked = requiredRuntime.every((item) => item.checked)
  const runtimeHealthy = requiredRuntime.every((item) => item.ok === true)
  if (runtimeHealthy) {
    gates.push(pass('runtime_health', 'Beta and production runtime health', 'Beta and production readiness endpoints answered successfully.', runtime))
  } else if (!runtimeChecked) {
    gates.push(fail('runtime_health', 'Beta and production runtime health', 'Beta and production runtime health has not been proven in this report.', runtime))
  } else {
    gates.push(fail('runtime_health', 'Beta and production runtime health', 'At least one production-like runtime is unavailable or degraded.', runtime))
  }

  const buildFresh = freshWithin(build.lastVerified, 168, nowMs)
  if (build.typecheckGreen && build.buildGreen && buildFresh && build.commit && build.commit !== 'dirty') {
    gates.push(pass('build_integrity', 'Fresh build integrity', `Type check and build are green from ${build.lastVerified}.`, build))
  } else {
    gates.push(fail('build_integrity', 'Fresh build integrity', 'Current launch proof needs a fresh clean type check and build tied to a commit.', build))
  }

  const syncFresh = freshWithin(sync.lastSuccessAt, 24, nowMs)
  if (sync.status !== 'failed' && sync.lastSuccessAt && syncFresh) {
    gates.push(pass('pricing_freshness', 'Pricing pipeline freshness', `Pricing sync last succeeded at ${sync.lastSuccessAt}.`, sync))
  } else {
    gates.push(fail('pricing_freshness', 'Pricing pipeline freshness', 'Pricing sync is failed, stale, or missing a successful run.', sync))
  }

  if (mobile.present && mobile.failures === 0 && mobile.executions > 0 && freshWithin(mobile.generatedAt, 168, nowMs)) {
    gates.push(pass('mobile_proof', 'Mobile audit proof', `Mobile audit passed ${mobile.executions} executions.`, mobile))
  } else {
    gates.push(fail('mobile_proof', 'Mobile audit proof', 'No fresh zero-failure mobile audit artifact is available.', mobile))
  }

  if (load.present && load.thresholdsPassed === true && freshWithin(load.generatedAt, 168, nowMs)) {
    gates.push(pass('load_proof', 'Load test proof', `Load profile ${load.profile ?? 'unknown'} passed recorded thresholds.`, load))
  } else {
    gates.push(fail('load_proof', 'Load test proof', 'No fresh passing k6 load artifact is available.', load))
  }

  if (environment.separateDatabases === true && environment.productionDataProtected === true) {
    gates.push(pass('environment_separation', 'Environment separation', 'Dev, beta, and production data boundaries are explicitly confirmed.', environment))
  } else {
    gates.push(fail('environment_separation', 'Environment separation', 'Dev, beta, and production data separation is missing or unproven.', environment))
  }

  if (topology.productionIngressPresent === true && topology.betaIngressPresent === true) {
    gates.push(pass('edge_topology', 'Edge topology', 'Beta and production ingress are documented in readiness evidence.', topology))
  } else {
    gates.push(warn('edge_topology', 'Edge topology', 'Production or beta ingress is missing from local readiness evidence.', topology))
  }

  if (observability.healthRoutes && observability.sentryDependency && observability.releaseReports) {
    gates.push(pass('observability', 'Observability baseline', 'Health routes, Sentry dependency, and release reports are present.', observability))
  } else {
    gates.push(warn('observability', 'Observability baseline', 'Observability exists partially but is not fully proven.', observability))
  }

  const requiredScripts = [
    'typecheck',
    'verify:release',
    'test:mobile:audit',
    'test:load',
    'test:e2e:smoke',
  ]
  const scriptSet = new Set(Array.isArray(release.scripts) ? release.scripts : [])
  const missingScripts = requiredScripts.filter((script) => !scriptSet.has(script))
  if (missingScripts.length === 0) {
    gates.push(pass('release_gate', 'Release gate commands', 'Core release, mobile, and load commands are present.', { requiredScripts }))
  } else {
    gates.push(fail('release_gate', 'Release gate commands', `Missing release gate commands: ${missingScripts.join(', ')}`, { requiredScripts, missingScripts }))
  }

  const counts = countStatuses(gates)
  const blockerFailures = gates.filter((gate) => gate.status === 'fail' && gate.severity === 'blocker')
  return {
    generatedAt: facts.generatedAt ?? new Date(nowMs).toISOString(),
    status: blockerFailures.length === 0 ? (counts.warn > 0 ? 'needs_review' : 'ready') : 'blocked',
    score: Math.round((counts.pass / gates.length) * 100),
    counts,
    gates,
    nextActions: gates
      .filter((gate) => gate.status !== 'pass')
      .slice(0, 6)
      .map((gate) => ({
        key: gate.key,
        label: gate.label,
        reason: gate.evidence,
      })),
  }
}

export function buildProfessionalReadinessMarkdown(report) {
  const lines = []
  lines.push('# Professional Readiness')
  lines.push('')
  lines.push(`Generated at: ${report.generatedAt}`)
  lines.push(`Status: ${report.status}`)
  lines.push(`Score: ${report.score}%`)
  lines.push('')
  lines.push('## Gates')
  for (const gate of report.gates) {
    lines.push(`- ${gate.status.toUpperCase()} ${gate.label}: ${gate.evidence}`)
  }
  lines.push('')
  lines.push('## Next Actions')
  if (report.nextActions.length === 0) {
    lines.push('- No blocker actions.')
  } else {
    for (const action of report.nextActions) {
      lines.push(`- ${action.label}: ${action.reason}`)
    }
  }
  lines.push('')
  lines.push('## Evidence Policy')
  lines.push('- This report treats missing artifacts as failed proof, not as success.')
  lines.push('- It does not start servers, run builds, run load tests, change databases, deploy, or clean files.')
  lines.push('- A launch claim requires fresh runtime, build, mobile, load, sync, and environment evidence.')
  return `${lines.join('\n')}\n`
}
