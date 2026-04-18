'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { WIZARD_STEPS, type OnboardingStepKey } from './onboarding-constants'

// ============================================
// EXISTING DATA (for pre-filling the wizard)
// ============================================

export async function getExistingProfileData() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: chef } = await db
    .from('chefs')
    .select(
      'business_name, display_name, cuisine_specialties, city, state, bio, website_url, phone, social_links, profile_image_url, logo_url'
    )
    .eq('id', tenantId)
    .maybeSingle()

  const { data: prefs } = await db
    .from('chef_preferences')
    .select('network_discoverable')
    .eq('chef_id', tenantId)
    .maybeSingle()

  const { data: directory } = await db
    .from('chef_directory_listings')
    .select('service_radius_miles')
    .eq('chef_id', tenantId)
    .maybeSingle()

  const { data: pricing } = await db
    .from('chef_pricing_config')
    .select('group_rate_3_course, minimum_booking_cents, cook_and_leave_rate, add_on_catalog')
    .eq('chef_id', tenantId)
    .maybeSingle()

  return {
    profile: chef
      ? {
          businessName: chef.business_name || '',
          cuisines: (chef.cuisine_specialties as string[]) || [],
          city: chef.city || '',
          state: chef.state || '',
          bio: chef.bio || '',
          websiteUrl: chef.website_url || '',
          phone: chef.phone || '',
          socialLinks: (chef.social_links as Record<string, string>) || {},
          profileImageUrl: chef.profile_image_url || null,
          logoUrl: chef.logo_url || null,
          isPublic: prefs?.network_discoverable ?? true,
          serviceRadius: directory?.service_radius_miles || null,
        }
      : null,
    pricing: pricing
      ? {
          hourlyRate: pricing.cook_and_leave_rate
            ? (pricing.cook_and_leave_rate / 100).toString()
            : '',
          perGuestRate: pricing.group_rate_3_course
            ? (pricing.group_rate_3_course / 100).toString()
            : '',
          minimumBooking: pricing.minimum_booking_cents
            ? (pricing.minimum_booking_cents / 100).toString()
            : '',
          packages: Array.isArray(pricing.add_on_catalog)
            ? (
                pricing.add_on_catalog as Array<{
                  name: string
                  price_cents: number
                  type?: string
                }>
              )
                .filter((p) => p.type === 'package')
                .map((p) => ({
                  name: p.name,
                  priceDollars: (p.price_cents / 100).toString(),
                }))
            : [],
        }
      : null,
  }
}

// ============================================
// SERVER ACTIONS
// ============================================

export async function getOnboardingProgress() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('onboarding_progress')
    .select('step_key, completed_at, skipped, data')
    .eq('chef_id', tenantId)

  if (error) {
    console.error('[onboarding] Failed to get progress', error)
    return []
  }

  return data ?? []
}

export async function completeStep(stepKey: string, data?: Record<string, unknown>) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Triple-write profile data to chefs, chef_directory_listings, chef_marketplace_profiles
  if (stepKey === 'profile' && data) {
    try {
      await persistProfileData(db, tenantId, data)
    } catch (err) {
      console.error('[onboarding] Profile triple-write error', err)
      // Non-blocking: profile data persistence is best-effort during onboarding
    }
  }

  // If this is the pricing step, persist the pricing config to chef_pricing_config
  if (stepKey === 'pricing' && data?.pricingConfig) {
    try {
      const pricingUpdates = data.pricingConfig as Record<string, unknown>

      // Ensure a config row exists (upsert)
      await db
        .from('chef_pricing_config')
        .upsert({ chef_id: tenantId }, { onConflict: 'chef_id' })
        .select('id')
        .single()

      // Update only the provided fields
      const { error: pricingError } = await db
        .from('chef_pricing_config')
        .update(pricingUpdates)
        .eq('chef_id', tenantId)

      if (pricingError) {
        console.error('[onboarding] Failed to save pricing config', pricingError)
        return { success: false, error: 'Failed to save pricing configuration' }
      }

      revalidatePath('/settings/pricing')
    } catch (err) {
      console.error('[onboarding] Pricing config error', err)
      return { success: false, error: 'Failed to save pricing configuration' }
    }
  }

  const { error } = await db.from('onboarding_progress').upsert(
    {
      chef_id: tenantId,
      step_key: stepKey,
      completed_at: new Date().toISOString(),
      skipped: false,
      data: data ?? {},
    },
    { onConflict: 'chef_id,step_key' }
  )

  if (error) {
    console.error('[onboarding] Failed to complete step', error)
    return { success: false, error: 'Failed to save progress' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/onboarding')
  return { success: true }
}

export async function skipStep(stepKey: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db.from('onboarding_progress').upsert(
    {
      chef_id: tenantId,
      step_key: stepKey,
      skipped: true,
      data: {},
    },
    { onConflict: 'chef_id,step_key' }
  )

  if (error) {
    console.error('[onboarding] Failed to skip step', error)
    return { success: false, error: 'Failed to save progress' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function resetOnboarding() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db.from('onboarding_progress').delete().eq('chef_id', tenantId)

  if (error) {
    console.error('[onboarding] Failed to reset onboarding', error)
    return { success: false, error: 'Failed to reset onboarding' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getOnboardingProgressSummary() {
  const progress = await getOnboardingProgress()

  // Count only against the 5 required wizard steps for banner/status purposes
  const totalSteps = WIZARD_STEPS.length
  const wizardKeys = new Set(WIZARD_STEPS.map((s) => s.key))
  const wizardProgress = progress.filter((p: any) => wizardKeys.has(p.step_key))
  const completed = wizardProgress.filter((p: any) => p.completed_at).length
  const skipped = wizardProgress.filter((p: any) => p.skipped).length
  const percentComplete = Math.round((completed / totalSteps) * 100)

  // Find the first wizard step not yet completed or skipped
  const doneKeys = new Set(progress.map((p: any) => p.step_key))
  const currentStep = WIZARD_STEPS.find((s) => !doneKeys.has(s.key))?.key ?? null

  return {
    totalSteps,
    completed,
    skipped,
    percentComplete,
    currentStep,
    progress,
  }
}

// ============================================
// WIZARD COMPLETION
// ============================================

export async function completeOnboardingWizard() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_banner_dismissed_at: new Date().toISOString(),
    })
    .eq('id', user.entityId)

  if (error) {
    console.error('[onboarding] Failed to mark wizard complete', error)
    return { success: false, error: 'Failed to complete onboarding' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/onboarding')
  return { success: true }
}

// ============================================
// BANNER DISMISSAL
// ============================================

export async function dismissOnboardingBanner() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({ onboarding_banner_dismissed_at: new Date().toISOString() })
    .eq('id', user.entityId)

  if (error) {
    console.error('[onboarding] Failed to dismiss banner', error)
    return { success: false, error: 'Failed to dismiss banner' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function dismissOnboardingReminder() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Increment the counter
  const { data: chef } = await db
    .from('chefs')
    .select('onboarding_reminders_dismissed')
    .eq('id', user.entityId)
    .single()

  const current = chef?.onboarding_reminders_dismissed ?? 0

  const { error } = await db
    .from('chefs')
    .update({ onboarding_reminders_dismissed: current + 1 })
    .eq('id', user.entityId)

  if (error) {
    console.error('[onboarding] Failed to dismiss reminder', error)
    return { success: false, error: 'Failed to dismiss reminder' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getOnboardingDismissalState() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chefs')
    .select(
      'onboarding_completed_at, onboarding_banner_dismissed_at, onboarding_reminders_dismissed'
    )
    .eq('id', user.entityId)
    .single()

  return {
    wizardCompleted: !!data?.onboarding_completed_at,
    bannerDismissed: !!data?.onboarding_banner_dismissed_at,
    remindersDismissed: data?.onboarding_reminders_dismissed ?? 0,
  }
}

// ============================================
// PORTFOLIO PHOTO UPLOAD
// ============================================

export async function uploadPortfolioPhotos(
  formData: FormData
): Promise<
  | { success: true; urls: string[]; skipped?: { name: string; reason: string }[] }
  | { success: false; error: string }
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const files = formData.getAll('photos') as File[]
  if (!files || files.length === 0) {
    return { success: false, error: 'No photos provided' }
  }
  if (files.length > 50) {
    return { success: false, error: 'Maximum 50 photos per upload batch' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const maxSize = 5 * 1024 * 1024

  const uploadedUrls: string[] = []
  const skipped: { name: string; reason: string }[] = []

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      skipped.push({ name: file.name, reason: 'Unsupported format' })
      continue
    }
    if (file.size > maxSize) {
      skipped.push({ name: file.name, reason: 'Exceeds 5MB limit' })
      continue
    }

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const storagePath = `${tenantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    const uploadFn = async () =>
      db.storage.from('portfolio-photos').upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    let { error: uploadError } = await uploadFn()

    // Auto-create bucket if missing
    if (
      uploadError &&
      String(uploadError?.message || '')
        .toLowerCase()
        .includes('bucket')
    ) {
      await db.storage.createBucket('portfolio-photos', { public: true })
      const retry = await uploadFn()
      uploadError = retry.error
    }

    if (uploadError) {
      console.error('[onboarding] Portfolio photo upload error', uploadError)
      skipped.push({ name: file.name, reason: 'Storage error' })
      continue
    }

    const { data: urlData } = await db.storage.from('portfolio-photos').getPublicUrl(storagePath)
    if (urlData?.publicUrl) {
      uploadedUrls.push(urlData.publicUrl)
    }
  }

  if (uploadedUrls.length === 0) {
    return { success: false, error: 'No photos could be uploaded' }
  }

  // Save URLs to chef_directory_listings.portfolio_urls (no cap, append all)
  try {
    const { data: existing } = await db
      .from('chef_directory_listings')
      .select('portfolio_urls')
      .eq('chef_id', tenantId)
      .maybeSingle()

    const existingUrls: string[] = (existing?.portfolio_urls as string[]) || []
    const mergedUrls = [...existingUrls, ...uploadedUrls]

    await db
      .from('chef_directory_listings')
      .upsert({ chef_id: tenantId, portfolio_urls: mergedUrls }, { onConflict: 'chef_id' })
  } catch (err) {
    console.error('[onboarding] Failed to save portfolio URLs to directory listing', err)
  }

  revalidatePath('/onboarding')
  revalidatePath('/settings/my-profile')
  return { success: true, urls: uploadedUrls, skipped: skipped.length > 0 ? skipped : undefined }
}

// ============================================
// PROFILE TRIPLE-WRITE (internal helper)
// ============================================

async function persistProfileData(db: any, tenantId: string, data: Record<string, unknown>) {
  const {
    businessName,
    cuisines,
    city,
    state,
    serviceArea,
    bio,
    websiteUrl,
    phone,
    socialLinks,
    isPublic,
    profileImageUrl,
    logoUrl,
    serviceRadius,
  } = data as {
    businessName?: string
    cuisines?: string[]
    city?: string
    state?: string
    serviceArea?: string
    serviceRadius?: number
    bio?: string
    websiteUrl?: string
    phone?: string
    socialLinks?: Record<string, string>
    isPublic?: boolean
    profileImageUrl?: string
    logoUrl?: string
  }

  // 1. Update chefs table
  const chefUpdate: Record<string, unknown> = {}
  if (businessName) {
    chefUpdate.business_name = businessName
    chefUpdate.display_name = businessName
  }
  if (cuisines && cuisines.length > 0) chefUpdate.cuisine_specialties = cuisines
  if (city) chefUpdate.city = city
  if (state) chefUpdate.state = state
  if (bio) chefUpdate.bio = bio
  if (websiteUrl) chefUpdate.website_url = websiteUrl
  if (phone) chefUpdate.phone = phone
  if (socialLinks) chefUpdate.social_links = socialLinks

  // Auto-generate slug from business name if slug is currently null
  if (businessName) {
    const { data: currentChef } = await db
      .from('chefs')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle()

    if (!currentChef?.slug) {
      const baseSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Check uniqueness, append -2, -3 etc. on collision
      let candidateSlug = baseSlug
      let suffix = 1
      let slugTaken = true
      while (slugTaken && suffix <= 10) {
        const { data: existing } = await db
          .from('chefs')
          .select('id')
          .eq('slug', candidateSlug)
          .neq('id', tenantId)
          .maybeSingle()
        if (!existing) {
          slugTaken = false
        } else {
          suffix++
          candidateSlug = `${baseSlug}-${suffix}`
        }
      }
      if (!slugTaken) {
        chefUpdate.slug = candidateSlug
      }
    }
  }

  if (Object.keys(chefUpdate).length > 0) {
    const { error } = await db.from('chefs').update(chefUpdate).eq('id', tenantId)
    if (error) console.error('[onboarding] Failed to update chefs table', error)
  }

  // 2. Upsert chef_directory_listings
  const directoryData: Record<string, unknown> = { chef_id: tenantId }
  if (businessName) directoryData.business_name = businessName
  if (cuisines && cuisines.length > 0) directoryData.cuisines = cuisines
  if (city) directoryData.city = city
  if (state) directoryData.state = state
  if (websiteUrl) directoryData.website_url = websiteUrl
  if (profileImageUrl) directoryData.profile_photo_url = profileImageUrl
  if (serviceRadius) directoryData.service_radius_miles = serviceRadius

  if (Object.keys(directoryData).length > 1) {
    const { error } = await db
      .from('chef_directory_listings')
      .upsert(directoryData, { onConflict: 'chef_id' })
    if (error) console.error('[onboarding] Failed to upsert chef_directory_listings', error)
  }

  // 3. Upsert chef_marketplace_profiles
  const marketplaceData: Record<string, unknown> = { chef_id: tenantId }
  if (cuisines && cuisines.length > 0) marketplaceData.cuisine_types = cuisines
  if (city) marketplaceData.service_area_city = city
  if (state) marketplaceData.service_area_state = state
  if (profileImageUrl) marketplaceData.hero_image_url = profileImageUrl

  if (Object.keys(marketplaceData).length > 1) {
    const { error } = await db
      .from('chef_marketplace_profiles')
      .upsert(marketplaceData, { onConflict: 'chef_id' })
    if (error) console.error('[onboarding] Failed to upsert chef_marketplace_profiles', error)
  }

  // 4. Persist service_area to community_profiles (freeform text, e.g. "Greater Boston area")
  if (serviceArea && serviceArea.trim()) {
    try {
      const { error } = await db
        .from('community_profiles')
        .upsert(
          {
            chef_id: tenantId,
            display_name: businessName || 'Chef',
            service_area: serviceArea.trim(),
          },
          { onConflict: 'chef_id' }
        )
      if (error) console.error('[onboarding] Failed to persist service_area', error)
    } catch (err) {
      console.error('[non-blocking] Service area persistence failed', err)
    }
  }

  // 5. Set network_discoverable in chef_preferences
  if (typeof isPublic === 'boolean') {
    const { error } = await db
      .from('chef_preferences')
      .upsert(
        { chef_id: tenantId, tenant_id: tenantId, network_discoverable: isPublic },
        { onConflict: 'chef_id' }
      )
    if (error) console.error('[onboarding] Failed to update network_discoverable', error)
  }

  revalidatePath('/settings/my-profile')
}
