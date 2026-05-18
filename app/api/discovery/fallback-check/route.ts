import { NextRequest, NextResponse } from 'next/server'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import type { DirectoryChef } from '@/lib/directory/actions'

export const runtime = 'nodejs'
export const revalidate = 60

// ── Types ──────────────────────────────────────────────────────────────────

export type FallbackAlternative = {
  slug: string
  displayName: string
  profileImageUrl: string | null
  primaryCuisine: string | null
  locationLabel: string | null
  ctaHref: string
  isAccepting: boolean
}

export type FallbackCheckResponse = {
  count: number
  hasAlternatives: boolean
  alternatives: FallbackAlternative[]
  broadenedLabel: string | null
}

// ── Filter helpers ─────────────────────────────────────────────────────────

function matchesCuisine(chef: DirectoryChef, cuisine: string): boolean {
  if (!cuisine) return true
  const target = cuisine.toLowerCase()
  return chef.discovery.cuisine_types.some((c) => c.toLowerCase().includes(target))
}

function matchesDietary(chef: DirectoryChef, dietary: string): boolean {
  if (!dietary) return true
  const target = dietary.toLowerCase()
  const specialties = chef.discovery.dietary_specialties ?? []
  return specialties.some((d) => d.toLowerCase().includes(target))
}

function matchesServiceType(chef: DirectoryChef, serviceType: string): boolean {
  if (!serviceType) return true
  const target = serviceType.toLowerCase()
  return chef.discovery.service_types.some((s) => s.toLowerCase().includes(target))
}

function matchesOccasion(chef: DirectoryChef, occasion: string): boolean {
  if (!occasion) return true
  const target = occasion.toLowerCase()
  const serviceTypes = chef.discovery.service_types
  const occasions: Record<string, string[]> = {
    tonight: ['private_dinner', 'personal_chef'],
    dinner_party: ['private_dinner', 'catering'],
    weekend: ['private_dinner', 'catering', 'event_chef'],
    work_lunch: ['catering', 'corporate'],
    team_dinner: ['catering', 'corporate', 'private_dinner'],
    going_out: ['personal_chef', 'private_dinner'],
    late_night: ['private_dinner', 'personal_chef'],
    quick_eats: ['meal_prep', 'catering'],
    care_meals: ['meal_prep', 'personal_chef'],
    surprise_me: [],
  }
  const mapped = occasions[target]
  if (!mapped) return true
  if (mapped.length === 0) return true
  return serviceTypes.some((s) => mapped.includes(s.toLowerCase()))
}

function applyFilters(
  chefs: DirectoryChef[],
  params: { cuisine?: string; dietary?: string; serviceType?: string; occasion?: string }
): DirectoryChef[] {
  return chefs.filter((chef) => {
    if (params.cuisine && !matchesCuisine(chef, params.cuisine)) return false
    if (params.dietary && !matchesDietary(chef, params.dietary)) return false
    if (params.serviceType && !matchesServiceType(chef, params.serviceType)) return false
    if (params.occasion && !matchesOccasion(chef, params.occasion)) return false
    return true
  })
}

function toAlternative(chef: DirectoryChef): FallbackAlternative {
  const city = chef.discovery.service_area_city ?? null
  const state = chef.discovery.service_area_state ?? null
  const locationLabel = [city, state].filter(Boolean).join(', ') || null

  const ctaHref =
    chef.booking_enabled && chef.booking_slug
      ? `/book/${chef.booking_slug}`
      : chef.discovery.accepting_inquiries
        ? `/chef/${chef.slug}/inquire`
        : `/chef/${chef.slug}`

  return {
    slug: chef.slug!,
    displayName: chef.display_name,
    profileImageUrl: chef.profile_image_url ?? chef.discovery.hero_image_url ?? null,
    primaryCuisine: chef.discovery.cuisine_types[0] ?? null,
    locationLabel,
    ctaHref,
    isAccepting: chef.discovery.accepting_inquiries ?? false,
  }
}

function rankAlternatives(chefs: DirectoryChef[]): DirectoryChef[] {
  return [...chefs].sort((a, b) => {
    const scoreA =
      (a.profile_image_url ? 3 : 0) +
      (a.discovery.accepting_inquiries ? 2 : 0) +
      (a.is_founder ? 1 : 0) +
      (a.discovery.completeness_score ?? 0) * 0.05
    const scoreB =
      (b.profile_image_url ? 3 : 0) +
      (b.discovery.accepting_inquiries ? 2 : 0) +
      (b.is_founder ? 1 : 0) +
      (b.discovery.completeness_score ?? 0) * 0.05
    return scoreB - scoreA
  })
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const cuisine = searchParams.get('cuisine')?.trim() ?? ''
  const dietary = searchParams.get('dietary')?.trim() ?? ''
  const serviceType = searchParams.get('serviceType')?.trim() ?? ''
  const occasion = searchParams.get('occasion')?.trim() ?? ''

  // No filters selected → return early (not a zero-results scenario)
  if (!cuisine && !dietary && !serviceType && !occasion) {
    return NextResponse.json<FallbackCheckResponse>({
      count: 0,
      hasAlternatives: false,
      alternatives: [],
      broadenedLabel: null,
    })
  }

  const allChefs = await getDiscoverableChefs()

  // Pass 1: exact filter match
  const exactMatches = applyFilters(allChefs, { cuisine, dietary, serviceType, occasion })
  if (exactMatches.length > 0) {
    return NextResponse.json<FallbackCheckResponse>({
      count: exactMatches.length,
      hasAlternatives: false,
      alternatives: [],
      broadenedLabel: null,
    })
  }

  // Pass 2: drop dietary (most restrictive)
  if (dietary) {
    const broadened = applyFilters(allChefs, { cuisine, serviceType, occasion })
    if (broadened.length > 0) {
      const ranked = rankAlternatives(broadened).slice(0, 6)
      return NextResponse.json<FallbackCheckResponse>({
        count: 0,
        hasAlternatives: true,
        alternatives: ranked.map(toAlternative),
        broadenedLabel:
          cuisine || serviceType
            ? `Showing ${cuisine || serviceType || 'available'} chefs`
            : 'Showing available chefs',
      })
    }
  }

  // Pass 3: drop cuisine too, keep service/occasion
  if (cuisine) {
    const broadened = applyFilters(allChefs, { serviceType, occasion })
    if (broadened.length > 0) {
      const ranked = rankAlternatives(broadened).slice(0, 6)
      return NextResponse.json<FallbackCheckResponse>({
        count: 0,
        hasAlternatives: true,
        alternatives: ranked.map(toAlternative),
        broadenedLabel: serviceType
          ? `Showing ${serviceType.replace(/_/g, ' ')} chefs`
          : 'Showing available chefs',
      })
    }
  }

  // Pass 4: fall back to global popular chefs
  const popular = rankAlternatives(allChefs).slice(0, 6)
  return NextResponse.json<FallbackCheckResponse>({
    count: 0,
    hasAlternatives: popular.length > 0,
    alternatives: popular.map(toAlternative),
    broadenedLabel: 'Highly rated chefs near you',
  })
}
