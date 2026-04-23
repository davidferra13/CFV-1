import surfaceCompleteness from '../lib/interface/surface-completeness.ts'
import type {
  SystemContractGraph,
  SurfaceCompletenessAuditResult,
  SurfaceCompletenessCheckId,
  SurfaceCompletenessGroup,
} from '../lib/interface/surface-completeness.ts'

const { SURFACE_COMPLETENESS_CHECKS, buildSystemContractGraph, runSurfaceCompletenessAudit } =
  surfaceCompleteness

type CliOptions = {
  checkIds: SurfaceCompletenessCheckId[]
  format: 'json' | 'text'
  graphJson: boolean
  groups: SurfaceCompletenessGroup[]
  help: boolean
  strict: boolean
}

const VALID_CHECK_IDS = new Set(SURFACE_COMPLETENESS_CHECKS.map((check) => check.id))
const VALID_GROUPS = new Set(SURFACE_COMPLETENESS_CHECKS.map((check) => check.group))

function collectFlagValues(args: string[], flag: string) {
  const values: string[] = []

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (value === flag && args[index + 1]) {
      values.push(args[index + 1])
      index += 1
      continue
    }
    if (value.startsWith(`${flag}=`)) {
      values.push(value.slice(flag.length + 1))
    }
  }

  return values
}

function assertAllValid<T extends string>(
  values: string[],
  validSet: Set<string>,
  label: string
): T[] {
  const invalid = values.filter((value) => !validSet.has(value))
  if (invalid.length > 0) {
    throw new Error(`Unknown ${label}: ${invalid.join(', ')}`)
  }
  return values as T[]
}

function parseOptions(args = process.argv.slice(2)): CliOptions {
  return {
    checkIds: assertAllValid<SurfaceCompletenessCheckId>(
      collectFlagValues(args, '--check'),
      VALID_CHECK_IDS,
      '--check value'
    ),
    format: args.includes('--json') ? 'json' : 'text',
    graphJson: args.includes('--graph-json'),
    groups: assertAllValid<SurfaceCompletenessGroup>(
      collectFlagValues(args, '--group'),
      VALID_GROUPS,
      '--group value'
    ),
    help: args.includes('--help') || args.includes('-h'),
    strict: args.includes('--strict'),
  }
}

function getHelpText() {
  const checkLines = SURFACE_COMPLETENESS_CHECKS.map(
    (check) => `  - ${check.id} (${check.group})`
  ).join('\n')

  return [
    'Surface completeness audit',
    '',
    'Usage:',
    '  tsx scripts/audit-surface-completeness.ts [--json] [--graph-json] [--group <group>] [--check <id>] [--strict]',
    '',
    'Flags:',
    '  --json            Emit the full audit report as JSON.',
    '  --graph-json      Emit the unified system contract graph as JSON.',
    '  --group <group>   Run only checks in the named group. Repeatable.',
    '  --check <id>      Run only the named check. Repeatable.',
    '  --strict          Exit non-zero on warnings as well as failures.',
    '  --help            Show this help text.',
    '',
    'Available checks:',
    checkLines,
  ].join('\n')
}

function renderTextReport(report: SurfaceCompletenessAuditResult) {
  const lines = [
    'Surface completeness audit',
    `Generated at: ${report.generatedAt}`,
    `Checks selected: ${report.selectedCheckCount}`,
    `Results: ${report.passCount} pass, ${report.warnCount} warn, ${report.failCount} fail`,
    '',
  ]

  for (const result of report.results) {
    lines.push(
      `[${result.status.toUpperCase()}] ${result.label} (${result.id})`,
      `  group=${result.group} findings=${result.findings.length}`
    )

    const summaryEntries = Object.entries(result.summary)
    if (summaryEntries.length > 0) {
      lines.push(`  summary=${summaryEntries.map(([key, value]) => `${key}:${value}`).join(', ')}`)
    }

    for (const finding of result.findings) {
      lines.push(`  - [${finding.severity}] ${finding.message}`)
      if (finding.role) {
        lines.push(`    role=${finding.role}`)
      }
      if (finding.paths && finding.paths.length > 0) {
        lines.push(`    paths=${finding.paths.join(', ')}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

function renderGraphSummary(graph: SystemContractGraph) {
  return [
    'System contract graph',
    `Generated at: ${graph.generatedAt}`,
    `Nodes: ${graph.summary.totalNodes}`,
    `Edges: ${graph.summary.totalEdges}`,
    `Page routes: ${graph.summary.pageRoutes} (${graph.summary.dynamicPageRoutes} dynamic, ${graph.summary.resolvedDynamicPageRoutes} resolved, ${graph.summary.unresolvedDynamicPageRoutes} unresolved)`,
    `API routes: ${graph.summary.apiRoutes}`,
    `Server action mutations: ${graph.summary.serverActionMutations} (${graph.summary.pageFacingWriteActions} page-facing, ${graph.summary.pageFacingWriteContractCompliantActions} compliant, ${graph.summary.pageFacingWriteContractWarningActions} warnings-only, ${graph.summary.pageFacingWriteContractRequiredViolationActions} required violations)`,
    `Derived outputs: ${graph.summary.derivedOutputNodes} (${graph.summary.derivedOutputAiAssistedNodes} AI-assisted/hybrid, ${graph.summary.derivedOutputContractCompliantNodes} shared-contract, ${graph.summary.derivedOutputObservabilityBridgeNodes} observability-bridged)`,
    `SEO expectations: ${graph.summary.seoExpectations}`,
    `Observability expectations: ${graph.summary.observabilityExpectations}`,
    `Build surfaces: ${graph.summary.buildSurfaces} (${graph.summary.buildSurfaceMissingPaths} missing paths, ${graph.summary.buildSurfaceIntegrityFailures} integrity findings)`,
    `Audit entrypoints: ${graph.summary.auditEntrypoints}`,
  ].join('\n')
}

function resolveExitCode(report: SurfaceCompletenessAuditResult, strict: boolean) {
  if (report.failCount > 0) return 1
  if (strict && report.warnCount > 0) return 1
  return 0
}

async function main() {
  const options = parseOptions()
  if (options.help) {
    console.log(getHelpText())
    return
  }

  if (options.graphJson) {
    const graph = await buildSystemContractGraph()
    console.log(JSON.stringify(graph, null, 2))
    return
  }

  const report = await runSurfaceCompletenessAudit({
    checkIds: options.checkIds,
    groups: options.groups,
  })

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2))
  } else {
    const graph = await buildSystemContractGraph()
    console.log(`${renderTextReport(report)}\n\n${renderGraphSummary(graph)}`)
  }

  process.exitCode = resolveExitCode(report, options.strict)
}

void main().catch((error) => {
  console.error(
    '[audit:surface-completeness] FAILED:',
    error instanceof Error ? error.message : String(error)
  )
  process.exitCode = 1
})
