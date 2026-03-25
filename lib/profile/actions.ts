// Public Chef Profile Server Actions
// Public: getPublicChefProfile (no auth, admin client)
// Authenticated: updateChefSlug, getChefSlug

'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  directoryListingToDiscoveryProfile,
  legacyChefToDiscoveryProfile,
  marketplaceRowToDiscoveryProfile,
  mergeDiscoveryProfile,
} from '@/lib/discovery/profile'
import {
  findChefByPublicSlug,
  getPublicChefPathSlug,
  getPublicInquirySlug,
} from '@/lib/profile/public-chef'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

const SlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be 50 characters or less')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')

const CHEF_PORTAL_BACKGROUNDS_BUCKET = 'chef-portal-backgrounds'
const MAX_BACKGROUND_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_BACKGROUND_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]
const BACKGROUND_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

function isRelationMissingError(error: any) {
  return error?.code === '42P01' || error?.code === '42703'
}

function extractPortalBackgroundPath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${CHEF_PORTAL_BACKGROUNDS_BUCKET}/`
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  const encodedPath = url
    .slice(markerIndex + marker.length)
    .split('?')[0]
    .split('#')[0]
  if (!encodedPath) return null
  return decodeURIComponent(encodedPath)
}

async function ensureChefPortalBackgroundsBucket(db: any) {
  const { error: createError } = await db.storage.createBucket(CHEF_PORTAL_BACKGROUNDS_BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_BACKGROUND_IMAGE_TYPES,
    fileSizeLimit: `${MAX_BACKGROUND_IMAGE_SIZE}`,
  } as any)

  if (!createError) return

  const message = String((createError as any)?.message || '').toLowerCase()
  const statusCode = Number((createError as any)?.statusCode || (createError as any)?.status || 0)
  const isConflict =
    statusCode === 409 ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('conflict')

  if (isConflict) return

  const { data: buckets, error: listError } = await db.storage.listBuckets()
  if (!listError) {
    const exists = (buckets || []).some(
      (bucket: any) => bucket.id === CHEF_PORTAL_BACKGROUNDS_BUCKET
    )
    if (exists) return
  }

  console.error('[ensureChefPortalBackgroundsBucket] createBucket error:', createError)
  throw new Error(
    'Storage bucket setup failed. Please create bucket "chef-portal-backgrounds" (public).'
  )
}

// ============================================
// 1. GET PUBLIC CHEF PROFILE (no auth)
// ============================================

export async function getPublicChefProfile(slug: string) {
  const db: any = createServerClient({ admin: true })

  let chefLookup = await findChefByPublicSlug<any>(
    db,
    slug,
    [
      'id',
      'slug',
      'booking_slug',
      'booking_enabled',
      'business_name',
      'display_name',
      'bio',
      'profile_image_url',
      'logo_url',
      'tagline',
      'website_url',
      'show_website_on_public_profile',
      'preferred_inquiry_destination',
      'portal_primary_color',
      'portal_background_color',
      'portal_background_image_url',
      'show_availability_signals',
    ].join(', ')
  )

  // Backward compatibility before website controls migration is applied.
  if (chefLookup.error?.code === '42703') {
    chefLookup = await findChefByPublicSlug<any>(
      db,
      slug,
      [
        'id',
        'slug',
        'booking_slug',
        'booking_enabled',
        'business_name',
        'display_name',
        'bio',
        'profile_image_url',
        'tagline',
        'portal_primary_color',
        'portal_background_color',
        'portal_background_image_url',
      ].join(', ')
    )
  }

  const chef = chefLookup.data
  if (chefLookup.error || !chef) return null

  const [partnersResult, marketplaceResult, listingResult] = await Promise.all([
    db
      .from('referral_partners')
      .select(
        `
        id, name, partner_type, booking_url, description, cover_image_url, showcase_order,
        partner_locations(id, name, address, city, state, zip, booking_url, description, max_guest_count, is_active),
        partner_images(id, image_url, caption, season, display_order, location_id)
      `
      )
      .eq('tenant_id', chef.id)
      .eq('is_showcase_visible', true)
      .eq('status', 'active')
      .order('showcase_order', { ascending: true }),
    (db as any)
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
      .eq('chef_id', chef.id)
      .maybeSingle(),
    (db as any)
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
      .eq('chef_id', chef.id)
      .maybeSingle(),
  ])

  const showcasePartners = (partnersResult.data || []).map((partner: any) => ({
    ...partner,
    partner_locations: (partner.partner_locations || []).filter(
      (location: { is_active: boolean }) => location.is_active
    ),
    partner_images: (partner.partner_images || []).sort(
      (a: { display_order: number | null }, b: { display_order: number | null }) =>
        (a.display_order ?? 0) - (b.display_order ?? 0)
    ),
  }))

  if (marketplaceResult.error && !isRelationMissingError(marketplaceResult.error)) {
    console.error(
      '[getPublicChefProfile] marketplace profile fetch error:',
      marketplaceResult.error
    )
  }
  if (listingResult.error && !isRelationMissingError(listingResult.error)) {
    console.error('[getPublicChefProfile] directory listing fetch error:', listingResult.error)
  }

  const discovery = mergeDiscoveryProfile(
    legacyChefToDiscoveryProfile(chef),
    directoryListingToDiscoveryProfile(listingResult.data),
    marketplaceRowToDiscoveryProfile(marketplaceResult.data)
  )
  const publicSlug = getPublicChefPathSlug(chef)
  const inquirySlug = getPublicInquirySlug(chef)

  return {
    chef: {
      id: chef.id,
      slug: chef.slug ?? null,
      booking_slug: chef.booking_slug ?? null,
      public_slug: publicSlug,
      inquiry_slug: inquirySlug,
      booking_enabled: chef.booking_enabled ?? false,
      display_name: chef.display_name || chef.business_name,
      business_name: chef.business_name,
      bio: chef.bio,
      profile_image_url: chef.profile_image_url ?? discovery.hero_image_url,
      logo_url: chef.logo_url ?? null,
      tagline: chef.tagline ?? discovery.highlight_text,
      website_url: chef.website_url,
      show_website_on_public_profile: chef.show_website_on_public_profile ?? true,
      preferred_inquiry_destination: chef.preferred_inquiry_destination ?? 'both',
      portal_primary_color: chef.portal_primary_color,
      portal_background_color: chef.portal_background_color,
      portal_background_image_url: chef.portal_background_image_url,
      show_availability_signals: chef.show_availability_signals ?? false,
      discovery,
    },
    partners: showcasePartners,
  }
}

// ============================================
// 2. UPDATE CHEF SLUG (authenticated)
// ============================================

export async function updateChefSlug(slug: string) {
  const user = await requireChef()
  const validated = SlugSchema.parse(slug)
  const db: any = createServerClient()

  // Check uniqueness
  const { data: existing } = await db
    .from('chefs')
    .select('id')
    .eq('slug', validated)
    .neq('id', user.entityId)
    .single()

  if (existing) {
    throw new Error('This URL is already taken. Please choose a different one.')
  }

  const { error } = await db.from('chefs').update({ slug: validated }).eq('id', user.entityId)

  if (error) {
    console.error('[updateChefSlug] Error:', error)
    throw new Error('Failed to update profile URL')
  }

  revalidatePath('/settings/profile')
  revalidateTag(`chef-layout-${user.entityId}`)
  return { success: true, slug: validated }
}

// ============================================
// 3. UPDATE CHEF TAGLINE (authenticated)
// ============================================

export async function updateChefTagline(tagline: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('chefs').update({ tagline }).eq('id', user.entityId)

  if (error) {
    console.error('[updateChefTagline] Error:', error)
    throw new Error('Failed to update tagline')
  }

  revalidatePath('/settings/profile')
  revalidateTag(`chef-layout-${user.entityId}`)
  return { success: true }
}

const UpdateChefPortalThemeSchema = z.object({
  tagline: z.string().trim().max(250).nullable().optional(),
  portal_primary_color: HexColorSchema.nullable().optional(),
  portal_background_color: HexColorSchema.nullable().optional(),
  portal_background_image_url: z.string().trim().url().nullable().optional(),
})

export async function updateChefPortalTheme(input: z.infer<typeof UpdateChefPortalThemeSchema>) {
  const user = await requireChef()
  const validated = UpdateChefPortalThemeSchema.parse(input)
  const db: any = createServerClient()

  const { data: currentChef } = await db
    .from('chefs')
    .select('slug, booking_slug')
    .eq('id', user.entityId)
    .single()

  const payload: Record<string, string | null> = {}

  if (Object.prototype.hasOwnProperty.call(validated, 'tagline')) {
    payload.tagline = validated.tagline ?? null
  }
  if (Object.prototype.hasOwnProperty.call(validated, 'portal_primary_color')) {
    payload.portal_primary_color = validated.portal_primary_color ?? null
  }
  if (Object.prototype.hasOwnProperty.call(validated, 'portal_background_color')) {
    payload.portal_background_color = validated.portal_background_color ?? null
  }
  if (Object.prototype.hasOwnProperty.call(validated, 'portal_background_image_url')) {
    payload.portal_background_image_url = validated.portal_background_image_url ?? null
  }

  if (Object.keys(payload).length === 0) {
    return { success: true }
  }

  const { error } = await db.from('chefs').update(payload).eq('id', user.entityId)

  if (error) {
    console.error('[updateChefPortalTheme] Error:', error)
    throw new Error('Failed to update portal theme')
  }

  revalidatePath('/settings/public-profile')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidateTag(`chef-layout-${user.entityId}`)
  if (currentChef?.slug) {
    revalidatePath(`/chef/${currentChef.slug}`)
    revalidatePath(`/chef/${currentChef.slug}/inquire`)
  }
  if (currentChef?.booking_slug && currentChef.booking_slug !== currentChef?.slug) {
    revalidatePath(`/chef/${currentChef.booking_slug}`)
    revalidatePath(`/chef/${currentChef.booking_slug}/inquire`)
  }

  return { success: true }
}

export async function uploadChefPortalBackgroundImage(
  formData: FormData
): Promise<{ success: true; url: string }> {
  const user = await requireChef()
  const db: any = createAdminClient()

  const file = formData.get('image') as File | null
  if (!file) throw new Error('No image file provided')

  if (!ALLOWED_BACKGROUND_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Use JPEG, PNG, HEIC, or WebP')
  }
  if (file.size > MAX_BACKGROUND_IMAGE_SIZE) {
    throw new Error(
      `File too large. Maximum ${(MAX_BACKGROUND_IMAGE_SIZE / 1024 / 1024).toFixed(0)}MB`
    )
  }

  const { data: currentChef } = await db
    .from('chefs')
    .select('slug, booking_slug, portal_background_image_url')
    .eq('id', user.entityId)
    .single()

  const previousPath = extractPortalBackgroundPath(currentChef?.portal_background_image_url)
  const ext = BACKGROUND_IMAGE_MIME_TO_EXT[file.type] || 'jpg'
  const storagePath = `${user.entityId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const uploadFile = async () =>
    db.storage.from(CHEF_PORTAL_BACKGROUNDS_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  let { error: uploadError } = await uploadFile()

  if (
    uploadError &&
    String(uploadError.message || '')
      .toLowerCase()
      .includes('bucket')
  ) {
    await ensureChefPortalBackgroundsBucket(db)
    const retry = await uploadFile()
    uploadError = retry.error
  }

  if (uploadError) {
    console.error('[uploadChefPortalBackgroundImage] upload error:', uploadError)
    throw new Error('Failed to upload background image')
  }

  const { data: publicUrlData } = db.storage
    .from(CHEF_PORTAL_BACKGROUNDS_BUCKET)
    .getPublicUrl(storagePath)

  const publicUrl = publicUrlData.publicUrl
  const { error: updateError } = await db
    .from('chefs')
    .update({ portal_background_image_url: publicUrl })
    .eq('id', user.entityId)

  if (updateError) {
    console.error('[uploadChefPortalBackgroundImage] update profile error:', updateError)
    await db.storage.from(CHEF_PORTAL_BACKGROUNDS_BUCKET).remove([storagePath])
    throw new Error('Image uploaded but failed to save portal settings')
  }

  if (previousPath && previousPath !== storagePath) {
    await db.storage.from(CHEF_PORTAL_BACKGROUNDS_BUCKET).remove([previousPath])
  }

  revalidatePath('/settings/public-profile')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidateTag(`chef-layout-${user.entityId}`)
  if (currentChef?.slug) {
    revalidatePath(`/chef/${currentChef.slug}`)
    revalidatePath(`/chef/${currentChef.slug}/inquire`)
  }
  if (currentChef?.booking_slug && currentChef.booking_slug !== currentChef?.slug) {
    revalidatePath(`/chef/${currentChef.booking_slug}`)
    revalidatePath(`/chef/${currentChef.booking_slug}/inquire`)
  }

  return { success: true, url: publicUrl }
}

// ============================================
// 4. GET CHEF SLUG (authenticated)
// ============================================

export async function getChefSlug() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chefs')
    .select(
      'slug, tagline, portal_primary_color, portal_background_color, portal_background_image_url'
    )
    .eq('id', user.entityId)
    .single()

  return {
    slug: data?.slug || null,
    tagline: data?.tagline || null,
    portal_primary_color: data?.portal_primary_color || null,
    portal_background_color: data?.portal_background_color || null,
    portal_background_image_url: data?.portal_background_image_url || null,
  }
}
