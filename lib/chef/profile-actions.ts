'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const UpdateChefFullProfileSchema = z.object({
  business_name: z.string().max(120).optional(),
  display_name: z.string().max(100).nullable().optional(),
  bio: z.string().max(1200).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  tagline: z.string().max(160).nullable().optional(),
  google_review_url: z.string().url('Google review URL must be valid').nullable().optional(),
  profile_image_url: z.string().url('Profile image URL must be valid').nullable().optional(),
  website_url: z.string().url('Website URL must be valid').nullable().optional(),
  show_website_on_public_profile: z.boolean().optional(),
  preferred_inquiry_destination: z
    .enum(['website_only', 'chefflow_only', 'both'])
    .optional(),
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
  website_url: string | null
  show_website_on_public_profile: boolean
  preferred_inquiry_destination: 'website_only' | 'chefflow_only' | 'both'
}

export async function getChefFullProfile(): Promise<ChefFullProfile> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let { data, error } = await supabase
    .from('chefs')
    .select(`
      business_name,
      display_name,
      bio,
      phone,
      tagline,
      google_review_url,
      profile_image_url,
      website_url,
      show_website_on_public_profile,
      preferred_inquiry_destination
    `)
    .eq('id', user.entityId)
    .single()

  // Backward compatibility before the migration is applied.
  if (error?.code === '42703') {
    const fallback = await supabase
      .from('chefs')
      .select('business_name, display_name, bio, phone, tagline, google_review_url, profile_image_url')
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
    website_url: data.website_url ?? null,
    show_website_on_public_profile: data.show_website_on_public_profile ?? true,
    preferred_inquiry_destination: data.preferred_inquiry_destination ?? 'both',
  }
}

export async function updateChefFullProfile(input: UpdateChefFullProfileInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validated = UpdateChefFullProfileSchema.parse(input)

  const payload: Record<string, unknown> = {
    display_name: validated.display_name?.trim() || null,
    bio: validated.bio?.trim() || null,
    phone: validated.phone?.trim() || null,
    tagline: validated.tagline?.trim() || null,
    google_review_url: validated.google_review_url?.trim() || null,
    profile_image_url: validated.profile_image_url?.trim() || null,
    website_url: validated.website_url?.trim() || null,
    show_website_on_public_profile: validated.show_website_on_public_profile ?? true,
    preferred_inquiry_destination: validated.preferred_inquiry_destination ?? 'both',
  }

  // Only update business_name if a non-empty value was provided (preserves DB NOT NULL)
  const trimmedBusinessName = validated.business_name?.trim()
  if (trimmedBusinessName) {
    payload.business_name = trimmedBusinessName
  }

  let { error } = await supabase
    .from('chefs')
    .update(payload)
    .eq('id', user.entityId)

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
    const fallback = await supabase
      .from('chefs')
      .update(fallbackPayload)
      .eq('id', user.entityId)
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

  return { success: true as const }
}
