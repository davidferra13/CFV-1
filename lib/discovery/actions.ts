'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  canonicalizeDiscoveryCuisine,
  canonicalizeDiscoveryPriceRange,
  canonicalizeDiscoveryServiceType,
} from '@/lib/discovery/constants'
import {
  DEFAULT_DISCOVERY_PROFILE,
  directoryListingToDiscoveryProfile,
  legacyChefToDiscoveryProfile,
  marketplaceRowToDiscoveryProfile,
  mergeDiscoveryProfile,
} from '@/lib/discovery/profile'
import { normalizeZipCode, resolvePublicLocationQuery } from '@/lib/geo/public-location'
import { revalidatePath, revalidateTag } from 'next/cache'
import sharp from 'sharp'
import { z } from 'zod'

const CHEF_HERO_IMAGES_BUCKET = 'chef-hero-images'
const MAX_HERO_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_HERO_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]
const HERO_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function isRelationMissingError(error: any) {
  return error?.code === '42P01' || error?.code === '42703'
}

function buildUrlFieldSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value == null || /^https?:\/\//i.test(value), 'Must be a valid URL')
}

const DiscoveryProfileInputSchema = z
  .object({
    cuisine_types: z.array(z.string()).max(12).default([]),
    service_types: z.array(z.string()).max(12).default([]),
    price_range: z.string().trim().nullable().optional(),
    min_guest_count: z.number().int().min(1).max(500).nullable().optional(),
    max_guest_count: z.number().int().min(1).max(500).nullable().optional(),
    service_area_city: z.string().trim().max(120).nullable().optional(),
    service_area_state: z.string().trim().max(80).nullable().optional(),
    service_area_zip: z.string().trim().max(20).nullable().optional(),
    service_area_radius_miles: z.number().int().min(0).max(500).nullable().optional(),
    accepting_inquiries: z.boolean().default(true),
    next_available_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
      .nullable()
      .optional(),
    lead_time_days: z.number().int().min(0).max(365).nullable().optional(),
    hero_image_url: buildUrlFieldSchema(1000),
    highlight_text: z.string().trim().max(240).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.min_guest_count != null &&
      value.max_guest_count != null &&
      value.max_guest_count < value.min_guest_count
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['max_guest_count'],
        message: 'Maximum guests must be greater than or equal to minimum guests',
      })
    }
  })

function normalizeCanonicalArray(
  values: string[],
  canonicalize: (value: string | null | undefined) => string | null,
  fieldName: string
) {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    const canonical = canonicalize(value)
    if (!canonical) {
      throw new Error(`Invalid ${fieldName} value`)
    }
    if (seen.has(canonical)) continue
    seen.add(canonical)
    normalized.push(canonical)
  }

  return normalized
}

async function fetchMarketplaceRow(db: any, chefId: string) {
  const result = await (db as any)
    .from('chef_marketplace_profiles')
    .select(
      [
        'chef_id',
        'cuisine_types',
        'service_types',
        'price_range',
        'min_guest_count',
        'max_guest_count',
        'service_area_city',
        'service_area_state',
        'service_area_zip',
        'service_area_lat',
        'service_area_lng',
        'service_area_radius_miles',
        'avg_rating',
        'review_count',
        'accepting_inquiries',
        'next_available_date',
        'lead_time_days',
        'hero_image_url',
        'highlight_text',
      ].join(', ')
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (result.error && !isRelationMissingError(result.error)) {
    console.error('[fetchMarketplaceRow]', result.error)
  }

  return result
}

async function fetchDirectoryListingRow(db: any, chefId: string) {
  const result = await (db as any)
    .from('chef_directory_listings')
    .select(
      [
        'chef_id',
        'cuisines',
        'service_types',
        'city',
        'state',
        'zip_code',
        'service_radius_miles',
        'min_price_cents',
        'max_price_cents',
        'profile_photo_url',
        'rating_avg',
        'review_count',
      ].join(', ')
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (result.error && !isRelationMissingError(result.error)) {
    console.error('[fetchDirectoryListingRow]', result.error)
  }

  return result
}

async function fetchLegacyChefRow(db: any, chefId: string) {
  const { data, error } = await db
    .from('chefs')
    .select('tagline, profile_image_url')
    .eq('id', chefId)
    .single()

  if (error) {
    console.error('[fetchLegacyChefRow]', error)
    return null
  }

  return data
}

export async function getMyDiscoveryProfile() {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const [marketplaceResult, listingResult, legacyChef] = await Promise.all([
    fetchMarketplaceRow(db, user.entityId),
    fetchDirectoryListingRow(db, user.entityId),
    fetchLegacyChefRow(db, user.entityId),
  ])

  return mergeDiscoveryProfile(
    DEFAULT_DISCOVERY_PROFILE,
    legacyChefToDiscoveryProfile(legacyChef),
    directoryListingToDiscoveryProfile(listingResult.data),
    marketplaceRowToDiscoveryProfile(marketplaceResult.data)
  )
}

export async function updateMyDiscoveryProfile(input: z.input<typeof DiscoveryProfileInputSchema>) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = DiscoveryProfileInputSchema.parse(input)

  const payload = {
    chef_id: user.entityId,
    cuisine_types: normalizeCanonicalArray(
      validated.cuisine_types,
      canonicalizeDiscoveryCuisine,
      'cuisine'
    ),
    service_types: normalizeCanonicalArray(
      validated.service_types,
      canonicalizeDiscoveryServiceType,
      'service type'
    ),
    price_range: canonicalizeDiscoveryPriceRange(validated.price_range ?? null),
    min_guest_count: validated.min_guest_count ?? null,
    max_guest_count: validated.max_guest_count ?? null,
    service_area_city: validated.service_area_city || null,
    service_area_state: validated.service_area_state || null,
    service_area_zip:
      normalizeZipCode(validated.service_area_zip) || validated.service_area_zip || null,
    service_area_radius_miles: validated.service_area_radius_miles ?? null,
    accepting_inquiries: validated.accepting_inquiries,
    next_available_date: validated.next_available_date || null,
    lead_time_days: validated.lead_time_days ?? null,
    hero_image_url: validated.hero_image_url ?? null,
    highlight_text: validated.highlight_text || null,
    service_area_lat: null as number | null,
    service_area_lng: null as number | null,
  }

  const locationQuery =
    payload.service_area_zip ||
    [payload.service_area_city, payload.service_area_state].filter(Boolean).join(', ')

  if (locationQuery) {
    const locResult = await resolvePublicLocationQuery(locationQuery)
    const resolvedLocation = locResult.data
    if (resolvedLocation) {
      payload.service_area_lat = resolvedLocation.lat
      payload.service_area_lng = resolvedLocation.lng

      if (!payload.service_area_zip && resolvedLocation.zip) {
        payload.service_area_zip = resolvedLocation.zip
      }
      if (!payload.service_area_city && resolvedLocation.city) {
        payload.service_area_city = resolvedLocation.city
      }
      if (!payload.service_area_state && resolvedLocation.state) {
        payload.service_area_state = resolvedLocation.state
      }
    }
  }

  const { data: chef } = await db
    .from('chefs')
    .select('slug, booking_slug')
    .eq('id', user.entityId)
    .single()

  const { error } = await (db as any)
    .from('chef_marketplace_profiles')
    .upsert(payload, { onConflict: 'chef_id' })

  if (error) {
    console.error('[updateMyDiscoveryProfile]', error)
    if (isRelationMissingError(error)) {
      throw new Error(
        'Discovery profile storage is not available until the marketplace migrations are applied.'
      )
    }
    throw new Error('Failed to update discovery profile')
  }

  revalidatePath('/settings/public-profile')
  revalidatePath('/chefs')
  revalidateTag(`chef-layout-${user.entityId}`)

  if (chef?.slug) {
    revalidatePath(`/chef/${chef.slug}`)
    revalidatePath(`/chef/${chef.slug}/inquire`)
  }
  if (chef?.booking_slug && chef.booking_slug !== chef?.slug) {
    revalidatePath(`/chef/${chef.booking_slug}`)
    revalidatePath(`/chef/${chef.booking_slug}/inquire`)
  }

  return { success: true }
}

function extractHeroImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/api/storage/public/${CHEF_HERO_IMAGES_BUCKET}/`
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  return decodeURIComponent(
    url
      .slice(markerIndex + marker.length)
      .split('?')[0]
      .split('#')[0]
  )
}

async function ensureChefHeroImagesBucket(db: any) {
  const { error: createError } = await db.storage.createBucket(CHEF_HERO_IMAGES_BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_HERO_IMAGE_TYPES,
    fileSizeLimit: `${MAX_HERO_IMAGE_SIZE}`,
  })
  if (!createError) return
  const message = String((createError as any)?.message || '').toLowerCase()
  const statusCode = Number((createError as any)?.statusCode || (createError as any)?.status || 0)
  const isConflict =
    statusCode === 409 ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('conflict')
  if (isConflict) return
  console.error('[ensureChefHeroImagesBucket]', createError)
  throw new Error('Storage bucket setup failed. Please create bucket "chef-hero-images" (public).')
}

async function revalidateDiscoveryPaths(db: any, chefId: string) {
  revalidatePath('/settings/public-profile')
  revalidatePath('/chefs')
  revalidateTag(`chef-layout-${chefId}`)

  const { data: chef } = await db
    .from('chefs')
    .select('slug, booking_slug')
    .eq('id', chefId)
    .maybeSingle()

  if (chef?.slug) {
    revalidatePath(`/chef/${chef.slug}`)
    revalidatePath(`/chef/${chef.slug}/inquire`)
  }
  if (chef?.booking_slug && chef.booking_slug !== chef?.slug) {
    revalidatePath(`/chef/${chef.booking_slug}`)
    revalidatePath(`/chef/${chef.booking_slug}/inquire`)
  }
}

export async function uploadDiscoveryHeroImage(
  formData: FormData
): Promise<{ success: true; url: string }> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const file = formData.get('image') as File | null
  if (!file) {
    throw new Error('No image file provided')
  }

  if (!ALLOWED_HERO_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Use JPEG, PNG, WebP, or HEIC.')
  }

  if (file.size > MAX_HERO_IMAGE_SIZE) {
    throw new Error('File too large. Maximum 10MB.')
  }

  // Get existing hero image URL for cleanup
  const existingRow = await fetchMarketplaceRow(db, user.entityId)
  const previousPath = extractHeroImagePath(existingRow.data?.hero_image_url)

  // Process image with sharp: strip EXIF metadata, convert HEIC to JPEG
  const rawBuffer = Buffer.from(await file.arrayBuffer())
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif'

  let processed: Buffer
  let finalExt: string
  let finalContentType: string

  if (isHeic) {
    processed = await sharp(rawBuffer).rotate().jpeg({ quality: 95 }).toBuffer()
    finalExt = 'jpg'
    finalContentType = 'image/jpeg'
  } else {
    processed = await sharp(rawBuffer).rotate().toBuffer()
    finalExt = HERO_IMAGE_MIME_TO_EXT[file.type] || 'jpg'
    finalContentType = file.type
  }

  const storagePath = `${user.entityId}/${Date.now()}-${crypto.randomUUID()}.${finalExt}`

  // Create a File-like object from the processed buffer for the storage upload
  const processedFile = new File([new Uint8Array(processed)], `hero.${finalExt}`, {
    type: finalContentType,
  })

  const uploadFile = async () =>
    db.storage
      .from(CHEF_HERO_IMAGES_BUCKET)
      .upload(storagePath, processedFile, { contentType: finalContentType, upsert: false })

  let { error: uploadError } = await uploadFile()

  if (
    uploadError &&
    String((uploadError as any).message || '')
      .toLowerCase()
      .includes('bucket')
  ) {
    await ensureChefHeroImagesBucket(db)
    const retry = await uploadFile()
    uploadError = retry.error
  }

  if (uploadError) {
    console.error('[uploadDiscoveryHeroImage] upload error:', uploadError)
    throw new Error('Failed to upload image')
  }

  const { data: publicUrlData } = db.storage.from(CHEF_HERO_IMAGES_BUCKET).getPublicUrl(storagePath)
  const publicUrl = publicUrlData.publicUrl

  // Upsert only hero_image_url + updated_at to avoid wiping other fields
  const { error: upsertError } = await (db as any).from('chef_marketplace_profiles').upsert(
    {
      chef_id: user.entityId,
      hero_image_url: publicUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (upsertError) {
    console.error('[uploadDiscoveryHeroImage] upsert error:', upsertError)
    // Clean up the uploaded file since DB write failed
    await db.storage.from(CHEF_HERO_IMAGES_BUCKET).remove([storagePath])
    throw new Error('Image uploaded but failed to save to profile')
  }

  // Clean up previous image if it was a local storage file
  if (previousPath && previousPath !== storagePath) {
    await db.storage.from(CHEF_HERO_IMAGES_BUCKET).remove([previousPath])
  }

  await revalidateDiscoveryPaths(db, user.entityId)

  return { success: true, url: publicUrl }
}

export async function removeDiscoveryHeroImage(): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  // Get existing hero image URL for cleanup
  const existingRow = await fetchMarketplaceRow(db, user.entityId)
  const previousPath = extractHeroImagePath(existingRow.data?.hero_image_url)

  // Set hero_image_url to null
  const { error } = await (db as any).from('chef_marketplace_profiles').upsert(
    {
      chef_id: user.entityId,
      hero_image_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    console.error('[removeDiscoveryHeroImage] error:', error)
    throw new Error('Failed to remove showcase image')
  }

  // Delete the file from storage if it's a local file
  if (previousPath) {
    await db.storage.from(CHEF_HERO_IMAGES_BUCKET).remove([previousPath])
  }

  await revalidateDiscoveryPaths(db, user.entityId)

  return { success: true }
}
