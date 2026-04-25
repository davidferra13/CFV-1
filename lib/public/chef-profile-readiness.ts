import { createServerClient } from '@/lib/db/server'
import type { ChefServiceConfig } from '@/lib/chef-services/service-config-actions'

export type PublicChefBuyerSignals = {
  pricing: {
    startingPriceCents: number | null
    dinnerLowCents: number | null
    dinnerHighCents: number | null
    mealPrepLowCents: number | null
    mealPrepHighCents: number | null
    cookAndLeaveRateCents: number | null
    minimumBookingCents: number | null
    minimumSpendCents: number | null
    depositType: 'percent' | 'fixed' | null
    depositPercent: number | null
    depositFixedCents: number | null
  }
  service: {
    includedItems: string[]
    staffingItems: string[]
    equipmentItems: string[]
    dietaryItems: string[]
    communicationItems: string[]
    extraItems: string[]
    travelRadiusMiles: number | null
    travelFeeCents: number | null
    minimumGuests: number | null
    guestCountDeadlineDays: number | null
    groceriesIncluded: boolean | null
    gratuityPolicy: 'not_expected' | 'appreciated' | 'included' | null
    hasCancellationPolicy: boolean | null
    cancellationTerms: string | null
    hasReschedulePolicy: boolean | null
    rescheduleTerms: string | null
    customWhatsIncluded: string | null
    customCleanupNote: string | null
    customTravelNote: string | null
    customDietaryNote: string | null
    customGratuityNote: string | null
    customIntroPitch: string | null
    selfReportedInsurance: boolean
  }
  operations: {
    responseTime: string | null
    lastActiveAt: string | null
  }
  verification: {
    badges: PublicVerificationBadge[]
    activeInsuranceCount: number
    activeCertificationCount: number
  }
}

export type PublicVerificationBadge = {
  label: string
  detail: string
  kind: 'insurance' | 'certification' | 'business_record'
  source: 'current_record'
}

export type PublicShowcaseMenu = {
  id: string
  name: string
  description: string | null
  photoUrl: string | null
  cuisineType: string | null
  serviceStyle: string | null
  guestCount: number | null
  timesUsed: number
  dishes: Array<{
    id: string
    name: string
    courseName: string
    courseNumber: number
    description: string | null
    dietaryTags: string[]
    allergenFlags: string[]
  }>
}

type PublicBookingSignals = {
  bookingBasePriceCents?: number | null
  bookingPricingType?: 'flat_rate' | 'per_person' | null
  bookingDepositType?: 'percent' | 'fixed' | null
  bookingDepositPercent?: number | null
  bookingDepositFixedCents?: number | null
}

function positiveNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
  )
}

function minOrNull(values: number[]): number | null {
  return values.length > 0 ? Math.min(...values) : null
}

function maxOrNull(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null
}

function isNotExpired(dateValue: string | null | undefined, today: string): boolean {
  if (!dateValue) return true
  return dateValue >= today
}

function isAlreadyEffective(dateValue: string | null | undefined, today: string): boolean {
  if (!dateValue) return true
  return dateValue <= today
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function normalizePublicNote(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildIncludedItems(serviceConfig: ChefServiceConfig | null): string[] {
  if (!serviceConfig) return []

  return dedupe([
    serviceConfig.offers_grocery_shopping ? 'Grocery shopping' : '',
    serviceConfig.offers_dessert_course ? 'Dessert course' : '',
    serviceConfig.offers_cocktail_hour ? 'Cocktail hour' : '',
    serviceConfig.offers_wine_pairings ? 'Wine pairings' : '',
    serviceConfig.offers_bartending ? 'Bartending' : '',
    serviceConfig.offers_table_setup ? 'Table setup' : '',
    serviceConfig.offers_serving ? 'Serving' : '',
    serviceConfig.offers_cleanup ? 'Cleanup' : '',
    serviceConfig.offers_leftover_packaging ? 'Leftover packaging' : '',
    serviceConfig.brings_dinnerware ? 'Dinnerware' : '',
    serviceConfig.brings_linens ? 'Linens' : '',
    serviceConfig.coordinates_rentals ? 'Rental coordination' : '',
    serviceConfig.shares_menu_for_approval ? 'Menu approval before the event' : '',
    serviceConfig.does_preevent_checkin ? 'Pre-event check-in' : '',
    serviceConfig.sends_final_details_reminder ? 'Final details reminder' : '',
    serviceConfig.sends_postevent_followup ? 'Post-event follow-up' : '',
  ])
}

function buildEquipmentItems(serviceConfig: ChefServiceConfig | null): string[] {
  if (!serviceConfig) return []

  return dedupe([
    serviceConfig.brings_own_cookware ? 'Own cookware and knives' : '',
    serviceConfig.brings_dinnerware ? 'Dinnerware and tableware' : '',
    serviceConfig.brings_linens ? 'Linens' : '',
    serviceConfig.coordinates_rentals ? 'Rental coordination' : '',
  ])
}

function buildStaffingItems(serviceConfig: ChefServiceConfig | null): string[] {
  if (!serviceConfig) return []

  return dedupe([
    serviceConfig.brings_server ? 'Server support' : '',
    serviceConfig.brings_sous_chef ? 'Sous chef support' : '',
    serviceConfig.brings_bartender ? 'Bartender support' : '',
    serviceConfig.coordinates_additional_staff ? 'Additional staff coordination' : '',
  ])
}

function buildDietaryItems(serviceConfig: ChefServiceConfig | null): string[] {
  if (!serviceConfig) return []

  return dedupe([
    serviceConfig.handles_allergies ? 'Allergy-aware handling' : '',
    serviceConfig.handles_medical_diets ? 'Medical diets' : '',
    serviceConfig.handles_religious_diets ? 'Religious diets' : '',
  ])
}

function buildCommunicationItems(serviceConfig: ChefServiceConfig | null): string[] {
  if (!serviceConfig) return []

  return dedupe([
    serviceConfig.shares_menu_for_approval ? 'Menu approval before the event' : '',
    serviceConfig.does_preevent_checkin ? 'Pre-event check-in' : '',
    serviceConfig.sends_final_details_reminder ? 'Final details reminder' : '',
    serviceConfig.sends_postevent_followup ? 'Post-event follow-up' : '',
  ])
}

function buildExtraItems(serviceConfig: ChefServiceConfig | null): string[] {
  if (!serviceConfig) return []

  return dedupe([
    serviceConfig.offers_tastings ? 'Pre-event tastings' : '',
    serviceConfig.offers_nda ? 'NDA available' : '',
    serviceConfig.coordinates_vendors ? 'Vendor coordination' : '',
    serviceConfig.accommodates_outdoor_events ? 'Outdoor events' : '',
    serviceConfig.handles_kid_menus ? 'Kid-friendly menus' : '',
    serviceConfig.photographs_food ? 'Food photography' : '',
    serviceConfig.posts_on_social_media ? 'Social sharing with permission' : '',
  ])
}

function dedupeVerificationBadges(
  badges: Array<PublicVerificationBadge | null>
): PublicVerificationBadge[] {
  const seen = new Set<string>()
  const items: PublicVerificationBadge[] = []

  for (const badge of badges) {
    if (!badge) continue
    const key = `${badge.kind}:${badge.label}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push(badge)
  }

  return items
}

function buildVerificationBadges(input: {
  activePolicies: any[]
  activeCertifications: any[]
}): PublicVerificationBadge[] {
  const { activePolicies, activeCertifications } = input

  const policyTypes = new Set((activePolicies || []).map((policy: any) => policy.policy_type))
  const certTypes = new Set((activeCertifications || []).map((cert: any) => cert.cert_type))

  return dedupeVerificationBadges([
    policyTypes.has('general_liability')
      ? {
          label: 'General liability record current',
          detail: 'ChefFlow is showing a current general liability record for this chef.',
          kind: 'insurance',
          source: 'current_record',
        }
      : null,
    policyTypes.has('professional_liability')
      ? {
          label: 'Professional liability record current',
          detail: 'ChefFlow is showing a current professional liability record for this chef.',
          kind: 'insurance',
          source: 'current_record',
        }
      : null,
    policyTypes.has('workers_comp') || certTypes.has('workers_comp')
      ? {
          label: "Workers' comp record current",
          detail: "ChefFlow is showing a current workers' compensation record for this chef.",
          kind: 'insurance',
          source: 'current_record',
        }
      : null,
    policyTypes.has('vehicle') || certTypes.has('auto_insurance')
      ? {
          label: 'Vehicle coverage record current',
          detail: 'ChefFlow is showing a current vehicle or auto coverage record for this chef.',
          kind: 'insurance',
          source: 'current_record',
        }
      : null,
    policyTypes.has('liquor_liability')
      ? {
          label: 'Liquor liability record current',
          detail: 'ChefFlow is showing a current liquor liability record for this chef.',
          kind: 'insurance',
          source: 'current_record',
        }
      : null,
    certTypes.has('servsafe') || certTypes.has('food_handler') || certTypes.has('servsafe_manager')
      ? {
          label: 'Food safety certification current',
          detail: 'ChefFlow is showing a current food safety certification record for this chef.',
          kind: 'certification',
          source: 'current_record',
        }
      : null,
    certTypes.has('allergen_awareness')
      ? {
          label: 'Allergen awareness record current',
          detail: 'ChefFlow is showing a current allergen awareness record for this chef.',
          kind: 'certification',
          source: 'current_record',
        }
      : null,
    certTypes.has('health_permit')
      ? {
          label: 'Health permit record current',
          detail: 'ChefFlow is showing a current health permit record for this chef.',
          kind: 'business_record',
          source: 'current_record',
        }
      : null,
    certTypes.has('business_license')
      ? {
          label: 'Business license record current',
          detail: 'ChefFlow is showing a current business license record for this chef.',
          kind: 'business_record',
          source: 'current_record',
        }
      : null,
    certTypes.has('llc')
      ? {
          label: 'Business registration record current',
          detail: 'ChefFlow is showing a current business registration record for this chef.',
          kind: 'business_record',
          source: 'current_record',
        }
      : null,
    certTypes.has('cottage_food')
      ? {
          label: 'Cottage food record current',
          detail: 'ChefFlow is showing a current cottage food record for this chef.',
          kind: 'business_record',
          source: 'current_record',
        }
      : null,
    certTypes.has('liability_insurance') && !policyTypes.has('general_liability')
      ? {
          label: 'Insurance record current',
          detail: 'ChefFlow is showing a current insurance-related record for this chef.',
          kind: 'insurance',
          source: 'current_record',
        }
      : null,
  ])
}

export async function getPublicChefBuyerSignals(
  chefId: string,
  bookingSignals: PublicBookingSignals = {},
  serviceConfig: ChefServiceConfig | null = null
): Promise<PublicChefBuyerSignals> {
  const db: any = createServerClient({ admin: true })
  const today = new Date().toISOString().slice(0, 10)

  const [pricingResult, autoResponseResult, activityResult, insuranceResult, certificationResult] =
    await Promise.all([
      db
        .from('chef_pricing_config')
        .select(
          [
            'couples_rate_3_course',
            'couples_rate_4_course',
            'couples_rate_5_course',
            'group_rate_3_course',
            'group_rate_4_course',
            'group_rate_5_course',
            'weekly_standard_min',
            'weekly_standard_max',
            'weekly_commit_min',
            'weekly_commit_max',
            'cook_and_leave_rate',
            'deposit_percentage',
            'minimum_booking_cents',
          ].join(', ')
        )
        .eq('chef_id', chefId)
        .maybeSingle(),
      db
        .from('auto_response_config')
        .select('enabled, default_response_time')
        .eq('chef_id', chefId)
        .maybeSingle(),
      db
        .from('chef_activity_log')
        .select('created_at')
        .eq('tenant_id', chefId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('chef_insurance_policies')
        .select('id, policy_type, effective_date, expiry_date')
        .eq('tenant_id', chefId),
      db
        .from('chef_certifications')
        .select('id, cert_type, status, expiry_date, expires_at, is_active')
        .eq('chef_id', chefId),
    ])

  const pricing = pricingResult.data || {}
  const autoResponse = autoResponseResult.data || {}
  const lastActivity = activityResult.data?.created_at ?? null

  const activePolicies = (insuranceResult.data || []).filter(
    (policy: any) =>
      isAlreadyEffective(policy.effective_date ?? null, today) &&
      isNotExpired(policy.expiry_date ?? null, today)
  )
  const activeCertifications = (certificationResult.data || []).filter((cert: any) => {
    const expiryDate = cert.expiry_date ?? cert.expires_at ?? null
    return cert.is_active !== false && cert.status !== 'expired' && isNotExpired(expiryDate, today)
  })

  const groupDinnerRates = positiveNumbers([
    pricing.group_rate_3_course,
    pricing.group_rate_4_course,
    pricing.group_rate_5_course,
  ])
  const allDinnerRates = positiveNumbers([
    pricing.couples_rate_3_course,
    pricing.couples_rate_4_course,
    pricing.couples_rate_5_course,
    ...groupDinnerRates,
    bookingSignals.bookingPricingType === 'per_person'
      ? bookingSignals.bookingBasePriceCents
      : null,
  ])
  const mealPrepRates = positiveNumbers([
    pricing.weekly_standard_min,
    pricing.weekly_standard_max,
    pricing.weekly_commit_min,
    pricing.weekly_commit_max,
  ])

  const badges = buildVerificationBadges({
    activePolicies,
    activeCertifications,
  })

  return {
    pricing: {
      startingPriceCents: minOrNull(allDinnerRates),
      dinnerLowCents: minOrNull(groupDinnerRates.length > 0 ? groupDinnerRates : allDinnerRates),
      dinnerHighCents: maxOrNull(groupDinnerRates.length > 0 ? groupDinnerRates : allDinnerRates),
      mealPrepLowCents: minOrNull(mealPrepRates),
      mealPrepHighCents: maxOrNull(mealPrepRates),
      cookAndLeaveRateCents:
        typeof pricing.cook_and_leave_rate === 'number' && pricing.cook_and_leave_rate > 0
          ? pricing.cook_and_leave_rate
          : null,
      minimumBookingCents:
        typeof pricing.minimum_booking_cents === 'number' && pricing.minimum_booking_cents > 0
          ? pricing.minimum_booking_cents
          : null,
      minimumSpendCents:
        serviceConfig?.has_minimum_spend &&
        typeof serviceConfig.minimum_spend_cents === 'number' &&
        serviceConfig.minimum_spend_cents > 0
          ? serviceConfig.minimum_spend_cents
          : null,
      depositType:
        bookingSignals.bookingDepositType ??
        (typeof pricing.deposit_percentage === 'number' ? 'percent' : null),
      depositPercent:
        typeof bookingSignals.bookingDepositPercent === 'number'
          ? bookingSignals.bookingDepositPercent
          : typeof pricing.deposit_percentage === 'number'
            ? pricing.deposit_percentage
            : null,
      depositFixedCents:
        typeof bookingSignals.bookingDepositFixedCents === 'number' &&
        bookingSignals.bookingDepositFixedCents > 0
          ? bookingSignals.bookingDepositFixedCents
          : null,
    },
    service: {
      includedItems: buildIncludedItems(serviceConfig),
      staffingItems: buildStaffingItems(serviceConfig),
      equipmentItems: buildEquipmentItems(serviceConfig),
      dietaryItems: buildDietaryItems(serviceConfig),
      communicationItems: buildCommunicationItems(serviceConfig),
      extraItems: buildExtraItems(serviceConfig),
      travelRadiusMiles:
        typeof serviceConfig?.travel_fee_radius_miles === 'number' &&
        serviceConfig.travel_fee_radius_miles > 0
          ? serviceConfig.travel_fee_radius_miles
          : null,
      travelFeeCents:
        serviceConfig?.charges_travel_fee &&
        typeof serviceConfig.travel_fee_cents === 'number' &&
        serviceConfig.travel_fee_cents > 0
          ? serviceConfig.travel_fee_cents
          : null,
      minimumGuests:
        serviceConfig?.has_minimum_guests &&
        typeof serviceConfig.minimum_guests === 'number' &&
        serviceConfig.minimum_guests > 0
          ? serviceConfig.minimum_guests
          : null,
      guestCountDeadlineDays:
        serviceConfig?.has_guest_count_deadline &&
        typeof serviceConfig.guest_count_deadline_days === 'number' &&
        serviceConfig.guest_count_deadline_days > 0
          ? serviceConfig.guest_count_deadline_days
          : null,
      groceriesIncluded:
        typeof serviceConfig?.grocery_cost_included === 'boolean'
          ? serviceConfig.grocery_cost_included
          : null,
      gratuityPolicy: serviceConfig?.gratuity_policy ?? null,
      hasCancellationPolicy:
        typeof serviceConfig?.has_cancellation_policy === 'boolean'
          ? serviceConfig.has_cancellation_policy
          : null,
      cancellationTerms: serviceConfig?.cancellation_terms ?? null,
      hasReschedulePolicy:
        typeof serviceConfig?.has_reschedule_policy === 'boolean'
          ? serviceConfig.has_reschedule_policy
          : null,
      rescheduleTerms: serviceConfig?.reschedule_terms ?? null,
      customWhatsIncluded: normalizePublicNote(serviceConfig?.custom_whats_included),
      customCleanupNote: normalizePublicNote(serviceConfig?.custom_cleanup_note),
      customTravelNote: normalizePublicNote(serviceConfig?.custom_travel_note),
      customDietaryNote: normalizePublicNote(serviceConfig?.custom_dietary_note),
      customGratuityNote: normalizePublicNote(serviceConfig?.custom_gratuity_note),
      customIntroPitch: normalizePublicNote(serviceConfig?.custom_intro_pitch),
      selfReportedInsurance: Boolean(serviceConfig?.is_insured),
    },
    operations: {
      responseTime:
        autoResponse.enabled && typeof autoResponse.default_response_time === 'string'
          ? autoResponse.default_response_time
          : null,
      lastActiveAt: lastActivity,
    },
    verification: {
      badges,
      activeInsuranceCount: activePolicies.length,
      activeCertificationCount: activeCertifications.length,
    },
  }
}

export async function getPublicShowcaseMenus(
  chefId: string,
  options?: { limit?: number | null }
): Promise<PublicShowcaseMenu[]> {
  const db: any = createServerClient({ admin: true })
  const limit = options?.limit ?? 3

  const { data, error } = await db
    .from('menus')
    .select(
      `
      id,
      name,
      description,
      cuisine_type,
      service_style,
      target_guest_count,
      times_used,
      dishes (
        id,
        name,
        course_name,
        course_number,
        description,
        photo_url,
        dietary_tags,
        allergen_flags,
        sort_order
      )
    `
    )
    .eq('tenant_id', chefId)
    .eq('is_showcase', true)
    .neq('status', 'archived')
    .order('times_used', { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error) console.error('[getPublicShowcaseMenus] Error:', error)
    return []
  }

  return data.map((menu: any) => {
    const sortedDishes = [...(menu.dishes || [])].sort(
      (a: any, b: any) =>
        (a.course_number ?? 0) - (b.course_number ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )
    const photoUrl =
      sortedDishes
        .map((dish: any) => (typeof dish.photo_url === 'string' ? dish.photo_url.trim() : ''))
        .find((url: string) => url.length > 0) ?? null

    return {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      photoUrl,
      cuisineType: menu.cuisine_type,
      serviceStyle: menu.service_style,
      guestCount: menu.target_guest_count,
      timesUsed: menu.times_used ?? 0,
      dishes: sortedDishes.map((dish: any) => ({
        id: dish.id,
        name: dish.name ?? dish.course_name ?? 'Dish',
        courseName: dish.course_name,
        courseNumber: dish.course_number,
        description: dish.description,
        dietaryTags: dish.dietary_tags ?? [],
        allergenFlags: dish.allergen_flags ?? [],
      })),
    }
  })
}
