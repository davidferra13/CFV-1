import { z } from 'zod'

export const OPERATIONAL_DOCUMENT_TYPES = [
  'summary',
  'grocery',
  'foh',
  'prep',
  'execution',
  'checklist',
  'packing',
  'reset',
  'travel',
  'shots',
  'beo',
] as const

export type OperationalDocumentType = (typeof OPERATIONAL_DOCUMENT_TYPES)[number]

export const SNAPSHOT_DOCUMENT_TYPES = [...OPERATIONAL_DOCUMENT_TYPES, 'all'] as const
export type SnapshotDocumentType = (typeof SNAPSHOT_DOCUMENT_TYPES)[number]

export const DOCUMENT_REQUEST_TYPES = [...OPERATIONAL_DOCUMENT_TYPES, 'all', 'pack'] as const
export type DocumentRequestType = (typeof DOCUMENT_REQUEST_TYPES)[number]

export const CORE_PACKET_DOCUMENT_TYPES: OperationalDocumentType[] = [
  'summary',
  'grocery',
  'foh',
  'prep',
  'execution',
  'checklist',
  'packing',
  'reset',
]

export type DocumentDefinition = {
  type: OperationalDocumentType
  label: string
  docTypeLabel: string
  fallbackTitle: string
  filenameBase: string
  templateSlug: string
  category: 'core' | 'travel' | 'marketing'
  isCorePacket: boolean
  requiredSignals: readonly string[]
}

const operationalDocumentTypeSchema = z.enum(OPERATIONAL_DOCUMENT_TYPES)
const snapshotDocumentTypeSchema = z.enum(SNAPSHOT_DOCUMENT_TYPES)
const documentRequestTypeSchema = z.enum(DOCUMENT_REQUEST_TYPES)

export const DOCUMENT_DEFINITIONS: Record<OperationalDocumentType, DocumentDefinition> = {
  summary: {
    type: 'summary',
    label: 'Event Summary',
    docTypeLabel: 'Event Summary',
    fallbackTitle: 'EVENT SUMMARY',
    filenameBase: 'event-summary',
    templateSlug: 'event-summary',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['event basics', 'client context', 'menu context'],
  },
  grocery: {
    type: 'grocery',
    label: 'Grocery List',
    docTypeLabel: 'Grocery List',
    fallbackTitle: 'GROCERY LIST',
    filenameBase: 'grocery-list',
    templateSlug: 'grocery-list',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['menu ingredients', 'shopping sections', 'quantities'],
  },
  foh: {
    type: 'foh',
    label: 'Front-of-House Menu',
    docTypeLabel: 'FOH Menu',
    fallbackTitle: 'FRONT-OF-HOUSE MENU',
    filenameBase: 'front-of-house-menu',
    templateSlug: 'front-of-house-menu',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['menu courses', 'dish names', 'display formatting'],
  },
  prep: {
    type: 'prep',
    label: 'Prep Sheet',
    docTypeLabel: 'Prep Sheet',
    fallbackTitle: 'PREP SHEET',
    filenameBase: 'prep-sheet',
    templateSlug: 'prep-sheet',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['prep tasks', 'timing', 'course linkage'],
  },
  execution: {
    type: 'execution',
    label: 'Execution Sheet',
    docTypeLabel: 'Execution Sheet',
    fallbackTitle: 'EXECUTION SHEET',
    filenameBase: 'execution-sheet',
    templateSlug: 'execution-sheet',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['service flow', 'timing controls', 'allergy callouts'],
  },
  checklist: {
    type: 'checklist',
    label: 'Non-Negotiables Checklist',
    docTypeLabel: 'Non-Negotiables',
    fallbackTitle: 'NON-NEGOTIABLES',
    filenameBase: 'checklist',
    templateSlug: 'non-negotiables-checklist',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['operational controls', 'critical checks'],
  },
  packing: {
    type: 'packing',
    label: 'Packing List',
    docTypeLabel: 'Packing List',
    fallbackTitle: 'PACKING LIST',
    filenameBase: 'packing-list',
    templateSlug: 'packing-list',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['equipment list', 'loadout zones', 'component counts'],
  },
  reset: {
    type: 'reset',
    label: 'Post-Service Reset Checklist',
    docTypeLabel: 'Reset Checklist',
    fallbackTitle: 'POST-SERVICE RESET',
    filenameBase: 'reset-checklist',
    templateSlug: 'post-service-reset',
    category: 'core',
    isCorePacket: true,
    requiredSignals: ['closeout tasks', 'cleanup', 'post-service controls'],
  },
  travel: {
    type: 'travel',
    label: 'Travel Route',
    docTypeLabel: 'Travel Route',
    fallbackTitle: 'TRAVEL ROUTE',
    filenameBase: 'travel-route',
    templateSlug: 'travel-route',
    category: 'travel',
    isCorePacket: false,
    requiredSignals: ['route legs', 'timing windows', 'stops'],
  },
  shots: {
    type: 'shots',
    label: 'Content Asset Capture Sheet',
    docTypeLabel: 'Content Shot List',
    fallbackTitle: 'CONTENT SHOT LIST',
    filenameBase: 'content-shot-list',
    templateSlug: 'content-asset-capture',
    category: 'marketing',
    isCorePacket: false,
    requiredSignals: ['capture checklist', 'content goals'],
  },
  beo: {
    type: 'beo',
    label: 'Banquet Event Order',
    docTypeLabel: 'BEO',
    fallbackTitle: 'BANQUET EVENT ORDER',
    filenameBase: 'beo',
    templateSlug: 'banquet-event-order',
    category: 'core',
    isCorePacket: false,
    requiredSignals: ['event basics', 'client context', 'menu context', 'timeline'],
  },
}

export function getDocumentDefinition(type: OperationalDocumentType): DocumentDefinition {
  return DOCUMENT_DEFINITIONS[type]
}

export function isOperationalDocumentType(value: string): value is OperationalDocumentType {
  return operationalDocumentTypeSchema.safeParse(value).success
}

export function isSnapshotDocumentType(value: string): value is SnapshotDocumentType {
  return snapshotDocumentTypeSchema.safeParse(value).success
}

export type ParsedOperationalTypeCsv = {
  types: OperationalDocumentType[]
  invalidTokens: string[]
}

export function parseOperationalDocumentTypeCsv(
  input: string | null | undefined
): ParsedOperationalTypeCsv {
  if (!input) return { types: [], invalidTokens: [] }

  const seen = new Set<OperationalDocumentType>()
  const types: OperationalDocumentType[] = []
  const invalidTokens: string[] = []

  for (const rawPart of input.split(',')) {
    const normalized = rawPart.trim().toLowerCase()
    if (!normalized) continue
    if (!isOperationalDocumentType(normalized)) {
      invalidTokens.push(normalized)
      continue
    }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    types.push(normalized)
  }

  return { types, invalidTokens }
}

const archiveParamSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => ['1', 'true', 'yes', '0', 'false', 'no'].includes(value), {
    message: 'archive must be one of: 1, true, yes, 0, false, no',
  })

const idempotencyKeyParamSchema = z
  .string()
  .trim()
  .min(8, 'idempotency key must be at least 8 characters')
  .max(160, 'idempotency key must be at most 160 characters')
  .regex(/^[a-zA-Z0-9:_\-.]+$/, 'idempotency key contains invalid characters')

export type ParsedDocumentRequestQuery = {
  requestedType: DocumentRequestType
  selectedTypes: OperationalDocumentType[]
  archiveRequested: boolean
  idempotencyKey: string | null
}

export type DocumentRequestValidationResult =
  | { success: true; value: ParsedDocumentRequestQuery }
  | { success: false; error: string; details: string[] }

export function parseDocumentRequestQuery(
  searchParams: URLSearchParams
): DocumentRequestValidationResult {
  const requestedTypeRaw = (searchParams.get('type') ?? 'all').trim().toLowerCase()
  const requestedType = documentRequestTypeSchema.safeParse(requestedTypeRaw)
  if (!requestedType.success) {
    return {
      success: false,
      error:
        'Invalid document type. Use: summary, grocery, foh, prep, execution, checklist, packing, reset, travel, shots, beo, all, or pack.',
      details: [`received type="${requestedTypeRaw || '(empty)'}"`],
    }
  }

  const parsedTypes = parseOperationalDocumentTypeCsv(searchParams.get('types'))
  if (parsedTypes.invalidTokens.length > 0) {
    return {
      success: false,
      error: 'Invalid value for "types" query parameter.',
      details: parsedTypes.invalidTokens.map((token) => `invalid type token "${token}"`),
    }
  }

  const archiveRaw = searchParams.get('archive')
  if (archiveRaw) {
    const archiveResult = archiveParamSchema.safeParse(archiveRaw)
    if (!archiveResult.success) {
      return {
        success: false,
        error: 'Invalid value for "archive" query parameter.',
        details: [archiveResult.error.issues[0]?.message ?? 'archive value is invalid'],
      }
    }
  }

  const archiveRequested =
    (archiveRaw ? ['1', 'true', 'yes'].includes(archiveRaw.trim().toLowerCase()) : false) ||
    requestedType.data === 'all' ||
    requestedType.data === 'pack'

  const idempotencyRaw = searchParams.get('idempotencyKey') ?? searchParams.get('idempotency_key')
  const idempotencyParsed = idempotencyRaw
    ? idempotencyKeyParamSchema.safeParse(idempotencyRaw)
    : null
  if (idempotencyRaw && (!idempotencyParsed || !idempotencyParsed.success)) {
    return {
      success: false,
      error: 'Invalid value for idempotency key query parameter.',
      details: [
        idempotencyParsed?.error.issues[0]?.message ??
          'idempotencyKey must be 8-160 chars using letters, numbers, :, _, -, .',
      ],
    }
  }

  return {
    success: true,
    value: {
      requestedType: requestedType.data,
      selectedTypes: parsedTypes.types,
      archiveRequested,
      idempotencyKey: idempotencyParsed?.data ?? null,
    },
  }
}

const snapshotMetadataSchema = z
  .object({
    source: z.literal('api/documents/[eventId]'),
    request: z.object({
      requestedType: documentRequestTypeSchema,
      selectedTypes: z.array(operationalDocumentTypeSchema).max(25),
      archiveRequested: z.boolean(),
    }),
    generatedAtIso: z.string().datetime(),
  })
  .strict()

export type SnapshotMetadata = z.infer<typeof snapshotMetadataSchema>

export function buildSnapshotMetadata(input: {
  requestedType: DocumentRequestType
  selectedTypes: OperationalDocumentType[]
  archiveRequested: boolean
}): SnapshotMetadata {
  return snapshotMetadataSchema.parse({
    source: 'api/documents/[eventId]',
    request: {
      requestedType: input.requestedType,
      selectedTypes: input.selectedTypes,
      archiveRequested: input.archiveRequested,
    },
    generatedAtIso: new Date().toISOString(),
  })
}

const snapshotArchiveInsertSchema = z
  .object({
    tenantId: z.string().min(8).max(128),
    eventId: z.string().min(8).max(128),
    documentType: snapshotDocumentTypeSchema,
    versionNumber: z.number().int().positive().max(999999),
    filename: z
      .string()
      .min(5)
      .max(180)
      .regex(/^[a-z0-9._-]+$/i, 'filename has invalid characters'),
    storagePath: z
      .string()
      .min(12)
      .max(512)
      .regex(/^[a-z0-9/_\-.]+$/i, 'storagePath has invalid characters'),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/i, 'contentHash must be a 64-char hex sha256'),
    sizeBytes: z
      .number()
      .int()
      .nonnegative()
      .max(25 * 1024 * 1024),
    generatedBy: z.string().min(8).max(128),
    metadata: snapshotMetadataSchema,
  })
  .strict()

export type SnapshotArchiveInsertInput = z.infer<typeof snapshotArchiveInsertSchema>

export function validateSnapshotArchiveInsert(input: SnapshotArchiveInsertInput) {
  return snapshotArchiveInsertSchema.safeParse(input)
}
