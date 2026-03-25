'use server'

// Auto-Organization: creates year/month folder hierarchy on receipt approval.
// Folder structure: Receipts / 2026 / 03 - March
// Uses is_auto flag to distinguish auto-generated folders from manual ones.
// Idempotent: finds existing folders before creating new ones.

import { createServerClient } from '@/lib/db/server'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Ensure the Receipts / {year} / {MM} - {MonthName} folder hierarchy exists.
 * Returns the leaf folder ID for document assignment.
 * Idempotent: reuses existing auto-folders.
 */
export async function ensureReceiptFolder(tenantId: string, date: string | Date): Promise<string> {
  const db: any = createServerClient()
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear().toString()
  const monthNum = (d.getMonth() + 1).toString().padStart(2, '0')
  const monthName = MONTH_NAMES[d.getMonth()]
  const monthLabel = `${monthNum} - ${monthName}`

  // 1. Find or create root "Receipts" folder
  const rootId = await findOrCreateFolder(db, tenantId, 'Receipts', null)

  // 2. Find or create year folder under Receipts
  const yearId = await findOrCreateFolder(db, tenantId, year, rootId)

  // 3. Find or create month folder under year
  const monthId = await findOrCreateFolder(db, tenantId, monthLabel, yearId)

  return monthId
}

async function findOrCreateFolder(
  db: any,
  tenantId: string,
  name: string,
  parentFolderId: string | null
): Promise<string> {
  // Try to find existing auto-folder with this name and parent
  let query = db
    .from('chef_folders' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', name)
    .eq('is_auto', true)

  if (parentFolderId === null) {
    query = query.is('parent_folder_id', null)
  } else {
    query = query.eq('parent_folder_id', parentFolderId)
  }

  const { data: existing } = await query.limit(1).single()

  if (existing) return existing.id

  // Create new auto-folder
  const { data: created, error } = await (db
    .from('chef_folders' as any)
    .insert({
      tenant_id: tenantId,
      name,
      parent_folder_id: parentFolderId,
      is_auto: true,
    })
    .select('id')
    .single() as any)

  if (error || !created) {
    console.error('[auto-organize] Failed to create folder:', name, error)
    throw new Error(`Failed to create auto-folder: ${name}`)
  }

  return created.id
}

/**
 * Create a chef_document record for an approved receipt and place it in the auto-folder.
 * Links the document to the receipt's event and client if available.
 */
export async function createReceiptDocument(
  tenantId: string,
  opts: {
    receiptPhotoId: string
    storeName: string | null
    purchaseDate: string | null
    totalCents: number | null
    eventId: string | null
    clientId: string | null
    folderId: string
    photoUrl: string
  }
): Promise<string> {
  const db: any = createServerClient()

  const title = [
    opts.storeName ?? 'Receipt',
    opts.purchaseDate ? `(${opts.purchaseDate})` : '',
    opts.totalCents ? `$${(opts.totalCents / 100).toFixed(2)}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const { data, error } = await db
    .from('chef_documents')
    .insert({
      tenant_id: tenantId,
      title,
      document_type: 'receipt',
      content_text: null,
      summary: `Receipt from ${opts.storeName ?? 'unknown store'}${opts.purchaseDate ? ` on ${opts.purchaseDate}` : ''}`,
      source_type: 'receipt_approval',
      source_filename: null,
      event_id: opts.eventId,
      client_id: opts.clientId,
      folder_id: opts.folderId,
    } as any)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[auto-organize] Failed to create receipt document:', error)
    throw new Error('Failed to create receipt document record')
  }

  return data.id
}
