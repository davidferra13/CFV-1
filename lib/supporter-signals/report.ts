import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/db/admin'

export type SupporterSignalStatus =
  | 'public_ready'
  | 'approved_quote'
  | 'permission_candidate'
  | 'private_candidate'

export type SupporterSignalCandidate = {
  id: string
  name: string
  source: 'testimonial' | 'partner' | 'beta_signup' | 'feedback'
  relationship: string
  status: SupporterSignalStatus
  evidence: string
  publicUse: string
  nextStep: string
  createdAt: string | null
  href: string
}

export type SupporterSignalMetric = {
  label: string
  value: number
  detail: string
  href: string
}

export type SupporterSignalAction = {
  label: string
  reason: string
  href: string
  priority: 'high' | 'medium' | 'low'
}

export type SupporterSignalsReport = {
  generatedAt: string
  publicReadySignals: number
  approvedProofSignals: number
  permissionCandidateSignals: number
  privateCandidateSignals: number
  metrics: SupporterSignalMetric[]
  candidates: SupporterSignalCandidate[]
  nextActions: SupporterSignalAction[]
  homepageReadiness: {
    mode: 'empty_honest' | 'quotes_ready' | 'logos_ready' | 'mixed_ready'
    headline: string
    detail: string
    safePublicClaim: string
    blockedClaim: string
  }
}

export type TestimonialSignalRow = {
  id: string
  guest_name: string
  testimonial: string
  rating: number | null
  is_approved: boolean
  is_featured: boolean
  created_at: string | null
}

export type PartnerSignalRow = {
  id: string
  name: string
  partner_type: string
  status: string
  contact_name: string | null
  is_showcase_visible: boolean
  created_at: string | null
}

export type BetaSignupSignalRow = {
  id: string
  name: string
  business_name: string | null
  status: string
  cuisine_type: string | null
  created_at: string | null
}

export type FeedbackSignalRow = {
  id: string
  sentiment: string
  message: string
  anonymous: boolean
  user_role: string | null
  created_at: string | null
}

export type SupporterSignalsFacts = {
  generatedAt: string
  testimonials: TestimonialSignalRow[]
  partners: PartnerSignalRow[]
  betaSignups: BetaSignupSignalRow[]
  feedback: FeedbackSignalRow[]
}

type QueryResult<T> = {
  data: T[] | null
  error: { message?: string } | null
}

function assertQuery<T>(result: QueryResult<T>, label: string): T[] {
  if (result.error) {
    throw new Error(`Supporter signals query failed: ${label}`)
  }
  return result.data ?? []
}

function excerpt(value: string, maxLength = 120): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 3).trim()}...`
}

function displayName(name: string | null | undefined, fallback: string): string {
  const trimmed = name?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

function sortCandidates(candidates: SupporterSignalCandidate[]): SupporterSignalCandidate[] {
  const statusWeight: Record<SupporterSignalStatus, number> = {
    public_ready: 4,
    approved_quote: 3,
    permission_candidate: 2,
    private_candidate: 1,
  }

  return [...candidates].sort((a, b) => {
    const byStatus = statusWeight[b.status] - statusWeight[a.status]
    if (byStatus !== 0) return byStatus
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime
  })
}

function buildNextActions(input: {
  featuredTestimonials: TestimonialSignalRow[]
  approvedUnfeaturedTestimonials: TestimonialSignalRow[]
  publicPartners: PartnerSignalRow[]
  activeNonPublicPartners: PartnerSignalRow[]
  activeBetaSignups: BetaSignupSignalRow[]
  positiveFeedback: FeedbackSignalRow[]
}): SupporterSignalAction[] {
  const actions: SupporterSignalAction[] = []

  if (input.featuredTestimonials.length + input.publicPartners.length === 0) {
    actions.push({
      label: 'Keep homepage proof copy early-stage',
      reason: 'No current record is both public-ready and directly usable for a trust section.',
      href: '/admin/supporter-signals',
      priority: 'high',
    })
  }

  if (input.approvedUnfeaturedTestimonials.length > 0) {
    actions.push({
      label: 'Review approved testimonials for featuring',
      reason: `${input.approvedUnfeaturedTestimonials.length} approved quote${
        input.approvedUnfeaturedTestimonials.length === 1 ? '' : 's'
      } can become public proof after editorial review.`,
      href: '/admin/supporter-signals',
      priority: 'high',
    })
  }

  if (input.activeNonPublicPartners.length > 0) {
    actions.push({
      label: 'Ask active partners for public permission',
      reason: `${input.activeNonPublicPartners.length} active partner${
        input.activeNonPublicPartners.length === 1 ? '' : 's'
      } could become ecosystem proof after explicit approval.`,
      href: '/admin/referral-partners',
      priority: 'medium',
    })
  }

  const onboardedBetaSignups = input.activeBetaSignups.filter((row) => row.status === 'onboarded')
  if (onboardedBetaSignups.length > 0) {
    actions.push({
      label: 'Request beta reference permission',
      reason: `${onboardedBetaSignups.length} onboarded beta signup${
        onboardedBetaSignups.length === 1 ? '' : 's'
      } can be asked for private reference, quote, or public supporter consent.`,
      href: '/admin/beta',
      priority: 'medium',
    })
  }

  if (input.positiveFeedback.length > 0) {
    actions.push({
      label: 'Convert positive feedback into permissioned proof',
      reason: `${input.positiveFeedback.length} positive feedback signal${
        input.positiveFeedback.length === 1 ? '' : 's'
      } need identity and quote permission before public use.`,
      href: '/admin/feedback',
      priority: 'low',
    })
  }

  return actions
}

export function buildSupporterSignalsReport(facts: SupporterSignalsFacts): SupporterSignalsReport {
  const approvedTestimonials = facts.testimonials.filter((row) => row.is_approved)
  const featuredTestimonials = approvedTestimonials.filter((row) => row.is_featured)
  const approvedUnfeaturedTestimonials = approvedTestimonials.filter((row) => !row.is_featured)
  const activePartners = facts.partners.filter((row) => row.status === 'active')
  const publicPartners = activePartners.filter((row) => row.is_showcase_visible)
  const activeNonPublicPartners = activePartners.filter((row) => !row.is_showcase_visible)
  const activeBetaSignups = facts.betaSignups.filter((row) =>
    ['invited', 'onboarded'].includes(row.status)
  )
  const positiveFeedback = facts.feedback.filter((row) => row.sentiment === 'love')

  const candidates: SupporterSignalCandidate[] = [
    ...featuredTestimonials.map((row) => ({
      id: row.id,
      name: row.guest_name,
      source: 'testimonial' as const,
      relationship: 'Guest testimonial',
      status: 'public_ready' as const,
      evidence: excerpt(row.testimonial),
      publicUse: 'Featured public quote',
      nextStep: 'Can be considered for the homepage trust section now.',
      createdAt: row.created_at,
      href: '/admin/supporter-signals',
    })),
    ...approvedTestimonials
      .filter((row) => !row.is_featured)
      .map((row) => ({
        id: row.id,
        name: row.guest_name,
        source: 'testimonial' as const,
        relationship: 'Guest testimonial',
        status: 'approved_quote' as const,
        evidence: excerpt(row.testimonial),
        publicUse: 'Approved testimonial quote',
        nextStep: 'Decide whether this quote should become featured public proof.',
        createdAt: row.created_at,
        href: '/admin/supporter-signals',
      })),
    ...publicPartners.map((row) => ({
      id: row.id,
      name: row.name,
      source: 'partner' as const,
      relationship: row.partner_type,
      status: 'public_ready' as const,
      evidence: 'Showcase visibility is enabled.',
      publicUse: 'Public partner name or business listing',
      nextStep: 'Can be considered for a public ecosystem proof row.',
      createdAt: row.created_at,
      href: '/admin/referral-partners',
    })),
    ...activeNonPublicPartners.map((row) => ({
      id: row.id,
      name: row.name,
      source: 'partner' as const,
      relationship: row.partner_type,
      status: 'permission_candidate' as const,
      evidence: 'Active referral partner record exists.',
      publicUse: 'Not approved for public display',
      nextStep: 'Ask for permission before showing name, logo, or partner status publicly.',
      createdAt: row.created_at,
      href: '/admin/referral-partners',
    })),
    ...activeBetaSignups.map((row) => ({
      id: row.id,
      name: displayName(row.business_name, row.name),
      source: 'beta_signup' as const,
      relationship: row.cuisine_type ?? 'Culinary operator',
      status:
        row.status === 'onboarded'
          ? ('private_candidate' as const)
          : ('permission_candidate' as const),
      evidence: `${row.status} early access signup`,
      publicUse: 'No public use approved',
      nextStep:
        row.status === 'onboarded'
          ? 'Ask whether this operator can be a private reference or public supporter.'
          : 'Invite, onboard, then ask for support permission after real value.',
      createdAt: row.created_at,
      href: '/admin/beta',
    })),
    ...positiveFeedback.map((row) => ({
      id: row.id,
      name: row.anonymous ? 'Anonymous feedback' : displayName(row.user_role, 'User feedback'),
      source: 'feedback' as const,
      relationship: row.user_role ?? 'unknown role',
      status: 'permission_candidate' as const,
      evidence: excerpt(row.message),
      publicUse: 'No public use approved',
      nextStep: 'Follow up only when identity and quote permission can be confirmed.',
      createdAt: row.created_at,
      href: '/admin/feedback',
    })),
  ]

  const publicReadySignals = featuredTestimonials.length + publicPartners.length
  const approvedProofSignals = approvedTestimonials.length + publicPartners.length
  const permissionCandidateSignals =
    activeNonPublicPartners.length +
    activeBetaSignups.length +
    positiveFeedback.length +
    approvedUnfeaturedTestimonials.length
  const privateCandidateSignals =
    activePartners.length + activeBetaSignups.length + positiveFeedback.length

  const hasQuotes = featuredTestimonials.length > 0
  const hasLogos = publicPartners.length > 0

  return {
    generatedAt: facts.generatedAt,
    publicReadySignals,
    approvedProofSignals,
    permissionCandidateSignals,
    privateCandidateSignals,
    metrics: [
      {
        label: 'Public ready',
        value: publicReadySignals,
        detail: 'Featured testimonials plus showcase-visible partners.',
        href: '/admin/supporter-signals',
      },
      {
        label: 'Approved proof',
        value: approvedProofSignals,
        detail: 'Approved testimonials plus public partner records.',
        href: '/admin/supporter-signals',
      },
      {
        label: 'Permission candidates',
        value: permissionCandidateSignals,
        detail: 'People or records that need explicit permission before public use.',
        href: '/admin/supporter-signals',
      },
      {
        label: 'Private candidates',
        value: privateCandidateSignals,
        detail: 'Useful supporter leads even when no public consent exists.',
        href: '/admin/supporter-signals',
      },
    ],
    candidates: sortCandidates(candidates),
    nextActions: buildNextActions({
      featuredTestimonials,
      approvedUnfeaturedTestimonials,
      publicPartners,
      activeNonPublicPartners,
      activeBetaSignups,
      positiveFeedback,
    }),
    homepageReadiness: {
      mode:
        hasQuotes && hasLogos
          ? 'mixed_ready'
          : hasQuotes
            ? 'quotes_ready'
            : hasLogos
              ? 'logos_ready'
              : 'empty_honest',
      headline:
        publicReadySignals > 0
          ? 'ChefFlow has public proof signals ready for review.'
          : 'ChefFlow should use an honest early-stage trust section for now.',
      detail:
        publicReadySignals > 0
          ? 'Use only featured testimonials and showcase-visible partners until a formal supporter consent table exists.'
          : 'Use language like "Built with input from culinary operators" until public supporter permission is recorded.',
      safePublicClaim:
        publicReadySignals > 0
          ? 'ChefFlow is building from permissioned operator and event evidence.'
          : 'Built with input from culinary operators.',
      blockedClaim:
        publicReadySignals > 0
          ? 'Do not imply every testimonial is a direct ChefFlow endorsement.'
          : 'Do not claim "trusted by", named supporters, logos, press, or customer counts yet.',
    },
  }
}

export async function getSupporterSignalsReport(): Promise<SupporterSignalsReport> {
  await requireAdmin()
  const db: any = createAdminClient()

  const [testimonialResult, partnerResult, betaResult, feedbackResult] = await Promise.all([
    db
      .from('guest_testimonials')
      .select('id, guest_name, testimonial, rating, is_approved, is_featured, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('referral_partners')
      .select('id, name, partner_type, status, contact_name, is_showcase_visible, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('beta_signups')
      .select('id, name, business_name, status, cuisine_type, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('user_feedback')
      .select('id, sentiment, message, anonymous, user_role, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return buildSupporterSignalsReport({
    generatedAt: new Date().toISOString(),
    testimonials: assertQuery<TestimonialSignalRow>(testimonialResult, 'guest_testimonials'),
    partners: assertQuery<PartnerSignalRow>(partnerResult, 'referral_partners'),
    betaSignups: assertQuery<BetaSignupSignalRow>(betaResult, 'beta_signups'),
    feedback: assertQuery<FeedbackSignalRow>(feedbackResult, 'user_feedback'),
  })
}
