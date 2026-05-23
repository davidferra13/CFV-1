import type {
  PublicChefBuyerSignals,
  PublicShowcaseMenu,
} from '@/lib/public/chef-profile-readiness'
import type { PublicReviewFeedResult } from '@/lib/reviews/public-actions'

export type PublicServicePackage = {
  id: string
  title: string
  description: string
  priceLabel: string
  inclusions: string[]
  constraints: string[]
  inquiryLabel: string
}

export type PublicChefShowcase = {
  status: 'draft' | 'published'
  packages: PublicServicePackage[]
  proof: {
    reviewCount: number
    averageRating: number
    featuredReviewText: string | null
  }
  links: string[]
  portfolioCount: number
  workHistoryCount: number
  achievementCount: number
  menuCount: number
  follow: {
    enabled: boolean
    source: 'consumer_saved_chefs'
    consentCopy: string
  }
}

export type ShowcaseReadiness = {
  score: number
  total: number
  missing: string[]
  status: PublicChefShowcase['status']
}

type ShowcaseInput = {
  chef: {
    bio?: string | null
    tagline?: string | null
    website_url?: string | null
    show_website_on_public_profile?: boolean | null
    social_links?: Record<string, unknown> | null
    discovery?: {
      accepting_inquiries?: boolean | null
      service_types?: string[] | null
    } | null
  }
  buyerSignals: PublicChefBuyerSignals
  reviewFeed: PublicReviewFeedResult
  showcaseMenus?: PublicShowcaseMenu[]
  portfolioEntries?: Array<{ isPublic?: boolean | null }>
  workHistory?: Array<{ is_public?: boolean | null }>
  achievements?: unknown[]
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatRange(
  lowCents: number | null,
  highCents: number | null,
  suffix = ''
): string | null {
  if (lowCents && highCents && lowCents !== highCents) {
    return `${formatCurrency(lowCents)}${suffix} to ${formatCurrency(highCents)}${suffix}`
  }

  const value = lowCents ?? highCents
  return value ? `${formatCurrency(value)}${suffix}` : null
}

function compactStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])]
}

export function derivePublicServicePackages(
  buyerSignals: PublicChefBuyerSignals
): PublicServicePackage[] {
  const sharedConstraints = compactStrings([
    buyerSignals.service.minimumGuests
      ? `${buyerSignals.service.minimumGuests} guest minimum`
      : null,
    buyerSignals.service.travelRadiusMiles
      ? `Travel guidance published for ${buyerSignals.service.travelRadiusMiles} miles`
      : null,
    buyerSignals.service.hasCancellationPolicy === true
      ? 'Cancellation terms are shared before payment'
      : null,
  ])

  const packages: PublicServicePackage[] = []
  const dinnerPrice = formatRange(
    buyerSignals.pricing.dinnerLowCents,
    buyerSignals.pricing.dinnerHighCents,
    '/person'
  )

  if (dinnerPrice || buyerSignals.service.includedItems.length > 0) {
    packages.push({
      id: 'private-dinner',
      title: 'Private Dinner',
      description:
        buyerSignals.service.customIntroPitch ||
        'A hosted private meal shaped around your event date, guest count, kitchen, and menu goals.',
      priceLabel: dinnerPrice ? `Starting ${dinnerPrice}` : 'Quote after scope review',
      inclusions: buyerSignals.service.includedItems.slice(0, 6),
      constraints: sharedConstraints,
      inquiryLabel: 'Ask about this dinner',
    })
  }

  const mealPrepPrice = formatRange(
    buyerSignals.pricing.mealPrepLowCents,
    buyerSignals.pricing.mealPrepHighCents
  )
  if (mealPrepPrice) {
    packages.push({
      id: 'meal-prep',
      title: 'Meal Prep',
      description: 'Prepared meals planned around household rhythm, dietary needs, and schedule.',
      priceLabel: `Starting ${mealPrepPrice}`,
      inclusions: compactStrings([
        ...buyerSignals.service.dietaryItems,
        ...buyerSignals.service.communicationItems,
      ]).slice(0, 5),
      constraints: sharedConstraints,
      inquiryLabel: 'Ask about meal prep',
    })
  }

  if (buyerSignals.pricing.cookAndLeaveRateCents) {
    packages.push({
      id: 'cook-and-leave',
      title: 'Cook And Leave',
      description:
        'A prepared service path for clients who want the food ready without hosted service.',
      priceLabel: `Starting ${formatCurrency(buyerSignals.pricing.cookAndLeaveRateCents)}`,
      inclusions: compactStrings([
        'Prepared food handoff',
        buyerSignals.service.groceriesIncluded
          ? 'Groceries included in quoted service price'
          : null,
        ...buyerSignals.service.equipmentItems,
      ]).slice(0, 5),
      constraints: sharedConstraints,
      inquiryLabel: 'Ask about cook-and-leave',
    })
  }

  if (packages.length === 0) {
    packages.push({
      id: 'custom-event',
      title: 'Custom Event Inquiry',
      description:
        'Share your date, guest count, location, and budget so the chef can confirm fit before quoting.',
      priceLabel: 'Quote after scope review',
      inclusions: compactStrings([
        ...buyerSignals.service.includedItems,
        ...buyerSignals.service.staffingItems,
        ...buyerSignals.service.dietaryItems,
      ]).slice(0, 6),
      constraints: sharedConstraints,
      inquiryLabel: 'Start custom inquiry',
    })
  }

  return packages.slice(0, 3)
}

export function buildPublicChefShowcase(input: ShowcaseInput): PublicChefShowcase {
  const publicPortfolioCount = (input.portfolioEntries ?? []).filter(
    (entry) => entry.isPublic !== false
  ).length
  const publicWorkHistoryCount = (input.workHistory ?? []).filter(
    (entry) => entry.is_public !== false
  ).length
  const links = compactStrings([
    input.chef.show_website_on_public_profile !== false ? input.chef.website_url : null,
    ...Object.values(input.chef.social_links ?? {}).map((value) =>
      typeof value === 'string' ? value : null
    ),
  ])

  const packages =
    input.chef.discovery?.accepting_inquiries === false
      ? []
      : derivePublicServicePackages(input.buyerSignals)

  const showcase: PublicChefShowcase = {
    status: 'draft',
    packages,
    proof: {
      reviewCount: input.reviewFeed.stats.totalReviews,
      averageRating: input.reviewFeed.stats.averageRating,
      featuredReviewText: input.reviewFeed.reviews[0]?.reviewText ?? null,
    },
    links,
    portfolioCount: publicPortfolioCount,
    workHistoryCount: publicWorkHistoryCount,
    achievementCount: input.achievements?.length ?? 0,
    menuCount: input.showcaseMenus?.length ?? 0,
    follow: {
      enabled: true,
      source: 'consumer_saved_chefs',
      consentCopy:
        'Signed-in visitors can save this chef. Anonymous visitors can ask to receive updates through inquiry.',
    },
  }

  showcase.status = deriveShowcaseReadiness(showcase, input.chef).status
  return showcase
}

export function deriveShowcaseReadiness(
  showcase: Pick<
    PublicChefShowcase,
    'packages' | 'proof' | 'links' | 'portfolioCount' | 'workHistoryCount' | 'menuCount'
  >,
  chef: ShowcaseInput['chef']
): ShowcaseReadiness {
  const checks = [
    { label: 'public URL and bio', ready: Boolean(chef.bio || chef.tagline) },
    { label: 'service package or inquiry path', ready: showcase.packages.length > 0 },
    { label: 'proof source', ready: showcase.proof.reviewCount > 0 },
    {
      label: 'portfolio, work history, or menu proof',
      ready: showcase.portfolioCount + showcase.workHistoryCount + showcase.menuCount > 0,
    },
    { label: 'public link or social destination', ready: showcase.links.length > 0 },
  ]

  const missing = checks.filter((check) => !check.ready).map((check) => check.label)
  const score = checks.length - missing.length

  return {
    score,
    total: checks.length,
    missing,
    status: score >= 2 ? 'published' : 'draft',
  }
}
