// Client Photo Constants & Types
// Extracted from photo-actions.ts — 'use server' files can only export async functions.

export const PHOTO_CATEGORIES = [
  { value: 'portrait', label: 'Client Portrait' },
  { value: 'house', label: 'House / Exterior' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining', label: 'Dining Area' },
  { value: 'outdoor', label: 'Outdoor / Patio' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other' },
] as const

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]['value']

export type ClientPhoto = {
  id: string
  client_id: string
  tenant_id: string
  storage_path: string
  filename_original: string
  content_type: string
  size_bytes: number
  caption: string | null
  category: string
  display_order: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  signedUrl: string
}
