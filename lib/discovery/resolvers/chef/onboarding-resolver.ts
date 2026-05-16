import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

/**
 * Surfaces incomplete onboarding steps and missing profile fields.
 * Tables: onboarding_progress, chefs
 */
export async function resolveOnboardingGaps(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  const items: GodModeResolvedItem[] = []

  // Part 1: Incomplete onboarding steps
  let incompleteSteps: { stepKey: string }[]

  try {
    const result = await pgClient`
      SELECT step_key as "stepKey"
      FROM onboarding_progress
      WHERE chef_id = ${ctx.tenantId}
        AND completed_at IS NULL
        AND (skipped IS NULL OR skipped = false)
      ORDER BY created_at ASC
    `
    incompleteSteps = result as unknown as typeof incompleteSteps
  } catch (err) {
    console.error('[onboarding-resolver] Steps query failed:', err)
    incompleteSteps = []
  }

  if (incompleteSteps.length > 0) {
    const stepNames = incompleteSteps.map((s) => s.stepKey.replace(/_/g, ' ')).slice(0, 3)
    const remaining = incompleteSteps.length

    items.push({
      definitionId: 'chef.onboarding_incomplete',
      tier: 'p3',
      label: `Onboarding: ${remaining} step${remaining > 1 ? 's' : ''} left`,
      context: stepNames.join(', ') + (remaining > 3 ? ` +${remaining - 3} more` : ''),
      destination: '/chef/settings/onboarding',
      icon: 'list-checks',
      loopState: 'active',
      sourceKind: 'system',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: 'Complete setup',
      data: {
        incompleteCount: remaining,
        stepKeys: incompleteSteps.map((s) => s.stepKey),
      },
    })
  }

  // Part 2: Profile missing key fields (bio, tagline, profile image)
  let profile: {
    bio: string | null
    tagline: string | null
    profileImageUrl: string | null
    stripeOnboardingComplete: boolean
    onboardingCompletedAt: string | null
    slug: string | null
  } | null

  try {
    const result = await pgClient`
      SELECT
        bio,
        tagline,
        profile_image_url as "profileImageUrl",
        stripe_onboarding_complete as "stripeOnboardingComplete",
        onboarding_completed_at as "onboardingCompletedAt",
        slug
      FROM chefs
      WHERE id = ${ctx.tenantId}
      LIMIT 1
    `
    profile = (result as unknown as (typeof profile)[])[0] ?? null
  } catch (err) {
    console.error('[onboarding-resolver] Profile query failed:', err)
    profile = null
  }

  if (profile) {
    const missing: string[] = []
    if (!profile.bio) missing.push('bio')
    if (!profile.tagline) missing.push('tagline')
    if (!profile.profileImageUrl) missing.push('profile photo')
    if (!profile.slug) missing.push('public URL slug')

    if (missing.length > 0) {
      items.push({
        definitionId: 'chef.profile_incomplete',
        tier: 'p4',
        label: `Profile: ${missing.length} field${missing.length > 1 ? 's' : ''} missing`,
        context: missing.join(', '),
        destination: '/chef/settings/profile',
        icon: 'user',
        loopState: 'active',
        sourceKind: 'system',
        evidenceLabel: 'confirmed',
        confidence: 1,
        nextAction: 'Complete your profile',
        data: {
          missingFields: missing,
        },
      })
    }

    // Missing Stripe setup
    if (!profile.stripeOnboardingComplete) {
      items.push({
        definitionId: 'chef.stripe_not_setup',
        tier: 'p2',
        label: 'Payment setup incomplete',
        context: 'Stripe not connected; you cannot accept payments',
        destination: '/chef/settings/payments',
        icon: 'credit-card',
        loopState: 'blocked',
        sourceKind: 'payment',
        evidenceLabel: 'confirmed',
        confidence: 1,
        nextAction: 'Connect Stripe to accept payments',
        data: {
          stripeOnboardingComplete: false,
        },
      })
    }
  }

  return items
}
