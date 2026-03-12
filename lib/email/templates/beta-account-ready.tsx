import { Link } from '@react-email/components'
import * as React from 'react'
import {
  BetaBodyText,
  BetaDetailsTable,
  BetaLifecycleLayout,
  BetaSectionCard,
  BetaTimeline,
  BetaTrackerCard,
  type BetaDetailItem,
  type BetaTrackerItem,
} from './beta-email-kit'

type BetaAccountReadyEmailProps = {
  name: string
  signInUrl: string
  onboardingUrl: string
  stageLabel: string
  progressPercent: number
  nextAction: string
  trackerItems: BetaTrackerItem[]
  businessName?: string | null
  email?: string | null
}

export function BetaAccountReadyEmail({
  name,
  signInUrl,
  onboardingUrl,
  stageLabel,
  progressPercent,
  nextAction,
  trackerItems,
  businessName,
  email,
}: BetaAccountReadyEmailProps) {
  const details: BetaDetailItem[] = [
    { label: 'Account email', value: email || 'The email used for signup' },
    { label: 'Business', value: businessName || 'Can be finalized during onboarding' },
    { label: 'Current stage', value: stageLabel },
    { label: 'Next best step', value: nextAction },
  ]

  return (
    <BetaLifecycleLayout
      preview="Your ChefFlow beta account is live. Sign in and continue onboarding."
      statusLabel="Account Ready"
      statusTone="success"
      headline="Your beta account is live."
      intro={`Hi ${name}, your ChefFlow account has been created successfully. You can sign in now and move directly into onboarding.`}
      action={{ label: 'Sign in and start onboarding', href: signInUrl }}
      footerReason="You are receiving this because your ChefFlow beta account was created."
    >
      <BetaTrackerCard
        stageLabel={stageLabel}
        progressPercent={progressPercent}
        nextAction={nextAction}
        items={trackerItems}
      />

      <BetaSectionCard title="Your first session plan" eyebrow="Recommended Flow">
        <BetaTimeline
          items={[
            {
              title: 'Enter the launch wizard',
              detail:
                'Complete the core five-step launch path so your profile, URL, and payout rails are usable.',
            },
            {
              title: 'Continue into the setup hub',
              detail:
                'Use the setup hub to import clients, build recipes, configure loyalty, and add staff.',
            },
            {
              title: 'Start with one real workflow',
              detail:
                'Do not try to configure everything at once. Get the first operating workflow live, then expand.',
            },
          ]}
        />
      </BetaSectionCard>

      <BetaSectionCard title="Access summary" eyebrow="Account Snapshot">
        <BetaDetailsTable rows={details} />
      </BetaSectionCard>

      <BetaSectionCard title="Direct links" eyebrow="Use whichever path is fastest">
        <BetaBodyText>
          Sign in directly:{' '}
          <Link href={signInUrl} style={link}>
            {signInUrl}
          </Link>
        </BetaBodyText>
        <BetaBodyText>
          Open onboarding:{' '}
          <Link href={onboardingUrl} style={link}>
            {onboardingUrl}
          </Link>
        </BetaBodyText>
      </BetaSectionCard>
    </BetaLifecycleLayout>
  )
}

const link = {
  color: '#b8642b',
  textDecoration: 'underline',
  fontWeight: '700' as const,
  wordBreak: 'break-all' as const,
}
