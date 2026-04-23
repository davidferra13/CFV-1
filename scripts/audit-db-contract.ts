import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as bootContractNamespace from '../lib/db/boot-contract'
import * as directoryStateSqlNamespace from '../lib/discover/directory-state-sql'
import type {
  DbBootContractSourceSpec,
  DbBootContractSurface,
  LiveDbBootContractCheck,
} from '../lib/db/boot-contract'

const bootContractModule = {
  ...(bootContractNamespace.default ?? {}),
  ...bootContractNamespace,
}
const directoryStateSqlModule = {
  ...(directoryStateSqlNamespace.default ?? {}),
  ...directoryStateSqlNamespace,
}

const { DB_BOOT_CONTRACT_OBJECTS, DB_BOOT_CONTRACT_VERSION, inspectLiveDbBootContract } =
  bootContractModule
const { DIRECTORY_CANONICAL_STATE_SQL, DIRECTORY_DISCOVERABLE_STATUSES } = directoryStateSqlModule

type AuditSeverity = 'error' | 'warning'

type AuditFinding = {
  code: string
  message: string
  paths: string[]
  severity: AuditSeverity
}

type SourceSurfaceResult = {
  filePath: string
  patterns: readonly string[]
  present: boolean
}

type ContractObjectSurfaceStatus = {
  description: string
  id: string
  surfaces: Partial<Record<DbBootContractSurface, SourceSurfaceResult[]>>
}

type MigrationIssue = {
  filePath: string
  line: number
  statement: string
}

type MigrationDirectoryReport = {
  destructiveStatements: MigrationIssue[]
  duplicates: Array<{ first: string; second: string; version: string }>
  invalidFiles: string[]
  migrationFiles: string[]
  versions: string[]
}

type RollbackValidationResult = {
  errorMessage: string | null
  filePath: string
  ok: boolean
}

type PlannerCheckResult = {
  errorMessage?: string
  expectedIndexes: string[]
  id: string
  nodeTypes: string[]
  ok: boolean
  planSummary: string[]
  relationNames: string[]
  usedIndexes: string[]
}

type RuntimeInvariantResult = {
  description: string
  filePath: string
  forbiddenPatterns: string[]
  id: string
  missingPatterns: string[]
  ok: boolean
}

type DbContractAuditReport = {
  contractVersion: string
  failCount: number
  findings: AuditFinding[]
  generatedAt: string
  live: Awaited<ReturnType<typeof inspectLiveDbBootContract>> | null
  migrationDirectory: MigrationDirectoryReport
  plannerChecks: PlannerCheckResult[]
  rollbackValidations: RollbackValidationResult[]
  runtimeInvariants: RuntimeInvariantResult[]
  sourceAudit: ContractObjectSurfaceStatus[]
  summary: {
    liveMissingCount: number
    plannerFailureCount: number
    rollbackFailureCount: number
    runtimeInvariantFailureCount: number
    sourceFailureCount: number
  }
  warnCount: number
}

type AuditOptions = {
  includeLive?: boolean
  includePlannerChecks?: boolean
  includeRollbackValidation?: boolean
  rootDir?: string
}

type RuntimeInvariantSpec = {
  absentPatterns?: readonly string[]
  description: string
  filePath: string
  id: string
  requiredPatterns: readonly string[]
}

const DESTRUCTIVE_SQL_PATTERNS: Array<{ label: string; matcher: RegExp }> = [
  { label: 'DROP TABLE', matcher: /\bDROP\s+TABLE\b/i },
  { label: 'DROP COLUMN', matcher: /\bDROP\s+COLUMN\b/i },
  { label: 'DROP SCHEMA', matcher: /\bDROP\s+SCHEMA\b/i },
  { label: 'DROP DATABASE', matcher: /\bDROP\s+DATABASE\b/i },
  { label: 'DROP VIEW', matcher: /\bDROP\s+VIEW\b/i },
  { label: 'TRUNCATE', matcher: /\bTRUNCATE\b/i },
  { label: 'DELETE FROM', matcher: /\bDELETE\s+FROM\b/i },
]

const RUNTIME_INVARIANTS: readonly RuntimeInvariantSpec[] = [
  {
    id: 'server-client-uses-compat-client',
    description: 'Server runtime must resolve through the shared compat client.',
    filePath: 'lib/db/server.ts',
    requiredPatterns: ["import { createCompatClient", 'return createCompatClient()'],
  },
  {
    id: 'admin-client-uses-compat-client',
    description: 'Admin runtime must resolve through the shared compat client.',
    filePath: 'lib/db/admin.ts',
    requiredPatterns: ["import { createCompatClient", 'return createCompatClient()'],
  },
  {
    id: 'compat-client-uses-shared-pg-client',
    description: 'Compat client must read and write through the shared Postgres client export.',
    filePath: 'lib/db/compat.ts',
    requiredPatterns: ["import { pgClient } from '@/lib/db'"],
  },
  {
    id: 'auth-config-uses-shared-drizzle-db',
    description: 'Auth config must resolve its queries through the shared Drizzle export.',
    filePath: 'lib/auth/auth-config.ts',
    requiredPatterns: ["import { db } from '@/lib/db'"],
  },
  {
    id: 'get-user-uses-shared-drizzle-db',
    description: 'Authenticated user lookup must resolve through the shared Drizzle export.',
    filePath: 'lib/auth/get-user.ts',
    requiredPatterns: ["import { db } from '@/lib/db'"],
  },
  {
    id: 'cil-sidecar-stays-explicitly-sqlite',
    description: 'The CIL sidecar must remain a separate SQLite lane, not a hidden Postgres fork.',
    filePath: 'lib/cil/db.ts',
    requiredPatterns: ['better-sqlite3', 'storage', 'cil'],
    absentPatterns: ['DATABASE_URL'],
  },
] as const

function compareVersions(left: string, right: string) {
  const leftVersion = BigInt(left)
  const rightVersion = BigInt(right)
  if (leftVersion < rightVersion) return -1
  if (leftVersion > rightVersion) return 1
  return 0
}

function readText(rootDir: string, relativePath: string) {
  const absolutePath = path.join(rootDir, relativePath)
  return readFileSync(absolutePath, 'utf8')
}

function matchesSourceSpec(rootDir: string, spec: DbBootContractSourceSpec): SourceSurfaceResult {
  const content = readText(rootDir, spec.filePath)
  return {
    filePath: spec.filePath,
    patterns: spec.patterns,
    present: spec.patterns.every((pattern) => content.includes(pattern)),
  }
}

function walkPlanNodes(
  plan: any,
  state: {
    indexes: Set<string>
    nodes: Set<string>
    relations: Set<string>
  }
) {
  if (!plan || typeof plan !== 'object') return

  if (typeof plan['Index Name'] === 'string' && plan['Index Name']) {
    state.indexes.add(plan['Index Name'])
  }
  if (typeof plan['Node Type'] === 'string' && plan['Node Type']) {
    state.nodes.add(plan['Node Type'])
  }
  if (typeof plan['Relation Name'] === 'string' && plan['Relation Name']) {
    state.relations.add(plan['Relation Name'])
  }

  if (Array.isArray(plan.Plans)) {
    for (const child of plan.Plans) {
      walkPlanNodes(child, state)
    }
  }
}

export function auditDbContractSources(rootDir = process.cwd()): ContractObjectSurfaceStatus[] {
  return DB_BOOT_CONTRACT_OBJECTS.map((object) => {
    const surfaces: Partial<Record<DbBootContractSurface, SourceSurfaceResult[]>> = {}

    for (const surface of ['activeSchema', 'generatedSchema', 'migrationSnapshot', 'sqlMigrations'] as const) {
      const specs = object.surfaces?.[surface]
      if (!specs || specs.length === 0) continue
      surfaces[surface] = specs.map((spec) => matchesSourceSpec(rootDir, spec))
    }

    return {
      description: object.description,
      id: object.id,
      surfaces,
    }
  })
}

export function inspectMigrationDirectory(rootDir = process.cwd()): MigrationDirectoryReport {
  const migrationsDir = path.join(rootDir, 'database', 'migrations')
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  const seen = new Map<string, string>()
  const duplicates: Array<{ first: string; second: string; version: string }> = []
  const invalidFiles: string[] = []
  const versions: string[] = []
  const destructiveStatements: MigrationIssue[] = []

  for (const file of migrationFiles) {
    const match = /^(\d{14})_/.exec(file)
    if (!match) {
      invalidFiles.push(file)
      continue
    }

    const version = match[1]
    const first = seen.get(version)
    if (first) {
      duplicates.push({ first, second: file, version })
    } else {
      seen.set(version, file)
      versions.push(version)
    }

    const relativePath = path.posix.join('database/migrations', file)
    const content = readText(rootDir, relativePath)
    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
      for (const pattern of DESTRUCTIVE_SQL_PATTERNS) {
        if (!pattern.matcher.test(line)) continue
        destructiveStatements.push({
          filePath: relativePath,
          line: index + 1,
          statement: pattern.label,
        })
      }
    })
  }

  return {
    destructiveStatements,
    duplicates,
    invalidFiles,
    migrationFiles,
    versions: [...versions].sort(compareVersions),
  }
}

export function auditRuntimeInvariants(rootDir = process.cwd()): RuntimeInvariantResult[] {
  return RUNTIME_INVARIANTS.map((spec) => {
    const content = readText(rootDir, spec.filePath)
    const missingPatterns = spec.requiredPatterns.filter((pattern) => !content.includes(pattern))
    const forbiddenPatterns = (spec.absentPatterns ?? []).filter((pattern) => content.includes(pattern))

    return {
      description: spec.description,
      filePath: spec.filePath,
      forbiddenPatterns,
      id: spec.id,
      missingPatterns,
      ok: missingPatterns.length === 0 && forbiddenPatterns.length === 0,
    }
  })
}

async function createQuietSqlClient() {
  const postgresNamespace = await import('postgres')
  const postgresFactory = (postgresNamespace.default ??
    postgresNamespace) as typeof import('postgres').default
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

  return postgresFactory(connectionString, {
    connect_timeout: 10,
    idle_timeout: 5,
    max: 1,
    onnotice: () => {},
  })
}

export async function validateMigrationRollback(filePath: string, rootDir = process.cwd()) {
  const sqlText = readText(rootDir, filePath)
  const rollbackSignal = new Error(`rollback:${filePath}`)
  const sqlClient = await createQuietSqlClient()

  try {
    await sqlClient.begin(async (sql: any) => {
      await sql.unsafe('SET LOCAL search_path = public, openclaw, extensions')
      await sql.unsafe(sqlText)
      throw rollbackSignal
    })

    return {
      errorMessage: 'migration transaction committed unexpectedly during rollback validation',
      filePath,
      ok: false,
    } satisfies RollbackValidationResult
  } catch (error) {
    if (error === rollbackSignal) {
      return {
        errorMessage: null,
        filePath,
        ok: true,
      } satisfies RollbackValidationResult
    }

    return {
      errorMessage: error instanceof Error ? error.message : String(error),
      filePath,
      ok: false,
    } satisfies RollbackValidationResult
  } finally {
    await sqlClient.end({ timeout: 1 })
  }
}

async function explainQuery(sqlText: string, params: Array<string | number>) {
  const sqlClient = await createQuietSqlClient()

  try {
    const rows = (await sqlClient.begin(async (sql: any) => {
      await sql.unsafe('SET LOCAL search_path = public, openclaw, extensions')
      return sql.unsafe(`EXPLAIN (FORMAT JSON) ${sqlText}`, params)
    })) as Array<{ 'QUERY PLAN'?: unknown }>
    const rawPlan = rows[0]?.['QUERY PLAN']
    const explainPayload = Array.isArray(rawPlan) && rawPlan.length > 0 ? rawPlan[0] : rawPlan
    const plan = (explainPayload as any)?.Plan ?? explainPayload
    const state = {
      indexes: new Set<string>(),
      nodes: new Set<string>(),
      relations: new Set<string>(),
    }
    walkPlanNodes(plan, state)

    return {
      nodeTypes: [...state.nodes].sort(),
      relationNames: [...state.relations].sort(),
      usedIndexes: [...state.indexes].sort(),
    }
  } finally {
    await sqlClient.end({ timeout: 1 })
  }
}

export async function runPlannerChecks(): Promise<PlannerCheckResult[]> {
  const discoverableStatusSql = DIRECTORY_DISCOVERABLE_STATUSES.map((status) => `'${status}'`).join(', ')
  const canonicalStateQuery = `SELECT id
    FROM public.directory_listings
    WHERE status IN (${discoverableStatusSql})
      AND ${DIRECTORY_CANONICAL_STATE_SQL} = $1
    ORDER BY featured DESC, name ASC
    LIMIT 24`

  const directoryGeoQuery = `SELECT id
    FROM public.directory_listings
    WHERE status IN (${discoverableStatusSql})
      AND ${DIRECTORY_CANONICAL_STATE_SQL} = $1
      AND lat IS NOT NULL
      AND lon IS NOT NULL
      AND lat BETWEEN $2 AND $3
      AND lon BETWEEN $4 AND $5
    ORDER BY featured DESC, name ASC
    LIMIT 24`

  const plannerSpecs = [
    {
      id: 'directory-state-browse',
      sqlText: canonicalStateQuery,
      params: ['CA'],
      expectedIndexes: ['idx_directory_listings_canonical_state'],
    },
    {
      id: 'directory-geo-radius',
      sqlText: directoryGeoQuery,
      params: ['CA', 33.5, 35.0, -119.5, -117.0],
      expectedIndexes: ['idx_directory_listings_geo'],
    },
    {
      id: 'discoverable-chefs',
      sqlText: `SELECT c.id
        FROM public.chefs c
        JOIN public.chef_preferences cp
          ON cp.chef_id = c.id
        WHERE c.directory_approved = true
          AND c.slug IS NOT NULL
          AND cp.network_discoverable = true
        ORDER BY c.updated_at DESC
        LIMIT 24`,
      params: [],
      expectedIndexes: ['idx_chef_preferences_network_discoverable_chef'],
    },
    {
      id: 'canonical-ingredient-trigram',
      sqlText: `SELECT ingredient_id
        FROM openclaw.canonical_ingredients
        WHERE name % $1
        ORDER BY similarity(name, $1) DESC
        LIMIT 20`,
      params: ['tomato'],
      expectedIndexes: ['idx_canonical_ingredients_name_trgm'],
    },
    {
      id: 'ingredient-knowledge-trigram',
      sqlText: `SELECT si.id
        FROM public.system_ingredients si
        WHERE si.name % $1
        ORDER BY similarity(si.name, $1) DESC
        LIMIT 20`,
      params: ['tomato'],
      expectedIndexes: ['idx_system_ingredients_name_trgm'],
    },
  ] as const

  const results: PlannerCheckResult[] = []
  for (const spec of plannerSpecs) {
    try {
      const explained = await explainQuery(spec.sqlText, spec.params)
      results.push({
        expectedIndexes: [...spec.expectedIndexes],
        id: spec.id,
        nodeTypes: explained.nodeTypes,
        ok: spec.expectedIndexes.every((indexName) => explained.usedIndexes.includes(indexName)),
        planSummary: [
          `nodes=${explained.nodeTypes.join(', ') || 'none'}`,
          `indexes=${explained.usedIndexes.join(', ') || 'none'}`,
          `relations=${explained.relationNames.join(', ') || 'none'}`,
        ],
        relationNames: explained.relationNames,
        usedIndexes: explained.usedIndexes,
      })
    } catch (error) {
      results.push({
        errorMessage: error instanceof Error ? error.message : String(error),
        expectedIndexes: [...spec.expectedIndexes],
        id: spec.id,
        nodeTypes: [],
        ok: false,
        planSummary: [],
        relationNames: [],
        usedIndexes: [],
      })
    }
  }

  return results
}

function addFinding(findings: AuditFinding[], finding: AuditFinding) {
  findings.push(finding)
}

function getCriticalMigrationFiles() {
  return [
    ...new Set(
      DB_BOOT_CONTRACT_OBJECTS.flatMap((object) =>
        object.criticalMigrationFile
          ? [path.posix.join('database/migrations', object.criticalMigrationFile)]
          : []
      )
    ),
  ]
}

export async function runDbContractAudit(options: AuditOptions = {}): Promise<DbContractAuditReport> {
  const rootDir = options.rootDir ?? process.cwd()
  const findings: AuditFinding[] = []
  const sourceAudit = auditDbContractSources(rootDir)
  const migrationDirectory = inspectMigrationDirectory(rootDir)
  const runtimeInvariants = auditRuntimeInvariants(rootDir)
  const criticalMigrationFiles = new Set(getCriticalMigrationFiles())
  const includeLive = options.includeLive !== false
  const includePlannerChecks = includeLive && options.includePlannerChecks !== false
  const includeRollbackValidation = options.includeRollbackValidation !== false
  const live = includeLive ? await inspectLiveDbBootContract() : null
  const plannerChecks = includePlannerChecks ? await runPlannerChecks() : []
  const rollbackValidations = includeRollbackValidation
    ? await Promise.all(
        getCriticalMigrationFiles().map((filePath) => validateMigrationRollback(filePath, rootDir))
      )
    : []

  for (const objectStatus of sourceAudit) {
    for (const [surface, results] of Object.entries(objectStatus.surfaces) as Array<
      [DbBootContractSurface, SourceSurfaceResult[]]
    >) {
      for (const result of results) {
        if (result.present) continue
        addFinding(findings, {
          code: `db-contract:source-surface-missing:${objectStatus.id}:${surface}`,
          message: `${objectStatus.id} is missing from ${surface} (${result.filePath}).`,
          paths: [result.filePath],
          severity: 'error',
        })
      }
    }
  }

  if (migrationDirectory.invalidFiles.length > 0) {
    addFinding(findings, {
      code: 'db-contract:migrations:invalid-filenames',
      message: `Found ${migrationDirectory.invalidFiles.length} migration file(s) without a 14-digit timestamp prefix.`,
      paths: migrationDirectory.invalidFiles.map((file) => path.posix.join('database/migrations', file)),
      severity: 'error',
    })
  }

  if (migrationDirectory.duplicates.length > 0) {
    addFinding(findings, {
      code: 'db-contract:migrations:duplicate-timestamps',
      message: `Found ${migrationDirectory.duplicates.length} duplicate migration timestamp collision(s).`,
      paths: migrationDirectory.duplicates.flatMap((duplicate) => [
        path.posix.join('database/migrations', duplicate.first),
        path.posix.join('database/migrations', duplicate.second),
      ]),
      severity: 'error',
    })
  }

  const criticalDestructiveStatements = migrationDirectory.destructiveStatements.filter((issue) =>
    criticalMigrationFiles.has(issue.filePath)
  )

  if (criticalDestructiveStatements.length > 0) {
    addFinding(findings, {
      code: 'db-contract:migrations:destructive-sql',
      message: `Found ${criticalDestructiveStatements.length} destructive SQL statement(s) in critical additive migration lanes.`,
      paths: criticalDestructiveStatements.map((issue) => `${issue.filePath}:${issue.line}`),
      severity: 'error',
    })
  }

  for (const runtimeInvariant of runtimeInvariants) {
    if (runtimeInvariant.ok) continue
    addFinding(findings, {
      code: `db-contract:runtime-invariant:${runtimeInvariant.id}`,
      message: `${runtimeInvariant.id} drifted from the single-DB contract assumptions.`,
      paths: [runtimeInvariant.filePath],
      severity: 'error',
    })
  }

  for (const validation of rollbackValidations) {
    if (validation.ok) continue
    addFinding(findings, {
      code: `db-contract:rollback-validation:${validation.filePath}`,
      message: `Rollback validation failed for ${validation.filePath}: ${validation.errorMessage}`,
      paths: [validation.filePath],
      severity: 'error',
    })
  }

  if (live) {
    if (live.status === 'unreachable') {
      addFinding(findings, {
        code: 'db-contract:live-db:unreachable',
        message: `Live DB contract probe failed: ${live.errorMessage ?? 'unknown database error'}`,
        paths: [],
        severity: 'error',
      })
    } else {
      for (const missingObject of live.missingObjects) {
        addFinding(findings, {
          code: `db-contract:live-missing:${missingObject.id}`,
          message: `${missingObject.id} is missing from the live database boot contract.`,
          paths: missingObject.criticalMigrationFile
            ? [path.posix.join('database/migrations', missingObject.criticalMigrationFile)]
            : [],
          severity: 'error',
        })
      }

      const unappliedCriticalMigrations = new Map<string, LiveDbBootContractCheck[]>()
      for (const missingObject of live.missingObjects) {
        if (!missingObject.criticalMigrationFile) continue
        const key = missingObject.criticalMigrationFile
        const bucket = unappliedCriticalMigrations.get(key) ?? []
        bucket.push(missingObject)
        unappliedCriticalMigrations.set(key, bucket)
      }

      for (const [migrationFile, missingObjects] of unappliedCriticalMigrations.entries()) {
        addFinding(findings, {
          code: `db-contract:critical-migration-unapplied:${migrationFile}`,
          message: `${migrationFile} has not been applied to the live database; missing objects: ${missingObjects.map((item) => item.id).join(', ')}.`,
          paths: [path.posix.join('database/migrations', migrationFile)],
          severity: 'error',
        })
      }
    }
  }

  for (const plannerCheck of plannerChecks) {
    if (plannerCheck.ok) continue
    addFinding(findings, {
      code: `db-contract:planner:${plannerCheck.id}`,
      message: plannerCheck.errorMessage
        ? `${plannerCheck.id} EXPLAIN failed: ${plannerCheck.errorMessage}`
        : `${plannerCheck.id} did not use the required index(es): ${plannerCheck.expectedIndexes.join(', ')}.`,
      paths: [],
      severity: 'error',
    })
  }

  const failCount = findings.filter((finding) => finding.severity === 'error').length
  const warnCount = findings.filter((finding) => finding.severity === 'warning').length

  return {
    contractVersion: DB_BOOT_CONTRACT_VERSION,
    failCount,
    findings,
    generatedAt: new Date().toISOString(),
    live,
    migrationDirectory,
    plannerChecks,
    rollbackValidations,
    runtimeInvariants,
    sourceAudit,
    summary: {
      liveMissingCount: live?.missingObjects.length ?? 0,
      plannerFailureCount: plannerChecks.filter((check) => !check.ok).length,
      rollbackFailureCount: rollbackValidations.filter((item) => !item.ok).length,
      runtimeInvariantFailureCount: runtimeInvariants.filter((item) => !item.ok).length,
      sourceFailureCount: findings.filter((finding) =>
        finding.code.startsWith('db-contract:source-surface-missing')
      ).length,
    },
    warnCount,
  }
}

function parseArgs(argv: string[]) {
  return {
    skipLive: argv.includes('--skip-live'),
    skipPlanner: argv.includes('--skip-planner'),
    skipRollbackValidation: argv.includes('--skip-rollback-validation'),
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  const report = await runDbContractAudit({
    includeLive: !args.skipLive,
    includePlannerChecks: !args.skipPlanner,
    includeRollbackValidation: !args.skipRollbackValidation,
  })

  console.log(JSON.stringify(report, null, 2))
  process.exitCode = report.failCount > 0 ? 1 : 0
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
const scriptPath = path.resolve(fileURLToPath(import.meta.url))

if (invokedPath && invokedPath === scriptPath) {
  main().catch((error) => {
    const report = {
      contractVersion: DB_BOOT_CONTRACT_VERSION,
      failCount: 1,
      findings: [
        {
          code: 'db-contract:audit-fatal',
          message: error instanceof Error ? error.message : String(error),
          paths: [],
          severity: 'error',
        },
      ],
      generatedAt: new Date().toISOString(),
      live: null,
      migrationDirectory: {
        destructiveStatements: [],
        duplicates: [],
        invalidFiles: [],
        migrationFiles: [],
        versions: [],
      },
      plannerChecks: [],
      rollbackValidations: [],
      runtimeInvariants: [],
      sourceAudit: [],
      summary: {
        liveMissingCount: 0,
        plannerFailureCount: 0,
        rollbackFailureCount: 0,
        runtimeInvariantFailureCount: 0,
        sourceFailureCount: 0,
      },
      warnCount: 0,
    } satisfies DbContractAuditReport

    console.log(JSON.stringify(report, null, 2))
    process.exitCode = 1
  })
}
