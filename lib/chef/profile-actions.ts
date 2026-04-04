'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { optimizeLogo } from '@/lib/images/optimize'

const CHEF_LOGOS_BUCKET = 'chef-logos'
const MAX_LOGO_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const LOGO_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

function extractChefLogoPath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${CHEF_LOGOS_BUCKET}/`
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  return decodeURIComponent(
    url
      .slice(markerIndex + marker.length)
      .split('?')[0]
      .split('#')[0]
  )
}

async function ensureChefLogosBucket(db: any) {
  const { error: createError } = await db.storage.createBucket(CHEF_LOGOS_BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_LOGO_TYPES,
    fileSizeLimit: `${MAX_LOGO_SIZE}`,
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
  console.error('[ensureChefLogosBucket]', createError)
  throw new Error('Storage bucket setup failed. Please create bucket "chef-logos" (public).')
}

const SocialLinksSchema = z
  .object({
    instagram: z.string().url('Instagram URL must be valid').optional().or(z.literal('')),
    tiktok: z.string().url('TikTok URL must be valid').optional().or(z.literal('')),
    facebook: z.string().url('Facebook URL must be valid').optional().or(z.literal('')),
    youtube: z.string().url('YouTube URL must be valid').optional().or(z.literal('')),
    linktree: z.string().url('Linktree URL must be valid').optional().or(z.literal('')),
  })
  .optional()

export type ChefSocialLinks = {
  instagram?: string
  tiktok?: string
  facebook?: string
  youtube?: string
  linktree?: string
}

const UpdateChefFullProfileSchema = z.object({
  business_name: z.string().max(120).optional(),
  display_name: z.string().max(100).nullable().optional(),
  bio: z.string().max(1200).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  tagline: z.string().max(160).nullable().optional(),
  google_review_url: z.string().url('Google review URL must be valid').nullable().optional(),
  profile_image_url: z.string().url('Profile image URL must be valid').nullable().optional(),
  logo_url: z.string().url('Logo URL must be valid').nullable().optional(),
  website_url: z.string().url('Website URL must be valid').nullable().optional(),
  show_website_on_public_profile: z.boolean().optional(),
  preferred_inquiry_destination: z.enum(['website_only', 'chefflow_only', 'both']).optional(),
  social_links: SocialLinksSchema,
})

export type UpdateChefFullProfileInput = z.infer<typeof UpdateChefFullProfileSchema>

export type ChefFullProfile = {
  business_name: string
  display_name: string | null
  bio: string | null
  phone: string | null
  tagline: string | null
  google_review_url: string | null
  profile_image_url: string | null
  logo_url: string | null
  website_url: string | null
  show_website_on_public_profile: boolean
  preferred_inquiry_destination: 'website_only' | 'chefflow_only' | 'both'
  social_links: ChefSocialLinks
}

export async function getChefFullProfile(): Promise<ChefFullProfile> {
  const user = await requireChef()
  const db: any = createServerClient()

  let { data, error } = await db
    .from('chefs')
    .select(
      `
      business_name,
      display_name,
      bio,
      phone,
      tagline,
      google_review_url,
      profile_image_url,
      logo_url,
      website_url,
      show_website_on_public_profile,
      preferred_inquiry_destination,
      social_links
    `
    )
    .eq('id', user.entityId)
    .single()

  // Backward compatibility before the migration is applied.
  if (error?.code === '42703') {
    const fallback = await db
      .from('chefs')
      .select(
        'business_name, display_name, bio, phone, tagline, google_review_url, profile_image_url'
      )
      .eq('id', user.entityId)
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error || !data) {
    console.error('[getChefFullProfile] Error:', error)
    throw new Error('Failed to fetch profile')
  }

  return {
    business_name: data.business_name,
    display_name: data.display_name ?? null,
    bio: data.bio ?? null,
    phone: data.phone ?? null,
    tagline: data.tagline ?? null,
    google_review_url: data.google_review_url ?? null,
    profile_image_url: data.profile_image_url ?? null,
    logo_url: data.logo_url ?? null,
    website_url: data.website_url ?? null,
    show_website_on_public_profile: data.show_website_on_public_profile ?? true,
    preferred_inquiry_destination: data.preferred_inquiry_destination ?? 'both',
    social_links: (data.social_links as ChefSocialLinks) ?? {},
  }
}

export async function updateChefFullProfile(input: UpdateChefFullProfileInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = UpdateChefFullProfileSchema.parse(input)

  // Normalize social_links: strip empty strings so the DB stores clean data
  const normalizedSocialLinks: ChefSocialLinks = {}
  if (validated.social_links) {
    for (const [key, value] of Object.entries(validated.social_links)) {
      const trimmed = value?.trim()
      if (trimmed) {
        normalizedSocialLinks[key as keyof ChefSocialLinks] = trimmed
      }
    }
  }

  const payload: Record<string, unknown> = {
    display_name: validated.display_name?.trim() || null,
    bio: validated.bio?.trim() || null,
    phone: validated.phone?.trim() || null,
    tagline: validated.tagline?.trim() || null,
    google_review_url: validated.google_review_url?.trim() || null,
    profile_image_url: validated.profile_image_url?.trim() || null,
    logo_url: validated.logo_url?.trim() || null,
    website_url: validated.website_url?.trim() || null,
    show_website_on_public_profile: validated.show_website_on_public_profile ?? true,
    preferred_inquiry_destination: validated.preferred_inquiry_destination ?? 'both',
    social_links: normalizedSocialLinks,
  }

  // Only update business_name if a non-empty value was provided (preserves DB NOT NULL)
  const trimmedBusinessName = validated.business_name?.trim()
  if (trimmedBusinessName) {
    payload.business_name = trimmedBusinessName
  }

  let { error } = await db.from('chefs').update(payload).eq('id', user.entityId)

  // Backward compatibility before the migration is applied.
  if (error?.code === '42703') {
    const fallbackPayload: Record<string, unknown> = {
      display_name: payload.display_name,
      bio: payload.bio,
      phone: payload.phone,
      tagline: payload.tagline,
      google_review_url: payload.google_review_url,
      profile_image_url: payload.profile_image_url,
    }
    if (payload.business_name) fallbackPayload.business_name = payload.business_name
    const fallback = await db.from('chefs').update(fallbackPayload).eq('id', user.entityId)
    error = fallback.error
  }

  if (error) {
    console.error('[updateChefFullProfile] Error:', error)
    throw new Error('Failed to update profile')
  }

  revalidatePath('/settings')
  revalidatePath('/settings/my-profile')
  revalidatePath('/settings/public-profile')
  revalidatePath('/settings/profile')
  revalidateTag(`chef-layout-${user.entityId}`)

  return { success: true as const }
}

/**
 * Upload a chef business logo and save the resulting public URL on the profile.
 * Separate from the profile photo - this is the brand/business logo mark.
 */
export async function uploadChefLogo(formData: FormData): Promise<{ success: true; url: string }> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const file = formData.get('logo') as File | null
  if (!file) {
    throw new Error('No logo file provided')
  }

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Use JPEG, PNG, WebP, or SVG')
  }

  if (file.size > MAX_LOGO_SIZE) {
    throw new Error(`File too large. Maximum ${(MAX_LOGO_SIZE / 1024 / 1024).toFixed(0)}MB`)
  }

  const { data: currentChef } = await db
    .from('chefs')
    .select('logo_url')
    .eq('id', user.entityId)
    .maybeSingle()

  const previousPath = extractChefLogoPath((currentChef as any)?.logo_url ?? null)

  // Optimize: resize to max 400px wide, convert to WebP (SVGs pass through)
  const rawBuffer = Buffer.from(await file.arrayBuffer())
  const optimized = await optimizeLogo(rawBuffer, file.type)

  const storagePath = `${user.entityId}/${Date.now()}-${crypto.randomUUID()}.${optimized.ext}`

  const uploadFile = async () =>
    db.storage
      .from(CHEF_LOGOS_BUCKET)
      .upload(storagePath, optimized.data, { contentType: optimized.mimeType, upsert: false })

  let { error: uploadError } = await uploadFile()

  if (
    uploadError &&
    String((uploadError as any).message || '')
      .toLowerCase()
      .includes('bucket')
  ) {
    await ensureChefLogosBucket(db)
    const retry = await uploadFile()
    uploadError = retry.error
  }

  if (uploadError) {
    console.error('[uploadChefLogo] upload error:', uploadError)
    throw new Error('Failed to upload logo')
  }

  const { data: publicUrlData } = db.storage.from(CHEF_LOGOS_BUCKET).getPublicUrl(storagePath)

  const publicUrl = publicUrlData.publicUrl

  const { error: updateError } = await db
    .from('chefs')
    .update({ logo_url: publicUrl })
    .eq('id', user.entityId)

  if (updateError) {
    console.error('[uploadChefLogo] update error:', updateError)
    await db.storage.from(CHEF_LOGOS_BUCKET).remove([storagePath])
    throw new Error('Logo uploaded but failed to save to profile')
  }

  if (previousPath && previousPath !== storagePath) {
    await db.storage.from(CHEF_LOGOS_BUCKET).remove([previousPath])
  }

  revalidatePath('/settings')
  revalidatePath('/settings/my-profile')
  revalidatePath('/settings/account')
  revalidateTag(`chef-layout-${user.entityId}`)

  return { success: true, url: publicUrl }
}

/**
 * Remove the chef's business logo, clearing the logo_url column.
 */
export async function removeChefLogo(): Promise<{ success: true }> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: currentChef } = await db
    .from('chefs')
    .select('logo_url')
    .eq('id', user.entityId)
    .maybeSingle()

  const previousPath = extractChefLogoPath((currentChef as any)?.logo_url ?? null)

  const { error } = await db.from('chefs').update({ logo_url: null }).eq('id', user.entityId)

  if (error) {
    throw new Error('Failed to remove logo')
  }

  if (previousPath) {
    try {
      await db.storage.from(CHEF_LOGOS_BUCKET).remove([previousPath])
    } catch (err) {
      console.warn('[removeChefLogo] failed to delete file:', err)
    }
  }

  revalidatePath('/settings')
  revalidatePath('/settings/my-profile')
  revalidatePath('/settings/account')
  revalidateTag(`chef-layout-${user.entityId}`)

  return { success: true }
}

export async function markOnboardingComplete() {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('chefs')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.entityId)

  return { success: true }
}

export async function getOnboardingStatus(): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chefs')
    .select('onboarding_completed_at, onboarding_banner_dismissed_at')
    .eq('id', user.entityId)
    .single()

  // Fail open: if we can't find the chef row, don't trap the user in a redirect loop
  if (!data) return true

  // Onboarding is "done" if the wizard was completed OR the user dismissed the banner
  // (dismissing = user explicitly opted out of onboarding)
  return !!(data as any)?.onboarding_completed_at || !!(data as any)?.onboarding_banner_dismissed_at
}
