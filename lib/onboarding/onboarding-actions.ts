'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { WIZARD_STEPS, type OnboardingStepKey } from './onboarding-constants'

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

export async function getOnboardingStatus() {
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
    .update({ onboarding_completed_at: new Date().toISOString() })
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
): Promise<{ success: true; urls: string[] } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const files = formData.getAll('photos') as File[]
  if (!files || files.length === 0) {
    return { success: false, error: 'No photos provided' }
  }
  if (files.length > 5) {
    return { success: false, error: 'Maximum 5 photos allowed' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const maxSize = 5 * 1024 * 1024

  const uploadedUrls: string[] = []

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) continue
    if (file.size > maxSize) continue

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
      continue
    }

    const { data: urlData } = db.storage.from('portfolio-photos').getPublicUrl(storagePath)
    if (urlData?.publicUrl) {
      uploadedUrls.push(urlData.publicUrl)
    }
  }

  if (uploadedUrls.length === 0) {
    return { success: false, error: 'No photos could be uploaded' }
  }

  // Save URLs to chef_directory_listings.portfolio_urls
  try {
    // Get existing portfolio URLs
    const { data: existing } = await db
      .from('chef_directory_listings')
      .select('portfolio_urls')
      .eq('chef_id', tenantId)
      .maybeSingle()

    const existingUrls: string[] = (existing?.portfolio_urls as string[]) || []
    const mergedUrls = [...existingUrls, ...uploadedUrls].slice(0, 5)

    await db
      .from('chef_directory_listings')
      .upsert({ chef_id: tenantId, portfolio_urls: mergedUrls }, { onConflict: 'chef_id' })
  } catch (err) {
    console.error('[onboarding] Failed to save portfolio URLs to directory listing', err)
  }

  revalidatePath('/onboarding')
  revalidatePath('/settings/my-profile')
  return { success: true, urls: uploadedUrls }
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
  } = data as {
    businessName?: string
    cuisines?: string[]
    city?: string
    state?: string
    serviceArea?: string
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

  // 4. Set network_discoverable in chef_preferences
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
