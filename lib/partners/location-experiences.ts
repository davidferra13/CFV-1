export const LOCATION_EXPERIENCE_TAG_OPTIONS = [
  'food',
  'outdoor',
  'plated',
  'event',
  'seasonal',
] as const

export const LOCATION_BEST_FOR_OPTIONS = [
  'intimate_dinner',
  'large_group',
  'outdoor_dining',
  'celebration',
  'retreat',
  'corporate_hosting',
] as const

export const LOCATION_SERVICE_TYPE_OPTIONS = [
  'tasting_menu',
  'family_style',
  'specialty_formats',
  'plated_service',
  'live_fire',
  'cocktail_reception',
] as const

export const CHEF_LOCATION_RELATIONSHIP_OPTIONS = [
  'preferred',
  'exclusive',
  'featured',
  'available_on_request',
  'owner',
] as const

export type LocationExperienceTag = (typeof LOCATION_EXPERIENCE_TAG_OPTIONS)[number]
export type LocationBestFor = (typeof LOCATION_BEST_FOR_OPTIONS)[number]
export type LocationServiceType = (typeof LOCATION_SERVICE_TYPE_OPTIONS)[number]
export type ChefLocationRelationshipType = (typeof CHEF_LOCATION_RELATIONSHIP_OPTIONS)[number]

export const LOCATION_EXPERIENCE_TAG_LABELS: Record<LocationExperienceTag, string> = {
  food: 'Food',
  outdoor: 'Outdoor',
  plated: 'Plated',
  event: 'Event',
  seasonal: 'Seasonal',
}

export const LOCATION_BEST_FOR_LABELS: Record<LocationBestFor, string> = {
  intimate_dinner: 'Intimate dinner',
  large_group: 'Large group',
  outdoor_dining: 'Outdoor dining',
  celebration: 'Celebration',
  retreat: 'Retreat',
  corporate_hosting: 'Corporate hosting',
}

export const LOCATION_SERVICE_TYPE_LABELS: Record<LocationServiceType, string> = {
  tasting_menu: 'Tasting menu',
  family_style: 'Family-style',
  specialty_formats: 'Specialty formats',
  plated_service: 'Plated service',
  live_fire: 'Live fire',
  cocktail_reception: 'Cocktail reception',
}

export const CHEF_LOCATION_RELATIONSHIP_LABELS: Record<ChefLocationRelationshipType, string> = {
  preferred: 'Preferred setting',
  exclusive: 'Exclusive setting',
  featured: 'Featured setting',
  available_on_request: 'Available on request',
  owner: 'Our restaurant',
}

export type ChefLocationLinkRecord = {
  id?: string
  chef_id?: string | null
  location_id: string
  relationship_type?: string | null
  is_public?: boolean | null
  is_featured?: boolean | null
  sort_order?: number | null
}

export type LocationExperienceImage = {
  id: string
  partner_id?: string | null
  image_url: string
  caption: string | null
  season: string | null
  display_order: number | null
  location_id: string | null
}

type PublicLocationExperienceSourceLocation = {
  id: string
  partner_id?: string | null
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  booking_url?: string | null
  description?: string | null
  max_guest_count?: number | null
  experience_tags?: string[] | null
  best_for?: string[] | null
  service_types?: string[] | null
  is_active?: boolean | null
}

type PublicLocationExperienceSourcePartner = {
  id: string
  tenant_id?: string | null
  showcase_order?: number | null
  name: string
  partner_type: string
  description?: string | null
  booking_url?: string | null
  cover_image_url?: string | null
  partner_locations?: PublicLocationExperienceSourceLocation[] | null
  partner_images?: LocationExperienceImage[] | null
}

type PublicLocationExperienceReadinessInput = {
  name: string | null | undefined
  address?: string | null
  city?: string | null
  state?: string | null
  description?: string | null
  experience_tags?: readonly string[] | null
  best_for?: readonly string[] | null
  service_types?: readonly string[] | null
  images?: readonly LocationExperienceImage[] | null
}

export type PublicLocationExperienceReadinessBlocker =
  | 'missing_name'
  | 'missing_location'
  | 'missing_context'

export type PublicLocationExperienceReadiness = {
  isReady: boolean
  blockers: PublicLocationExperienceReadinessBlocker[]
}

export type PublicChefLocationExperience = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  booking_url: string | null
  description: string | null
  max_guest_count: number | null
  experience_tags: LocationExperienceTag[]
  best_for: LocationBestFor[]
  service_types: LocationServiceType[]
  relationship_type: ChefLocationRelationshipType
  is_featured: boolean
  sort_order: number
  partner: {
    id: string
    name: string
    partner_type: string
    description: string | null
    booking_url: string | null
    cover_image_url: string | null
  }
  images: LocationExperienceImage[]
}

function isAllowedValue<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value)
}

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function hasNonEmptyText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeLocationOptionValues<T extends string>(
  values: readonly string[] | null | undefined,
  allowed: readonly T[]
): T[] {
  const normalized = (values ?? [])
    .map(normalizeToken)
    .filter((value): value is T => isAllowedValue(value, allowed))

  return [...new Set(normalized)]
}

export function normalizeRelationshipType(
  value: string | null | undefined
): ChefLocationRelationshipType {
  const normalized = normalizeToken(value ?? '')
  return isAllowedValue(normalized, CHEF_LOCATION_RELATIONSHIP_OPTIONS) ? normalized : 'preferred'
}

export function evaluatePublicLocationExperienceReadiness(
  input: PublicLocationExperienceReadinessInput
): PublicLocationExperienceReadiness {
  const blockers: PublicLocationExperienceReadinessBlocker[] = []

  const hasName = hasNonEmptyText(input.name)
  const hasLocation =
    hasNonEmptyText(input.address) || (hasNonEmptyText(input.city) && hasNonEmptyText(input.state))
  const hasImages =
    Array.isArray(input.images) && input.images.some((image) => hasNonEmptyText(image.image_url))
  const hasStructuredContext =
    (input.experience_tags?.length ?? 0) > 0 ||
    (input.best_for?.length ?? 0) > 0 ||
    (input.service_types?.length ?? 0) > 0
  const hasContext = hasNonEmptyText(input.description) || hasImages || hasStructuredContext

  if (!hasName) blockers.push('missing_name')
  if (!hasLocation) blockers.push('missing_location')
  if (!hasContext) blockers.push('missing_context')

  return {
    isReady: blockers.length === 0,
    blockers,
  }
}

export function buildLocationExperienceImages(input: {
  locationId: string
  images: LocationExperienceImage[]
  coverImageUrl?: string | null
}): LocationExperienceImage[] {
  const scoped = input.images
    .filter((image) => image.location_id === input.locationId)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  if (scoped.length > 0) return scoped

  const partnerFallback = input.images
    .filter((image) => image.location_id == null)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  if (partnerFallback.length > 0) return partnerFallback

  if (!input.coverImageUrl) return []

  return [
    {
      id: `${input.locationId}-cover`,
      image_url: input.coverImageUrl,
      caption: null,
      season: null,
      display_order: 0,
      location_id: null,
    },
  ]
}

export function buildPublicLocationExperiences(
  partners: PublicLocationExperienceSourcePartner[],
  locationLinks: ChefLocationLinkRecord[] = []
): PublicChefLocationExperience[] {
  const linkMap = Object.fromEntries((locationLinks || []).map((link) => [link.location_id, link]))

  return partners
    .flatMap((partner) =>
      (partner.partner_locations || []).flatMap((location) => {
        if (location.is_active === false) return []

        const link = linkMap[location.id]
        if (link?.is_public === false) return []

        const candidate: PublicChefLocationExperience = {
          id: location.id,
          name: location.name,
          address: location.address ?? null,
          city: location.city ?? null,
          state: location.state ?? null,
          zip: location.zip ?? null,
          booking_url: location.booking_url ?? partner.booking_url ?? null,
          description: location.description ?? null,
          max_guest_count: location.max_guest_count ?? null,
          experience_tags: normalizeLocationOptionValues(
            location.experience_tags,
            LOCATION_EXPERIENCE_TAG_OPTIONS
          ),
          best_for: normalizeLocationOptionValues(location.best_for, LOCATION_BEST_FOR_OPTIONS),
          service_types: normalizeLocationOptionValues(
            location.service_types,
            LOCATION_SERVICE_TYPE_OPTIONS
          ),
          relationship_type: normalizeRelationshipType(link?.relationship_type),
          is_featured: link?.is_featured ?? true,
          sort_order: link?.sort_order ?? 0,
          partner: {
            id: partner.id,
            name: partner.name,
            partner_type: partner.partner_type,
            description: partner.description ?? null,
            booking_url: partner.booking_url ?? null,
            cover_image_url: partner.cover_image_url ?? null,
          },
          images: buildLocationExperienceImages({
            locationId: location.id,
            images: partner.partner_images || [],
            coverImageUrl: partner.cover_image_url ?? null,
          }),
        }

        const readiness = evaluatePublicLocationExperienceReadiness(candidate)
        if (!readiness.isReady) return []

        return [candidate]
      })
    )
    .sort(
      (a, b) =>
        Number(b.is_featured) - Number(a.is_featured) ||
        a.sort_order - b.sort_order ||
        a.partner.name.localeCompare(b.partner.name) ||
        a.name.localeCompare(b.name)
    )
}

export async function fetchShowcasePartnersByChefIds(db: any, chefIds: string[]) {
  const uniqueChefIds = [...new Set(chefIds.filter(Boolean))]
  if (uniqueChefIds.length === 0) {
    return {} as Record<string, PublicLocationExperienceSourcePartner[]>
  }

  const { data: partners, error: partnerError } = await db
    .from('referral_partners')
    .select(
      [
        'id',
        'tenant_id',
        'name',
        'partner_type',
        'cover_image_url',
        'description',
        'booking_url',
        'showcase_order',
      ].join(', ')
    )
    .in('tenant_id', uniqueChefIds)
    .eq('is_showcase_visible', true)
    .eq('status', 'active')
    .order('showcase_order', { ascending: true })

  if (partnerError || !partners) {
    console.error('[fetchShowcasePartnersByChefIds] partner fetch error:', partnerError)
    return {} as Record<string, PublicLocationExperienceSourcePartner[]>
  }

  const partnerIds = partners.map((partner: any) => partner.id).filter(Boolean)
  const [{ data: locations, error: locationError }, { data: images, error: imageError }] =
    partnerIds.length > 0
      ? await Promise.all([
          db
            .from('partner_locations')
            .select(
              [
                'id',
                'partner_id',
                'name',
                'address',
                'city',
                'state',
                'zip',
                'booking_url',
                'description',
                'max_guest_count',
                'experience_tags',
                'best_for',
                'service_types',
                'is_active',
              ].join(', ')
            )
            .in('partner_id', partnerIds),
          db
            .from('partner_images')
            .select('id, partner_id, image_url, caption, season, display_order, location_id')
            .in('partner_id', partnerIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ]

  if (locationError) {
    console.error('[fetchShowcasePartnersByChefIds] location fetch error:', locationError)
  }
  if (imageError) {
    console.error('[fetchShowcasePartnersByChefIds] image fetch error:', imageError)
  }

  const locationsByPartnerId = new Map<string, PublicLocationExperienceSourceLocation[]>()
  for (const location of (locations || []) as PublicLocationExperienceSourceLocation[]) {
    const partnerId = location.partner_id
    if (!partnerId || location.is_active === false) continue

    const existing = locationsByPartnerId.get(partnerId) || []
    existing.push(location)
    locationsByPartnerId.set(partnerId, existing)
  }

  const imagesByPartnerId = new Map<string, LocationExperienceImage[]>()
  for (const image of (images || []) as LocationExperienceImage[]) {
    const partnerId = image.partner_id
    if (!partnerId) continue

    const existing = imagesByPartnerId.get(partnerId) || []
    existing.push(image)
    imagesByPartnerId.set(partnerId, existing)
  }

  const partnersByChefId: Record<string, PublicLocationExperienceSourcePartner[]> = {}
  for (const partner of partners as PublicLocationExperienceSourcePartner[]) {
    const chefId = partner.tenant_id
    if (!chefId) continue

    const assembledPartner: PublicLocationExperienceSourcePartner = {
      ...partner,
      partner_locations: (locationsByPartnerId.get(partner.id) || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      partner_images: (imagesByPartnerId.get(partner.id) || []).sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      ),
    }

    if (!partnersByChefId[chefId]) {
      partnersByChefId[chefId] = []
    }

    partnersByChefId[chefId].push(assembledPartner)
  }

  for (const chefId of Object.keys(partnersByChefId)) {
    partnersByChefId[chefId].sort(
      (a, b) =>
        (a.showcase_order ?? Number.MAX_SAFE_INTEGER) -
          (b.showcase_order ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name)
    )
  }

  return partnersByChefId
}
