// Public Chef Profile Server Actions
// Public: getPublicChefProfile (no auth, admin client)
// Authenticated: updateChefSlug, getChefSlug

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SlugSchema = z.string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be 50 characters or less')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')

// ============================================
// 1. GET PUBLIC CHEF PROFILE (no auth)
// ============================================

export async function getPublicChefProfile(slug: string) {
  const supabase = createServerClient({ admin: true })

  // Find chef by slug
  const { data: chef, error: chefError } = await supabase
    .from('chefs')
    .select('id, business_name, display_name, bio, profile_image_url, tagline')
    .eq('slug', slug)
    .single()

  if (chefError || !chef) return null

  // Get showcase-visible partners with locations and images
  const { data: partners } = await supabase
    .from('referral_partners')
    .select(`
      id, name, partner_type, booking_url, description, cover_image_url, showcase_order,
      partner_locations(id, name, city, state, booking_url, description, max_guest_count, is_active),
      partner_images(id, image_url, caption, season, display_order, location_id)
    `)
    .eq('tenant_id', chef.id)
    .eq('is_showcase_visible', true)
    .eq('status', 'active')
    .order('showcase_order', { ascending: true })

  // Filter active locations, sort images
  const showcasePartners = (partners || []).map(p => ({
    ...p,
    partner_locations: (p.partner_locations || []).filter(
      (l: { is_active: boolean }) => l.is_active
    ),
    partner_images: (p.partner_images || []).sort(
      (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
    ),
  }))

  return {
    chef: {
      display_name: chef.display_name || chef.business_name,
      business_name: chef.business_name,
      bio: chef.bio,
      profile_image_url: chef.profile_image_url,
      tagline: chef.tagline,
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
  const supabase = createServerClient()

  // Check uniqueness
  const { data: existing } = await supabase
    .from('chefs')
    .select('id')
    .eq('slug', validated)
    .neq('id', user.entityId)
    .single()

  if (existing) {
    throw new Error('This URL is already taken. Please choose a different one.')
  }

  const { error } = await supabase
    .from('chefs')
    .update({ slug: validated })
    .eq('id', user.entityId)

  if (error) {
    console.error('[updateChefSlug] Error:', error)
    throw new Error('Failed to update profile URL')
  }

  revalidatePath('/settings/profile')
  return { success: true, slug: validated }
}

// ============================================
// 3. UPDATE CHEF TAGLINE (authenticated)
// ============================================

export async function updateChefTagline(tagline: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chefs')
    .update({ tagline })
    .eq('id', user.entityId)

  if (error) {
    console.error('[updateChefTagline] Error:', error)
    throw new Error('Failed to update tagline')
  }

  revalidatePath('/settings/profile')
  return { success: true }
}

// ============================================
// 4. GET CHEF SLUG (authenticated)
// ============================================

export async function getChefSlug() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select('slug, tagline')
    .eq('id', user.entityId)
    .single()

  return {
    slug: data?.slug || null,
    tagline: data?.tagline || null,
  }
}
