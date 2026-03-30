'use server'

// Entity Photo Actions
// Upload or remove photos for clients (avatar), staff (photo), vendors (logo),
// equipment (photo), ingredients (image), and partners (cover image).
// All use public buckets with permanent URLs stored directly in the DB.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import * as storage from '@/lib/storage'

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = 'entity-photos'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

// Entity configs: table name, photo column, ID column for tenant scoping, revalidate paths
type EntityConfig = {
  table: string
  photoColumn: string
  tenantColumn: string
  revalidatePaths: (id: string) => string[]
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  client: {
    table: 'clients',
    photoColumn: 'avatar_url',
    tenantColumn: 'tenant_id',
    revalidatePaths: (id) => [`/clients/${id}`, '/clients'],
  },
  staff: {
    table: 'staff_members',
    photoColumn: 'photo_url',
    tenantColumn: 'chef_id',
    revalidatePaths: (id) => [`/staff/${id}`, '/staff'],
  },
  vendor: {
    table: 'vendors',
    photoColumn: 'logo_url',
    tenantColumn: 'tenant_id',
    revalidatePaths: (id) => [`/vendors/${id}`, '/vendors'],
  },
  equipment: {
    table: 'equipment_items',
    photoColumn: 'photo_url',
    tenantColumn: 'chef_id',
    revalidatePaths: (id) => ['/operations/equipment'],
  },
  ingredient: {
    table: 'ingredients',
    photoColumn: 'image_url',
    tenantColumn: 'tenant_id',
    revalidatePaths: (id) => [`/inventory/ingredients/${id}`, '/recipes/ingredients'],
  },
  partner: {
    table: 'referral_partners',
    photoColumn: 'cover_image_url',
    tenantColumn: 'tenant_id',
    revalidatePaths: (id) => [`/partners/${id}`, '/partners'],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateFile(file: File | null): string | null {
  if (!file || file.size === 0) return 'No file provided'
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Invalid file type. Accepted: JPEG, PNG, HEIC, WebP'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB`
  }
  return null
}

function extractStoragePath(publicUrl: string | null): string | null {
  if (!publicUrl) return null
  // Handle local storage URLs like /api/storage/public/entity-photos/...
  const marker = `/api/storage/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(
    publicUrl
      .slice(idx + marker.length)
      .split('?')[0]
      .split('#')[0]
  )
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadEntityPhoto(
  entityType: string,
  entityId: string,
  formData: FormData
): Promise<{ success: true; photoUrl: string } | { success: false; error: string }> {
  const config = ENTITY_CONFIGS[entityType]
  if (!config) return { success: false, error: `Unknown entity type: ${entityType}` }

  const user = await requireChef()
  const db: any = createServerClient()

  const tenantValue = config.tenantColumn === 'chef_id' ? user.entityId : user.tenantId!

  // Verify entity belongs to this tenant
  const { data: entity } = await db
    .from(config.table)
    .select(`id, ${config.photoColumn}`)
    .eq('id', entityId)
    .eq(config.tenantColumn, tenantValue)
    .single()

  if (!entity) return { success: false, error: `${entityType} not found` }

  const file = formData.get('photo') as File | null
  const validationError = validateFile(file)
  if (validationError) return { success: false, error: validationError }

  const ext = MIME_TO_EXT[file!.type]
  const storagePath = `${tenantValue}/${entityType}s/${entityId}.${ext}`

  // Remove old file if path differs
  const oldPath = extractStoragePath(entity[config.photoColumn])
  if (oldPath && oldPath !== storagePath) {
    await storage.remove(BUCKET, [oldPath])
  }

  // Upload
  const buffer = Buffer.from(await file!.arrayBuffer())
  const result = await storage.upload(BUCKET, storagePath, buffer, {
    contentType: file!.type,
    upsert: true,
  })

  if (!result) {
    return { success: false, error: 'Upload failed' }
  }

  const publicUrl = storage.getPublicUrl(BUCKET, storagePath)

  // Update DB
  const { error: updateError } = await db
    .from(config.table)
    .update({ [config.photoColumn]: publicUrl })
    .eq('id', entityId)
    .eq(config.tenantColumn, tenantValue)

  if (updateError) {
    console.error(`[uploadEntityPhoto:${entityType}] DB update failed:`, updateError)
    await storage.remove(BUCKET, [storagePath])
    return { success: false, error: 'Failed to save photo' }
  }

  for (const p of config.revalidatePaths(entityId)) {
    revalidatePath(p)
  }

  return { success: true, photoUrl: publicUrl }
}

// ─── Remove ───────────────────────────────────────────────────────────────────

export async function removeEntityPhoto(
  entityType: string,
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  const config = ENTITY_CONFIGS[entityType]
  if (!config) return { success: false, error: `Unknown entity type: ${entityType}` }

  const user = await requireChef()
  const db: any = createServerClient()

  const tenantValue = config.tenantColumn === 'chef_id' ? user.entityId : user.tenantId!

  const { data: entity } = await db
    .from(config.table)
    .select(`id, ${config.photoColumn}`)
    .eq('id', entityId)
    .eq(config.tenantColumn, tenantValue)
    .single()

  if (!entity) return { success: false, error: `${entityType} not found` }

  const oldPath = extractStoragePath(entity[config.photoColumn])
  if (oldPath) {
    await storage.remove(BUCKET, [oldPath])
  }

  await db
    .from(config.table)
    .update({ [config.photoColumn]: null })
    .eq('id', entityId)
    .eq(config.tenantColumn, tenantValue)

  for (const p of config.revalidatePaths(entityId)) {
    revalidatePath(p)
  }

  return { success: true }
}
