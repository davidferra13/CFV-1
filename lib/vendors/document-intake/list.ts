'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { SIGNED_URL_EXPIRY_SECONDS, VENDOR_DOCUMENTS_BUCKET } from './constants'
import type { VendorDocumentStatus, VendorDocumentType, VendorDocumentUploadRow } from './types'
import { assertVendorAccess } from './shared'

export async function listVendorDocumentUploads(
  vendorId: string,
  limit = 40
): Promise<VendorDocumentUploadRow[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const safeLimit = Math.min(Math.max(limit, 1), 200)

  await assertVendorAccess(db, user.tenantId!, vendorId)

  const { data, error } = await db
    .from('vendor_document_uploads')
    .select(
      'id, vendor_id, document_type, source_filename, file_storage_path, file_mime_type, file_size_bytes, file_hash, status, parse_summary, error_message, created_at, processed_at'
    )
    .eq('chef_id', user.tenantId!)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('[vendor-documents] list error:', error)
    throw new Error('Failed to load vendor documents')
  }

  const rows = (data ?? []) as Array<{
    id: string
    vendor_id: string
    document_type: VendorDocumentType
    source_filename: string
    file_storage_path: string | null
    file_mime_type: string | null
    file_size_bytes: number
    file_hash: string | null
    status: VendorDocumentStatus
    parse_summary: Record<string, unknown> | null
    error_message: string | null
    created_at: string
    processed_at: string | null
  }>

  const pathsToSign = rows
    .map((row) => row.file_storage_path)
    .filter((path): path is string => Boolean(path))

  const signedMap = new Map<string, string>()
  if (pathsToSign.length > 0) {
    const { data: signedUrls } = await db.storage
      .from(VENDOR_DOCUMENTS_BUCKET)
      .createSignedUrls(pathsToSign, SIGNED_URL_EXPIRY_SECONDS)

    for (const signed of signedUrls ?? []) {
      if (signed.path && signed.signedUrl) signedMap.set(signed.path, signed.signedUrl)
    }
  }

  return rows.map((row) => ({
    id: row.id,
    vendor_id: row.vendor_id,
    document_type: row.document_type,
    source_filename: row.source_filename,
    file_mime_type: row.file_mime_type,
    file_size_bytes: row.file_size_bytes,
    file_hash: row.file_hash,
    status: row.status,
    parse_summary: row.parse_summary ?? {},
    error_message: row.error_message,
    created_at: row.created_at,
    processed_at: row.processed_at,
    download_url: row.file_storage_path ? (signedMap.get(row.file_storage_path) ?? null) : null,
  }))
}
