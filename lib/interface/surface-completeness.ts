import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveAiDerivedOutputModelMetadata } from '@/lib/analytics/source-provenance'
import {
  MIN_PROTECTED_API_ROUTE_RATIO,
  buildApiRouteAuthInventory,
  type ApiRouteAuthInventory,
} from '@/lib/api/auth-inventory'
import {
  buildServerActionAuthInventory,
  buildServerActionMutationInventory,
} from '@/lib/auth/server-action-inventory'
import {
  resolveSurfaceModeForPortal,
  type ProductSurfacePortal,
} from '@/lib/interface/surface-governance'
import routeInventory, {
  type CoverageRole,
  type PageRouteEntry,
  type StaticPageRouteEntry,
} from '@/lib/interface/route-inventory'
import {
  PLATFORM_OBSERVABILITY_EMITTER_EXPECTATIONS,
  getPlatformObservabilityCoverageFindings,
} from '@/lib/platform-observability/coverage'
import { PUBLIC_ROUTE_SEO_CHECKS, hasPublicRouteSeoExpectation } from '@/lib/site/public-route-seo'
import { runNationalBrandAudit } from '@/lib/site/national-brand-audit'

export type SurfaceCompletenessCheckId =
  | 'static-route-coverage'
  | 'dynamic-route-resolution'
  | 'build-surface-integrity'
  | 'surface-mode-declaration'
  | 'route-policy-alignment'
  | 'api-auth-inventory'
  | 'server-action-auth-inventory'
  | 'server-action-mutation-inventory'
  | 'derived-output-provenance-inventory'
  | 'public-seo-contract'
  | 'national-brand-audit'
  | 'platform-observability-coverage'

export type SurfaceCompletenessGroup =
  | 'coverage'
  | 'release'
  | 'auth'
  | 'mutation'
  | 'metadata'
  | 'brand'
  | 'observability'

export type SurfaceCompletenessSeverity = 'warning' | 'error'

export type SurfaceCompletenessFinding = {
  checkId: SurfaceCompletenessCheckId
  code: string
  message: string
  paths?: string[]
  role?: CoverageRole
  severity: SurfaceCompletenessSeverity
}

export type SurfaceCompletenessCheckStatus = 'pass' | 'warn' | 'fail'

export type SurfaceCompletenessCheckResult = {
  findings: SurfaceCompletenessFinding[]
  group: SurfaceCompletenessGroup
  id: SurfaceCompletenessCheckId
  label: string
  status: SurfaceCompletenessCheckStatus
  summary: Record<string, number | string | boolean>
}

export type SurfaceCompletenessAuditResult = {
  generatedAt: string
  passCount: number
  requestedChecks: SurfaceCompletenessCheckId[]
  requestedGroups: SurfaceCompletenessGroup[]
  results: SurfaceCompletenessCheckResult[]
  selectedCheckCount: number
  totalFindings: number
  warnCount: number
  failCount: number
}

export type SystemContractFamily =
  | 'page-routes'
  | 'dynamic-route-resolution'
  | 'api-auth'
  | 'server-action-auth'
  | 'page-facing-write'
  | 'derived-output'
  | 'public-seo'
  | 'platform-observability'
  | 'build-surface'

export type SystemAuditProfile =
  | 'contract-core'
  | 'route-execution'
  | 'release-surface'
  | 'observability-smoke'

export type SystemContractGraphNodeKind =
  | 'page-route'
  | 'api-route'
  | 'server-action-mutation'
  | 'derived-output'
  | 'seo-expectation'
  | 'observability-expectation'
  | 'build-surface'
  | 'audit-entrypoint'

export type SystemContractGraphNode = {
  id: string
  kind: SystemContractGraphNodeKind
  label: string
  metadata: Record<string, unknown>
}

export type SystemContractGraphEdgeType =
  | 'audited-by'
  | 'has-seo-expectation'
  | 'included-in-build-surface'
  | 'covers-contract-family'

export type SystemContractGraphEdge = {
  from: string
  to: string
  type: SystemContractGraphEdgeType
}

export type SystemAuditEntrypoint = {
  command: string
  contractFamilies: SystemContractFamily[]
  id: string
  label: string
  machineReadable: boolean
  profiles: SystemAuditProfile[]
  scriptName?: string
  sourcePath: string
}

export type SystemContractGraphSummary = {
  apiRoutes: number
  auditEntrypoints: number
  buildSurfaceIntegrityFailures: number
  buildSurfaceMissingPaths: number
  buildSurfaces: number
  derivedOutputAiAssistedNodes: number
  derivedOutputContractCompliantNodes: number
  derivedOutputNodes: number
  derivedOutputObservabilityBridgeNodes: number
  dynamicPageRoutes: number
  observabilityExpectations: number
  pageRoutes: number
  pageFacingWriteActions: number
  pageFacingWriteContractCompliantActions: number
  pageFacingWriteContractRequiredViolationActions: number
  pageFacingWriteContractWarningActions: number
  resolvedDynamicPageRoutes: number
  seoExpectations: number
  serverActionMutations: number
  totalEdges: number
  totalNodes: number
  unresolvedDynamicPageRoutes: number
}

export type SystemContractGraph = {
  auditEntrypoints: SystemAuditEntrypoint[]
  edges: SystemContractGraphEdge[]
  generatedAt: string
  nodes: SystemContractGraphNode[]
  summary: SystemContractGraphSummary
}

type SurfaceCompletenessCheckDefinition = {
  group: SurfaceCompletenessGroup
  id: SurfaceCompletenessCheckId
  label: string
  run: () => SurfaceCompletenessCheckResult | Promise<SurfaceCompletenessCheckResult>
}

type SystemAuditEntrypointDefinition = {
  contractFamilies: SystemContractFamily[]
  fallbackCommand: string
  id: string
  label: string
  machineReadable: boolean
  profiles: SystemAuditProfile[]
  scriptName?: string
  sourcePath: string
}

type SiteAuditManifestRoute = {
  expected?: {
    reason?: string
    type?: string
  } | null
  path: string
  resolution: 'static' | 'dynamic'
  resolver: {
    kind: string
    paramNames?: string[]
    params?: Record<string, string | string[]>
    source: string
  }
  role: CoverageRole
  sourceFile: string
  template: string
}

type SiteAuditManifestSkippedRoute = {
  reason: string
  resolver?: {
    hasPageNotFoundGuard?: boolean
    kind: string
    missingParams?: string[]
    paramNames?: string[]
    source: string
    staticParamCount?: number
  }
  role?: CoverageRole
  sourceFile: string
  template: string
}

type SiteAuditManifestModule = {
  discoverSiteAuditRoutes(rootDir: string): Promise<{
    routes: SiteAuditManifestRoute[]
    skipped: SiteAuditManifestSkippedRoute[]
    summary?: {
      resolvedDynamicPaths?: number
      resolvedDynamicTemplates?: number
      resolverKinds?: Record<string, number>
      skippedDynamicTemplates?: number
      skippedKinds?: Record<string, number>
      totalRoutes?: number
      totalSkipped?: number
    }
  }>
}

type BuildSurfaceIncludeKind = 'app-entry' | 'api-tree' | 'page-tree' | 'support-file'

type BuildSurfaceIncludeEntry = {
  kind: BuildSurfaceIncludeKind
  path: string
}

type BuildSurfaceReleaseProfile = {
  buildStepName: string
  e2eScript: string
  id: string
  lintScript: string
  playwrightConfigPath?: string
  requiredEnv?: Record<string, string>
  typecheckScript: string
  unitTestScript: string
  verifyScript: string
}

type BuildSurfaceManifestEntry = {
  description: string
  expectedApiRoutes?: string[]
  expectedPageRoutes?: string[]
  include: Array<string | BuildSurfaceIncludeEntry>
  overlayAppDir?: string
  releaseProfile?: BuildSurfaceReleaseProfile
  requiredOverlayPaths?: string[]
}

type BuildSurfaceManifestModule = {
  BUILD_SURFACE_MANIFESTS?: Record<string, BuildSurfaceManifestEntry>
  getBuildSurfaceIncludeEntries?: (
    surfaceNameOrManifest: string | BuildSurfaceManifestEntry
  ) => BuildSurfaceIncludeEntry[]
  getBuildSurfaceIncludePaths?: (
    surfaceNameOrManifest: string | BuildSurfaceManifestEntry
  ) => string[]
  validateBuildSurfaceFilesystem?: (
    rootDir: string,
    surfaceName: string
  ) => Promise<{
    missingIncludePaths: string[]
    missingOverlayPaths: string[]
    ok: boolean
    surfaceName: string
  } | null>
}

type VerifyReleaseStep = {
  args: string[]
  env?: Record<string, string>
  name: string
  retries?: number
  scriptName?: string
}

type VerifyReleaseModule = {
  buildReleaseProfileContext?: (env?: NodeJS.ProcessEnv) => Record<string, unknown>
  buildReleaseProfiles?: (context?: Record<string, unknown>) => Record<string, VerifyReleaseStep[]>
}

type DerivedOutputInventoryDomain = 'ai' | 'analytics' | 'document' | 'email' | 'report'

type DerivedOutputInventoryDerivationMethod = 'deterministic' | 'ai-assisted' | 'hybrid'

type DerivedOutputInventoryEntry = {
  derivationMethod: DerivedOutputInventoryDerivationMethod
  domain: DerivedOutputInventoryDomain
  hasFreshnessSignal: boolean
  hasModelMetadataSignal: boolean
  hasObservabilityBridge: boolean
  hasSharedContract: boolean
  hasTimestampSignal: boolean
  relativeFilePath: string
}

type DerivedOutputInventory = {
  aiAssistedEntryCount: number
  compliantEntryCount: number
  entries: DerivedOutputInventoryEntry[]
  missingFreshnessEntryCount: number
  missingModelMetadataEntryCount: number
  missingSharedContractEntryCount: number
  observabilityBridgeEntryCount: number
  totalEntries: number
}

type SurfaceModeContractExpectation = {
  expectedPortalMarker: string
  label: string
  path: string
  requiresPathnameHeader: boolean
  resolverName: string | null
  role: CoverageRole | null
}

const COVERAGE_ROLES: CoverageRole[] = ['public', 'chef', 'client', 'admin', 'staff', 'partner']
const MAX_FINDING_PATHS = 50
const SEO_SIGNAL_PATTERNS = [
  /export\s+const\s+metadata\b/,
  /export\s+async\s+function\s+generateMetadata\b/,
  /\bbuildMarketingMetadata\s*\(/,
]
const DERIVED_OUTPUT_SCAN_ROOTS = [
  'lib/ai',
  'lib/analytics',
  'lib/documents',
  'lib/email',
  'lib/reports',
] as const
const DERIVED_OUTPUT_EXCLUDED_FILES = new Set([
  'lib/analytics/source-provenance.ts',
  'lib/reports/types.ts',
])
const DERIVED_OUTPUT_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])
const DERIVED_OUTPUT_CONTRACT_PATTERN =
  /\b(?:attachDerivedOutputProvenance|createDerivedOutputProvenance)\s*\(/
const DERIVED_OUTPUT_TIMESTAMP_PATTERN =
  /\bgeneratedAt(?:Iso)?\s*:\s*(?:new\s+Date\s*\(|\w+\.toISOString\s*\()/
const DERIVED_OUTPUT_FRESHNESS_PATTERN = /\b(?:freshness|asOf|freshnessWindowMs)\b/
const DERIVED_OUTPUT_AI_PATTERN = /\bparseWithOllama\s*\(/
const DERIVED_OUTPUT_HYBRID_PATTERN = /\bwithAiFallback\s*\(|\bgenerateDailyNarrative\s*\(/
const DERIVED_OUTPUT_OBSERVABILITY_PATTERN = /\bbuildDerivedOutputObservabilityMetadata\s*\(/
const DERIVED_OUTPUT_MODEL_PATTERN =
  /\bresolveAiDerivedOutputModelMetadata\s*\(|\bprovider:\s*['"]ollama['"]|\bmodelTier\b/
const SURFACE_MODE_CONTRACT_EXPECTATIONS: SurfaceModeContractExpectation[] = [
  {
    expectedPortalMarker: 'public',
    label: 'public root layout',
    path: 'app/(public)/layout.tsx',
    requiresPathnameHeader: false,
    resolverName: null,
    role: 'public',
  },
  {
    expectedPortalMarker: 'chef',
    label: 'chef root layout',
    path: 'app/(chef)/layout.tsx',
    requiresPathnameHeader: true,
    resolverName: 'resolveChefShellBudget',
    role: 'chef',
  },
  {
    expectedPortalMarker: 'client',
    label: 'client root layout',
    path: 'app/(client)/layout.tsx',
    requiresPathnameHeader: true,
    resolverName: 'resolveClientSurfaceMode',
    role: 'client',
  },
  {
    expectedPortalMarker: 'admin',
    label: 'admin root layout',
    path: 'app/(admin)/layout.tsx',
    requiresPathnameHeader: true,
    resolverName: 'resolveAdminSurfaceMode',
    role: 'admin',
  },
  {
    expectedPortalMarker: 'staff',
    label: 'staff root layout',
    path: 'app/(staff)/layout.tsx',
    requiresPathnameHeader: true,
    resolverName: 'resolveStaffSurfaceMode',
    role: 'staff',
  },
  {
    expectedPortalMarker: 'partner',
    label: 'partner root layout',
    path: 'app/(partner)/partner/layout.tsx',
    requiresPathnameHeader: true,
    resolverName: 'resolvePartnerSurfaceMode',
    role: 'partner',
  },
]
const BUILD_SURFACE_MODE_SHELL_PATHS = [
  'build-surfaces/web-beta/app/_components/release-portal-shell.tsx',
]

const SYSTEM_AUDIT_ENTRYPOINT_DEFINITIONS: SystemAuditEntrypointDefinition[] = [
  {
    contractFamilies: [
      'page-routes',
      'api-auth',
      'server-action-auth',
      'page-facing-write',
      'derived-output',
      'public-seo',
      'platform-observability',
      'build-surface',
    ],
    fallbackCommand: 'tsx scripts/audit-surface-completeness.ts',
    id: 'audit:completeness',
    label: 'Surface completeness audit',
    machineReadable: false,
    profiles: ['contract-core'],
    scriptName: 'audit:completeness',
    sourcePath: 'scripts/audit-surface-completeness.ts',
  },
  {
    contractFamilies: [
      'page-routes',
      'api-auth',
      'server-action-auth',
      'page-facing-write',
      'derived-output',
      'public-seo',
      'platform-observability',
      'build-surface',
    ],
    fallbackCommand: 'tsx scripts/audit-surface-completeness.ts --json',
    id: 'audit:completeness:json',
    label: 'Surface completeness audit (JSON)',
    machineReadable: true,
    profiles: ['contract-core'],
    scriptName: 'audit:completeness:json',
    sourcePath: 'scripts/audit-surface-completeness.ts',
  },
  {
    contractFamilies: [
      'page-routes',
      'api-auth',
      'server-action-auth',
      'page-facing-write',
      'derived-output',
      'public-seo',
      'platform-observability',
      'build-surface',
    ],
    fallbackCommand: 'tsx scripts/audit-surface-completeness.ts --strict',
    id: 'audit:completeness:strict',
    label: 'Surface completeness audit (strict)',
    machineReadable: false,
    profiles: ['contract-core'],
    scriptName: 'audit:completeness:strict',
    sourcePath: 'scripts/audit-surface-completeness.ts',
  },
  {
    contractFamilies: ['page-routes', 'dynamic-route-resolution'],
    fallbackCommand: 'node scripts/site-audit-runner.mjs',
    id: 'site-audit-runner',
    label: 'Full site audit runner',
    machineReadable: true,
    profiles: ['route-execution'],
    sourcePath: 'scripts/site-audit-runner.mjs',
  },
  {
    contractFamilies: ['page-routes', 'dynamic-route-resolution'],
    fallbackCommand: 'npm run test:coverage',
    id: 'test:coverage',
    label: 'Coverage matrix',
    machineReadable: false,
    profiles: ['route-execution'],
    scriptName: 'test:coverage',
    sourcePath: 'tests/coverage',
  },
  {
    contractFamilies: ['page-routes', 'public-seo'],
    fallbackCommand: 'npm run test:seo:public',
    id: 'test:seo:public',
    label: 'Public SEO route guards',
    machineReadable: false,
    profiles: ['contract-core', 'route-execution'],
    scriptName: 'test:seo:public',
    sourcePath: 'tests/coverage/13-public-seo-guards.spec.ts',
  },
  {
    contractFamilies: ['api-auth'],
    fallbackCommand:
      'npx playwright test --config=playwright.system-integrity.config.ts tests/system-integrity/q70-public-route-auth-inventory.spec.ts',
    id: 'q70-public-route-auth-inventory',
    label: 'Q70 API auth inventory',
    machineReadable: false,
    profiles: ['contract-core'],
    sourcePath: 'tests/system-integrity/q70-public-route-auth-inventory.spec.ts',
  },
  {
    contractFamilies: ['server-action-auth'],
    fallbackCommand:
      'npx playwright test --config=playwright.system-integrity.config.ts tests/system-integrity/q87-server-action-auth-completeness.spec.ts',
    id: 'q87-server-action-auth-completeness',
    label: 'Q87 server action auth completeness',
    machineReadable: false,
    profiles: ['contract-core'],
    sourcePath: 'tests/system-integrity/q87-server-action-auth-completeness.spec.ts',
  },
  {
    contractFamilies: ['page-facing-write'],
    fallbackCommand:
      'npx playwright test --config=playwright.system-integrity.config.ts tests/system-integrity/q80-revalidation-after-mutation.spec.ts',
    id: 'q80-cache-revalidation-after-mutation',
    label: 'Q80 page-facing write revalidation contract',
    machineReadable: false,
    profiles: ['contract-core'],
    sourcePath: 'tests/system-integrity/q80-revalidation-after-mutation.spec.ts',
  },
  {
    contractFamilies: ['platform-observability'],
    fallbackCommand: 'npm run smoke:platform-observability',
    id: 'smoke:platform-observability',
    label: 'Platform observability smoke',
    machineReadable: false,
    profiles: ['observability-smoke'],
    scriptName: 'smoke:platform-observability',
    sourcePath: 'scripts/smoke-platform-observability.ts',
  },
  {
    contractFamilies: ['build-surface'],
    fallbackCommand: 'npm run test:unit:web-beta',
    id: 'test:unit:web-beta',
    label: 'Web beta contract unit tests',
    machineReadable: false,
    profiles: ['release-surface'],
    scriptName: 'test:unit:web-beta',
    sourcePath: 'tests/unit/web-beta-build-surface.test.ts',
  },
  {
    contractFamilies: ['build-surface'],
    fallbackCommand: 'npm run verify:release:web-beta',
    id: 'verify:release:web-beta',
    label: 'Web beta release verification',
    machineReadable: false,
    profiles: ['release-surface'],
    scriptName: 'verify:release:web-beta',
    sourcePath: 'scripts/verify-release.mjs',
  },
]

function resolveStatus(findings: SurfaceCompletenessFinding[]): SurfaceCompletenessCheckStatus {
  if (findings.some((finding) => finding.severity === 'error')) return 'fail'
  if (findings.some((finding) => finding.severity === 'warning')) return 'warn'
  return 'pass'
}

function buildRoleFinding(
  checkId: SurfaceCompletenessCheckId,
  code: string,
  message: string,
  role: CoverageRole,
  paths: string[],
  severity: SurfaceCompletenessSeverity = 'error'
): SurfaceCompletenessFinding {
  return {
    checkId,
    code,
    message,
    paths,
    role,
    severity,
  }
}

function hasMetadataSignal(filePath: string): boolean {
  if (!existsSync(filePath)) return false
  const source = readFileSync(filePath, 'utf8')
  return SEO_SIGNAL_PATTERNS.some((pattern) => pattern.test(source))
}

function hasPublicMetadataContract(entry: StaticPageRouteEntry): boolean {
  const directory = path.dirname(entry.filePath)
  const siblingLayoutPaths = [
    path.join(directory, 'layout.tsx'),
    path.join(directory, 'layout.ts'),
    path.join(directory, 'layout.jsx'),
    path.join(directory, 'layout.js'),
  ]

  return [entry.filePath, ...siblingLayoutPaths].some(hasMetadataSignal)
}

function readSourceFileIfExists(filePath: string): string | null {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : null
}

function summarizePaths(paths: string[], maxPaths = MAX_FINDING_PATHS) {
  return paths.slice(0, maxPaths)
}

function inferDerivedOutputDomain(relativeFilePath: string): DerivedOutputInventoryDomain {
  if (relativeFilePath.startsWith('lib/ai/')) return 'ai'
  if (relativeFilePath.startsWith('lib/analytics/')) return 'analytics'
  if (relativeFilePath.startsWith('lib/documents/')) return 'document'
  if (relativeFilePath.startsWith('lib/email/')) return 'email'
  return 'report'
}

function walkSourceFiles(rootDir: string, currentDir: string, results: string[]) {
  if (!existsSync(currentDir)) return

  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') {
      continue
    }

    const fullPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      walkSourceFiles(rootDir, fullPath, results)
      continue
    }

    if (!DERIVED_OUTPUT_SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue
    results.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'))
  }
}

function classifyDerivedOutputMethod(source: string): DerivedOutputInventoryDerivationMethod {
  if (DERIVED_OUTPUT_HYBRID_PATTERN.test(source)) return 'hybrid'
  if (DERIVED_OUTPUT_AI_PATTERN.test(source)) return 'ai-assisted'
  return 'deterministic'
}

function buildDerivedOutputInventory(rootDir = process.cwd()): DerivedOutputInventory {
  const relativePaths: string[] = []

  for (const scanRoot of DERIVED_OUTPUT_SCAN_ROOTS) {
    walkSourceFiles(rootDir, path.join(rootDir, scanRoot), relativePaths)
  }

  const entries = relativePaths
    .map((relativeFilePath) => {
      if (DERIVED_OUTPUT_EXCLUDED_FILES.has(relativeFilePath)) {
        return null
      }

      const source = readFileSync(path.join(rootDir, relativeFilePath), 'utf8')
      const hasSharedContract = DERIVED_OUTPUT_CONTRACT_PATTERN.test(source)
      const hasTimestampSignal = DERIVED_OUTPUT_TIMESTAMP_PATTERN.test(source)
      const usesAi =
        DERIVED_OUTPUT_AI_PATTERN.test(source) || DERIVED_OUTPUT_HYBRID_PATTERN.test(source)

      if (!hasSharedContract && !hasTimestampSignal && !usesAi) {
        return null
      }

      return {
        derivationMethod: classifyDerivedOutputMethod(source),
        domain: inferDerivedOutputDomain(relativeFilePath),
        hasFreshnessSignal: hasSharedContract || DERIVED_OUTPUT_FRESHNESS_PATTERN.test(source),
        hasModelMetadataSignal: !usesAi || DERIVED_OUTPUT_MODEL_PATTERN.test(source),
        hasObservabilityBridge: DERIVED_OUTPUT_OBSERVABILITY_PATTERN.test(source),
        hasSharedContract,
        hasTimestampSignal,
        relativeFilePath,
      } satisfies DerivedOutputInventoryEntry
    })
    .filter((entry): entry is DerivedOutputInventoryEntry => Boolean(entry))
    .sort((left, right) => left.relativeFilePath.localeCompare(right.relativeFilePath))

  const aiAssistedEntries = entries.filter((entry) => entry.derivationMethod !== 'deterministic')
  const compliantEntries = entries.filter((entry) => entry.hasSharedContract)
  const missingSharedContractEntries = entries.filter((entry) => !entry.hasSharedContract)
  const missingFreshnessEntries = entries.filter((entry) => !entry.hasFreshnessSignal)
  const missingModelMetadataEntries = aiAssistedEntries.filter(
    (entry) => !entry.hasModelMetadataSignal
  )
  const observabilityBridgeEntries = entries.filter((entry) => entry.hasObservabilityBridge)

  return {
    aiAssistedEntryCount: aiAssistedEntries.length,
    compliantEntryCount: compliantEntries.length,
    entries,
    missingFreshnessEntryCount: missingFreshnessEntries.length,
    missingModelMetadataEntryCount: missingModelMetadataEntries.length,
    missingSharedContractEntryCount: missingSharedContractEntries.length,
    observabilityBridgeEntryCount: observabilityBridgeEntries.length,
    totalEntries: entries.length,
  }
}

function resolveKnownDerivedOutputModel(
  relativeFilePath: string
): ReturnType<typeof resolveAiDerivedOutputModelMetadata> | null {
  switch (relativeFilePath) {
    case 'lib/ai/contract-generator.ts':
      return resolveAiDerivedOutputModelMetadata({
        modelTier: 'standard',
        taskType: 'contract.generation',
      })
    case 'lib/ai/contingency-ai.ts':
      return resolveAiDerivedOutputModelMetadata({
        modelTier: 'standard',
        taskType: 'contingency.planning',
      })
    case 'lib/reports/compute-daily-report.ts':
      return resolveAiDerivedOutputModelMetadata({
        modelTier: 'fast',
        taskType: 'daily-report.narrative',
      })
    default:
      return null
  }
}

function runStaticRouteCoverageCheck(): SurfaceCompletenessCheckResult {
  const findings: SurfaceCompletenessFinding[] = []
  const summary: Record<string, number | string | boolean> = {}

  for (const role of COVERAGE_ROLES) {
    const staticRoutes = routeInventory.getStaticPageRoutesForRole(role)
    const coverageSpecPaths = routeInventory.getCoverageSpecPathsForRole(role, 'all')
    const missingSpecPaths = coverageSpecPaths.filter(
      (specPath) => !existsSync(path.join(process.cwd(), specPath))
    )
    const coverageGaps = routeInventory.getStaticCoverageGapsForRole(role)

    summary[`${role}StaticRoutes`] = staticRoutes.length
    summary[`${role}CoverageSpecPaths`] = coverageSpecPaths.length
    summary[`${role}CoverageGaps`] = coverageGaps.length

    if (staticRoutes.length > 0 && coverageSpecPaths.length === 0) {
      findings.push(
        buildRoleFinding(
          'static-route-coverage',
          'missing-coverage-spec-registration',
          `${role} has static routes but no registered coverage specs`,
          role,
          staticRoutes
        )
      )
    }

    if (missingSpecPaths.length > 0) {
      findings.push(
        buildRoleFinding(
          'static-route-coverage',
          'missing-coverage-spec-file',
          `${role} references coverage spec files that do not exist`,
          role,
          missingSpecPaths
        )
      )
    }

    if (coverageGaps.length > 0) {
      findings.push(
        buildRoleFinding(
          'static-route-coverage',
          'uncovered-static-route',
          `${role} has static routes without any registered coverage spec`,
          role,
          coverageGaps
        )
      )
    }
  }

  return {
    findings,
    group: 'coverage',
    id: 'static-route-coverage',
    label: 'Static route coverage registration',
    status: resolveStatus(findings),
    summary,
  }
}

async function runDynamicRouteResolutionCheck(): Promise<SurfaceCompletenessCheckResult> {
  const siteAuditModule = await importScriptModule<SiteAuditManifestModule>(
    'scripts/site-audit-manifest.mjs'
  )
  const manifest = await siteAuditModule.discoverSiteAuditRoutes(process.cwd())
  const dynamicEntries = routeInventory.getDynamicPageRouteEntries()
  const resolvedRoutesBySource = new Map<string, SiteAuditManifestRoute[]>()
  const skippedRoutesBySource = new Map<string, SiteAuditManifestSkippedRoute[]>()
  let resolvedDynamicTemplates = 0
  let staticParamResolvedTemplates = 0
  let seededDynamicTemplates = 0
  let guardedPlaceholderTemplates = 0

  for (const route of manifest.routes) {
    if (route.resolution !== 'dynamic') continue
    const sourcePath = relativePathFromRoot(route.sourceFile)
    const routesForSource = resolvedRoutesBySource.get(sourcePath) ?? []
    routesForSource.push(route)
    resolvedRoutesBySource.set(sourcePath, routesForSource)
  }

  for (const skippedRoute of manifest.skipped) {
    const sourcePath = relativePathFromRoot(skippedRoute.sourceFile)
    const routesForSource = skippedRoutesBySource.get(sourcePath) ?? []
    routesForSource.push(skippedRoute)
    skippedRoutesBySource.set(sourcePath, routesForSource)
  }

  const interactiveOnlyTemplates: string[] = []
  const dataDependentTemplates: string[] = []
  const unclassifiedTemplates: string[] = []

  for (const entry of dynamicEntries) {
    const relativeSourcePath = relativePathFromRoot(entry.filePath)
    const resolvedRoutes = resolvedRoutesBySource.get(relativeSourcePath) ?? []
    if (resolvedRoutes.length > 0) {
      resolvedDynamicTemplates += 1
      const resolverKinds = new Set(resolvedRoutes.map((route) => route.resolver.kind))
      if (resolverKinds.has('static-params')) staticParamResolvedTemplates += 1
      if (resolverKinds.has('seeded-dynamic')) seededDynamicTemplates += 1
      if (resolverKinds.has('guarded-placeholder')) guardedPlaceholderTemplates += 1
      continue
    }

    const skippedRoutes = skippedRoutesBySource.get(relativeSourcePath) ?? []
    const skippedKinds = new Set(
      skippedRoutes.map((route) => route.resolver?.kind ?? 'unclassified')
    )

    if (skippedKinds.has('interactive-only')) {
      interactiveOnlyTemplates.push(entry.template)
      continue
    }

    if (skippedKinds.has('data-dependent')) {
      dataDependentTemplates.push(entry.template)
      continue
    }

    unclassifiedTemplates.push(entry.template)
  }

  const findings: SurfaceCompletenessFinding[] = []

  if (interactiveOnlyTemplates.length > 0) {
    findings.push({
      checkId: 'dynamic-route-resolution',
      code: 'interactive-only-dynamic-route',
      message:
        `${interactiveOnlyTemplates.length} dynamic route template(s) still require interactive ` +
        'discovery and cannot be exercised through the shared site-audit manifest yet',
      paths: summarizePaths(interactiveOnlyTemplates),
      severity: 'warning',
    })
  }

  if (dataDependentTemplates.length > 0) {
    findings.push({
      checkId: 'dynamic-route-resolution',
      code: 'data-dependent-dynamic-route',
      message:
        `${dataDependentTemplates.length} dynamic route template(s) still lack a shared seeded or ` +
        'guarded placeholder contract and remain data-dependent',
      paths: summarizePaths(dataDependentTemplates),
      severity: 'warning',
    })
  }

  if (unclassifiedTemplates.length > 0) {
    findings.push({
      checkId: 'dynamic-route-resolution',
      code: 'unclassified-dynamic-route',
      message:
        `${unclassifiedTemplates.length} dynamic route template(s) are neither resolved nor ` +
        'explicitly classified by the shared site-audit manifest',
      paths: summarizePaths(unclassifiedTemplates),
      severity: 'error',
    })
  }

  return {
    findings,
    group: 'coverage',
    id: 'dynamic-route-resolution',
    label: 'Dynamic route resolution contract',
    status: resolveStatus(findings),
    summary: {
      totalDynamicTemplates: dynamicEntries.length,
      resolvedDynamicTemplates,
      resolvedDynamicPaths: manifest.summary?.resolvedDynamicPaths ?? 0,
      staticParamResolvedTemplates,
      seededDynamicTemplates,
      guardedPlaceholderTemplates,
      interactiveOnlyTemplates: interactiveOnlyTemplates.length,
      dataDependentTemplates: dataDependentTemplates.length,
      unclassifiedTemplates: unclassifiedTemplates.length,
    },
  }
}

async function runBuildSurfaceIntegrityCheck(): Promise<SurfaceCompletenessCheckResult> {
  const buildSurfaceModule = await importScriptModule<BuildSurfaceManifestModule>(
    'scripts/build-surface-manifest.mjs'
  )
  const apiInventory = buildApiRouteAuthInventory()
  const pageEntries = routeInventory.getPageRouteEntries()
  const buildSurfaceInfos = await resolveBuildSurfaceInfos(
    process.cwd(),
    buildSurfaceModule,
    buildSurfaceModule.BUILD_SURFACE_MANIFESTS ?? {},
    apiInventory,
    pageEntries
  )
  const findings: SurfaceCompletenessFinding[] = []

  for (const surfaceInfo of buildSurfaceInfos) {
    if (surfaceInfo.missingPaths.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'missing-build-surface-path',
        message: `${surfaceInfo.surfaceName} is missing required build-surface paths`,
        paths: summarizePaths(surfaceInfo.missingPaths),
        severity: 'error',
      })
    }

    if (surfaceInfo.invalidPageIncludePaths.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'page-include-without-routes',
        message:
          `${surfaceInfo.surfaceName} declares page-bearing include paths that do not resolve ` +
          'to any shared page route entries',
        paths: summarizePaths(surfaceInfo.invalidPageIncludePaths),
        severity: 'error',
      })
    }

    if (surfaceInfo.invalidApiIncludePaths.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'api-include-without-routes',
        message:
          `${surfaceInfo.surfaceName} declares API-bearing include paths that do not resolve ` +
          'to any shared API route entries',
        paths: summarizePaths(surfaceInfo.invalidApiIncludePaths),
        severity: 'error',
      })
    }

    if (surfaceInfo.missingExpectedPageRoutes.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'missing-expected-page-route',
        message: `${surfaceInfo.surfaceName} is missing expected page-facing routes`,
        paths: summarizePaths(surfaceInfo.missingExpectedPageRoutes),
        severity: 'error',
      })
    }

    if (surfaceInfo.missingExpectedApiRoutes.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'missing-expected-api-route',
        message: `${surfaceInfo.surfaceName} is missing expected API routes`,
        paths: summarizePaths(surfaceInfo.missingExpectedApiRoutes),
        severity: 'error',
      })
    }

    if (surfaceInfo.missingReleaseProfile) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'missing-release-profile',
        message: `${surfaceInfo.surfaceName} points to a release profile that verify-release does not expose`,
        paths: [surfaceInfo.manifest.releaseProfile?.id ?? surfaceInfo.surfaceName],
        severity: 'error',
      })
    }

    if (surfaceInfo.missingReleaseScripts.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'missing-release-script',
        message: `${surfaceInfo.surfaceName} references release scripts that are absent from package.json`,
        paths: summarizePaths(surfaceInfo.missingReleaseScripts),
        severity: 'error',
      })
    }

    if (surfaceInfo.missingReleaseSteps.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'missing-release-step',
        message:
          `${surfaceInfo.surfaceName} release profile is missing required verification steps ` +
          'for build-surface parity',
        paths: summarizePaths(surfaceInfo.missingReleaseSteps),
        severity: 'error',
      })
    }

    if (surfaceInfo.releaseEnvMismatches.length > 0) {
      findings.push({
        checkId: 'build-surface-integrity',
        code: 'release-profile-env-mismatch',
        message:
          `${surfaceInfo.surfaceName} release profile does not propagate the manifest-required ` +
          'build-surface environment contract to both build and smoke steps',
        paths: summarizePaths(surfaceInfo.releaseEnvMismatches),
        severity: 'error',
      })
    }
  }

  return {
    findings,
    group: 'release',
    id: 'build-surface-integrity',
    label: 'Build surface integrity',
    status: resolveStatus(findings),
    summary: {
      surfacesChecked: buildSurfaceInfos.length,
      missingPaths: buildSurfaceInfos.reduce((count, item) => count + item.missingPaths.length, 0),
      invalidPageIncludePaths: buildSurfaceInfos.reduce(
        (count, item) => count + item.invalidPageIncludePaths.length,
        0
      ),
      invalidApiIncludePaths: buildSurfaceInfos.reduce(
        (count, item) => count + item.invalidApiIncludePaths.length,
        0
      ),
      missingExpectedPageRoutes: buildSurfaceInfos.reduce(
        (count, item) => count + item.missingExpectedPageRoutes.length,
        0
      ),
      missingExpectedApiRoutes: buildSurfaceInfos.reduce(
        (count, item) => count + item.missingExpectedApiRoutes.length,
        0
      ),
      missingReleaseProfiles: buildSurfaceInfos.filter((item) => item.missingReleaseProfile).length,
      missingReleaseScripts: buildSurfaceInfos.reduce(
        (count, item) => count + item.missingReleaseScripts.length,
        0
      ),
      missingReleaseSteps: buildSurfaceInfos.reduce(
        (count, item) => count + item.missingReleaseSteps.length,
        0
      ),
      releaseEnvMismatches: buildSurfaceInfos.reduce(
        (count, item) => count + item.releaseEnvMismatches.length,
        0
      ),
    },
  }
}

function runSurfaceModeDeclarationCheck(): SurfaceCompletenessCheckResult {
  const findings: SurfaceCompletenessFinding[] = []
  let missingPortalMarkers = 0
  let missingSurfaceMarkers = 0
  let missingResolvers = 0
  let missingPathnameBindings = 0
  let missingBuildSurfaceShellMarkers = 0

  for (const expectation of SURFACE_MODE_CONTRACT_EXPECTATIONS) {
    const absolutePath = path.join(process.cwd(), expectation.path)
    const source = readSourceFileIfExists(absolutePath)

    if (!source) {
      findings.push({
        checkId: 'surface-mode-declaration',
        code: 'missing-surface-layout',
        message: `${expectation.label} is missing from the runtime surface contract`,
        paths: [expectation.path],
        role: expectation.role ?? undefined,
        severity: 'error',
      })
      continue
    }

    if (!source.includes(`data-cf-portal="${expectation.expectedPortalMarker}"`)) {
      missingPortalMarkers += 1
      findings.push({
        checkId: 'surface-mode-declaration',
        code: 'missing-portal-marker',
        message: `${expectation.label} does not publish its expected data-cf-portal marker`,
        paths: [expectation.path],
        role: expectation.role ?? undefined,
        severity: 'error',
      })
    }

    if (!source.includes('data-cf-surface=')) {
      missingSurfaceMarkers += 1
      findings.push({
        checkId: 'surface-mode-declaration',
        code: 'missing-surface-marker',
        message: `${expectation.label} does not publish a data-cf-surface mode marker`,
        paths: [expectation.path],
        role: expectation.role ?? undefined,
        severity: 'error',
      })
    }

    if (expectation.resolverName && !source.includes(expectation.resolverName)) {
      missingResolvers += 1
      findings.push({
        checkId: 'surface-mode-declaration',
        code: 'missing-surface-resolver',
        message: `${expectation.label} is not bound to the shared surface-mode resolver`,
        paths: [expectation.path],
        role: expectation.role ?? undefined,
        severity: 'error',
      })
    }

    if (expectation.requiresPathnameHeader && !source.includes('PATHNAME_HEADER')) {
      missingPathnameBindings += 1
      findings.push({
        checkId: 'surface-mode-declaration',
        code: 'missing-pathname-binding',
        message: `${expectation.label} is not reading the middleware pathname contract`,
        paths: [expectation.path],
        role: expectation.role ?? undefined,
        severity: 'error',
      })
    }
  }

  for (const relativePath of BUILD_SURFACE_MODE_SHELL_PATHS) {
    const absolutePath = path.join(process.cwd(), relativePath)
    const source = readSourceFileIfExists(absolutePath)

    if (!source) {
      findings.push({
        checkId: 'surface-mode-declaration',
        code: 'missing-build-surface-shell',
        message: 'A declared build-surface portal shell is missing from disk',
        paths: [relativePath],
        severity: 'error',
      })
      continue
    }

    if (
      !source.includes('data-cf-portal={portal}') ||
      !source.includes('data-cf-surface={surfaceMode}')
    ) {
      missingBuildSurfaceShellMarkers += 1
      findings.push({
        checkId: 'surface-mode-declaration',
        code: 'missing-build-surface-markers',
        message: 'Build-surface portal shells must publish portal and surface mode markers',
        paths: [relativePath],
        severity: 'error',
      })
    }
  }

  return {
    findings,
    group: 'coverage',
    id: 'surface-mode-declaration',
    label: 'Surface mode declaration',
    status: resolveStatus(findings),
    summary: {
      runtimeLayoutsChecked: SURFACE_MODE_CONTRACT_EXPECTATIONS.length,
      buildSurfaceShellsChecked: BUILD_SURFACE_MODE_SHELL_PATHS.length,
      missingPortalMarkers,
      missingSurfaceMarkers,
      missingResolvers,
      missingPathnameBindings,
      missingBuildSurfaceShellMarkers,
    },
  }
}

function runRoutePolicyAlignmentCheck(): SurfaceCompletenessCheckResult {
  const findings: SurfaceCompletenessFinding[] = []
  const summary: Record<string, number | string | boolean> = {}

  for (const role of COVERAGE_ROLES) {
    const gaps = routeInventory.getRoutePolicyGapsForRole(role)
    summary[`${role}PolicyGaps`] = gaps.length

    if (gaps.length > 0) {
      findings.push(
        buildRoleFinding(
          'route-policy-alignment',
          'route-policy-gap',
          `${role} route policy is missing discovered static routes`,
          role,
          gaps
        )
      )
    }
  }

  return {
    findings,
    group: 'auth',
    id: 'route-policy-alignment',
    label: 'Route policy alignment',
    status: resolveStatus(findings),
    summary,
  }
}

function runApiAuthInventoryCheck(): SurfaceCompletenessCheckResult {
  const inventory = buildApiRouteAuthInventory()
  const findings: SurfaceCompletenessFinding[] = []

  if (inventory.unknownNoStandardAuthRoutes.length > 0) {
    findings.push({
      checkId: 'api-auth-inventory',
      code: 'unknown-no-standard-auth-route',
      message: 'API routes without a standard auth guard are missing from the shared allowlist',
      paths: inventory.unknownNoStandardAuthRoutes,
      severity: 'error',
    })
  }

  if (inventory.protectedRouteRatio < MIN_PROTECTED_API_ROUTE_RATIO) {
    findings.push({
      checkId: 'api-auth-inventory',
      code: 'protected-route-ratio-too-low',
      message:
        `Only ${(inventory.protectedRouteRatio * 100).toFixed(0)}% of API routes have a ` +
        `standard or alternative auth signal; expected at least ${(MIN_PROTECTED_API_ROUTE_RATIO * 100).toFixed(0)}%.`,
      severity: 'error',
    })
  }

  return {
    findings,
    group: 'auth',
    id: 'api-auth-inventory',
    label: 'API auth inventory',
    status: resolveStatus(findings),
    summary: {
      standardAuthCount: inventory.standardAuthCount,
      alternativeAuthCount: inventory.alternativeAuthCount,
      knownNoStandardAuthCount: inventory.knownNoStandardAuthCount,
      unknownNoStandardAuthCount: inventory.unknownNoStandardAuthRoutes.length,
      totalRoutes: inventory.totalRoutes,
    },
  }
}

function runServerActionAuthInventoryCheck(): SurfaceCompletenessCheckResult {
  const inventory = buildServerActionAuthInventory()
  const findings: SurfaceCompletenessFinding[] = []

  if (inventory.missingAuthFunctionCount > 0) {
    findings.push({
      checkId: 'server-action-auth-inventory',
      code: 'server-action-missing-auth',
      message:
        `${inventory.missingAuthFunctionCount} exported server actions lack an early auth guard ` +
        `or explicit public classification`,
      paths: summarizePaths(inventory.missingAuthFunctionIds),
      severity: 'warning',
    })
  }

  if (inventory.lateAuthFunctionCount > 0) {
    findings.push({
      checkId: 'server-action-auth-inventory',
      code: 'server-action-late-auth',
      message:
        `${inventory.lateAuthFunctionCount} exported server actions call auth guards only ` +
        `after the early scan window`,
      paths: summarizePaths(inventory.lateAuthFunctionIds),
      severity: 'warning',
    })
  }

  return {
    findings,
    group: 'auth',
    id: 'server-action-auth-inventory',
    label: 'Server action auth inventory',
    status: resolveStatus(findings),
    summary: {
      totalServerActionFiles: inventory.totalFiles,
      totalServerActionFunctions: inventory.totalFunctions,
      earlyAuthFunctions: inventory.earlyAuthFunctionCount,
      lateAuthFunctions: inventory.lateAuthFunctionCount,
      documentedPublicFunctions: inventory.documentedPublicFunctionCount,
      fileExemptFunctions: inventory.fileExemptFunctionCount,
      missingAuthFunctions: inventory.missingAuthFunctionCount,
    },
  }
}

function runServerActionMutationInventoryCheck(): SurfaceCompletenessCheckResult {
  const inventory = buildServerActionMutationInventory()
  const findings: SurfaceCompletenessFinding[] = []

  if (inventory.missingAuthFunctionCount > 0) {
    findings.push({
      checkId: 'server-action-mutation-inventory',
      code: 'page-facing-mutation-missing-auth',
      message:
        `${inventory.missingAuthFunctionCount} page-facing mutation action(s) lack an auth guard ` +
        'or explicit public classification',
      paths: summarizePaths(inventory.missingAuthFunctionIds),
      severity: 'warning',
    })
  }

  if (inventory.missingValidationFunctionCount > 0) {
    findings.push({
      checkId: 'server-action-mutation-inventory',
      code: 'page-facing-mutation-missing-validation',
      message:
        `${inventory.missingValidationFunctionCount} page-facing mutation action(s) do not expose a ` +
        'shared validation signal',
      paths: summarizePaths(inventory.missingValidationFunctionIds),
      severity: 'warning',
    })
  }

  if (inventory.missingRevalidationFunctionCount > 0) {
    findings.push({
      checkId: 'server-action-mutation-inventory',
      code: 'page-facing-mutation-missing-revalidation',
      message:
        `${inventory.missingRevalidationFunctionCount} page-facing mutation action(s) do not call ` +
        'revalidatePath() or revalidateTag()',
      paths: summarizePaths(inventory.missingRevalidationFunctionIds),
      severity: 'warning',
    })
  }

  if (inventory.inputTenantMutationFunctionCount > 0) {
    findings.push({
      checkId: 'server-action-mutation-inventory',
      code: 'page-facing-mutation-input-tenant-scope',
      message:
        `${inventory.inputTenantMutationFunctionCount} page-facing mutation action(s) reference ` +
        'tenant scope from input payloads instead of relying purely on session-derived metadata',
      paths: summarizePaths(inventory.inputTenantMutationFunctionIds),
      severity: 'warning',
    })
  }

  if (inventory.missingRevalidationImportFileCount > 0) {
    findings.push({
      checkId: 'server-action-mutation-inventory',
      code: 'page-facing-mutation-missing-next-cache-import',
      message:
        `${inventory.missingRevalidationImportFileCount} page-facing mutation file(s) do not import ` +
        'revalidation helpers from next/cache',
      paths: summarizePaths(inventory.filesWithoutRevalidationImport),
      severity: 'warning',
    })
  }

  return {
    findings,
    group: 'mutation',
    id: 'server-action-mutation-inventory',
    label: 'Server action mutation inventory',
    status: resolveStatus(findings),
    summary: {
      totalServerActionFiles: inventory.totalFilesScanned,
      totalMutationFunctions: inventory.totalMutationFunctions,
      pageFacingMutationFunctions: inventory.pageFacingMutationFunctionCount,
      auditOnlyMutationFunctions: inventory.auditOnlyMutationFunctionCount,
      pathExemptMutationFunctions: inventory.pathExemptMutationFunctionCount,
      contractCompliantFunctions: inventory.contractCompliantFunctionCount,
      contractWarningFunctions: inventory.contractWarningFunctionCount,
      contractRequiredViolationFunctions: inventory.contractRequiredViolationFunctionCount,
      missingAuthFunctions: inventory.missingAuthFunctionCount,
      missingValidationFunctions: inventory.missingValidationFunctionCount,
      missingRevalidationFunctions: inventory.missingRevalidationFunctionCount,
      missingRevalidationImportFiles: inventory.missingRevalidationImportFileCount,
      missingObservabilityFunctions: inventory.missingObservabilityFunctionCount,
      missingExplicitOutcomeFunctions: inventory.missingExplicitOutcomeFunctionCount,
      conflictGuardedFunctions: inventory.conflictGuardedFunctionCount,
      idempotencyGuardedFunctions: inventory.idempotencyGuardedFunctionCount,
      observabilityInstrumentedFunctions: inventory.observabilityInstrumentedFunctionCount,
      sessionTenantMutationFunctions: inventory.sessionTenantMutationFunctionCount,
      inputTenantMutationFunctions: inventory.inputTenantMutationFunctionCount,
      redirectOutcomeFunctions: inventory.redirectOutcomeFunctionCount,
      structuredReturnFunctions: inventory.structuredReturnFunctionCount,
    },
  }
}

function runDerivedOutputProvenanceInventoryCheck(): SurfaceCompletenessCheckResult {
  const inventory = buildDerivedOutputInventory()
  const findings: SurfaceCompletenessFinding[] = []

  const missingSharedContractPaths = inventory.entries
    .filter((entry) => !entry.hasSharedContract)
    .map((entry) => entry.relativeFilePath)
  const missingFreshnessPaths = inventory.entries
    .filter((entry) => !entry.hasFreshnessSignal)
    .map((entry) => entry.relativeFilePath)
  const missingModelMetadataPaths = inventory.entries
    .filter((entry) => entry.derivationMethod !== 'deterministic' && !entry.hasModelMetadataSignal)
    .map((entry) => entry.relativeFilePath)

  if (missingSharedContractPaths.length > 0) {
    findings.push({
      checkId: 'derived-output-provenance-inventory',
      code: 'derived-output-missing-shared-contract',
      message:
        `${missingSharedContractPaths.length} derived output module(s) still rely on local ` +
        'timestamps or implicit provenance instead of the shared derived-output contract',
      paths: summarizePaths(missingSharedContractPaths),
      severity: 'warning',
    })
  }

  if (missingFreshnessPaths.length > 0) {
    findings.push({
      checkId: 'derived-output-provenance-inventory',
      code: 'derived-output-missing-freshness',
      message:
        `${missingFreshnessPaths.length} derived output module(s) do not expose an explicit ` +
        'freshness or as-of signal',
      paths: summarizePaths(missingFreshnessPaths),
      severity: 'warning',
    })
  }

  if (missingModelMetadataPaths.length > 0) {
    findings.push({
      checkId: 'derived-output-provenance-inventory',
      code: 'derived-output-missing-model-metadata',
      message:
        `${missingModelMetadataPaths.length} AI-assisted derived output module(s) do not surface ` +
        'shared provider/model trust metadata',
      paths: summarizePaths(missingModelMetadataPaths),
      severity: 'warning',
    })
  }

  return {
    findings,
    group: 'metadata',
    id: 'derived-output-provenance-inventory',
    label: 'Derived output provenance inventory',
    status: resolveStatus(findings),
    summary: {
      totalDerivedOutputs: inventory.totalEntries,
      sharedContractOutputs: inventory.compliantEntryCount,
      aiAssistedOutputs: inventory.aiAssistedEntryCount,
      missingSharedContractOutputs: inventory.missingSharedContractEntryCount,
      missingFreshnessOutputs: inventory.missingFreshnessEntryCount,
      missingModelMetadataOutputs: inventory.missingModelMetadataEntryCount,
      observabilityBridgeOutputs: inventory.observabilityBridgeEntryCount,
    },
  }
}

function runPublicSeoContractCheck(): SurfaceCompletenessCheckResult {
  const publicEntries = routeInventory
    .getStaticPageRouteEntriesForRole('public')
    .filter((entry) => entry.segments.includes('(public)'))
  const discoveredRoutes = new Set(publicEntries.map((entry) => entry.route))
  const staleExpectationRoutes = PUBLIC_ROUTE_SEO_CHECKS.map(
    (expectation) => expectation.path
  ).filter((route) => !discoveredRoutes.has(route))
  const missingExpectationRoutes = publicEntries
    .filter(
      (entry) => hasPublicMetadataContract(entry) && !hasPublicRouteSeoExpectation(entry.route)
    )
    .map((entry) => entry.route)

  const findings: SurfaceCompletenessFinding[] = []

  if (staleExpectationRoutes.length > 0) {
    findings.push({
      checkId: 'public-seo-contract',
      code: 'stale-seo-expectation',
      message:
        'Public SEO contract contains routes that were not discovered in the static public surface',
      paths: staleExpectationRoutes,
      severity: 'error',
    })
  }

  if (missingExpectationRoutes.length > 0) {
    findings.push({
      checkId: 'public-seo-contract',
      code: 'missing-seo-expectation',
      message:
        'Static public routes with explicit metadata are missing from PUBLIC_ROUTE_SEO_CHECKS',
      paths: missingExpectationRoutes,
      severity: 'warning',
    })
  }

  return {
    findings,
    group: 'metadata',
    id: 'public-seo-contract',
    label: 'Public SEO contract coverage',
    status: resolveStatus(findings),
    summary: {
      discoveredPublicRoutes: publicEntries.length,
      expectedSeoRoutes: PUBLIC_ROUTE_SEO_CHECKS.length,
      missingExpectationRoutes: missingExpectationRoutes.length,
      staleExpectationRoutes: staleExpectationRoutes.length,
    },
  }
}

function runNationalBrandCheck(): SurfaceCompletenessCheckResult {
  const result = runNationalBrandAudit()
  const findings: SurfaceCompletenessFinding[] = []

  if (result.findings.length > 0) {
    findings.push({
      checkId: 'national-brand-audit',
      code: 'national-brand-finding',
      message: `${result.findings.length} national brand audit finding(s) detected`,
      paths: result.findings.map(
        (finding) => `${finding.relativePath}:${finding.line}:${finding.column}`
      ),
      severity: 'error',
    })
  }

  return {
    findings,
    group: 'brand',
    id: 'national-brand-audit',
    label: 'National brand audit',
    status: resolveStatus(findings),
    summary: {
      filesScanned: result.filesScanned,
      findings: result.findings.length,
    },
  }
}

function runPlatformObservabilityCoverageCheck(): SurfaceCompletenessCheckResult {
  const missingExpectations = getPlatformObservabilityCoverageFindings()
  const findings = missingExpectations.map<SurfaceCompletenessFinding>((finding) => ({
    checkId: 'platform-observability-coverage',
    code: 'missing-platform-observability-emitter',
    message: `${finding.file} is missing /${finding.pattern}/`,
    paths: [finding.file],
    severity: 'error',
  }))

  return {
    findings,
    group: 'observability',
    id: 'platform-observability-coverage',
    label: 'Platform observability coverage',
    status: resolveStatus(findings),
    summary: {
      missingEmitters: missingExpectations.length,
    },
  }
}

function relativePathFromRoot(targetPath: string, rootDir = process.cwd()): string {
  return path.relative(rootDir, targetPath).replace(/\\/g, '/')
}

function isSpecialAppSegment(segment: string): boolean {
  return segment.startsWith('@') || segment.includes('(.)') || segment.includes('(..')
}

function matchesManifestInclude(relativeFilePath: string, includePath: string): boolean {
  const normalizedFilePath = relativeFilePath.replace(/\\/g, '/')
  const normalizedIncludePath = includePath.replace(/\\/g, '/').replace(/\/+$/, '')

  return (
    normalizedFilePath === normalizedIncludePath ||
    normalizedFilePath.startsWith(`${normalizedIncludePath}/`)
  )
}

function inferBuildSurfaceIncludeKind(relativePath: string): BuildSurfaceIncludeKind {
  if (relativePath.startsWith('app/api/')) {
    return 'api-tree'
  }
  if (/\.[^/]+$/.test(relativePath)) {
    return 'support-file'
  }
  return 'page-tree'
}

function normalizeBuildSurfaceIncludeEntries(
  manifest: BuildSurfaceManifestEntry,
  buildSurfaceModule?: BuildSurfaceManifestModule
): BuildSurfaceIncludeEntry[] {
  if (buildSurfaceModule?.getBuildSurfaceIncludeEntries) {
    return buildSurfaceModule.getBuildSurfaceIncludeEntries(manifest).map((entry) => ({
      kind: entry.kind,
      path: entry.path.replace(/\\/g, '/'),
    }))
  }

  return manifest.include.map((entry) =>
    typeof entry === 'string'
      ? {
          kind: inferBuildSurfaceIncludeKind(entry),
          path: entry,
        }
      : {
          kind: entry.kind ?? inferBuildSurfaceIncludeKind(entry.path),
          path: entry.path.replace(/\\/g, '/'),
        }
  )
}

function getBuildSurfaceIncludePaths(
  manifest: BuildSurfaceManifestEntry,
  buildSurfaceModule?: BuildSurfaceManifestModule
) {
  if (buildSurfaceModule?.getBuildSurfaceIncludePaths) {
    return buildSurfaceModule
      .getBuildSurfaceIncludePaths(manifest)
      .map((entry) => entry.replace(/\\/g, '/'))
  }

  return normalizeBuildSurfaceIncludeEntries(manifest, buildSurfaceModule).map(
    (entry) => entry.path
  )
}

async function resolveReleaseProfiles(rootDir = process.cwd()) {
  const verifyReleaseModule = await importScriptModule<VerifyReleaseModule>(
    'scripts/verify-release.mjs',
    rootDir
  )

  if (!verifyReleaseModule.buildReleaseProfiles) {
    return {} as Record<string, VerifyReleaseStep[]>
  }

  const context = verifyReleaseModule.buildReleaseProfileContext?.(process.env)
  return verifyReleaseModule.buildReleaseProfiles(context)
}

function readPackageScripts(rootDir = process.cwd()): Record<string, string> {
  try {
    const packageJsonPath = path.join(rootDir, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>
    }
    return packageJson.scripts ?? {}
  } catch {
    return {}
  }
}

function resolveSystemAuditEntrypoints(rootDir = process.cwd()): SystemAuditEntrypoint[] {
  const packageScripts = readPackageScripts(rootDir)

  return SYSTEM_AUDIT_ENTRYPOINT_DEFINITIONS.map((definition) => ({
    command: definition.scriptName
      ? (packageScripts[definition.scriptName] ?? definition.fallbackCommand)
      : definition.fallbackCommand,
    contractFamilies: definition.contractFamilies,
    id: definition.id,
    label: definition.label,
    machineReadable: definition.machineReadable,
    profiles: definition.profiles,
    scriptName: definition.scriptName,
    sourcePath: definition.sourcePath,
  }))
}

async function importScriptModule<T>(
  relativeScriptPath: string,
  rootDir = process.cwd()
): Promise<T> {
  return import(pathToFileURL(path.join(rootDir, relativeScriptPath)).href) as Promise<T>
}

function seoExpectationForRoute(route: string | null) {
  if (!route) return null
  return PUBLIC_ROUTE_SEO_CHECKS.find((expectation) => expectation.path === route) ?? null
}

type PreparedBuildSurfaceInfo = {
  apiRelativePaths: Set<string>
  includeEntries: BuildSurfaceIncludeEntry[]
  invalidApiIncludePaths: string[]
  invalidPageIncludePaths: string[]
  manifest: BuildSurfaceManifestEntry
  missingExpectedApiRoutes: string[]
  missingExpectedPageRoutes: string[]
  missingPaths: string[]
  missingReleaseProfile: boolean
  missingReleaseScripts: string[]
  missingReleaseSteps: string[]
  overlayEntries: PageRouteEntry[]
  pageRelativePaths: Set<string>
  releaseEnvMismatches: string[]
  releaseStepNames: string[]
  surfaceName: string
}

function countBuildSurfaceIntegrityFailures(surfaceInfo: PreparedBuildSurfaceInfo) {
  return (
    surfaceInfo.missingPaths.length +
    surfaceInfo.invalidPageIncludePaths.length +
    surfaceInfo.invalidApiIncludePaths.length +
    surfaceInfo.missingExpectedPageRoutes.length +
    surfaceInfo.missingExpectedApiRoutes.length +
    surfaceInfo.missingReleaseScripts.length +
    surfaceInfo.missingReleaseSteps.length +
    surfaceInfo.releaseEnvMismatches.length +
    (surfaceInfo.missingReleaseProfile ? 1 : 0)
  )
}

async function resolveBuildSurfaceInfos(
  rootDir: string,
  buildSurfaceModule: BuildSurfaceManifestModule,
  buildSurfaceManifests: Record<string, BuildSurfaceManifestEntry>,
  apiInventory: ApiRouteAuthInventory,
  pageEntries: PageRouteEntry[]
): Promise<PreparedBuildSurfaceInfo[]> {
  const packageScripts = readPackageScripts(rootDir)
  const releaseProfiles = await resolveReleaseProfiles(rootDir)

  return Promise.all(
    Object.entries(buildSurfaceManifests).map(async ([surfaceName, manifest]) => {
      const includeEntries = normalizeBuildSurfaceIncludeEntries(manifest, buildSurfaceModule)
      const includePaths = getBuildSurfaceIncludePaths(manifest, buildSurfaceModule)
      const filesystemValidation = buildSurfaceModule.validateBuildSurfaceFilesystem
        ? await buildSurfaceModule.validateBuildSurfaceFilesystem(rootDir, surfaceName)
        : null
      const overlayAppDir = manifest.overlayAppDir
        ? path.join(rootDir, manifest.overlayAppDir)
        : null
      const overlayEntries =
        manifest.overlayAppDir && overlayAppDir && existsSync(overlayAppDir)
          ? routeInventory.discoverPageRouteEntriesInAppDir(overlayAppDir)
          : []
      const missingIncludePaths = filesystemValidation?.missingIncludePaths ?? []
      const missingOverlayPaths = filesystemValidation?.missingOverlayPaths ?? []
      const missingPaths =
        filesystemValidation != null
          ? [...new Set([...missingIncludePaths, ...missingOverlayPaths])]
          : [
              ...new Set(
                includePaths.filter((includePath) => !existsSync(path.join(rootDir, includePath)))
              ),
            ]
      const pageRelativePaths = new Set<string>()
      const pageRoutesByIncludePath = new Map<string, string[]>()
      const includedPageRoutes = new Set<string>()

      for (const pageEntry of pageEntries) {
        const relativeSourcePath = relativePathFromRoot(pageEntry.filePath, rootDir)
        const matchingIncludePaths = includePaths.filter((includePath) =>
          matchesManifestInclude(relativeSourcePath, includePath)
        )

        if (matchingIncludePaths.length === 0) continue

        pageRelativePaths.add(relativeSourcePath)
        includedPageRoutes.add(pageEntry.route ?? pageEntry.template)

        for (const includePath of matchingIncludePaths) {
          const routesForIncludePath = pageRoutesByIncludePath.get(includePath) ?? []
          routesForIncludePath.push(pageEntry.route ?? pageEntry.template)
          pageRoutesByIncludePath.set(includePath, routesForIncludePath)
        }
      }

      for (const overlayEntry of overlayEntries) {
        includedPageRoutes.add(overlayEntry.route ?? overlayEntry.template)
      }

      const apiRelativePaths = new Set<string>()
      const apiRoutesByIncludePath = new Map<string, string[]>()
      const includedApiRoutes = new Set<string>()

      for (const apiEntry of apiInventory.entries) {
        const relativeApiPath = `app/api/${apiEntry.relativeFilePath}`.replace(/\\/g, '/')
        const matchingIncludePaths = includePaths.filter((includePath) =>
          matchesManifestInclude(relativeApiPath, includePath)
        )

        if (matchingIncludePaths.length === 0) continue

        apiRelativePaths.add(relativeApiPath)
        includedApiRoutes.add(apiEntry.urlPath)

        for (const includePath of matchingIncludePaths) {
          const routesForIncludePath = apiRoutesByIncludePath.get(includePath) ?? []
          routesForIncludePath.push(apiEntry.urlPath)
          apiRoutesByIncludePath.set(includePath, routesForIncludePath)
        }
      }

      const invalidPageIncludePaths = includeEntries
        .filter(
          (entry) =>
            entry.kind === 'page-tree' &&
            !missingPaths.includes(entry.path) &&
            (pageRoutesByIncludePath.get(entry.path)?.length ?? 0) === 0
        )
        .map((entry) => entry.path)
      const invalidApiIncludePaths = includeEntries
        .filter(
          (entry) =>
            entry.kind === 'api-tree' &&
            !missingPaths.includes(entry.path) &&
            (apiRoutesByIncludePath.get(entry.path)?.length ?? 0) === 0
        )
        .map((entry) => entry.path)
      const missingExpectedPageRoutes = (manifest.expectedPageRoutes ?? []).filter(
        (routePath) => !includedPageRoutes.has(routePath)
      )
      const missingExpectedApiRoutes = (manifest.expectedApiRoutes ?? []).filter(
        (routePath) => !includedApiRoutes.has(routePath)
      )
      const releaseProfile = manifest.releaseProfile
      const releaseSteps = releaseProfile ? (releaseProfiles[releaseProfile.id] ?? []) : []
      const releaseStepNames = releaseSteps.map((step) => step.name)
      const missingReleaseProfile = !!releaseProfile && releaseSteps.length === 0
      const missingReleaseScripts = releaseProfile
        ? [
            releaseProfile.verifyScript,
            releaseProfile.typecheckScript,
            releaseProfile.lintScript,
            releaseProfile.unitTestScript,
            releaseProfile.e2eScript,
          ].filter((scriptName) => !packageScripts[scriptName])
        : []
      const missingReleaseSteps = releaseProfile
        ? [
            'verify:secrets',
            releaseProfile.typecheckScript,
            releaseProfile.lintScript,
            'test:critical',
            releaseProfile.unitTestScript,
            releaseProfile.buildStepName,
            releaseProfile.e2eScript,
          ].filter((stepName) => !releaseStepNames.includes(stepName))
        : []
      const releaseEnvMismatches: string[] = []

      if (releaseProfile && releaseSteps.length > 0) {
        const buildStep = releaseSteps.find((step) => step.name === releaseProfile.buildStepName)
        const smokeStep = releaseSteps.find((step) => step.name === releaseProfile.e2eScript)

        for (const [key, expectedValue] of Object.entries(releaseProfile.requiredEnv ?? {})) {
          if (buildStep?.env?.[key] !== expectedValue) {
            releaseEnvMismatches.push(`${releaseProfile.buildStepName}:${key}`)
          }
          if (smokeStep?.env?.[key] !== expectedValue) {
            releaseEnvMismatches.push(`${releaseProfile.e2eScript}:${key}`)
          }
        }
      }

      return {
        apiRelativePaths,
        includeEntries,
        invalidApiIncludePaths,
        invalidPageIncludePaths,
        manifest,
        missingExpectedApiRoutes,
        missingExpectedPageRoutes,
        missingPaths,
        missingReleaseProfile,
        missingReleaseScripts,
        missingReleaseSteps,
        overlayEntries,
        pageRelativePaths,
        releaseEnvMismatches,
        releaseStepNames,
        surfaceName,
      }
    })
  )
}

export async function buildSystemContractGraph(
  rootDir = process.cwd()
): Promise<SystemContractGraph> {
  const [siteAuditModule, buildSurfaceModule] = await Promise.all([
    importScriptModule<SiteAuditManifestModule>('scripts/site-audit-manifest.mjs', rootDir),
    importScriptModule<BuildSurfaceManifestModule>('scripts/build-surface-manifest.mjs', rootDir),
  ])

  const siteAuditManifest = await siteAuditModule.discoverSiteAuditRoutes(rootDir)
  const buildSurfaceManifests = buildSurfaceModule.BUILD_SURFACE_MANIFESTS ?? {}
  const auditEntrypoints = resolveSystemAuditEntrypoints(rootDir)
  const pageEntries = routeInventory.getPageRouteEntries()
  const apiInventory = buildApiRouteAuthInventory(rootDir)
  const serverActionMutationInventory = buildServerActionMutationInventory({ rootDir })
  const derivedOutputInventory = buildDerivedOutputInventory(rootDir)
  const buildSurfaceInfos = await resolveBuildSurfaceInfos(
    rootDir,
    buildSurfaceModule,
    buildSurfaceManifests,
    apiInventory,
    pageEntries
  )
  const auditNodeIdsByFamily = new Map<SystemContractFamily, string[]>()
  const nodes: SystemContractGraphNode[] = []
  const edges: SystemContractGraphEdge[] = []
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()
  const addNode = (node: SystemContractGraphNode) => {
    if (nodeIds.has(node.id)) return
    nodeIds.add(node.id)
    nodes.push(node)
  }
  const addEdge = (from: string, to: string, type: SystemContractGraphEdgeType) => {
    const edgeKey = `${from}:${type}:${to}`
    if (edgeIds.has(edgeKey)) return
    edgeIds.add(edgeKey)
    edges.push({ from, to, type })
  }

  for (const entrypoint of auditEntrypoints) {
    const nodeId = `audit-entrypoint:${entrypoint.id}`
    addNode({
      id: nodeId,
      kind: 'audit-entrypoint',
      label: entrypoint.label,
      metadata: {
        command: entrypoint.command,
        contractFamilies: entrypoint.contractFamilies,
        entrypointId: entrypoint.id,
        machineReadable: entrypoint.machineReadable,
        profiles: entrypoint.profiles,
        scriptName: entrypoint.scriptName ?? null,
        sourcePath: entrypoint.sourcePath,
      },
    })

    for (const family of entrypoint.contractFamilies) {
      const familyAuditNodeIds = auditNodeIdsByFamily.get(family) ?? []
      familyAuditNodeIds.push(nodeId)
      auditNodeIdsByFamily.set(family, familyAuditNodeIds)
    }
  }
  const routePolicyGapsByRole = new Map(
    COVERAGE_ROLES.map((role) => [role, new Set(routeInventory.getRoutePolicyGapsForRole(role))])
  )
  const manualCoverageByRole = new Map(
    COVERAGE_ROLES.map((role) => [role, routeInventory.getManuallyCoveredRoutesForRole(role)])
  )
  const coverageSpecPathsByRole = new Map(
    COVERAGE_ROLES.map((role) => [role, routeInventory.getCoverageSpecPathsForRole(role, 'all')])
  )
  const siteAuditRoutesBySource = new Map<string, SiteAuditManifestRoute[]>()
  for (const route of siteAuditManifest.routes) {
    const sourcePath = relativePathFromRoot(route.sourceFile, rootDir)
    const routesForSource = siteAuditRoutesBySource.get(sourcePath) ?? []
    routesForSource.push(route)
    siteAuditRoutesBySource.set(sourcePath, routesForSource)
  }
  const siteAuditSkippedBySource = new Map<string, SiteAuditManifestSkippedRoute[]>()
  for (const item of siteAuditManifest.skipped) {
    const sourcePath = relativePathFromRoot(item.sourceFile, rootDir)
    const routesForSource = siteAuditSkippedBySource.get(sourcePath) ?? []
    routesForSource.push(item)
    siteAuditSkippedBySource.set(sourcePath, routesForSource)
  }
  const mutationFileSummariesByPath = new Map(
    serverActionMutationInventory.fileSummaries.map((entry) => [entry.relativeFilePath, entry])
  )

  for (const pageEntry of pageEntries) {
    const relativeSourcePath = relativePathFromRoot(pageEntry.filePath, rootDir)
    for (const surfaceInfo of buildSurfaceInfos) {
      if (
        surfaceInfo.includeEntries.some((entry) =>
          matchesManifestInclude(relativeSourcePath, entry.path)
        )
      ) {
        surfaceInfo.pageRelativePaths.add(relativeSourcePath)
      }
    }
  }

  for (const apiEntry of apiInventory.entries) {
    const relativeApiPath = `app/api/${apiEntry.relativeFilePath}`.replace(/\\/g, '/')
    for (const surfaceInfo of buildSurfaceInfos) {
      if (
        surfaceInfo.includeEntries.some((entry) =>
          matchesManifestInclude(relativeApiPath, entry.path)
        )
      ) {
        surfaceInfo.apiRelativePaths.add(relativeApiPath)
      }
    }
  }

  for (const surfaceInfo of buildSurfaceInfos) {
    const buildSurfaceNodeId = `build-surface:${surfaceInfo.surfaceName}`
    addNode({
      id: buildSurfaceNodeId,
      kind: 'build-surface',
      label: surfaceInfo.surfaceName,
      metadata: {
        description: surfaceInfo.manifest.description,
        expectedApiRoutes: surfaceInfo.manifest.expectedApiRoutes ?? [],
        expectedPageRoutes: surfaceInfo.manifest.expectedPageRoutes ?? [],
        includeEntries: surfaceInfo.includeEntries,
        includePaths: surfaceInfo.includeEntries.map((entry) => entry.path),
        includedApiRoutes: surfaceInfo.apiRelativePaths.size,
        includedPageRoutes: surfaceInfo.pageRelativePaths.size,
        invalidApiIncludePaths: surfaceInfo.invalidApiIncludePaths,
        invalidPageIncludePaths: surfaceInfo.invalidPageIncludePaths,
        missingExpectedApiRoutes: surfaceInfo.missingExpectedApiRoutes,
        missingExpectedPageRoutes: surfaceInfo.missingExpectedPageRoutes,
        missingPaths: surfaceInfo.missingPaths,
        missingReleaseProfile: surfaceInfo.missingReleaseProfile,
        missingReleaseScripts: surfaceInfo.missingReleaseScripts,
        missingReleaseSteps: surfaceInfo.missingReleaseSteps,
        overlayAppDir: surfaceInfo.manifest.overlayAppDir ?? null,
        overlayPageRoutes: surfaceInfo.overlayEntries.length,
        releaseEnvMismatches: surfaceInfo.releaseEnvMismatches,
        releaseProfileId: surfaceInfo.manifest.releaseProfile?.id ?? null,
        releaseStepNames: surfaceInfo.releaseStepNames,
        requiredOverlayPaths: surfaceInfo.manifest.requiredOverlayPaths ?? [],
        surfaceName: surfaceInfo.surfaceName,
      },
    })

    for (const auditNodeId of auditNodeIdsByFamily.get('build-surface') ?? []) {
      addEdge(buildSurfaceNodeId, auditNodeId, 'audited-by')
    }
  }

  const seoNodeIdsByRoute = new Map<string, string>()
  for (const expectation of PUBLIC_ROUTE_SEO_CHECKS) {
    const nodeId = `seo-expectation:${expectation.path}`
    seoNodeIdsByRoute.set(expectation.path, nodeId)
    addNode({
      id: nodeId,
      kind: 'seo-expectation',
      label: expectation.label,
      metadata: {
        canonicalPath: expectation.canonicalPath ?? expectation.path,
        expectedIndexable: expectation.expectedIndexable ?? true,
        path: expectation.path,
        requireCanonical: expectation.requireCanonical ?? true,
        requireOpenGraphImage: expectation.requireOpenGraphImage ?? true,
        requireTwitterImage: expectation.requireTwitterImage ?? true,
      },
    })

    for (const auditNodeId of auditNodeIdsByFamily.get('public-seo') ?? []) {
      addEdge(nodeId, auditNodeId, 'audited-by')
    }
  }

  for (const expectation of PLATFORM_OBSERVABILITY_EMITTER_EXPECTATIONS) {
    const nodeId = `observability-expectation:${expectation.file}:${expectation.pattern.source}`
    addNode({
      id: nodeId,
      kind: 'observability-expectation',
      label: expectation.file,
      metadata: {
        file: expectation.file,
        pattern: expectation.pattern.source,
      },
    })

    for (const auditNodeId of auditNodeIdsByFamily.get('platform-observability') ?? []) {
      addEdge(nodeId, auditNodeId, 'audited-by')
    }
  }

  for (const entry of derivedOutputInventory.entries) {
    const nodeId = `derived-output:${entry.relativeFilePath}`
    const expectedModel = resolveKnownDerivedOutputModel(entry.relativeFilePath)

    addNode({
      id: nodeId,
      kind: 'derived-output',
      label: entry.relativeFilePath,
      metadata: {
        derivationMethod: entry.derivationMethod,
        domain: entry.domain,
        expectedExecutionLocation: expectedModel?.executionLocation ?? null,
        expectedModel: expectedModel?.model ?? null,
        expectedModelProvider: expectedModel?.provider ?? null,
        hasFreshnessSignal: entry.hasFreshnessSignal,
        hasModelMetadataSignal: entry.hasModelMetadataSignal,
        hasObservabilityBridge: entry.hasObservabilityBridge,
        hasSharedContract: entry.hasSharedContract,
        hasTimestampSignal: entry.hasTimestampSignal,
        relativeFilePath: entry.relativeFilePath,
      },
    })

    for (const auditNodeId of auditNodeIdsByFamily.get('derived-output') ?? []) {
      addEdge(nodeId, auditNodeId, 'audited-by')
    }

    if (entry.hasObservabilityBridge) {
      for (const auditNodeId of auditNodeIdsByFamily.get('platform-observability') ?? []) {
        addEdge(nodeId, auditNodeId, 'audited-by')
      }
    }
  }

  for (const apiEntry of apiInventory.entries) {
    const nodeId = `api-route:${apiEntry.relativeFilePath}`
    const relativeApiPath = `app/api/${apiEntry.relativeFilePath}`.replace(/\\/g, '/')

    addNode({
      id: nodeId,
      kind: 'api-route',
      label: apiEntry.urlPath,
      metadata: {
        classification: apiEntry.classification,
        hasAlternativeAuth: apiEntry.hasAlternativeAuth,
        hasStandardAuth: apiEntry.hasStandardAuth,
        relativeFilePath: apiEntry.relativeFilePath,
        routePath: apiEntry.routePath,
        urlPath: apiEntry.urlPath,
      },
    })

    for (const auditNodeId of auditNodeIdsByFamily.get('api-auth') ?? []) {
      addEdge(nodeId, auditNodeId, 'audited-by')
    }

    for (const surfaceInfo of buildSurfaceInfos) {
      if (surfaceInfo.apiRelativePaths.has(relativeApiPath)) {
        addEdge(nodeId, `build-surface:${surfaceInfo.surfaceName}`, 'included-in-build-surface')
      }
    }
  }

  for (const mutationEntry of serverActionMutationInventory.entries) {
    const nodeId =
      `server-action-mutation:${mutationEntry.relativeFilePath}:${mutationEntry.line}:` +
      mutationEntry.functionName
    const fileSummary = mutationFileSummariesByPath.get(mutationEntry.relativeFilePath)

    addNode({
      id: nodeId,
      kind: 'server-action-mutation',
      label: mutationEntry.functionId,
      metadata: {
        authClassification: mutationEntry.authClassification,
        classification: mutationEntry.classification,
        fileHasPageFacingMutations: fileSummary?.hasPageFacingMutations ?? false,
        fileHasRevalidationImport: fileSummary?.hasRevalidationImport ?? false,
        functionId: mutationEntry.functionId,
        functionName: mutationEntry.functionName,
        guardTiming: mutationEntry.guardTiming,
        hasConflictGuard: mutationEntry.hasConflictGuard,
        hasIdempotencyGuard: mutationEntry.hasIdempotencyGuard,
        hasObservability: mutationEntry.hasObservability,
        hasRevalidation: mutationEntry.hasRevalidation,
        hasStructuredReturn: mutationEntry.hasStructuredReturn,
        hasValidation: mutationEntry.hasValidation,
        line: mutationEntry.line,
        mutationContractExemption: mutationEntry.contract.exemption,
        mutationContractRequiredViolationCodes: mutationEntry.contract.requiredViolationCodes,
        mutationContractRequirements: mutationEntry.contract.requirements,
        mutationContractStatus: mutationEntry.contract.status,
        mutationContractWarningCodes: mutationEntry.contract.warningCodes,
        mutationKinds: mutationEntry.mutationKinds,
        outcomeStyle: mutationEntry.outcomeStyle,
        relativeFilePath: mutationEntry.relativeFilePath,
        root: mutationEntry.root,
        tableReferences: mutationEntry.tableReferences,
        tenantScopeSignal: mutationEntry.tenantScopeSignal,
      },
    })

    for (const auditNodeId of auditNodeIdsByFamily.get('page-facing-write') ?? []) {
      addEdge(nodeId, auditNodeId, 'audited-by')
    }
  }

  let resolvedDynamicPageRoutes = 0
  let unresolvedDynamicPageRoutes = 0

  for (const pageEntry of pageEntries) {
    const relativeSourcePath = relativePathFromRoot(pageEntry.filePath, rootDir)
    const routePath = pageEntry.route ?? pageEntry.template
    const surfaceMode = resolveSurfaceModeForPortal(
      pageEntry.role as ProductSurfacePortal,
      routePath
    )
    const siteAuditRoutes = siteAuditRoutesBySource.get(relativeSourcePath) ?? []
    const siteAuditSkipped = siteAuditSkippedBySource.get(relativeSourcePath) ?? []
    const hasSpecialSegment = pageEntry.segments.some(isSpecialAppSegment)
    const seoExpectation = seoExpectationForRoute(pageEntry.route)
    const coverageSpecPaths = pageEntry.isDynamic
      ? []
      : (coverageSpecPathsByRole.get(pageEntry.role) ?? [])
    const staticRoute = pageEntry.isDynamic ? null : pageEntry.route
    const manuallyCovered = pageEntry.isDynamic
      ? false
      : staticRoute != null && (manualCoverageByRole.get(pageEntry.role)?.has(staticRoute) ?? false)
    const policyAligned = pageEntry.isDynamic
      ? null
      : !(
          staticRoute != null &&
          (routePolicyGapsByRole.get(pageEntry.role)?.has(staticRoute) ?? false)
        )
    const hasMetadataContract =
      !pageEntry.isDynamic && pageEntry.role === 'public'
        ? hasPublicMetadataContract(pageEntry as StaticPageRouteEntry)
        : false
    const buildSurfaceNames = buildSurfaceInfos
      .filter((surfaceInfo) => surfaceInfo.pageRelativePaths.has(relativeSourcePath))
      .map((surfaceInfo) => surfaceInfo.surfaceName)

    if (pageEntry.isDynamic && siteAuditRoutes.some((route) => route.resolution === 'dynamic')) {
      resolvedDynamicPageRoutes += 1
    }
    if (pageEntry.isDynamic && siteAuditRoutes.length === 0 && siteAuditSkipped.length > 0) {
      unresolvedDynamicPageRoutes += 1
    }

    const siteAuditMetadata =
      siteAuditRoutes.length > 0
        ? {
            expectedReason: siteAuditRoutes[0]?.expected?.reason ?? '',
            expectedType: siteAuditRoutes[0]?.expected?.type ?? '',
            path: siteAuditRoutes[0]?.path ?? '',
            resolvedPathCount: siteAuditRoutes.length,
            resolvedPathsSample: siteAuditRoutes.slice(0, 5).map((route) => route.path),
            resolverKinds: [...new Set(siteAuditRoutes.map((route) => route.resolver.kind))],
            resolverSources: [...new Set(siteAuditRoutes.map((route) => route.resolver.source))],
            resolution: siteAuditRoutes[0]?.resolution ?? 'dynamic',
            status: 'resolved',
          }
        : siteAuditSkipped.length > 0
          ? {
              reason: siteAuditSkipped[0]?.reason ?? '',
              skipKinds: [
                ...new Set(siteAuditSkipped.map((item) => item.resolver?.kind ?? 'unknown')),
              ],
              skipReasons: [...new Set(siteAuditSkipped.map((item) => item.reason))],
              status: 'skipped',
            }
          : {
              reason: hasSpecialSegment
                ? 'special route segment excluded from site audit manifest'
                : 'route not present in site audit manifest',
              status: hasSpecialSegment ? 'excluded' : 'not-discovered',
            }

    const nodeId = `page-route:app:${relativeSourcePath}`
    addNode({
      id: nodeId,
      kind: 'page-route',
      label: routePath,
      metadata: {
        buildSurfaceNames,
        coverageSpecPaths,
        hasPublicMetadataContract: hasMetadataContract,
        hasSpecialSegment,
        manuallyCovered,
        policyAligned,
        role: pageEntry.role,
        route: pageEntry.route,
        routeKind: pageEntry.isDynamic ? 'dynamic' : 'static',
        segments: pageEntry.segments,
        surfaceMode,
        siteAudit: siteAuditMetadata,
        sourceFile: relativeSourcePath,
        sourceLayer: 'app',
        template: pageEntry.template,
      },
    })

    for (const auditNodeId of auditNodeIdsByFamily.get('page-routes') ?? []) {
      addEdge(nodeId, auditNodeId, 'audited-by')
    }

    if (pageEntry.isDynamic) {
      for (const auditNodeId of auditNodeIdsByFamily.get('dynamic-route-resolution') ?? []) {
        addEdge(nodeId, auditNodeId, 'audited-by')
      }
    }

    if (seoExpectation) {
      addEdge(nodeId, seoNodeIdsByRoute.get(seoExpectation.path)!, 'has-seo-expectation')
    }

    for (const surfaceName of buildSurfaceNames) {
      addEdge(nodeId, `build-surface:${surfaceName}`, 'included-in-build-surface')
    }
  }

  for (const surfaceInfo of buildSurfaceInfos) {
    for (const overlayEntry of surfaceInfo.overlayEntries) {
      const relativeSourcePath = relativePathFromRoot(overlayEntry.filePath, rootDir)
      const routePath = overlayEntry.route ?? overlayEntry.template
      const surfaceMode = resolveSurfaceModeForPortal(
        overlayEntry.role as ProductSurfacePortal,
        routePath
      )
      const seoExpectation = seoExpectationForRoute(overlayEntry.route)
      const hasMetadataContract =
        !overlayEntry.isDynamic && overlayEntry.role === 'public'
          ? hasPublicMetadataContract(overlayEntry as StaticPageRouteEntry)
          : false
      const nodeId = `page-route:build-surface-overlay:${surfaceInfo.surfaceName}:${relativeSourcePath}`

      addNode({
        id: nodeId,
        kind: 'page-route',
        label: routePath,
        metadata: {
          buildSurfaceNames: [surfaceInfo.surfaceName],
          coverageSpecPaths: [],
          hasPublicMetadataContract: hasMetadataContract,
          hasSpecialSegment: overlayEntry.segments.some(isSpecialAppSegment),
          manuallyCovered: false,
          policyAligned: null,
          role: overlayEntry.role,
          route: overlayEntry.route,
          routeKind: overlayEntry.isDynamic ? 'dynamic' : 'static',
          segments: overlayEntry.segments,
          surfaceMode,
          siteAudit: {
            reason: 'build-surface overlay routes are outside the primary site audit manifest',
            status: 'not-applicable',
          },
          sourceFile: relativeSourcePath,
          sourceLayer: 'build-surface-overlay',
          surfaceName: surfaceInfo.surfaceName,
          template: overlayEntry.template,
        },
      })

      for (const auditNodeId of auditNodeIdsByFamily.get('build-surface') ?? []) {
        addEdge(nodeId, auditNodeId, 'audited-by')
      }

      if (seoExpectation) {
        addEdge(nodeId, seoNodeIdsByRoute.get(seoExpectation.path)!, 'has-seo-expectation')
      }

      addEdge(nodeId, `build-surface:${surfaceInfo.surfaceName}`, 'included-in-build-surface')
    }
  }

  const summary: SystemContractGraphSummary = {
    apiRoutes: apiInventory.entries.length,
    auditEntrypoints: auditEntrypoints.length,
    buildSurfaceIntegrityFailures: buildSurfaceInfos.reduce(
      (count, surfaceInfo) => count + countBuildSurfaceIntegrityFailures(surfaceInfo),
      0
    ),
    buildSurfaceMissingPaths: buildSurfaceInfos.reduce(
      (count, surfaceInfo) => count + surfaceInfo.missingPaths.length,
      0
    ),
    buildSurfaces: buildSurfaceInfos.length,
    derivedOutputAiAssistedNodes: derivedOutputInventory.entries.filter(
      (entry) => entry.derivationMethod !== 'deterministic'
    ).length,
    derivedOutputContractCompliantNodes: derivedOutputInventory.compliantEntryCount,
    derivedOutputNodes: derivedOutputInventory.totalEntries,
    derivedOutputObservabilityBridgeNodes: derivedOutputInventory.observabilityBridgeEntryCount,
    dynamicPageRoutes: nodes.filter(
      (node) => node.kind === 'page-route' && node.metadata.routeKind === 'dynamic'
    ).length,
    observabilityExpectations: PLATFORM_OBSERVABILITY_EMITTER_EXPECTATIONS.length,
    pageRoutes: nodes.filter((node) => node.kind === 'page-route').length,
    pageFacingWriteActions: serverActionMutationInventory.pageFacingMutationFunctionCount,
    pageFacingWriteContractCompliantActions:
      serverActionMutationInventory.contractCompliantFunctionCount,
    pageFacingWriteContractRequiredViolationActions:
      serverActionMutationInventory.contractRequiredViolationFunctionCount,
    pageFacingWriteContractWarningActions:
      serverActionMutationInventory.contractWarningFunctionCount,
    resolvedDynamicPageRoutes,
    seoExpectations: PUBLIC_ROUTE_SEO_CHECKS.length,
    serverActionMutations: serverActionMutationInventory.totalMutationFunctions,
    totalEdges: edges.length,
    totalNodes: nodes.length,
    unresolvedDynamicPageRoutes,
  }

  return {
    auditEntrypoints,
    edges,
    generatedAt: new Date().toISOString(),
    nodes,
    summary,
  }
}

export const SURFACE_COMPLETENESS_CHECKS: SurfaceCompletenessCheckDefinition[] = [
  {
    group: 'coverage',
    id: 'static-route-coverage',
    label: 'Static route coverage registration',
    run: runStaticRouteCoverageCheck,
  },
  {
    group: 'coverage',
    id: 'dynamic-route-resolution',
    label: 'Dynamic route resolution contract',
    run: runDynamicRouteResolutionCheck,
  },
  {
    group: 'release',
    id: 'build-surface-integrity',
    label: 'Build surface integrity',
    run: runBuildSurfaceIntegrityCheck,
  },
  {
    group: 'coverage',
    id: 'surface-mode-declaration',
    label: 'Surface mode declaration',
    run: runSurfaceModeDeclarationCheck,
  },
  {
    group: 'auth',
    id: 'route-policy-alignment',
    label: 'Route policy alignment',
    run: runRoutePolicyAlignmentCheck,
  },
  {
    group: 'auth',
    id: 'api-auth-inventory',
    label: 'API auth inventory',
    run: runApiAuthInventoryCheck,
  },
  {
    group: 'auth',
    id: 'server-action-auth-inventory',
    label: 'Server action auth inventory',
    run: runServerActionAuthInventoryCheck,
  },
  {
    group: 'mutation',
    id: 'server-action-mutation-inventory',
    label: 'Server action mutation inventory',
    run: runServerActionMutationInventoryCheck,
  },
  {
    group: 'metadata',
    id: 'derived-output-provenance-inventory',
    label: 'Derived output provenance inventory',
    run: runDerivedOutputProvenanceInventoryCheck,
  },
  {
    group: 'metadata',
    id: 'public-seo-contract',
    label: 'Public SEO contract coverage',
    run: runPublicSeoContractCheck,
  },
  {
    group: 'brand',
    id: 'national-brand-audit',
    label: 'National brand audit',
    run: runNationalBrandCheck,
  },
  {
    group: 'observability',
    id: 'platform-observability-coverage',
    label: 'Platform observability coverage',
    run: runPlatformObservabilityCoverageCheck,
  },
]

export async function runSurfaceCompletenessAudit(options?: {
  checkIds?: SurfaceCompletenessCheckId[]
  groups?: SurfaceCompletenessGroup[]
}) {
  const requestedCheckIds = options?.checkIds ?? []
  const requestedGroups = options?.groups ?? []
  const selectedChecks = SURFACE_COMPLETENESS_CHECKS.filter((check) => {
    if (requestedCheckIds.length > 0 && !requestedCheckIds.includes(check.id)) {
      return false
    }
    if (requestedGroups.length > 0 && !requestedGroups.includes(check.group)) {
      return false
    }
    return true
  })
  const results = await Promise.all(selectedChecks.map((check) => check.run()))
  const passCount = results.filter((result) => result.status === 'pass').length
  const warnCount = results.filter((result) => result.status === 'warn').length
  const failCount = results.filter((result) => result.status === 'fail').length

  return {
    generatedAt: new Date().toISOString(),
    passCount,
    requestedChecks: requestedCheckIds,
    requestedGroups,
    results,
    selectedCheckCount: selectedChecks.length,
    totalFindings: results.reduce((count, result) => count + result.findings.length, 0),
    warnCount,
    failCount,
  } satisfies SurfaceCompletenessAuditResult
}

const surfaceCompleteness = {
  SURFACE_COMPLETENESS_CHECKS,
  buildSystemContractGraph,
  runSurfaceCompletenessAudit,
}

export default surfaceCompleteness
