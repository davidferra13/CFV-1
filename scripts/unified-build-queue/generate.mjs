#!/usr/bin/env node
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SOURCE_TEXT_LIMIT = 200_000
const DEFAULT_OUT_DIR = join('system', 'unified-build-queue')

const MARKDOWN_SOURCES = [
  {
    source: '3977-build-queue',
    sourceKind: '3977',
    root: join('system', 'build-queue'),
    extensions: ['.md'],
  },
  {
    source: 'system-ready-tasks',
    sourceKind: 'ready-task',
    root: join('system', 'ready-tasks'),
    extensions: ['.md'],
  },
  {
    source: 'docs-specs',
    sourceKind: 'spec',
    root: join('docs', 'specs'),
    extensions: ['.md'],
  },
  {
    source: 'system-intake',
    sourceKind: 'intake',
    root: join('system', 'intake'),
    extensions: ['.md'],
  },
]

const CLASSIFICATIONS = [
  'v1_blocker',
  'v1_support',
  'v2',
  'blocked',
  'research_required',
  'duplicate',
  'rejected',
  'built',
]

const HARD_STOP_PATTERNS = [
  /\bpush to main\b/i,
  /\bmerge to main\b/i,
  /\bdeploy(?:ing|ment)? to production\b/i,
  /\bdrizzle-kit push\b/i,
  /\bdrop table\b/i,
  /\bdrop column\b/i,
  /\btruncate\b/i,
  /\bdelete from\b/i,
  /\bkill (?:the )?server\b/i,
  /\brestart (?:the )?server\b/i,
]

const REJECT_PATTERNS = [
  /\b(?:ai|agent|remy|ollama).{0,48}\b(?:generate|suggest|draft|create).{0,48}\brecipes?\b/i,
  /\bagent\.(?:create_recipe|update_recipe|add_ingredient)\b/i,
]

const V2_PATTERNS = [
  /\bmarketplace\b/i,
  /\bfranchise\b/i,
  /\bnational\b/i,
  /\bmulti-city\b/i,
  /\bwhite.?label\b/i,
  /\baffiliate\b/i,
  /\bambassador\b/i,
  /\bads?\b/i,
  /\bpublic directory\b/i,
  /\bsocial network\b/i,
  /\bpower user\b/i,
  /\bnice to have\b/i,
  /\bfuture\b/i,
  /\bv2\b/i,
]

const RESEARCH_PATTERNS = [
  /\bresearch\b/i,
  /\bunknown\b/i,
  /\bneeds evidence\b/i,
  /\bneeds validation\b/i,
  /\bvalidate against\b/i,
  /\bpersona\b/i,
  /\bmarket\b/i,
  /\bsurvey\b/i,
  /\bwave-?1\b/i,
]

const V1_BLOCKER_PATTERNS = [
  /\bpricing\b/i,
  /\bcosting\b/i,
  /\bquote\b/i,
  /\bledger\b/i,
  /\bpayment\b/i,
  /\bstripe\b/i,
  /\ballerg/i,
  /\bdietary\b/i,
  /\btenant\b/i,
  /\bauth\b/i,
  /\bsecurity\b/i,
  /\bfounder authority\b/i,
  /\bpublic booking\b/i,
  /\bintake\b/i,
  /\binquiry\b/i,
  /\bevent state\b/i,
  /\bfsm\b/i,
  /\bno fake\b/i,
  /\bhallucination\b/i,
  /\brelease proof\b/i,
  /\bv1 control plane\b/i,
  /\bmission control\b/i,
  /\bbuilder\b/i,
]

const V1_SUPPORT_PATTERNS = [
  /\bclient\b/i,
  /\bevent\b/i,
  /\bmenu\b/i,
  /\boffer\b/i,
  /\bagreement\b/i,
  /\bprep\b/i,
  /\bsourcing\b/i,
  /\bservice\b/i,
  /\bfollow-?up\b/i,
  /\bmemory\b/i,
  /\bdashboard\b/i,
  /\bworkflow\b/i,
  /\bchecklist\b/i,
  /\bavailability\b/i,
]

export const MODULES = [
  {
    id: 'pricing-trust',
    label: 'Pricing Trust',
    keywords: ['pricing', 'costing', 'plate cost', 'ingredient price', 'quote safety', 'grocery'],
  },
  {
    id: 'finance-ledger',
    label: 'Finance and Ledger',
    keywords: ['ledger', 'payment', 'stripe', 'invoice', 'payout', 'cents', 'billing'],
  },
  {
    id: 'client-intake',
    label: 'Client Intake',
    keywords: ['intake', 'inquiry', 'booking', 'public booking', 'client onboarding', 'embed'],
  },
  {
    id: 'events-ops',
    label: 'Event Operations',
    keywords: ['event', 'prep', 'service', 'checklist', 'timeline', 'guest count', 'agreement'],
  },
  {
    id: 'menus-offers',
    label: 'Menus and Offers',
    keywords: ['menu', 'offer', 'proposal', 'package', 'tasting'],
  },
  {
    id: 'dietary-safety',
    label: 'Dietary Safety',
    keywords: ['allergy', 'allergies', 'dietary', 'restriction', 'guest preference'],
  },
  {
    id: 'sourcing-inventory',
    label: 'Sourcing and Inventory',
    keywords: ['sourcing', 'inventory', 'pantry', 'vendor', 'supplier', 'farm', 'stock'],
  },
  {
    id: 'v1-control-plane',
    label: 'V1 Control Plane',
    keywords: ['mission control', 'v1 builder', 'control plane', 'queue', 'receipt', 'claim', 'governor'],
  },
  {
    id: 'auth-security',
    label: 'Auth and Security',
    keywords: ['auth', 'tenant', 'security', 'permission', 'founder authority', 'admin'],
  },
  {
    id: 'ai-boundaries',
    label: 'AI Boundaries',
    keywords: ['remy', 'ollama', 'ai', 'model', 'agent'],
  },
  {
    id: 'public-trust',
    label: 'Public Trust',
    keywords: ['public', 'homepage', 'seo', 'signup', 'beta', 'trust'],
  },
  {
    id: 'chef-workspace',
    label: 'Chef Workspace',
    keywords: ['dashboard', 'calendar', 'availability', 'task', 'workspace', 'command plane'],
  },
  {
    id: 'staff-partner',
    label: 'Staff and Partner Ops',
    keywords: ['staff', 'partner', 'venue', 'collaboration', 'team'],
  },
  {
    id: 'docs-release-proof',
    label: 'Docs and Release Proof',
    keywords: ['documentation', 'proof', 'audit', 'definition of done', 'release'],
  },
  {
    id: 'client-memory',
    label: 'Client Memory',
    keywords: ['client memory', 'preference', 'preferences', 'household', 'relationship timeline', 'follow-up memory'],
  },
  {
    id: 'quality-hallucination',
    label: 'Quality and Hallucination',
    keywords: ['no fake', 'hallucination', 'optimistic', 'rollback', 'error state', 'empty state', 'hardcoded metric'],
  },
]

export const SUBMODULES = {
  'pricing-trust': [
    submodule('price-resolution', 'Price Resolution', ['price resolution', 'ingredient price', 'observed price', 'price source']),
    submodule('pricing-confidence', 'Pricing Confidence', ['confidence', 'freshness', 'current price', 'pricing trust']),
    submodule('ingredient-matching', 'Ingredient Matching', ['ingredient matching', 'alias', 'recognized ingredient']),
    submodule('unit-conversion', 'Unit Conversion', ['unit conversion', 'convert', 'unit confidence']),
    submodule('yield-normalization', 'Yield Normalization', ['yield', 'trim loss', 'portion yield']),
    submodule('quote-safety', 'Quote Safety', ['quote safety', 'safe to quote', 'safe_to_quote', 'verify first', 'quote']),
    submodule('cost-export', 'Cost Export', ['export', 'csv', 'cost export']),
    submodule('openclaw-price-adapter', 'OpenClaw Price Adapter', ['openclaw', 'sync', 'pipeline']),
  ],
  'finance-ledger': [
    submodule('ledger-core', 'Ledger Core', ['ledger', 'balance', 'append', 'immutable']),
    submodule('stripe-payments', 'Stripe Payments', ['stripe', 'payment', 'checkout', 'webhook']),
    submodule('invoices', 'Invoices', ['invoice']),
    submodule('quote-payment-boundary', 'Quote Payment Boundary', ['quote payment', 'paid', 'agreement']),
    submodule('expenses-tax', 'Expenses and Tax', ['expense', 'tax', 'cpa']),
    submodule('financial-reports', 'Financial Reports', ['reporting', 'financial report', 'profit']),
    submodule('supporter-contributions', 'Supporter Contributions', ['supporter', 'contribution']),
    submodule('finance-export-adapter', 'Finance Export Adapter', ['finance export', 'export']),
  ],
  'client-intake': [
    submodule('public-booking', 'Public Booking', ['public booking', 'booking']),
    submodule('direct-inquiry', 'Direct Inquiry', ['inquiry', 'direct inquiry']),
    submodule('embed-intake', 'Embed Intake', ['embed', 'widget']),
    submodule('intake-lane-truth', 'Intake Lane Truth', ['intake lane', 'lane truth']),
    submodule('booking-follow-through', 'Booking Follow Through', ['follow through', 'follow-through']),
    submodule('intake-to-client-adapter', 'Intake To Client Adapter', ['intake to client', 'client onboarding']),
  ],
  'events-ops': [
    submodule('event-fsm', 'Event FSM', ['fsm', 'event state', 'transition']),
    submodule('event-detail-truth', 'Event Detail Truth', ['event detail', 'detail truth']),
    submodule('quote-agreement-boundary', 'Quote Agreement Boundary', ['quote agreement', 'agreement']),
    submodule('prep-service-readiness', 'Prep Service Readiness', ['prep', 'service', 'checklist', 'readiness']),
    submodule('guest-dietary-handoff', 'Guest Dietary Handoff', ['guest', 'dietary handoff']),
    submodule('service-format-specialization', 'Service Format Specialization', ['grazing', 'service format']),
    submodule('followup-after-action', 'Followup After Action', ['follow-up', 'followup', 'after action']),
    submodule('event-route-discoverability', 'Event Route Discoverability', ['route', 'navigation', 'discoverability']),
  ],
  'menus-offers': [
    submodule('menu-builder', 'Menu Builder', ['menu builder', 'menu']),
    submodule('proposal-offer-state', 'Proposal Offer State', ['proposal', 'offer']),
    submodule('recipe-book-search', 'Recipe Book Search', ['recipe search', 'recipe book']),
    submodule('menu-cost-adapter', 'Menu Cost Adapter', ['menu cost', 'costing']),
    submodule('public-sample-menus', 'Public Sample Menus', ['sample menu']),
    submodule('package-tasting-offers', 'Package Tasting Offers', ['package', 'tasting']),
  ],
  'dietary-safety': [
    submodule('allergy-records', 'Allergy Records', ['allergy', 'allergies']),
    submodule('guest-dietary-handoff', 'Guest Dietary Handoff', ['guest', 'dietary']),
    submodule('menu-safety-check', 'Menu Safety Check', ['menu safety', 'safety check']),
    submodule('severity-source-truth', 'Severity Source Truth', ['severity', 'source truth']),
  ],
  'sourcing-inventory': [
    submodule('inventory-quantity-truth', 'Inventory Quantity Truth', ['inventory', 'quantity']),
    submodule('vendor-supplier-truth', 'Vendor Supplier Truth', ['vendor', 'supplier', 'farm']),
    submodule('pantry-stock-flow', 'Pantry Stock Flow', ['pantry', 'stock']),
    submodule('procurement-planning', 'Procurement Planning', ['procurement', 'sourcing plan', 'grocery list']),
    submodule('price-source-adapters', 'Price Source Adapters', ['price source']),
    submodule('stock-to-costing-adapter', 'Stock To Costing Adapter', ['stock to costing']),
  ],
  'v1-control-plane': [
    submodule('v1-roadmap-release-truth', 'V1 Roadmap Release Truth', ['roadmap', 'release truth', 'blueprint']),
    submodule('builder-queue', 'Builder Queue', ['builder queue', 'queue', 'unified build queue']),
    submodule('claims-receipts', 'Claims Receipts', ['claim', 'receipt']),
    submodule('cannot-fail-gates', 'Cannot Fail Gates', ['cannot fail', 'gate']),
    submodule('validation-proof', 'Validation Proof', ['validation', 'survey', 'pilot']),
    submodule('cross-system-integrity', 'Cross System Integrity', ['cross system', 'sync status', 'runtime proof']),
    submodule('mission-control-status', 'Mission Control Status', ['mission control', 'status']),
    submodule('scheduled-ops-proof', 'Scheduled Ops Proof', ['scheduled', 'watchdog', 'cron']),
    submodule('planning', 'Planning', ['planning']),
  ],
  'auth-security': [
    submodule('founder-authority', 'Founder Authority', ['founder authority']),
    submodule('tenant-scoping', 'Tenant Scoping', ['tenant', 'scoping', 'tenant_id']),
    submodule('role-hierarchy', 'Role Hierarchy', ['role', 'admin', 'permission']),
    submodule('admin-gates', 'Admin Gates', ['admin gate', 'admin-only', 'admin route']),
    submodule('server-action-auth', 'Server Action Auth', ['server action', 'requirechef', 'requireauth']),
    submodule('public-token-auth', 'Public Token Auth', ['token', 'public token']),
    submodule('data-portability', 'Data Portability', ['export', 'takeout', 'portability']),
    submodule('secret-management', 'Secret Management', ['secret', 'env']),
  ],
  'ai-boundaries': [
    submodule('ollama-gateway', 'Ollama Gateway', ['ollama', 'parsewithollama', 'gateway']),
    submodule('remy-surfaces', 'Remy Surfaces', ['remy']),
    submodule('recipe-ip-protection', 'Recipe IP Protection', ['recipe', 'creative ip']),
    submodule('ai-privacy', 'AI Privacy', ['privacy']),
    submodule('ai-tool-permissions', 'AI Tool Permissions', ['tool permission']),
    submodule('ai-offline-failure', 'AI Offline Failure', ['offline', 'runtime unreachable']),
    submodule('ai-output-validation', 'AI Output Validation', ['zod', 'validation', 'repair pass']),
  ],
  'public-trust': [
    submodule('public-homepage', 'Public Homepage', ['homepage', 'home page']),
    submodule('public-chef-profile', 'Public Chef Profile', ['chef profile']),
    submodule('nearby-directory', 'Nearby Directory', ['nearby', 'directory']),
    submodule('public-seo-metadata', 'Public SEO Metadata', ['seo', 'metadata']),
    submodule('public-claim-flow', 'Public Claim Flow', ['claim']),
    submodule('public-proof-copy', 'Public Proof Copy', ['copy', 'claim']),
  ],
  'chef-workspace': [
    submodule('dashboard-return-to-work', 'Dashboard Return To Work', ['dashboard', 'return to work']),
    submodule('task-calendar-command', 'Task Calendar Command', ['task', 'calendar']),
    submodule('settings-configuration', 'Settings Configuration', ['settings', 'configuration']),
    submodule('mobile-runtime', 'Mobile Runtime', ['mobile', 'pwa']),
    submodule('workspace-navigation', 'Workspace Navigation', ['workspace', 'navigation']),
    submodule('operator-empty-error-states', 'Operator Empty Error States', ['empty state', 'error state']),
  ],
  'staff-partner': [
    submodule('staff-execution', 'Staff Execution', ['staff']),
    submodule('partner-referrals', 'Partner Referrals', ['partner', 'referral']),
  ],
  'docs-release-proof': [
    submodule('build-integrity', 'Build Integrity', ['build', 'typecheck']),
    submodule('test-proof', 'Test Proof', ['test', 'proof']),
    submodule('evidence-freshness', 'Evidence Freshness', ['freshness', 'stale']),
    submodule('release-attestation', 'Release Attestation', ['attestation', 'release']),
    submodule('documentation-drift', 'Documentation Drift', ['docs drift', 'documentation drift']),
    submodule('module-ownership-registry', 'Module Ownership Registry', ['module ownership', 'registry', 'module cards']),
  ],
  'client-memory': [
    submodule('client-identity', 'Client Identity', ['client identity']),
    submodule('client-preferences', 'Client Preferences', ['preference', 'taste']),
    submodule('household-guest-memory', 'Household Guest Memory', ['household', 'guest']),
    submodule('client-portal-visibility', 'Client Portal Visibility', ['portal visibility']),
    submodule('relationship-timeline', 'Relationship Timeline', ['relationship timeline', 'timeline']),
    submodule('communication-ingestion', 'Communication Ingestion', ['communication', 'gmail', 'message', 'thread']),
    submodule('followup-memory', 'Followup Memory', ['follow-up memory', 'followup memory']),
    submodule('dinner-circle-continuity', 'Dinner Circle Continuity', ['dinner circle']),
  ],
  'quality-hallucination': [
    submodule('unavailable-state-contracts', 'Unavailable State Contracts', ['unavailable']),
    submodule('optimistic-rollback', 'Optimistic Rollback', ['optimistic', 'rollback']),
    submodule('no-fake-money', 'No Fake Money', ['fake money', '$0.00', 'money']),
    submodule('no-noop-actions', 'No Noop Actions', ['noop', 'no-op', 'button']),
    submodule('error-empty-partial-states', 'Error Empty Partial States', ['error state', 'empty state', 'partial state']),
    submodule('hardcoded-metric-detection', 'Hardcoded Metric Detection', ['hardcoded metric', 'hardcoded']),
    submodule('cache-truth', 'Cache Truth', ['cache', 'revalidate']),
  ],
}

export function generateUnifiedQueue({
  root = process.cwd(),
  outDir = join(root, DEFAULT_OUT_DIR),
  write = true,
  now = new Date(),
} = {}) {
  const context = {
    root: resolve(root),
    outDir: resolve(outDir),
    now,
  }

  const evidence = loadEvidence(context)
  const rawCandidates = collectAllCandidates(context, evidence)
  const candidates = normalizeAndDedupe(rawCandidates, evidence)
  const moduleBatches = buildModuleBatches(candidates)
  const summary = buildSummary({ candidates, moduleBatches, evidence, context })

  const report = {
    candidates,
    moduleBatches,
    summary,
  }

  const sanitized = sanitizeForOutput(report)

  if (write) {
    mkdirSync(context.outDir, { recursive: true })
    writeJson(join(context.outDir, 'candidates.json'), sanitized.candidates)
    writeJson(join(context.outDir, 'module-batches.json'), sanitized.moduleBatches)
    writeJson(join(context.outDir, 'summary.json'), sanitized.summary)
  }

  return sanitized
}

function collectAllCandidates(context, evidence) {
  const candidates = []

  for (const source of MARKDOWN_SOURCES) {
    const dir = join(context.root, source.root)
    for (const file of walkFiles(dir, source.extensions)) {
      candidates.push(candidateFromMarkdownFile(context, source, file))
    }
  }

  candidates.push(...collectStickyNotes(context))
  candidates.push(...collectJsonlCandidates(context, evidence))

  return candidates
    .filter((candidate) => candidate.title || candidate.summary)
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath) || left.source.localeCompare(right.source))
}

function candidateFromMarkdownFile(context, source, file) {
  const sourcePath = slash(relative(context.root, file))
  const text = readTextLimited(file)
  const metadata = parseMetadata(text)
  const title = extractTitle(text, sourcePath, metadata)
  const summary = extractSummary(text, title)

  return baseCandidate({
    source: source.source,
    sourceKind: source.sourceKind,
    sourcePath,
    title,
    summary,
    text,
    metadata,
    createdAt: metadata.created ?? metadata.date ?? metadata.exported_at ?? metadata.generated ?? null,
  })
}

function collectStickyNotes(context) {
  const reportsDir = join(context.root, 'system', 'sticky-notes', 'reports')
  const latestReport = latestMatchingFile(reportsDir, '-organize.json')
  if (!latestReport) return []

  let report
  try {
    report = JSON.parse(readFileSync(latestReport, 'utf8'))
  } catch {
    return []
  }

  const attachments = Array.isArray(report.attachments) ? report.attachments : []
  const candidates = []

  for (const attachment of attachments) {
    const classification = String(attachment.classification ?? '')
    if (classification.startsWith('restricted.') || classification.startsWith('personal.')) continue
    if (classification.startsWith('archive.')) continue
    if (!classification.startsWith('chefFlow.') && classification !== 'needsReview') continue

    const destination = attachment.destination ?? attachment.noteRef ?? `sticky-note-${attachment.noteId ?? 'unknown'}`
    const fullPath = join(context.root, destination)
    const text = existsSync(fullPath) ? readTextLimited(fullPath) : JSON.stringify(attachment)
    const sourcePath = slash(destination)
    const metadata = {
      classification,
      noteId: attachment.noteId ?? null,
      noteRef: attachment.noteRef ?? null,
      status: attachment.status ?? null,
      requiresReview: Boolean(attachment.requiresReview),
      mayMutateProject: Boolean(attachment.mayMutateProject),
      organizeReport: slash(relative(context.root, latestReport)),
    }

    candidates.push(
      baseCandidate({
        source: 'sticky-notes',
        sourceKind: 'sticky-note',
        sourcePath,
        title: extractTitle(text, sourcePath, metadata),
        summary: extractSummary(text, `Sticky Notes ${classification} item`),
        text,
        metadata,
        createdAt: report.generatedAt ?? null,
      }),
    )
  }

  return candidates
}

function collectJsonlCandidates(context, evidence) {
  const candidates = []
  const queuePath = join(context.root, 'system', 'v1-builder', 'approved-queue.jsonl')
  const blockedPath = join(context.root, 'system', 'v1-builder', 'blocked.jsonl')
  const ledgerPath = join(context.root, 'system', 'v1-builder', 'request-ledger.jsonl')

  for (const record of readJsonl(queuePath)) {
    candidates.push(candidateFromRecord(record, {
      source: 'v1-approved-queue',
      sourceKind: 'v1-approved',
      defaultPath: 'system/v1-builder/approved-queue.jsonl',
    }))
  }

  for (const record of readJsonl(blockedPath)) {
    candidates.push(candidateFromRecord(record, {
      source: 'v1-blocked',
      sourceKind: 'v1-blocked',
      defaultPath: 'system/v1-builder/blocked.jsonl',
      forcedClassification: 'blocked',
    }))
  }

  for (const record of readJsonl(ledgerPath)) {
    if (record?.source !== 'developer-chat') continue
    candidates.push(candidateFromRecord(record, {
      source: 'founder-authority-request',
      sourceKind: 'founder-request',
      defaultPath: 'system/v1-builder/request-ledger.jsonl',
      forcedClassification: evidence.builtRequestIds.has(record.id) || record.status === 'built' ? 'built' : null,
    }))
  }

  return candidates
}

function candidateFromRecord(record, options) {
  const sourcePath = slash(record.sourcePath || options.defaultPath)
  const text = [
    record.title,
    record.rawAskSummary,
    record.statusReason,
    record.canonicalOwner,
    record.classification,
    record.status,
  ]
    .filter(Boolean)
    .join('\n')

  return baseCandidate({
    source: options.source,
    sourceKind: options.sourceKind,
    sourcePath,
    title: String(record.title || record.id || sourcePath),
    summary: String(record.rawAskSummary || record.statusReason || record.title || ''),
    text,
    metadata: {
      recordId: record.id ?? null,
      requestId: record.requestId ?? null,
      queueId: record.queueId ?? record.id ?? null,
      status: record.status ?? null,
      classification: record.classification ?? null,
      canonicalOwner: record.canonicalOwner ?? null,
      module: record.module ?? (record.moduleId ? { id: record.moduleId } : null),
      submodule: record.submodule ?? (record.submoduleId ? { id: record.submoduleId } : null),
      assignment: record.assignment ?? null,
      forcedClassification: options.forcedClassification ?? null,
    },
    createdAt: record.createdAt ?? null,
  })
}

function baseCandidate(fields) {
  const canonicalTitle = canonicalizeTitle(fields.title || fields.sourcePath)
  return {
    id: stableId(`${fields.source}:${fields.sourcePath}:${fields.metadata?.recordId ?? ''}`),
    source: fields.source,
    sourceKind: fields.sourceKind,
    sourcePath: fields.sourcePath,
    title: truncate(fields.title || fields.sourcePath, 180),
    canonicalTitle,
    summary: truncate(fields.summary || '', 500),
    module: null,
    submodule: null,
    assignment: null,
    classification: null,
    classificationReason: null,
    duplicateOf: null,
    duplicateGroupKey: null,
    approvalState: 'not_approved',
    executionEligible: false,
    batchEligible: false,
    priority: normalizePriority(fields.metadata?.priority),
    status: normalizeStatus(fields.metadata?.status),
    sourceCreatedAt: fields.createdAt,
    metadata: fields.metadata ?? {},
    signals: [],
    text: fields.text || '',
  }
}

function normalizeAndDedupe(rawCandidates, evidence) {
  const firstByGroup = new Map()
  const normalized = rawCandidates.map((candidate) => {
    const ownership = decideModuleOwnership(candidate)
    const classification = classifyCandidate(candidate, evidence)
    const result = {
      ...candidate,
      module: ownership.module,
      submodule: ownership.submodule,
      assignment: ownership.assignment,
      classification: classification.value,
      classificationReason: classification.reason,
      approvalState: approvalStateFor(classification.value, candidate),
      executionEligible: false,
      batchEligible: !['duplicate', 'rejected', 'built'].includes(classification.value),
      signals: classification.signals,
      text: undefined,
    }

    result.executionEligible =
      ['v1_blocker', 'v1_support'].includes(result.classification) &&
      result.source === 'v1-approved-queue' &&
      result.status === 'queued' &&
      !evidence.builtTaskIds.has(result.metadata.queueId)

    return result
  })

  const ranked = [...normalized].sort(comparePrimaryCandidate)
  for (const candidate of ranked) {
    const groupKey = duplicateGroupKey(candidate)
    candidate.duplicateGroupKey = groupKey
    const primary = firstByGroup.get(groupKey)
    if (!primary) {
      firstByGroup.set(groupKey, candidate)
      continue
    }

    candidate.classification = 'duplicate'
    candidate.classificationReason = `Duplicate of ${primary.id}.`
    candidate.duplicateOf = primary.id
    candidate.approvalState = 'not_approved'
    candidate.executionEligible = false
    candidate.batchEligible = false
  }

  return normalized.sort((left, right) => sourceRank(left.source) - sourceRank(right.source) || left.sourcePath.localeCompare(right.sourcePath))
}

function classifyCandidate(candidate, evidence) {
  const text = `${candidate.title}\n${candidate.summary}\n${candidate.text}`.toLowerCase()
  const status = normalizeStatus(candidate.status)
  const priority = normalizePriority(candidate.priority)
  const sourcePath = candidate.sourcePath
  const queueId = candidate.metadata.queueId ?? candidate.metadata.recordId ?? null

  if (queueId && evidence.builtTaskIds.has(queueId)) {
    return classification('built', 'A V1 builder receipt already exists for this queue item.', ['receipt'])
  }

  if (sourcePath && evidence.builtSourcePaths.has(sourcePath)) {
    return classification('built', 'The request ledger or receipts already mark this source as built.', ['ledger'])
  }

  if (candidate.metadata.forcedClassification) {
    return classification(candidate.metadata.forcedClassification, 'Forced by existing V1 builder state.', ['v1-builder'])
  }

  if (['built', 'verified', 'completed', 'complete', 'done'].includes(status)) {
    return classification('built', 'The source artifact already marks this work complete.', ['source-status'])
  }

  if (REJECT_PATTERNS.some((pattern) => pattern.test(text))) {
    return classification('rejected', 'Rejected by ChefFlow AI recipe boundary.', ['restricted-ai-recipe'])
  }

  if (HARD_STOP_PATTERNS.some((pattern) => pattern.test(text)) || ['blocked', 'on-hold'].includes(status)) {
    return classification('blocked', 'Blocked by hard-stop language or source status.', ['hard-stop'])
  }

  const existingClassification = String(candidate.metadata.classification || '')
  if (existingClassification.includes('approved_v1_blocker')) {
    return classification('v1_blocker', 'Already approved as a V1 blocker in the V1 builder queue.', ['approved-queue'])
  }
  if (existingClassification.includes('approved_v1_support')) {
    return classification('v1_support', 'Already approved as V1 support in the V1 builder queue.', ['approved-queue'])
  }
  if (existingClassification.includes('parked') || existingClassification.includes('v2')) {
    return classification('v2', 'Already parked outside the active V1 lane.', ['existing-classification'])
  }
  if (existingClassification.includes('research')) {
    return classification('research_required', 'Already marked as needing research.', ['existing-classification'])
  }

  if (candidate.source === 'sticky-notes') {
    return classification('research_required', 'Sticky Notes entries require review before build approval.', ['sticky-notes'])
  }

  if (RESEARCH_PATTERNS.some((pattern) => pattern.test(text))) {
    return classification('research_required', 'The item asks for research, validation, or persona evidence before build.', ['research'])
  }

  if (V2_PATTERNS.some((pattern) => pattern.test(text))) {
    return classification('v2', 'Useful scope, but not required for the V1 operating loop.', ['v2'])
  }

  if (priority === 'p0' || V1_BLOCKER_PATTERNS.some((pattern) => pattern.test(text))) {
    return classification('v1_blocker', 'Protects trust, money, safety, completion, pricing, or the governed builder lane.', ['v1-blocker'])
  }

  if (['p1', 'high'].includes(priority) || V1_SUPPORT_PATTERNS.some((pattern) => pattern.test(text))) {
    return classification('v1_support', 'Supports the V1 chef operating loop, but does not prove a release blocker by itself.', ['v1-support'])
  }

  if (candidate.sourceKind === 'spec' && status !== 'ready') {
    return classification('research_required', 'Spec is not ready for governed batch approval.', ['spec-status'])
  }

  return classification('v2', 'Preserved for later scope because it is not clearly V1-critical.', ['default-park'])
}

function classification(value, reason, signals) {
  if (!CLASSIFICATIONS.includes(value)) throw new Error(`Unknown classification: ${value}`)
  return { value, reason, signals }
}

function approvalStateFor(classificationValue, candidate) {
  if (candidate.source === 'v1-approved-queue' && ['v1_blocker', 'v1_support'].includes(classificationValue)) {
    return 'approved'
  }
  if (['v1_blocker', 'v1_support'].includes(classificationValue)) return 'candidate_review_required'
  if (classificationValue === 'research_required') return 'research_required'
  if (classificationValue === 'blocked') return 'blocked'
  if (classificationValue === 'v2') return 'parked'
  return 'not_approved'
}

function submodule(id, label, keywords) {
  return { id, label, keywords }
}

export function decideModuleOwnership(candidate = {}) {
  const metadata = candidate.metadata ?? {}
  const text = [
    candidate.title,
    candidate.summary,
    candidate.sourcePath,
    candidate.text,
    metadata.canonicalOwner,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  const explicitModule = moduleById(
    valueId(metadata.module) ??
      valueId(metadata.moduleId) ??
      valueId(metadata.module_id),
  )
  const moduleMatch = explicitModule ?? MODULES.find((item) =>
    item.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
  )

  if (!moduleMatch) {
    return {
      module: { id: 'unassigned', label: 'Unassigned' },
      submodule: { id: 'unassigned', label: 'Unassigned' },
      assignment: 'unassigned',
    }
  }

  const explicitSubmoduleId =
    valueId(metadata.submodule) ??
    valueId(metadata.submoduleId) ??
    valueId(metadata.submodule_id)
  const submoduleMatch = findSubmodule(moduleMatch.id, explicitSubmoduleId, text)
  const explicitAssignment = normalizeAssignment(metadata.assignment ?? metadata.assignmentStatus)

  return {
    module: { id: moduleMatch.id, label: moduleMatch.label },
    submodule: submoduleMatch,
    assignment: explicitAssignment ?? (explicitModule && explicitSubmoduleId ? 'manual' : 'proposed'),
  }
}

function moduleById(id) {
  if (!id) return null
  return MODULES.find((item) => item.id === id) ?? null
}

function findSubmodule(moduleId, explicitSubmoduleId, text) {
  const submodules = SUBMODULES[moduleId] ?? []
  const explicit = explicitSubmoduleId
    ? submodules.find((item) => item.id === explicitSubmoduleId)
    : null
  if (explicit) return { id: explicit.id, label: explicit.label }

  const scored = submodules
    .map((item) => ({
      item,
      hits: item.keywords.filter((keyword) => text.includes(keyword.toLowerCase())),
    }))
    .filter((entry) => entry.hits.length > 0)
    .sort((left, right) => {
      const longestLeft = Math.max(...left.hits.map((hit) => hit.length))
      const longestRight = Math.max(...right.hits.map((hit) => hit.length))
      return right.hits.length - left.hits.length || longestRight - longestLeft
    })
  const inferred = scored[0]?.item
  if (inferred) return { id: inferred.id, label: inferred.label }

  return { id: 'unassigned', label: 'Unassigned' }
}

function valueId(value) {
  if (value && typeof value === 'object') return normalizeId(value.id)
  return normalizeId(value)
}

function normalizeId(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function normalizeAssignment(value) {
  const normalized = normalizeId(value)
  if (['reviewed', 'manual', 'proposed', 'unassigned', 'needs-review'].includes(normalized)) {
    return normalized
  }
  return null
}

function buildModuleBatches(candidates) {
  const pending = candidates
    .filter((candidate) => candidate.batchEligible)
    .sort(compareBatchCandidate)

  const groups = new Map()
  for (const candidate of pending) {
    const key = `${candidate.module.id}:${candidate.submodule.id}:${candidate.classification}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(candidate)
  }

  const batches = []
  for (const [key, group] of groups.entries()) {
    const [moduleId, submoduleId, classificationValue] = key.split(':')
    const chunks = chunkBatch(group, 7)
    chunks.forEach((items, index) => {
      const module = items[0]?.module ?? { id: moduleId, label: moduleId }
      const submodule = items[0]?.submodule ?? { id: submoduleId, label: submoduleId }
      batches.push({
        id: stableId(`batch:${moduleId}:${submoduleId}:${classificationValue}:${index}:${items.map((item) => item.id).join(':')}`),
        module,
        submodule,
        assignment: batchAssignment(items),
        classification: classificationValue,
        approvalState: 'candidate_review_required',
        executionEligible: false,
        taskCount: items.length,
        sourceCounts: countBy(items, (item) => item.source),
        candidateIds: items.map((item) => item.id),
        titles: items.map((item) => item.title),
        reason: batchReason(classificationValue),
      })
    })
  }

  return batches.sort(
    (left, right) =>
      classificationRank(left.classification) - classificationRank(right.classification) ||
      left.module.id.localeCompare(right.module.id) ||
      left.submodule.id.localeCompare(right.submodule.id),
  )
}

function batchAssignment(items) {
  const assignments = items.map((item) => item.assignment)
  if (assignments.includes('unassigned')) return 'unassigned'
  if (assignments.includes('needs-review')) return 'needs-review'
  if (assignments.includes('proposed')) return 'proposed'
  if (assignments.includes('manual')) return 'manual'
  return 'reviewed'
}

function chunkBatch(group, size) {
  if (group.length <= size) return [group]
  const chunks = []
  for (let index = 0; index < group.length; index += size) {
    chunks.push(group.slice(index, index + size))
  }
  return chunks
}

function batchReason(classificationValue) {
  if (classificationValue === 'v1_blocker') return 'Candidate V1 blocker batch. It still needs explicit batch approval before execution.'
  if (classificationValue === 'v1_support') return 'Candidate V1 support batch. Queue after blocker batches once approved.'
  if (classificationValue === 'research_required') return 'Research batch. Resolve evidence before build approval.'
  if (classificationValue === 'blocked') return 'Blocked batch. Requires Founder Authority or hard-stop resolution.'
  if (classificationValue === 'v2') return 'Parked V2 batch. Preserve, do not execute in V1.'
  return 'Candidate batch.'
}

function buildSummary({ candidates, moduleBatches, evidence, context }) {
  const sourceCounts = countBy(candidates, (item) => item.source)
  const classificationCounts = countBy(candidates, (item) => item.classification)
  const moduleCounts = countBy(candidates, (item) => item.module.id)
  const submoduleCounts = countBy(candidates, (item) => `${item.module.id}:${item.submodule.id}`)
  const assignmentCounts = countBy(candidates, (item) => item.assignment)
  const approvedWithoutReceipt = candidates.filter(
    (item) => item.source === 'v1-approved-queue' && item.status === 'queued' && !evidence.builtTaskIds.has(item.metadata.queueId),
  )

  return {
    generatedAt: context.now.toISOString(),
    readOnly: true,
    schemaVersion: 1,
    outputs: {
      candidates: slash(relative(context.root, join(context.outDir, 'candidates.json'))),
      moduleBatches: slash(relative(context.root, join(context.outDir, 'module-batches.json'))),
      summary: slash(relative(context.root, join(context.outDir, 'summary.json'))),
    },
    totals: {
      candidates: candidates.length,
      moduleBatches: moduleBatches.length,
      executionQueueWrites: 0,
      approvedBatches: 0,
      duplicates: classificationCounts.duplicate ?? 0,
      built: classificationCounts.built ?? 0,
      blocked: classificationCounts.blocked ?? 0,
    },
    currentQueueTruth: {
      buildQueueFiles: sourceCounts['3977-build-queue'] ?? 0,
      readyTaskFiles: sourceCounts['system-ready-tasks'] ?? 0,
      docsSpecFiles: countDirectFiles(join(context.root, 'docs', 'specs'), '.md'),
      docsSpecRecursiveFiles: sourceCounts['docs-specs'] ?? 0,
      stickyNoteCandidates: sourceCounts['sticky-notes'] ?? 0,
      v1ApprovedQueueRecords: sourceCounts['v1-approved-queue'] ?? 0,
      v1ApprovedWithoutReceipt: approvedWithoutReceipt.length,
      founderAuthorityRequests: sourceCounts['founder-authority-request'] ?? 0,
    },
    bySource: sourceCounts,
    byClassification: classificationCounts,
    byModule: moduleCounts,
    bySubmodule: submoduleCounts,
    byAssignment: assignmentCounts,
    batchPolicy: {
      minIdealTasks: 3,
      maxTasks: 7,
      executionRule: 'No raw candidate is executable. Only an explicitly approved module batch may be copied into system/v1-builder/approved-queue.jsonl.',
    },
    warnings: buildWarnings(candidates, moduleBatches),
  }
}

function buildWarnings(candidates, moduleBatches) {
  const warnings = []
  if (moduleBatches.some((batch) => batch.taskCount < 3)) {
    warnings.push('Some module batches have fewer than 3 tasks because their module and classification groups are small.')
  }
  if (candidates.some((candidate) => candidate.module.id === 'unassigned')) {
    warnings.push('Some candidates are unassigned and need module review before approval.')
  }
  if (candidates.some((candidate) => candidate.submodule.id === 'unassigned')) {
    warnings.push('Some candidates have a module but no submodule and need module review before approval.')
  }
  if (candidates.some((candidate) => candidate.assignment === 'proposed')) {
    warnings.push('Some candidates have proposed module assignments that require review before high-risk execution.')
  }
  if (candidates.some((candidate) => candidate.source === 'sticky-notes')) {
    warnings.push('Sticky Notes candidates are staged as research_required until reviewed.')
  }
  return warnings
}

function loadEvidence(context) {
  const ledger = readJsonl(join(context.root, 'system', 'v1-builder', 'request-ledger.jsonl'))
  const receipts = readReceiptFiles(join(context.root, 'system', 'v1-builder', 'receipts'))
  const builtTaskIds = new Set()
  const builtRequestIds = new Set()
  const builtSourcePaths = new Set()

  for (const receipt of receipts) {
    if (receipt?.taskId && ['built', 'validated', 'pushed', 'completed'].includes(String(receipt.status || '').toLowerCase())) {
      builtTaskIds.add(receipt.taskId)
    }
  }

  for (const record of ledger) {
    if (String(record?.status || '').toLowerCase() !== 'built') continue
    if (record.id) builtRequestIds.add(record.id)
    if (record.queueId) builtTaskIds.add(record.queueId)
    if (record.sourcePath) builtSourcePaths.add(slash(record.sourcePath))
  }

  return { ledger, receipts, builtTaskIds, builtRequestIds, builtSourcePaths }
}

function readReceiptFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      try {
        return JSON.parse(readFileSync(join(dir, name), 'utf8'))
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function parseMetadata(text) {
  const metadata = {}
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (frontmatter) {
    for (const line of frontmatter[1].split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (!match) continue
      metadata[match[1]] = cleanValue(match[2])
    }
  }

  for (const match of text.matchAll(/^>\s*\*\*([^*]+):\*\*\s*(.+)$/gm)) {
    metadata[camelKey(match[1])] = cleanValue(match[2])
  }

  for (const match of text.matchAll(/^\*\*([^*]+):\*\*\s*(.+)$/gm)) {
    metadata[camelKey(match[1])] = cleanValue(match[2])
  }

  return metadata
}

function extractTitle(text, sourcePath, metadata = {}) {
  if (metadata.title) return String(metadata.title)
  const heading = text.match(/^#\s+(.+)$/m)
  if (heading) return heading[1].trim()
  return basename(sourcePath, extname(sourcePath)).replace(/[-_]+/g, ' ')
}

function extractSummary(text, fallback) {
  const withoutFrontmatter = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  const lines = withoutFrontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('>'))
  return truncate(lines[0] || fallback || '', 500)
}

function readTextLimited(file) {
  const raw = readFileSync(file)
  return raw.subarray(0, SOURCE_TEXT_LIMIT).toString('utf8')
}

function readJsonl(file) {
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function walkFiles(root, extensions) {
  if (!existsSync(root)) return []
  const files = []
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.git') continue
        stack.push(fullPath)
      } else if (extensions.includes(extname(entry).toLowerCase())) {
        files.push(fullPath)
      }
    }
  }
  return files.sort()
}

function latestMatchingFile(dir, suffix) {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => join(dir, name))
    .sort()
  return files.at(-1) ?? null
}

function countDirectFiles(dir, extension) {
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter((name) => extname(name).toLowerCase() === extension).length
}

function duplicateGroupKey(candidate) {
  const owner = slash(candidate.metadata.canonicalOwner || candidate.sourcePath || '')
  if (owner && owner !== 'system/v1-builder/approved-queue.jsonl' && owner !== 'system/v1-builder/request-ledger.jsonl') {
    return `path:${owner}`
  }
  return `title:${candidate.canonicalTitle}`
}

function canonicalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/^build task:\s*/i, '')
    .replace(/^spec:\s*/i, '')
    .replace(/\b(?:high|medium|low|p0|p1|p2|p3)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !['the', 'and', 'for', 'with', 'module', 'workflow'].includes(word))
    .join('-')
}

function comparePrimaryCandidate(left, right) {
  return primaryRank(left) - primaryRank(right) || left.sourcePath.localeCompare(right.sourcePath)
}

function primaryRank(candidate) {
  if (candidate.classification === 'built') return 0
  if (candidate.source === 'v1-approved-queue') return 1
  if (candidate.source === 'founder-authority-request') return 2
  if (candidate.source === 'docs-specs') return 3
  if (candidate.source === 'system-ready-tasks') return 4
  if (candidate.source === '3977-build-queue') return 5
  if (candidate.source === 'sticky-notes') return 6
  return 9
}

function compareBatchCandidate(left, right) {
  return (
    classificationRank(left.classification) - classificationRank(right.classification) ||
    left.module.id.localeCompare(right.module.id) ||
    priorityRank(left.priority) - priorityRank(right.priority) ||
    left.sourcePath.localeCompare(right.sourcePath)
  )
}

function sourceRank(source) {
  return [
    'v1-approved-queue',
    'founder-authority-request',
    'v1-blocked',
    'docs-specs',
    'system-ready-tasks',
    '3977-build-queue',
    'sticky-notes',
    'system-intake',
  ].indexOf(source) + 1 || 99
}

function classificationRank(value) {
  return {
    v1_blocker: 0,
    v1_support: 1,
    research_required: 2,
    blocked: 3,
    v2: 4,
    duplicate: 5,
    rejected: 6,
    built: 7,
  }[value] ?? 9
}

function priorityRank(value) {
  return {
    p0: 0,
    p1: 1,
    high: 1,
    p2: 2,
    medium: 2,
    p3: 3,
    low: 3,
  }[normalizePriority(value)] ?? 4
}

function normalizePriority(value) {
  const text = String(value ?? '').toLowerCase()
  if (text.includes('p0')) return 'p0'
  if (text.includes('p1')) return 'p1'
  if (text.includes('p2')) return 'p2'
  if (text.includes('p3')) return 'p3'
  if (text.includes('high')) return 'high'
  if (text.includes('medium')) return 'medium'
  if (text.includes('low')) return 'low'
  return text || null
}

function normalizeStatus(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function stableId(input) {
  return createHash('sha256').update(String(input)).digest('hex').slice(0, 16)
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item) || 'unknown'
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function cleanValue(value) {
  return String(value ?? '').trim().replace(/^['"]|['"]$/g, '')
}

function camelKey(value) {
  return String(value)
    .trim()
    .replace(/[^A-Za-z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase())
}

function truncate(value, length) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= length) return text
  return `${text.slice(0, length - 3)}...`
}

function slash(value) {
  return String(value ?? '').replace(/\\/g, '/')
}

function sanitizeForOutput(value) {
  if (typeof value === 'string') return value.replace(/\u2014/g, ' - ').replace(/\u2013/g, '-')
  if (Array.isArray(value)) return value.map((item) => sanitizeForOutput(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sanitizeForOutput(entry)]))
  }
  return value
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { write: true, root: process.cwd(), outDir: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--no-write') args.write = false
    else if (arg === '--root') args.root = argv[++index]
    else if (arg === '--out') args.outDir = argv[++index]
    else if (arg === '--help') args.help = true
  }
  return args
}

function printUsage() {
  console.log(`Usage:
  node scripts/unified-build-queue/generate.mjs [--root path] [--out path] [--no-write]

Writes:
  system/unified-build-queue/candidates.json
  system/unified-build-queue/module-batches.json
  system/unified-build-queue/summary.json`)
}

async function main() {
  const args = parseArgs()
  if (args.help) {
    printUsage()
    return
  }

  const root = resolve(args.root)
  const outDir = args.outDir ? resolve(args.outDir) : join(root, DEFAULT_OUT_DIR)
  const result = generateUnifiedQueue({ root, outDir, write: args.write })
  console.log(
    JSON.stringify(
      {
        ok: true,
        readOnly: true,
        wrote: args.write,
        outDir: slash(relative(root, outDir)),
        totals: result.summary.totals,
        currentQueueTruth: result.summary.currentQueueTruth,
      },
      null,
      2,
    ),
  )
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
const modulePath = fileURLToPath(import.meta.url)
if (invokedPath && pathToFileURL(invokedPath).href === pathToFileURL(modulePath).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
