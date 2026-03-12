import { Link } from '@react-email/components'
import * as React from 'react'
import {
  BetaBodyText,
  BetaDetailsTable,
  BetaLifecycleLayout,
  BetaSectionCard,
  BetaTimeline,
  type BetaDetailItem,
} from './beta-email-kit'

type BetaPendingReviewEmailProps = {
  name: string
  email: string
  phone?: string | null
  businessName?: string | null
  cuisineType?: string | null
  yearsInBusiness?: string | null
  referralSource?: string | null
  siteUrl?: string
}

const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export function BetaPendingReviewEmail({
  name,
  email,
  phone,
  businessName,
  cuisineType,
  yearsInBusiness,
  referralSource,
  siteUrl = DEFAULT_SITE_URL,
}: BetaPendingReviewEmailProps) {
  const details: BetaDetailItem[] = [
    { label: 'Name', value: name },
    { label: 'Email', value: email },
    { label: 'Phone', value: phone || 'Not provided' },
    { label: 'Business', value: businessName || 'Not provided' },
    { label: 'Cuisine', value: cuisineType || 'Not provided' },
    { label: 'Years in business', value: yearsInBusiness || 'Not provided' },
    { label: 'Referral source', value: referralSource || 'Not provided' },
  ]

  return (
    <BetaLifecycleLayout
      preview="We received your ChefFlow beta application and review is now in progress."
      statusLabel="Pending Review"
      statusTone="review"
      headline="Your beta application is under review."
      intro={`Hi ${name}, we have your request and it is now in the active review queue. You do not need to submit anything else right now.`}
      action={{ label: 'Explore ChefFlow', href: siteUrl }}
      footerReason="You are receiving this because you submitted the ChefFlow beta signup form."
    >
      <BetaSectionCard title="What happens next" eyebrow="Review Flow">
        <BetaTimeline
          items={[
            {
              title: 'We review fit and timing',
              detail:
                'We onboard in small batches so support stays personal and setup quality stays high.',
            },
            {
              title: 'We send a decision by email',
              detail:
                'If we move forward, you will receive a personal invitation link to create your account.',
            },
            {
              title: 'We guide onboarding',
              detail:
                'Accepted chefs are routed into onboarding with a structured launch path and direct support.',
            },
          ]}
        />
      </BetaSectionCard>

      <BetaSectionCard title="What we are evaluating" eyebrow="Review Criteria">
        <BetaBodyText>
          We review business fit, readiness for onboarding, service model, and current onboarding
          capacity. The goal is not volume. The goal is a tight cohort that can actually launch
          well.
        </BetaBodyText>
        <BetaBodyText>
          If we need clarification before making a decision, we will reach out using this email
          thread.
        </BetaBodyText>
      </BetaSectionCard>

      <BetaSectionCard title="Your submitted details" eyebrow="Application Snapshot">
        <BetaDetailsTable rows={details} />
      </BetaSectionCard>

      <BetaSectionCard title="What to prepare now" eyebrow="Optional Prep">
        <BetaBodyText>
          If you are invited, the fastest onboarding starts when you already know the business name,
          public profile direction, service mix, and the first workflow you want ChefFlow to solve.
        </BetaBodyText>
        <BetaBodyText>
          You can keep an eye on the product at{' '}
          <Link href={siteUrl} style={link}>
            cheflowhq.com
          </Link>
          .
        </BetaBodyText>
      </BetaSectionCard>
    </BetaLifecycleLayout>
  )
}

const link = {
  color: '#b8642b',
  textDecoration: 'underline',
  fontWeight: '700' as const,
}
