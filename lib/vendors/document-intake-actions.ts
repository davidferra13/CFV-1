'use server'

import { uploadVendorDocument as uploadVendorDocumentAction } from './document-intake/upload'
import { applyVendorDocumentDraft as applyVendorDocumentDraftAction } from './document-intake/apply-draft'
import { listVendorDocumentUploads as listVendorDocumentUploadsAction } from './document-intake/list'

export type {
  VendorDocumentType,
  VendorDocumentStatus,
  VendorDocumentUploadRow,
  UploadVendorDocumentResult,
  ApplyVendorDocumentDraftResult,
} from './document-intake/types'

export async function uploadVendorDocument(...args: Parameters<typeof uploadVendorDocumentAction>) {
  return uploadVendorDocumentAction(...args)
}

export async function applyVendorDocumentDraft(
  ...args: Parameters<typeof applyVendorDocumentDraftAction>
) {
  return applyVendorDocumentDraftAction(...args)
}

export async function listVendorDocumentUploads(
  ...args: Parameters<typeof listVendorDocumentUploadsAction>
) {
  return listVendorDocumentUploadsAction(...args)
}
