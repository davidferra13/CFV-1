import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

class ExportError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CATEGORIES = new Set([
  'inquiry',
  'existing_thread',
  'client',
  'event',
  'preference',
  'payment_invoice',
  'follow_up',
])
const usage =
  'node tools/simulation-forge/export-career-findings.mjs --tenant-id UUID --output findings.json [--cursor UUID] [--limit 5000]'
const uuid = (value) => (typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : null)
const sourceId = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,512}$/.test(value) ? value : null
const date = (value) => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const at = Date.parse(value)
  return Number.isFinite(at) ? new Date(at).toISOString() : null
}

// Keyset source ordering uses the immutable finding UUID. Original received_at is
// preserved for the replay clock; no uncertain date is assigned the current time.
// No subject, sender, name, body, audit payload, or message content is selected.
export const CAREER_FINDINGS_SQL = `
SELECT f.id, f.tenant_id, f.gmail_message_id, f.gmail_thread_id, f.mailbox_id,
       f.received_at, f.classification, f.confidence, f.status,
       f.imported_inquiry_id, f.reviewed_at,
       (f.classification IN ('inquiry', 'existing_thread')
        AND i.id IS NOT NULL
        AND i.unknown_fields->>'imported_from' = 'historical_email_scan'
        AND i.unknown_fields->>'gmail_message_id' = f.gmail_message_id
        AND (i.unknown_fields->>'gmail_mailbox_id' IS NULL
             OR i.unknown_fields->>'gmail_mailbox_id' = f.mailbox_id::text)
        AND EXISTS (
          SELECT 1 FROM messages m
          WHERE m.tenant_id = f.tenant_id
            AND m.inquiry_id = f.imported_inquiry_id
            AND m.gmail_message_id = f.gmail_message_id
            AND (m.mailbox_id IS NOT DISTINCT FROM f.mailbox_id OR m.mailbox_id IS NULL)
        )) AS receipt_verified
FROM gmail_historical_findings f
LEFT JOIN inquiries i ON i.id = f.imported_inquiry_id
  AND i.tenant_id = f.tenant_id AND i.deleted_at IS NULL
WHERE f.tenant_id = $1::uuid
  AND ($2::uuid IS NULL OR f.id > $2::uuid)
ORDER BY f.id ASC
LIMIT $3::integer
`

/** A single bounded, tenant-scoped source segment. The reader only executes SELECT. */
export async function exportCareerFindings({ tenantId, cursor = null, limit = 5000, reader }) {
  const tenant = uuid(tenantId),
    after = cursor === null ? null : uuid(cursor)
  if (!tenant || (cursor !== null && !after))
    throw new ExportError('Invalid tenant-id or cursor UUID')
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000)
    throw new ExportError('Invalid segment limit (1-5000)')
  if (typeof reader !== 'function') throw new ExportError('Invalid read-only reader')
  const rows = await reader(CAREER_FINDINGS_SQL, [tenant, after, limit + 1])
  if (!Array.isArray(rows) || rows.length > limit + 1)
    throw new ExportError('Reader exceeded bounded source segment')
  let previousId = after
  for (const row of rows) {
    if (uuid(row.tenant_id) !== tenant)
      throw new ExportError('Tenant scope mismatch in source reader')
    const id = uuid(row.id)
    if (!id || (previousId !== null && id <= previousId))
      throw new ExportError('Invalid source keyset order')
    previousId = id
  }
  const selected = rows.slice(0, limit)
  const findings = selected.map((row) => {
    const messageId = sourceId(row.gmail_message_id),
      mailboxId = uuid(row.mailbox_id)
    const reviewedAt = date(row.reviewed_at),
      importedId = uuid(row.imported_inquiry_id)
    const category = CATEGORIES.has(row.classification) ? row.classification : 'unknown'
    const validReceipt =
      row.status === 'imported' &&
      row.receipt_verified === true &&
      importedId &&
      reviewedAt &&
      messageId &&
      ['inquiry', 'existing_thread'].includes(category)
    const status = validReceipt ? 'imported' : row.status === 'dismissed' ? 'dismissed' : 'pending'
    return {
      id: uuid(row.id),
      source: 'gmail',
      sourceUrl: messageId
        ? `gmail-message:${mailboxId ?? 'legacy'}:${messageId}`
        : `business-history-finding:${uuid(row.id)}`,
      gmail_message_id: messageId,
      gmail_thread_id: sourceId(row.gmail_thread_id),
      mailbox_id: mailboxId,
      category,
      classification: category,
      confidence: ['high', 'medium', 'low'].includes(row.confidence) ? row.confidence : 'low',
      status,
      receivedAt: date(row.received_at),
      reviewedAt,
      importedInquiryId: validReceipt ? importedId : null,
    }
  })
  const hasMore = rows.length > limit
  return {
    schemaVersion: 1,
    source: 'gmail_historical_findings',
    tenantId: tenant,
    cursor: after,
    limit,
    hasMore,
    nextCursor: hasMore ? uuid(selected.at(-1).id) : null,
    exportedRows: findings.length,
    findings,
    privacy: { messageContentIncluded: false, namesIncluded: false, emailAddressesIncluded: false },
    scope: {
      queries: 'read_only',
      customerWrites: false,
      receiptVerification: 'same_tenant_live_inquiry_and_original_message',
    },
  }
}

/** Uses the caller's existing DATABASE_URL and installed postgres.js package. No credential discovery. */
export async function createPostgresReader(databaseUrl = process.env.DATABASE_URL) {
  if (typeof databaseUrl !== 'string' || !databaseUrl.trim())
    throw new ExportError('DATABASE_URL is required in the caller environment')
  let postgres
  try {
    // Resolve from the caller's installed ChefFlow checkout, including when this
    // script itself lives in a dependency-free feature worktree.
    const callerRequire = createRequire(resolve(process.cwd(), 'package.json'))
    postgres = (await import(pathToFileURL(callerRequire.resolve('postgres')).href)).default
  } catch {
    throw new ExportError('Existing postgres.js driver is unavailable in the caller checkout')
  }
  const client = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 5,
    prepare: false,
    connection: {
      default_transaction_read_only: 'on',
      statement_timeout: 10000,
      application_name: 'chefflow-career-source-export',
    },
  })
  return {
    reader: async (query, params) => {
      try {
        return await client.begin('read only', (transaction) => transaction.unsafe(query, params))
      } catch (error) {
        throw new ExportError('Read-only source database query failed', { cause: error })
      }
    },
    close: () => client.end({ timeout: 5 }),
  }
}

export async function main(
  argv = process.argv.slice(2),
  { createReader = createPostgresReader } = {}
) {
  const allowed = new Set(['--tenant-id', '--output', '--cursor', '--limit']),
    args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') {
      console.log(usage)
      return 0
    }
    if (!allowed.has(argv[i]) || !argv[i + 1] || argv[i + 1].startsWith('--'))
      throw new ExportError('Invalid export command argument')
    if (args[argv[i]]) throw new ExportError('Duplicate export command argument')
    args[argv[i]] = argv[++i]
  }
  if (!args['--tenant-id'] || !args['--output']) throw new ExportError(usage)
  // Validate before opening a connection or attempting to create a file.
  const tenantId = uuid(args['--tenant-id']),
    cursor = args['--cursor'] ? uuid(args['--cursor']) : null
  const limit = Number(args['--limit'] ?? 5000)
  if (
    !tenantId ||
    (args['--cursor'] && !cursor) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 5000
  )
    throw new ExportError('Invalid tenant-id, cursor, or segment limit')
  const connection = await createReader()
  try {
    const output = await exportCareerFindings({
      tenantId,
      cursor,
      limit,
      reader: connection.reader,
    })
    await writeFile(resolve(args['--output']), JSON.stringify(output, null, 2) + '\n', {
      flag: 'wx',
    })
    console.log(
      JSON.stringify({
        exportedRows: output.exportedRows,
        hasMore: output.hasMore,
        nextCursor: output.nextCursor,
        messageContentIncluded: false,
        customerWrites: false,
      })
    )
    return output.hasMore ? 3 : 0
  } finally {
    await connection.close()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      // Only safe, deliberately constructed messages reach stderr. Never print a
      // database exception, query parameters, connection string, or stack trace.
      console.error(
        error instanceof ExportError
          ? error.message
          : 'Read-only source export could not create the requested output'
      )
      process.exitCode = 1
    })
}
