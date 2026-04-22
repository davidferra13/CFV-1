import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export type ServerActionDiscoveryRoot = 'lib' | 'app'

export type ServerActionAuthClassification =
  | 'auth-guarded'
  | 'documented-public'
  | 'file-exempt'
  | 'missing-auth'

export type ServerActionGuardTiming = 'early' | 'late' | 'none'

export type ServerActionAuthEntry = {
  classification: ServerActionAuthClassification
  filePath: string
  functionName: string
  guardTiming: ServerActionGuardTiming
  hasAuthGuard: boolean
  hasPublicComment: boolean
  line: number
  relativeFilePath: string
  root: ServerActionDiscoveryRoot
}

export type ServerActionRootSummary = {
  authGuarded: number
  documentedPublic: number
  fileExempt: number
  files: number
  functions: number
  lateAuth: number
  missingAuth: number
}

export type ServerActionAuthInventory = {
  authGuardedFunctionCount: number
  documentedPublicFunctionCount: number
  earlyAuthFunctionCount: number
  entries: ServerActionAuthEntry[]
  fileExemptFunctionCount: number
  lateAuthFunctionCount: number
  lateAuthFunctionIds: string[]
  missingAuthFunctionCount: number
  missingAuthFunctionIds: string[]
  rootSummary: Record<ServerActionDiscoveryRoot, ServerActionRootSummary>
  rootsScanned: ServerActionDiscoveryRoot[]
  totalFiles: number
  totalFunctions: number
}

export type ServerActionMutationClassification = 'page-facing' | 'audit-only' | 'path-exempt'

export type ServerActionMutationKind = 'insert' | 'update' | 'delete' | 'raw-sql'

export type ServerActionPrivilegeLevel = 'standard' | 'sensitive' | 'critical'

export type ServerActionPrivilegeStatus = 'not-privileged' | 'exempt' | 'compliant' | 'violations'

export type ServerActionPrivilegeTriggerCode =
  | 'admin-surface'
  | 'finance-surface'
  | 'contract-surface'
  | 'staff-surface'
  | 'permission-surface'
  | 'account-deletion-surface'
  | 'client-data-surface'
  | 'event-surface'
  | 'inquiry-surface'
  | 'quote-surface'
  | 'identity-table'
  | 'financial-table'
  | 'contract-table'
  | 'client-table'
  | 'event-table'
  | 'inquiry-table'
  | 'quote-table'
  | 'destructive-mutation'

export type ServerActionPrivilegeControlCode =
  | 'early-auth'
  | 'observability'
  | 'strong-confirmation'
  | 'step-up-auth'

export type ServerActionPrivilegeViolationCode =
  | 'missing-auth'
  | 'late-auth'
  | 'missing-observability'

export type ServerActionPrivilegePolicy = {
  enforcedControls: ServerActionPrivilegeControlCode[]
  futureControls: ServerActionPrivilegeControlCode[]
  level: ServerActionPrivilegeLevel
  status: ServerActionPrivilegeStatus
  triggerCodes: ServerActionPrivilegeTriggerCode[]
  violationCodes: ServerActionPrivilegeViolationCode[]
}

export type ServerActionMutationContractStatus =
  | 'compliant'
  | 'required-violations'
  | 'warnings'
  | 'exempt'

export type ServerActionMutationContractSignalStatus =
  | 'satisfied'
  | 'missing'
  | 'warning'
  | 'not-detected'
  | 'exempt'

export type ServerActionMutationContractSignalCode =
  | 'auth'
  | 'validation'
  | 'revalidation'
  | 'revalidation-import'
  | 'tenant-scope'
  | 'observability'
  | 'explicit-outcome'

export type ServerActionMutationExemptionCode = 'audit-only-table' | 'path-prefix'

export type ServerActionMutationExemption = {
  code: ServerActionMutationExemptionCode
  matchedAuditTables: string[]
  matchedPathPrefix: string | null
  reason: string
}

export type ServerActionMutationOutcomeStyle =
  | 'structured-return'
  | 'redirect'
  | 'other-return'
  | 'no-explicit-outcome'

export type ServerActionTenantScopeSignal = 'session-derived' | 'input-derived' | 'not-detected'

export type ServerActionMutationContract = {
  exemption: ServerActionMutationExemption | null
  requiredViolationCodes: ServerActionMutationContractSignalCode[]
  requirements: {
    auth: {
      classification: ServerActionAuthClassification
      guardTiming: ServerActionGuardTiming
      hasAuthGuard: boolean
      required: boolean
      status: ServerActionMutationContractSignalStatus
    }
    conflictGuard: {
      detected: boolean
      required: boolean
      status: ServerActionMutationContractSignalStatus
    }
    idempotency: {
      detected: boolean
      required: boolean
      status: ServerActionMutationContractSignalStatus
    }
    observability: {
      detected: boolean
      required: boolean
      status: ServerActionMutationContractSignalStatus
    }
    outcome: {
      required: boolean
      status: ServerActionMutationContractSignalStatus
      style: ServerActionMutationOutcomeStyle
    }
    revalidation: {
      detected: boolean
      required: boolean
      status: ServerActionMutationContractSignalStatus
    }
    revalidationImport: {
      fileHasNextCacheImport: boolean
      required: boolean
      status: ServerActionMutationContractSignalStatus
    }
    tenantScope: {
      required: boolean
      signal: ServerActionTenantScopeSignal
      status: ServerActionMutationContractSignalStatus
    }
    validation: {
      detected: boolean
      required: boolean
      status: ServerActionMutationContractSignalStatus
    }
  }
  scope: ServerActionMutationClassification
  status: ServerActionMutationContractStatus
  warningCodes: ServerActionMutationContractSignalCode[]
}

export type ServerActionMutationEntry = {
  authClassification: ServerActionAuthClassification
  classification: ServerActionMutationClassification
  contract: ServerActionMutationContract
  filePath: string
  functionId: string
  functionName: string
  guardTiming: ServerActionGuardTiming
  hasAuthGuard: boolean
  hasConflictGuard: boolean
  hasIdempotencyGuard: boolean
  hasObservability: boolean
  hasPublicComment: boolean
  hasRevalidation: boolean
  hasStructuredReturn: boolean
  hasValidation: boolean
  line: number
  mutationKinds: ServerActionMutationKind[]
  outcomeStyle: ServerActionMutationOutcomeStyle
  privilegedPolicy: ServerActionPrivilegePolicy
  relativeFilePath: string
  root: ServerActionDiscoveryRoot
  tableReferences: string[]
  tenantScopeSignal: ServerActionTenantScopeSignal
}

export type ServerActionMutationFileSummary = {
  filePath: string
  hasPageFacingMutations: boolean
  hasRevalidationImport: boolean
  missingRevalidationImportForPageFacingMutations: boolean
  mutationFunctions: number
  pageFacingMutationFunctions: number
  relativeFilePath: string
  root: ServerActionDiscoveryRoot
}

export type ServerActionMutationRootSummary = {
  auditOnlyMutations: number
  conflictGuardedMutations: number
  contractCompliantPageFacingMutations: number
  contractRequiredViolationMutations: number
  contractWarningPageFacingMutations: number
  filesWithMutations: number
  idempotencyGuardedMutations: number
  inputTenantMutations: number
  missingAuth: number
  missingExplicitOutcome: number
  missingObservability: number
  missingRevalidation: number
  missingValidation: number
  mutationFunctions: number
  observabilityInstrumented: number
  pageFacingMutations: number
  pathExemptMutations: number
  redirectOutcomeMutations: number
  sessionTenantMutations: number
  structuredReturnMutations: number
}

export type ServerActionMutationInventory = {
  auditOnlyMutationFunctionCount: number
  conflictGuardedFunctionCount: number
  contractCompliantFunctionCount: number
  contractCompliantFunctionIds: string[]
  contractRequiredViolationFunctionCount: number
  contractRequiredViolationFunctionIds: string[]
  contractWarningFunctionCount: number
  contractWarningFunctionIds: string[]
  entries: ServerActionMutationEntry[]
  fileSummaries: ServerActionMutationFileSummary[]
  filesWithPageFacingMutations: string[]
  filesWithoutRevalidationImport: string[]
  idempotencyGuardedFunctionCount: number
  inputTenantMutationFunctionCount: number
  inputTenantMutationFunctionIds: string[]
  missingAuthFunctionCount: number
  missingAuthFunctionIds: string[]
  missingExplicitOutcomeFunctionCount: number
  missingExplicitOutcomeFunctionIds: string[]
  missingObservabilityFunctionCount: number
  missingObservabilityFunctionIds: string[]
  missingRevalidationFunctionCount: number
  missingRevalidationFunctionIds: string[]
  missingRevalidationImportFileCount: number
  missingValidationFunctionCount: number
  missingValidationFunctionIds: string[]
  observabilityInstrumentedFunctionCount: number
  pageFacingMutationFunctionCount: number
  pageFacingMutationFunctionIds: string[]
  pathExemptMutationFunctionCount: number
  privilegedMutationFunctionCount: number
  privilegedMutationFunctionIds: string[]
  privilegedPolicyViolationFunctionCount: number
  privilegedPolicyViolationFunctionIds: string[]
  redirectOutcomeFunctionCount: number
  rootSummary: Record<ServerActionDiscoveryRoot, ServerActionMutationRootSummary>
  rootsScanned: ServerActionDiscoveryRoot[]
  sensitiveMutationFunctionCount: number
  sensitiveMutationFunctionIds: string[]
  sessionTenantMutationFunctionCount: number
  sessionTenantMutationFunctionIds: string[]
  criticalMutationFunctionCount: number
  criticalMutationFunctionIds: string[]
  structuredReturnFunctionCount: number
  totalFilesScanned: number
  totalMutationFunctions: number
}

export type BuildServerActionAuthInventoryOptions = {
  earlyGuardLineWindow?: number
  includeRoots?: ServerActionDiscoveryRoot[]
  lateGuardLineWindow?: number
  rootDir?: string
}

export type BuildServerActionMutationInventoryOptions = BuildServerActionAuthInventoryOptions

export const SERVER_ACTION_ROOTS: ServerActionDiscoveryRoot[] = ['lib', 'app']

export const SERVER_ACTION_AUTH_GUARD_TOKENS = [
  'requireChef',
  'requireClient',
  'requireAdmin',
  'requireAuth',
  'requirePartner',
  'requireStaff',
  'requireRole',
  'requireUser',
  'requireSession',
  'requirePermission',
  'requirePro',
  'getServerSession',
  'withApiAuth',
  'withApiGuard',
  'auth(',
  'assertPosRoleAccess',
] as const

export const SERVER_ACTION_PUBLIC_FILE_ALLOWLIST = [
  'lib/auth/actions.ts',
  'lib/auth/client-actions.ts',
  'lib/hub/profile-actions.ts',
  'lib/hub/group-actions.ts',
  'lib/email/unsubscribe-actions.ts',
  'lib/email/actions.ts',
  'lib/clients/public-actions.ts',
  'lib/reviews/public-actions.ts',
] as const

export const SERVER_ACTION_PUBLIC_COMMENT_PATTERNS = [
  /\/\/\s*public:/i,
  /\/\/\s*no auth/i,
  /\/\/\s*unauthenticated/i,
  /\/\/\s*anonymous/i,
  /\/\*\s*public/i,
] as const

export const SERVER_ACTION_MUTATION_AUDIT_TABLE_NAMES = [
  'activity_log',
  'chef_activity_log',
  'audit_log',
  'system_log',
  'error_log',
  'email_log',
  'notification_log',
  'sms_log',
  'webhook_log',
  'permission_audit_log',
  'remy_action_audit_log',
] as const

export const SERVER_ACTION_MUTATION_EXEMPT_PATH_PREFIXES = [
  'lib/cron/',
  'lib/webhooks/',
  'lib/stripe/',
  'lib/monitoring/',
  'lib/openclaw/',
  'lib/simulation/',
  'lib/gmail/',
  'lib/sms/',
  'lib/incidents/',
  'lib/automations/',
  'lib/loyalty/triggers.ts',
  'lib/loyalty/award-internal',
  'lib/integrations/',
  'lib/daily-ops/',
  'lib/ai/scheduled/',
  'lib/ai/queue/',
  'lib/ai/reactive/',
  'lib/ai/ollama-cache',
  'lib/ai/remy-metrics',
  'lib/ai/remy-guardrails',
  'lib/ai/remy-abuse',
  'lib/ai/remy-action-audit',
  'lib/ai/remy-feedback',
  'lib/ai/remy-memory',
  'lib/ai/remy-proactive',
  'lib/ai/remy-personality',
  'lib/ai/remy-conversation',
  'lib/ai/remy-artifact',
  'lib/ai/remy-approval-policy',
  'lib/ai/command-orchestrator',
  'lib/ai/campaign-outreach',
  'lib/ai/privacy-actions',
  'lib/ai/support-share',
  'lib/chat/system-messages',
  'lib/documents/activity-logging',
  'lib/documents/auto-organize',
  'lib/discover/outreach',
  'lib/hub/circle-digest',
  'lib/hub/circle-first-notify',
  'lib/hub/circle-lifecycle',
  'lib/hub/circle-notification',
  'lib/hub/email-to-circle',
  'lib/hub/inquiry-circle-first',
  'lib/hub/hub-push-subscriptions',
  'lib/hub/pre-event-briefing',
  'lib/hub/integration-actions',
  'lib/inquiries/platform-cpl',
  'lib/versioning/snapshot',
  'lib/push/subscriptions',
  'lib/front-of-house/',
  'lib/google/auth',
  'lib/beta/actions',
  'lib/migration/',
  'lib/vendors/price-point',
  'lib/zapier/',
  'lib/contact/actions',
  'lib/cancellation/',
  'lib/campaigns/',
  'lib/calling/',
  'lib/guest-leads/',
  'lib/guest-messages/',
  'lib/guest-photos/',
  'lib/social/',
  'lib/proposals/view-tracking',
  'lib/chefs/streaks',
  'lib/marketplace/',
] as const

const SERVER_ACTION_PRIVILEGED_CRITICAL_PATH_GROUPS = [
  { code: 'admin-surface' as const, prefixes: ['lib/admin/'] },
  {
    code: 'finance-surface' as const,
    prefixes: ['lib/finance/', 'lib/ledger/', 'lib/billing/', 'lib/api/key-actions.ts'],
  },
  { code: 'contract-surface' as const, prefixes: ['lib/contracts/'] },
  { code: 'staff-surface' as const, prefixes: ['lib/staff/'] },
  {
    code: 'permission-surface' as const,
    prefixes: ['lib/auth/permission-actions.ts', 'lib/auth/admin-preview-actions.ts'],
  },
  {
    code: 'account-deletion-surface' as const,
    prefixes: [
      'lib/clients/account-deletion-actions.ts',
      'lib/compliance/account-deletion-actions.ts',
    ],
  },
] as const

const SERVER_ACTION_PRIVILEGED_SENSITIVE_PATH_GROUPS = [
  { code: 'client-data-surface' as const, prefixes: ['lib/clients/'] },
  { code: 'event-surface' as const, prefixes: ['lib/events/'] },
  { code: 'inquiry-surface' as const, prefixes: ['lib/inquiries/'] },
  { code: 'quote-surface' as const, prefixes: ['lib/quotes/'] },
] as const

const SERVER_ACTION_PRIVILEGED_IDENTITY_TABLES = [
  'platform_admins',
  'user_roles',
  'api_keys',
] as const

const SERVER_ACTION_PRIVILEGED_FINANCIAL_TABLES = [
  'ledger_entries',
  'invoices',
  'invoice_payments',
  'expenses',
  'payment_installments',
] as const

const SERVER_ACTION_PRIVILEGED_CONTRACT_TABLES = ['event_contracts', 'contracts'] as const

const SERVER_ACTION_PRIVILEGED_CLIENT_TABLES = ['clients'] as const

const SERVER_ACTION_PRIVILEGED_EVENT_TABLES = ['events', 'event_state_transitions'] as const

const SERVER_ACTION_PRIVILEGED_INQUIRY_TABLES = ['inquiries', 'guest_count_changes'] as const

const SERVER_ACTION_PRIVILEGED_QUOTE_TABLES = ['quotes', 'quote_versions'] as const

const EXPORTED_ASYNC_ARROW_FUNCTION_PATTERN =
  /export\s+const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*(?::[^{=]+)?=>\s*\{/g
const SERVER_ACTION_MUTATION_PATTERNS = [
  { kind: 'insert' as const, pattern: /\.insert\s*\(/ },
  { kind: 'update' as const, pattern: /\.update\s*\(/ },
  { kind: 'delete' as const, pattern: /\.delete\s*\(/ },
  { kind: 'raw-sql' as const, pattern: /\bINSERT\s+INTO\b/i },
  { kind: 'raw-sql' as const, pattern: /\bUPDATE\s+[A-Z0-9_"`.[\]]+/i },
  { kind: 'raw-sql' as const, pattern: /\bDELETE\s+FROM\b/i },
] as const
const SERVER_ACTION_VALIDATION_PATTERNS = [
  /\.parse\s*\(/,
  /\.safeParse\s*\(/,
  /\bvalidated\b/,
  /\bvalidation\b/i,
  /\bassert[A-Z]\w*\s*\(/,
] as const
const SERVER_ACTION_CONFLICT_PATTERNS = [
  /\bcreateConflictError\s*\(/,
  /\bexpected_updated_at\b/,
  /\bexpectedUpdatedAt\b/,
  /\.eq\(\s*['"]updated_at['"]/,
  /\.eq\(\s*['"]status['"]/,
  /\bp_from_status\b/,
  /\btransition_[a-z_]+_atomic\b/,
] as const
const SERVER_ACTION_IDEMPOTENCY_PATTERNS = [
  /\bexecuteWithIdempotency\s*\(/,
  /\bidempotencyKey\b/,
  /\bidempotency_key\b/,
  /\bmutation_idempotency\b/,
  /\btransaction_reference\b/,
] as const
const SERVER_ACTION_OBSERVABILITY_PATTERNS = [
  /\brecordPlatformEvent\s*\(/,
  /\bbuildPlatformObservabilityMetadata\s*\(/,
  /\bextractRequestMetadata\s*\(/,
] as const
const SERVER_ACTION_STRUCTURED_RETURN_PATTERN = /\breturn\s+\{/
const SERVER_ACTION_ANY_RETURN_PATTERN = /\breturn\b/
const SERVER_ACTION_REDIRECT_PATTERN = /\bredirect\s*\(/
const SERVER_ACTION_REVALIDATION_PATTERN = /\brevalidate(?:Path|Tag)\s*\(/
const SERVER_ACTION_NEXT_CACHE_IMPORT_PATTERN = /from\s+['"]next\/cache['"]/
const SERVER_ACTION_INPUT_TENANT_PATTERNS = [
  /(?:input|data|body|payload|params)\s*(?:\?\.|\.|\[\s*['"])\s*tenant_id\b/,
  /(?:input|data|body|payload|params)\s*(?:\?\.|\.|\[\s*['"])\s*tenantId\b/,
] as const
const SERVER_ACTION_SESSION_TENANT_PATTERNS = [
  /\buser\.tenantId\b/,
  /\buser\.entityId\b/,
  /\btenant_id\s*:\s*user\./,
  /\btenantId\s*:\s*user\./,
] as const
const SERVER_ACTION_TABLE_REFERENCE_PATTERNS = [
  /\.from\(\s*['"`]([\w.]+)['"`]\s*\)/g,
  /\bINSERT\s+INTO\s+['"`]?([\w.]+)['"`]?/gi,
  /\bUPDATE\s+['"`]?([\w.]+)['"`]?/gi,
  /\bDELETE\s+FROM\s+['"`]?([\w.]+)['"`]?/gi,
] as const

const DEFAULT_EARLY_GUARD_LINE_WINDOW = 10
const DEFAULT_LATE_GUARD_LINE_WINDOW = 30
const MODULE_USE_SERVER_PATTERN = /^['"]use server['"]/m
const EXPORTED_ASYNC_FUNCTION_PATTERN = /export\s+async\s+function\s+(\w+)\s*\(/g
const GENERIC_REQUIRE_GUARD_PATTERN = /\brequire[A-Z]\w*\(/

type DiscoveredServerActionFile = {
  filePath: string
  root: ServerActionDiscoveryRoot
  source: string
}

type ExtractedServerAction = {
  body: string
  endIndex: number
  functionName: string
  line: number
  startIndex: number
}

function createEmptyRootSummary(): ServerActionRootSummary {
  return {
    authGuarded: 0,
    documentedPublic: 0,
    fileExempt: 0,
    files: 0,
    functions: 0,
    lateAuth: 0,
    missingAuth: 0,
  }
}

function createEmptyMutationRootSummary(): ServerActionMutationRootSummary {
  return {
    auditOnlyMutations: 0,
    conflictGuardedMutations: 0,
    contractCompliantPageFacingMutations: 0,
    contractRequiredViolationMutations: 0,
    contractWarningPageFacingMutations: 0,
    filesWithMutations: 0,
    idempotencyGuardedMutations: 0,
    inputTenantMutations: 0,
    missingAuth: 0,
    missingExplicitOutcome: 0,
    missingObservability: 0,
    missingRevalidation: 0,
    missingValidation: 0,
    mutationFunctions: 0,
    observabilityInstrumented: 0,
    pageFacingMutations: 0,
    pathExemptMutations: 0,
    redirectOutcomeMutations: 0,
    sessionTenantMutations: 0,
    structuredReturnMutations: 0,
  }
}

function normalizeRelativeFilePath(rootDir: string, filePath: string) {
  return relative(resolve(rootDir), filePath).replace(/\\/g, '/')
}

function normalizeRoots(input?: ServerActionDiscoveryRoot[]) {
  if (!input || input.length === 0) {
    return [...SERVER_ACTION_ROOTS]
  }

  return [...new Set(input)].filter((root): root is ServerActionDiscoveryRoot =>
    SERVER_ACTION_ROOTS.includes(root)
  )
}

function walkCandidateFiles(
  dir: string,
  root: ServerActionDiscoveryRoot,
  results: DiscoveredServerActionFile[]
) {
  if (!existsSync(dir)) return

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') {
      continue
    }

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      walkCandidateFiles(fullPath, root, results)
      continue
    }

    const isSupportedFile =
      (root === 'lib' && entry.name.endsWith('.ts')) ||
      (root === 'app' && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')))

    if (!isSupportedFile) continue

    const source = readFileSync(fullPath, 'utf8')
    if (!hasModuleUseServerDirective(source)) continue

    results.push({
      filePath: fullPath,
      root,
      source,
    })
  }
}

export function hasModuleUseServerDirective(source: string): boolean {
  return MODULE_USE_SERVER_PATTERN.test(source.slice(0, 500))
}

export function discoverServerActionFiles(
  rootDir = process.cwd(),
  includeRoots?: ServerActionDiscoveryRoot[]
): string[] {
  return discoverServerActionFileDescriptors(rootDir, includeRoots).map((entry) => entry.filePath)
}

function discoverServerActionFileDescriptors(
  rootDir = process.cwd(),
  includeRoots?: ServerActionDiscoveryRoot[]
): DiscoveredServerActionFile[] {
  const descriptors: DiscoveredServerActionFile[] = []

  for (const root of normalizeRoots(includeRoots)) {
    walkCandidateFiles(resolve(rootDir, root), root, descriptors)
  }

  return descriptors.sort((left, right) => left.filePath.localeCompare(right.filePath))
}

function findFunctionBodyStart(source: string, startIndex: number) {
  let cursor = source.indexOf('(', startIndex)
  if (cursor === -1) return -1

  let angleDepth = 0
  let braceDepth = 0
  let bracketDepth = 0
  let parenDepth = 0
  let inReturnType = false
  let seenParameterList = false
  let previousNonWhitespace = ''

  for (; cursor < source.length; cursor += 1) {
    const char = source[cursor]
    const nextChar = source[cursor + 1] ?? ''

    if (char === '(') {
      parenDepth += 1
      previousNonWhitespace = char
      continue
    }

    if (char === ')') {
      if (parenDepth > 0) parenDepth -= 1
      if (parenDepth === 0) seenParameterList = true
      previousNonWhitespace = char
      continue
    }

    if (!seenParameterList) {
      if (char.trim()) previousNonWhitespace = char
      continue
    }

    if (
      char === ':' &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0 &&
      angleDepth === 0
    ) {
      inReturnType = true
      previousNonWhitespace = char
      continue
    }

    if (
      char === '=' &&
      nextChar === '>' &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0 &&
      angleDepth === 0
    ) {
      inReturnType = false
      cursor += 1
      previousNonWhitespace = '>'
      continue
    }

    if (char === '<') {
      angleDepth += 1
      previousNonWhitespace = char
      continue
    }

    if (char === '>') {
      if (angleDepth > 0) angleDepth -= 1
      previousNonWhitespace = char
      continue
    }

    if (char === '[') {
      bracketDepth += 1
      previousNonWhitespace = char
      continue
    }

    if (char === ']') {
      if (bracketDepth > 0) bracketDepth -= 1
      previousNonWhitespace = char
      continue
    }

    if (char === '{') {
      const atTopLevel =
        parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && angleDepth === 0
      const startsTypeLiteral =
        inReturnType && [':', '|', '&', '<', ',', '('].includes(previousNonWhitespace)

      if (atTopLevel && !startsTypeLiteral) {
        return cursor
      }

      braceDepth += 1
      previousNonWhitespace = char
      continue
    }

    if (char === '}') {
      if (braceDepth > 0) braceDepth -= 1
      previousNonWhitespace = char
      continue
    }

    if (char.trim()) {
      previousNonWhitespace = char
    }
  }

  return -1
}

function findFunctionBlock(source: string, startIndex: number) {
  const braceStart = findFunctionBodyStart(source, startIndex)
  if (braceStart === -1) return null

  let depth = 1

  for (let cursor = braceStart + 1; cursor < source.length; cursor += 1) {
    const char = source[cursor]
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) {
      return {
        body: source.slice(braceStart + 1, cursor),
        endIndex: cursor,
      }
    }
  }

  return null
}

function extractExportedServerActions(source: string): ExtractedServerAction[] {
  const actions: ExtractedServerAction[] = []
  const seenActionIds = new Set<string>()

  for (const pattern of [
    EXPORTED_ASYNC_FUNCTION_PATTERN,
    EXPORTED_ASYNC_ARROW_FUNCTION_PATTERN,
  ] as const) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      const startIndex = match.index
      if (startIndex == null) continue
      const block = findFunctionBlock(source, startIndex)
      if (!block) continue
      const actionId = `${startIndex}:${match[1]}`
      if (seenActionIds.has(actionId)) continue
      seenActionIds.add(actionId)

      actions.push({
        body: block.body,
        endIndex: block.endIndex,
        functionName: match[1],
        line: source.slice(0, startIndex).split('\n').length,
        startIndex,
      })
    }
  }

  return actions.sort((left, right) => {
    if (left.startIndex !== right.startIndex) {
      return left.startIndex - right.startIndex
    }
    return left.functionName.localeCompare(right.functionName)
  })
}

function getFunctionHead(source: string, startIndex: number, lines: number): string {
  const braceStart = findFunctionBodyStart(source, startIndex)
  if (braceStart === -1) return ''

  let newlineCount = 0
  let cursor = braceStart + 1

  while (cursor < source.length && newlineCount < lines) {
    if (source[cursor] === '\n') newlineCount += 1
    cursor += 1
  }

  return source.slice(braceStart + 1, cursor)
}

function hasAuthGuardInHead(head: string): boolean {
  return (
    SERVER_ACTION_AUTH_GUARD_TOKENS.some((token) => head.includes(token)) ||
    GENERIC_REQUIRE_GUARD_PATTERN.test(head)
  )
}

function hasPublicDocumentation(contextBefore: string): boolean {
  return SERVER_ACTION_PUBLIC_COMMENT_PATTERNS.some((pattern) => pattern.test(contextBefore))
}

function hasPatternMatch(source: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(source))
}

function collectMutationKinds(source: string): ServerActionMutationKind[] {
  const kinds = new Set<ServerActionMutationKind>()

  for (const { kind, pattern } of SERVER_ACTION_MUTATION_PATTERNS) {
    if (pattern.test(source)) {
      kinds.add(kind)
    }
  }

  return [...kinds]
}

function normalizeTableName(tableName: string) {
  return tableName.split('.').at(-1)?.toLowerCase() ?? tableName.toLowerCase()
}

function collectTableReferences(source: string): string[] {
  const tableNames = new Set<string>()

  for (const pattern of SERVER_ACTION_TABLE_REFERENCE_PATTERNS) {
    pattern.lastIndex = 0

    for (const match of source.matchAll(pattern)) {
      const tableName = match[1]?.trim()
      if (!tableName) continue
      tableNames.add(normalizeTableName(tableName))
    }
  }

  return [...tableNames]
}

function findMatchedAuditTables(tableReferences: string[]) {
  const matchedTables = new Set<string>()

  for (const tableName of tableReferences) {
    const matchedAuditTable = SERVER_ACTION_MUTATION_AUDIT_TABLE_NAMES.find((auditTable) =>
      tableName.includes(auditTable.toLowerCase())
    )
    if (matchedAuditTable) {
      matchedTables.add(matchedAuditTable.toLowerCase())
    }
  }

  return [...matchedTables].sort((left, right) => left.localeCompare(right))
}

function findMutationExemptPathPrefix(relativeFilePath: string) {
  return SERVER_ACTION_MUTATION_EXEMPT_PATH_PREFIXES.find((prefix) =>
    relativeFilePath.startsWith(prefix)
  )
}

function resolveMutationExemption(
  relativeFilePath: string,
  tableReferences: string[]
): ServerActionMutationExemption | null {
  if (
    tableReferences.length > 0 &&
    tableReferences.every((tableName) =>
      SERVER_ACTION_MUTATION_AUDIT_TABLE_NAMES.some((auditTable) =>
        tableName.includes(auditTable.toLowerCase())
      )
    )
  ) {
    return {
      code: 'audit-only-table',
      matchedAuditTables: findMatchedAuditTables(tableReferences),
      matchedPathPrefix: null,
      reason:
        'mutation writes only to audit or log tables and is exempt from page-facing enforcement',
    }
  }

  const matchedPathPrefix = findMutationExemptPathPrefix(relativeFilePath)
  if (matchedPathPrefix) {
    return {
      code: 'path-prefix',
      matchedAuditTables: [],
      matchedPathPrefix,
      reason: 'mutation lives under a background, integration, or otherwise non-page-facing path',
    }
  }

  return null
}

function classifyServerActionMutation(
  relativeFilePath: string,
  tableReferences: string[]
): {
  classification: ServerActionMutationClassification
  exemption: ServerActionMutationExemption | null
} {
  const exemption = resolveMutationExemption(relativeFilePath, tableReferences)
  if (!exemption) {
    return {
      classification: 'page-facing',
      exemption: null,
    }
  }

  return {
    classification: exemption.code === 'audit-only-table' ? 'audit-only' : 'path-exempt',
    exemption,
  }
}

function detectTenantScopeSignal(source: string): ServerActionTenantScopeSignal {
  if (hasPatternMatch(source, SERVER_ACTION_INPUT_TENANT_PATTERNS)) {
    return 'input-derived'
  }
  if (hasPatternMatch(source, SERVER_ACTION_SESSION_TENANT_PATTERNS)) {
    return 'session-derived'
  }
  return 'not-detected'
}

function detectOutcomeStyle(source: string): ServerActionMutationOutcomeStyle {
  if (SERVER_ACTION_REDIRECT_PATTERN.test(source)) return 'redirect'
  if (SERVER_ACTION_STRUCTURED_RETURN_PATTERN.test(source)) return 'structured-return'
  if (SERVER_ACTION_ANY_RETURN_PATTERN.test(source)) return 'other-return'
  return 'no-explicit-outcome'
}

function matchesAnyPathPrefix(relativeFilePath: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => relativeFilePath.startsWith(prefix))
}

function findPrivilegeTableMatches(tableReferences: string[], tables: readonly string[]) {
  return tableReferences.filter((tableReference) =>
    tables.some((candidate) => tableReference.includes(candidate))
  )
}

function buildServerActionPrivilegePolicy(input: {
  authClassification: ServerActionAuthClassification
  classification: ServerActionMutationClassification
  guardTiming: ServerActionGuardTiming
  hasObservability: boolean
  mutationKinds: ServerActionMutationKind[]
  relativeFilePath: string
  tableReferences: string[]
}): ServerActionPrivilegePolicy {
  if (input.classification !== 'page-facing') {
    return {
      enforcedControls: [],
      futureControls: [],
      level: 'standard',
      status: 'exempt',
      triggerCodes: [],
      violationCodes: [],
    }
  }

  const triggerCodes = new Set<ServerActionPrivilegeTriggerCode>()
  let level: ServerActionPrivilegeLevel = 'standard'

  const escalateToSensitive = (code: ServerActionPrivilegeTriggerCode) => {
    triggerCodes.add(code)
    if (level === 'standard') level = 'sensitive'
  }

  const escalateToCritical = (code: ServerActionPrivilegeTriggerCode) => {
    triggerCodes.add(code)
    level = 'critical'
  }

  for (const group of SERVER_ACTION_PRIVILEGED_CRITICAL_PATH_GROUPS) {
    if (matchesAnyPathPrefix(input.relativeFilePath, group.prefixes)) {
      escalateToCritical(group.code)
    }
  }

  for (const group of SERVER_ACTION_PRIVILEGED_SENSITIVE_PATH_GROUPS) {
    if (matchesAnyPathPrefix(input.relativeFilePath, group.prefixes)) {
      escalateToSensitive(group.code)
    }
  }

  if (
    findPrivilegeTableMatches(input.tableReferences, SERVER_ACTION_PRIVILEGED_IDENTITY_TABLES)
      .length > 0
  ) {
    escalateToCritical('identity-table')
  }
  if (
    findPrivilegeTableMatches(input.tableReferences, SERVER_ACTION_PRIVILEGED_FINANCIAL_TABLES)
      .length > 0
  ) {
    escalateToCritical('financial-table')
  }
  if (
    findPrivilegeTableMatches(input.tableReferences, SERVER_ACTION_PRIVILEGED_CONTRACT_TABLES)
      .length > 0
  ) {
    escalateToCritical('contract-table')
  }
  if (
    findPrivilegeTableMatches(input.tableReferences, SERVER_ACTION_PRIVILEGED_CLIENT_TABLES)
      .length > 0
  ) {
    escalateToSensitive('client-table')
  }
  if (
    findPrivilegeTableMatches(input.tableReferences, SERVER_ACTION_PRIVILEGED_EVENT_TABLES).length >
    0
  ) {
    escalateToSensitive('event-table')
  }
  if (
    findPrivilegeTableMatches(input.tableReferences, SERVER_ACTION_PRIVILEGED_INQUIRY_TABLES)
      .length > 0
  ) {
    escalateToSensitive('inquiry-table')
  }
  if (
    findPrivilegeTableMatches(input.tableReferences, SERVER_ACTION_PRIVILEGED_QUOTE_TABLES).length >
    0
  ) {
    escalateToSensitive('quote-table')
  }

  if (
    level !== 'standard' &&
    input.mutationKinds.some((kind) => kind === 'delete' || kind === 'raw-sql')
  ) {
    triggerCodes.add('destructive-mutation')
  }

  if (level === 'standard') {
    return {
      enforcedControls: [],
      futureControls: [],
      level,
      status: 'not-privileged',
      triggerCodes: [],
      violationCodes: [],
    }
  }

  const enforcedControls: ServerActionPrivilegeControlCode[] =
    level === 'critical' ? ['observability', 'early-auth'] : ['observability']
  const futureControls: ServerActionPrivilegeControlCode[] =
    level === 'critical' ? ['strong-confirmation', 'step-up-auth'] : ['strong-confirmation']
  const violationCodes: ServerActionPrivilegeViolationCode[] = []

  if (input.authClassification !== 'auth-guarded') {
    violationCodes.push('missing-auth')
  } else if (level === 'critical' && input.guardTiming !== 'early') {
    violationCodes.push('late-auth')
  }

  if (!input.hasObservability) {
    violationCodes.push('missing-observability')
  }

  return {
    enforcedControls,
    futureControls,
    level,
    status: violationCodes.length > 0 ? 'violations' : 'compliant',
    triggerCodes: [...triggerCodes].sort(),
    violationCodes,
  }
}

function buildServerActionMutationContract(input: {
  authClassification: ServerActionAuthClassification
  classification: ServerActionMutationClassification
  exemption: ServerActionMutationExemption | null
  guardTiming: ServerActionGuardTiming
  hasAuthGuard: boolean
  hasConflictGuard: boolean
  hasIdempotencyGuard: boolean
  hasObservability: boolean
  hasRevalidation: boolean
  hasRevalidationImport: boolean
  hasValidation: boolean
  outcomeStyle: ServerActionMutationOutcomeStyle
  tenantScopeSignal: ServerActionTenantScopeSignal
}): ServerActionMutationContract {
  if (input.classification !== 'page-facing') {
    return {
      exemption: input.exemption,
      requiredViolationCodes: [],
      requirements: {
        auth: {
          classification: input.authClassification,
          guardTiming: input.guardTiming,
          hasAuthGuard: input.hasAuthGuard,
          required: false,
          status: 'exempt',
        },
        conflictGuard: {
          detected: input.hasConflictGuard,
          required: false,
          status: 'exempt',
        },
        idempotency: {
          detected: input.hasIdempotencyGuard,
          required: false,
          status: 'exempt',
        },
        observability: {
          detected: input.hasObservability,
          required: false,
          status: 'exempt',
        },
        outcome: {
          required: false,
          status: 'exempt',
          style: input.outcomeStyle,
        },
        revalidation: {
          detected: input.hasRevalidation,
          required: false,
          status: 'exempt',
        },
        revalidationImport: {
          fileHasNextCacheImport: input.hasRevalidationImport,
          required: false,
          status: 'exempt',
        },
        tenantScope: {
          required: false,
          signal: input.tenantScopeSignal,
          status: 'exempt',
        },
        validation: {
          detected: input.hasValidation,
          required: false,
          status: 'exempt',
        },
      },
      scope: input.classification,
      status: 'exempt',
      warningCodes: [],
    }
  }

  const requiredViolationCodes: ServerActionMutationContractSignalCode[] = []
  const warningCodes: ServerActionMutationContractSignalCode[] = []
  const authStatus =
    input.authClassification === 'missing-auth' ? 'missing' : ('satisfied' as const)
  const validationStatus = input.hasValidation ? 'satisfied' : ('missing' as const)
  const revalidationStatus = input.hasRevalidation ? 'satisfied' : ('missing' as const)
  const revalidationImportStatus = input.hasRevalidationImport ? 'satisfied' : ('missing' as const)
  const tenantScopeStatus =
    input.tenantScopeSignal === 'session-derived'
      ? ('satisfied' as const)
      : input.tenantScopeSignal === 'input-derived'
        ? ('warning' as const)
        : ('not-detected' as const)
  const observabilityStatus = input.hasObservability ? 'satisfied' : ('warning' as const)
  const outcomeStatus =
    input.outcomeStyle === 'no-explicit-outcome' ? ('warning' as const) : ('satisfied' as const)

  if (authStatus === 'missing') requiredViolationCodes.push('auth')
  if (validationStatus === 'missing') requiredViolationCodes.push('validation')
  if (revalidationStatus === 'missing') requiredViolationCodes.push('revalidation')
  if (revalidationImportStatus === 'missing') requiredViolationCodes.push('revalidation-import')
  if (tenantScopeStatus === 'warning') warningCodes.push('tenant-scope')
  if (observabilityStatus === 'warning') warningCodes.push('observability')
  if (outcomeStatus === 'warning') warningCodes.push('explicit-outcome')

  return {
    exemption: null,
    requiredViolationCodes,
    requirements: {
      auth: {
        classification: input.authClassification,
        guardTiming: input.guardTiming,
        hasAuthGuard: input.hasAuthGuard,
        required: true,
        status: authStatus,
      },
      conflictGuard: {
        detected: input.hasConflictGuard,
        required: false,
        status: input.hasConflictGuard ? 'satisfied' : 'not-detected',
      },
      idempotency: {
        detected: input.hasIdempotencyGuard,
        required: false,
        status: input.hasIdempotencyGuard ? 'satisfied' : 'not-detected',
      },
      observability: {
        detected: input.hasObservability,
        required: false,
        status: observabilityStatus,
      },
      outcome: {
        required: false,
        status: outcomeStatus,
        style: input.outcomeStyle,
      },
      revalidation: {
        detected: input.hasRevalidation,
        required: true,
        status: revalidationStatus,
      },
      revalidationImport: {
        fileHasNextCacheImport: input.hasRevalidationImport,
        required: true,
        status: revalidationImportStatus,
      },
      tenantScope: {
        required: false,
        signal: input.tenantScopeSignal,
        status: tenantScopeStatus,
      },
      validation: {
        detected: input.hasValidation,
        required: true,
        status: validationStatus,
      },
    },
    scope: input.classification,
    status:
      requiredViolationCodes.length > 0
        ? 'required-violations'
        : warningCodes.length > 0
          ? 'warnings'
          : 'compliant',
    warningCodes,
  }
}

export function formatServerActionFunctionId(
  entry: Pick<ServerActionAuthEntry, 'functionName' | 'line' | 'relativeFilePath'>
) {
  return `${entry.relativeFilePath}:${entry.line} ${entry.functionName}`
}

export function buildServerActionAuthInventory(
  options?: BuildServerActionAuthInventoryOptions
): ServerActionAuthInventory {
  const rootDir = options?.rootDir ?? process.cwd()
  const earlyGuardLineWindow = options?.earlyGuardLineWindow ?? DEFAULT_EARLY_GUARD_LINE_WINDOW
  const lateGuardLineWindow = Math.max(
    options?.lateGuardLineWindow ?? DEFAULT_LATE_GUARD_LINE_WINDOW,
    earlyGuardLineWindow
  )
  const rootsScanned = normalizeRoots(options?.includeRoots)
  const entries: ServerActionAuthEntry[] = []
  const rootSummary: Record<ServerActionDiscoveryRoot, ServerActionRootSummary> = {
    lib: createEmptyRootSummary(),
    app: createEmptyRootSummary(),
  }

  for (const file of discoverServerActionFileDescriptors(rootDir, rootsScanned)) {
    const relativeFilePath = normalizeRelativeFilePath(rootDir, file.filePath)
    const extractedActions = extractExportedServerActions(file.source)
    const rootStats = rootSummary[file.root]

    rootStats.files += 1
    rootStats.functions += extractedActions.length

    for (const action of extractedActions) {
      const contextBefore = file.source.slice(
        Math.max(0, action.startIndex - 200),
        action.startIndex
      )
      const earlyHead = getFunctionHead(file.source, action.startIndex, earlyGuardLineWindow)
      const lateHead = getFunctionHead(file.source, action.startIndex, lateGuardLineWindow)
      const hasEarlyAuthGuard = hasAuthGuardInHead(earlyHead)
      const hasLateAuthGuard = hasAuthGuardInHead(lateHead)
      const hasPublicComment = hasPublicDocumentation(contextBefore)
      const isFileExempt = SERVER_ACTION_PUBLIC_FILE_ALLOWLIST.includes(
        relativeFilePath as (typeof SERVER_ACTION_PUBLIC_FILE_ALLOWLIST)[number]
      )

      let classification: ServerActionAuthClassification = 'missing-auth'
      let guardTiming: ServerActionGuardTiming = 'none'

      if (isFileExempt) {
        classification = 'file-exempt'
        rootStats.fileExempt += 1
      } else if (hasPublicComment) {
        classification = 'documented-public'
        rootStats.documentedPublic += 1
      } else if (hasEarlyAuthGuard) {
        classification = 'auth-guarded'
        guardTiming = 'early'
        rootStats.authGuarded += 1
      } else if (hasLateAuthGuard) {
        classification = 'auth-guarded'
        guardTiming = 'late'
        rootStats.authGuarded += 1
        rootStats.lateAuth += 1
      } else {
        rootStats.missingAuth += 1
      }

      entries.push({
        classification,
        filePath: file.filePath,
        functionName: action.functionName,
        guardTiming,
        hasAuthGuard: hasLateAuthGuard,
        hasPublicComment,
        line: action.line,
        relativeFilePath,
        root: file.root,
      })
    }
  }

  entries.sort((left, right) => {
    if (left.relativeFilePath !== right.relativeFilePath) {
      return left.relativeFilePath.localeCompare(right.relativeFilePath)
    }
    if (left.line !== right.line) return left.line - right.line
    return left.functionName.localeCompare(right.functionName)
  })

  const authGuardedFunctionCount = entries.filter(
    (entry) => entry.classification === 'auth-guarded'
  ).length
  const documentedPublicFunctionCount = entries.filter(
    (entry) => entry.classification === 'documented-public'
  ).length
  const fileExemptFunctionCount = entries.filter(
    (entry) => entry.classification === 'file-exempt'
  ).length
  const lateAuthEntries = entries.filter((entry) => entry.guardTiming === 'late')
  const missingAuthEntries = entries.filter((entry) => entry.classification === 'missing-auth')

  return {
    authGuardedFunctionCount,
    documentedPublicFunctionCount,
    earlyAuthFunctionCount: authGuardedFunctionCount - lateAuthEntries.length,
    entries,
    fileExemptFunctionCount,
    lateAuthFunctionCount: lateAuthEntries.length,
    lateAuthFunctionIds: lateAuthEntries.map(formatServerActionFunctionId),
    missingAuthFunctionCount: missingAuthEntries.length,
    missingAuthFunctionIds: missingAuthEntries.map(formatServerActionFunctionId),
    rootSummary,
    rootsScanned,
    totalFiles: rootsScanned.reduce((count, root) => count + rootSummary[root].files, 0),
    totalFunctions: entries.length,
  }
}

export function buildServerActionMutationInventory(
  options?: BuildServerActionMutationInventoryOptions
): ServerActionMutationInventory {
  const rootDir = options?.rootDir ?? process.cwd()
  const rootsScanned = normalizeRoots(options?.includeRoots)
  const authInventory = buildServerActionAuthInventory(options)
  const authEntriesById = new Map(
    authInventory.entries.map((entry) => [formatServerActionFunctionId(entry), entry])
  )
  const entries: ServerActionMutationEntry[] = []
  const fileSummaries: ServerActionMutationFileSummary[] = []
  const filesWithPageFacingMutations = new Set<string>()
  const rootSummary: Record<ServerActionDiscoveryRoot, ServerActionMutationRootSummary> = {
    lib: createEmptyMutationRootSummary(),
    app: createEmptyMutationRootSummary(),
  }

  for (const file of discoverServerActionFileDescriptors(rootDir, rootsScanned)) {
    const relativeFilePath = normalizeRelativeFilePath(rootDir, file.filePath)
    const extractedActions = extractExportedServerActions(file.source)
    const hasRevalidationImport = SERVER_ACTION_NEXT_CACHE_IMPORT_PATTERN.test(file.source)
    const fileEntries: ServerActionMutationEntry[] = []

    for (const action of extractedActions) {
      const functionSource = file.source.slice(action.startIndex, action.endIndex + 1)
      const mutationKinds = collectMutationKinds(functionSource)
      if (mutationKinds.length === 0) continue

      const authEntry = authEntriesById.get(
        formatServerActionFunctionId({
          functionName: action.functionName,
          line: action.line,
          relativeFilePath,
        })
      )
      const tableReferences = collectTableReferences(functionSource)
      const { classification, exemption } = classifyServerActionMutation(
        relativeFilePath,
        tableReferences
      )
      const tenantScopeSignal = detectTenantScopeSignal(functionSource)
      const outcomeStyle = detectOutcomeStyle(functionSource)
      const hasValidation = hasPatternMatch(functionSource, SERVER_ACTION_VALIDATION_PATTERNS)
      const hasConflictGuard = hasPatternMatch(functionSource, SERVER_ACTION_CONFLICT_PATTERNS)
      const hasIdempotencyGuard = hasPatternMatch(
        functionSource,
        SERVER_ACTION_IDEMPOTENCY_PATTERNS
      )
      const hasObservability = hasPatternMatch(functionSource, SERVER_ACTION_OBSERVABILITY_PATTERNS)
      const hasRevalidation = SERVER_ACTION_REVALIDATION_PATTERN.test(functionSource)
      const hasStructuredReturn = SERVER_ACTION_STRUCTURED_RETURN_PATTERN.test(functionSource)
      const privilegedPolicy = buildServerActionPrivilegePolicy({
        authClassification: authEntry?.classification ?? 'missing-auth',
        classification,
        guardTiming: authEntry?.guardTiming ?? 'none',
        hasObservability,
        mutationKinds,
        relativeFilePath,
        tableReferences,
      })
      const contract = buildServerActionMutationContract({
        authClassification: authEntry?.classification ?? 'missing-auth',
        classification,
        exemption,
        guardTiming: authEntry?.guardTiming ?? 'none',
        hasAuthGuard: authEntry?.hasAuthGuard ?? false,
        hasConflictGuard,
        hasIdempotencyGuard,
        hasObservability,
        hasRevalidation,
        hasRevalidationImport,
        hasValidation,
        outcomeStyle,
        tenantScopeSignal,
      })
      const entry: ServerActionMutationEntry = {
        authClassification: authEntry?.classification ?? 'missing-auth',
        classification,
        contract,
        filePath: file.filePath,
        functionId: formatServerActionFunctionId({
          functionName: action.functionName,
          line: action.line,
          relativeFilePath,
        }),
        functionName: action.functionName,
        guardTiming: authEntry?.guardTiming ?? 'none',
        hasAuthGuard: authEntry?.hasAuthGuard ?? false,
        hasConflictGuard,
        hasIdempotencyGuard,
        hasObservability,
        hasPublicComment: authEntry?.hasPublicComment ?? false,
        hasRevalidation,
        hasStructuredReturn,
        hasValidation,
        line: action.line,
        mutationKinds,
        outcomeStyle,
        privilegedPolicy,
        relativeFilePath,
        root: file.root,
        tableReferences,
        tenantScopeSignal,
      }

      fileEntries.push(entry)
      entries.push(entry)

      const rootStats = rootSummary[file.root]
      rootStats.mutationFunctions += 1

      if (classification === 'audit-only') {
        rootStats.auditOnlyMutations += 1
        continue
      }

      if (classification === 'path-exempt') {
        rootStats.pathExemptMutations += 1
        continue
      }

      rootStats.pageFacingMutations += 1
      if (entry.contract.status === 'compliant') {
        rootStats.contractCompliantPageFacingMutations += 1
      } else if (entry.contract.status === 'warnings') {
        rootStats.contractWarningPageFacingMutations += 1
      } else if (entry.contract.status === 'required-violations') {
        rootStats.contractRequiredViolationMutations += 1
      }
      if (entry.authClassification === 'missing-auth') rootStats.missingAuth += 1
      if (!entry.hasValidation) rootStats.missingValidation += 1
      if (!entry.hasRevalidation) rootStats.missingRevalidation += 1
      if (entry.hasConflictGuard) rootStats.conflictGuardedMutations += 1
      if (entry.hasIdempotencyGuard) rootStats.idempotencyGuardedMutations += 1
      if (entry.hasObservability) rootStats.observabilityInstrumented += 1
      if (entry.contract.warningCodes.includes('observability')) rootStats.missingObservability += 1
      if (entry.contract.warningCodes.includes('explicit-outcome')) {
        rootStats.missingExplicitOutcome += 1
      }
      if (entry.tenantScopeSignal === 'session-derived') rootStats.sessionTenantMutations += 1
      if (entry.tenantScopeSignal === 'input-derived') rootStats.inputTenantMutations += 1
      if (entry.outcomeStyle === 'redirect') rootStats.redirectOutcomeMutations += 1
      if (entry.hasStructuredReturn) rootStats.structuredReturnMutations += 1
    }

    if (fileEntries.length === 0) continue

    const pageFacingMutationFunctions = fileEntries.filter(
      (entry) => entry.classification === 'page-facing'
    ).length
    const fileSummary: ServerActionMutationFileSummary = {
      filePath: file.filePath,
      hasPageFacingMutations: pageFacingMutationFunctions > 0,
      hasRevalidationImport,
      missingRevalidationImportForPageFacingMutations:
        pageFacingMutationFunctions > 0 && !hasRevalidationImport,
      mutationFunctions: fileEntries.length,
      pageFacingMutationFunctions,
      relativeFilePath,
      root: file.root,
    }

    fileSummaries.push(fileSummary)
    rootSummary[file.root].filesWithMutations += 1

    if (fileSummary.hasPageFacingMutations) {
      filesWithPageFacingMutations.add(relativeFilePath)
    }
  }

  entries.sort((left, right) => {
    if (left.relativeFilePath !== right.relativeFilePath) {
      return left.relativeFilePath.localeCompare(right.relativeFilePath)
    }
    if (left.line !== right.line) return left.line - right.line
    return left.functionName.localeCompare(right.functionName)
  })
  fileSummaries.sort((left, right) => left.relativeFilePath.localeCompare(right.relativeFilePath))

  const pageFacingEntries = entries.filter((entry) => entry.classification === 'page-facing')
  const auditOnlyEntries = entries.filter((entry) => entry.classification === 'audit-only')
  const pathExemptEntries = entries.filter((entry) => entry.classification === 'path-exempt')
  const missingAuthEntries = pageFacingEntries.filter(
    (entry) => entry.authClassification === 'missing-auth'
  )
  const contractCompliantEntries = pageFacingEntries.filter(
    (entry) => entry.contract.status === 'compliant'
  )
  const contractWarningEntries = pageFacingEntries.filter(
    (entry) => entry.contract.status === 'warnings'
  )
  const contractRequiredViolationEntries = pageFacingEntries.filter(
    (entry) => entry.contract.status === 'required-violations'
  )
  const missingValidationEntries = pageFacingEntries.filter((entry) => !entry.hasValidation)
  const missingRevalidationEntries = pageFacingEntries.filter((entry) => !entry.hasRevalidation)
  const missingObservabilityEntries = pageFacingEntries.filter((entry) =>
    entry.contract.warningCodes.includes('observability')
  )
  const missingExplicitOutcomeEntries = pageFacingEntries.filter((entry) =>
    entry.contract.warningCodes.includes('explicit-outcome')
  )
  const conflictGuardedEntries = pageFacingEntries.filter((entry) => entry.hasConflictGuard)
  const idempotencyGuardedEntries = pageFacingEntries.filter((entry) => entry.hasIdempotencyGuard)
  const observabilityEntries = pageFacingEntries.filter((entry) => entry.hasObservability)
  const inputTenantEntries = pageFacingEntries.filter(
    (entry) => entry.tenantScopeSignal === 'input-derived'
  )
  const sessionTenantEntries = pageFacingEntries.filter(
    (entry) => entry.tenantScopeSignal === 'session-derived'
  )
  const privilegedEntries = pageFacingEntries.filter(
    (entry) => entry.privilegedPolicy.level !== 'standard'
  )
  const sensitiveEntries = privilegedEntries.filter(
    (entry) => entry.privilegedPolicy.level === 'sensitive'
  )
  const criticalEntries = privilegedEntries.filter(
    (entry) => entry.privilegedPolicy.level === 'critical'
  )
  const privilegedViolationEntries = privilegedEntries.filter(
    (entry) => entry.privilegedPolicy.status === 'violations'
  )
  const redirectOutcomeEntries = pageFacingEntries.filter(
    (entry) => entry.outcomeStyle === 'redirect'
  )
  const structuredReturnEntries = pageFacingEntries.filter((entry) => entry.hasStructuredReturn)
  const filesWithoutRevalidationImport = fileSummaries
    .filter((entry) => entry.missingRevalidationImportForPageFacingMutations)
    .map((entry) => entry.relativeFilePath)

  return {
    auditOnlyMutationFunctionCount: auditOnlyEntries.length,
    conflictGuardedFunctionCount: conflictGuardedEntries.length,
    contractCompliantFunctionCount: contractCompliantEntries.length,
    contractCompliantFunctionIds: contractCompliantEntries.map((entry) => entry.functionId),
    contractRequiredViolationFunctionCount: contractRequiredViolationEntries.length,
    contractRequiredViolationFunctionIds: contractRequiredViolationEntries.map(
      (entry) => entry.functionId
    ),
    contractWarningFunctionCount: contractWarningEntries.length,
    contractWarningFunctionIds: contractWarningEntries.map((entry) => entry.functionId),
    entries,
    fileSummaries,
    filesWithPageFacingMutations: [...filesWithPageFacingMutations].sort((left, right) =>
      left.localeCompare(right)
    ),
    filesWithoutRevalidationImport,
    idempotencyGuardedFunctionCount: idempotencyGuardedEntries.length,
    inputTenantMutationFunctionCount: inputTenantEntries.length,
    inputTenantMutationFunctionIds: inputTenantEntries.map((entry) => entry.functionId),
    missingAuthFunctionCount: missingAuthEntries.length,
    missingAuthFunctionIds: missingAuthEntries.map((entry) => entry.functionId),
    missingExplicitOutcomeFunctionCount: missingExplicitOutcomeEntries.length,
    missingExplicitOutcomeFunctionIds: missingExplicitOutcomeEntries.map(
      (entry) => entry.functionId
    ),
    missingObservabilityFunctionCount: missingObservabilityEntries.length,
    missingObservabilityFunctionIds: missingObservabilityEntries.map((entry) => entry.functionId),
    missingRevalidationFunctionCount: missingRevalidationEntries.length,
    missingRevalidationFunctionIds: missingRevalidationEntries.map((entry) => entry.functionId),
    missingRevalidationImportFileCount: filesWithoutRevalidationImport.length,
    missingValidationFunctionCount: missingValidationEntries.length,
    missingValidationFunctionIds: missingValidationEntries.map((entry) => entry.functionId),
    observabilityInstrumentedFunctionCount: observabilityEntries.length,
    pageFacingMutationFunctionCount: pageFacingEntries.length,
    pageFacingMutationFunctionIds: pageFacingEntries.map((entry) => entry.functionId),
    pathExemptMutationFunctionCount: pathExemptEntries.length,
    privilegedMutationFunctionCount: privilegedEntries.length,
    privilegedMutationFunctionIds: privilegedEntries.map((entry) => entry.functionId),
    privilegedPolicyViolationFunctionCount: privilegedViolationEntries.length,
    privilegedPolicyViolationFunctionIds: privilegedViolationEntries.map(
      (entry) => entry.functionId
    ),
    redirectOutcomeFunctionCount: redirectOutcomeEntries.length,
    rootSummary,
    rootsScanned,
    sensitiveMutationFunctionCount: sensitiveEntries.length,
    sensitiveMutationFunctionIds: sensitiveEntries.map((entry) => entry.functionId),
    sessionTenantMutationFunctionCount: sessionTenantEntries.length,
    sessionTenantMutationFunctionIds: sessionTenantEntries.map((entry) => entry.functionId),
    criticalMutationFunctionCount: criticalEntries.length,
    criticalMutationFunctionIds: criticalEntries.map((entry) => entry.functionId),
    structuredReturnFunctionCount: structuredReturnEntries.length,
    totalFilesScanned: authInventory.totalFiles,
    totalMutationFunctions: entries.length,
  }
}
