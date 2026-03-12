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

type BetaInviteEmailProps = {
  name: string
  inviteUrl: string
  invitedAt?: string | null
  businessName?: string | null
  email?: string | null
}

export function BetaInviteEmail({
  name,
  inviteUrl,
  invitedAt,
  businessName,
  email,
}: BetaInviteEmailProps) {
  const trackerItems: BetaTrackerItem[] = [
    {
      label: 'Create your account',
      detail: 'Use the invite link below. Your email is pre-filled so setup moves faster.',
      state: 'active',
    },
    {
      label: 'Start the launch wizard',
      detail: 'Complete the five-step onboarding wizard for profile, branding, URL, and payouts.',
      state: 'upcoming',
    },
    {
      label: 'Finish the setup hub',
      detail: 'Import clients, recipes, loyalty, and staff when they matter to your operation.',
      state: 'upcoming',
    },
    {
      label: 'Activate your workspace',
      detail: 'Once setup is complete, you will move into the live dashboard and full workflows.',
      state: 'upcoming',
    },
  ]

  const details: BetaDetailItem[] = [
    { label: 'Invite email', value: email || 'Pre-filled from your request' },
    { label: 'Business', value: businessName || 'Will be confirmed during setup' },
    {
      label: 'Invite issued',
      value: invitedAt ? new Date(invitedAt).toLocaleString('en-US') : 'Just now',
    },
    { label: 'Onboarding path', value: 'Account creation -> Launch wizard -> Setup hub' },
  ]

  return (
    <BetaLifecycleLayout
      preview="Your ChefFlow beta invite is ready. Create your account and start onboarding."
      statusLabel="Invited"
      statusTone="active"
      headline="Your ChefFlow beta invite is ready."
      intro={`Hi ${name}, your spot is open. Use the invitation below to create your ChefFlow account and move straight into onboarding.`}
      action={{ label: 'Create my beta account', href: inviteUrl }}
      footerReason="You are receiving this because your ChefFlow beta application was approved."
    >
      <BetaTrackerCard
        stageLabel="Account Creation"
        progressPercent={35}
        nextAction="Create your account from this invite to unlock the onboarding wizard and launch your workspace."
        items={trackerItems}
      />

      <BetaSectionCard title="What happens after signup" eyebrow="Launch Sequence">
        <BetaTimeline
          items={[
            {
              title: 'Create your account',
              detail:
                'Your invite link carries the beta context and pre-fills your email to reduce friction.',
            },
            {
              title: 'Complete the launch wizard',
              detail:
                'You will set your profile, brand the portal, claim your URL, and connect payouts.',
            },
            {
              title: 'Move into the setup hub',
              detail:
                'From there, you can import clients, build recipes, turn on loyalty, and add staff.',
            },
          ]}
        />
      </BetaSectionCard>

      <BetaSectionCard title="What to have ready" eyebrow="Before You Start">
        <BetaBodyText>
          The best first session happens when you already know the business name you want visible,
          your public-facing chef name, your first workflow priority, and whether you want to set up
          payouts immediately.
        </BetaBodyText>
        <BetaBodyText>
          You do not need to finish every setup step in one sitting, but getting through the launch
          wizard in your first pass is the fastest way to unlock value.
        </BetaBodyText>
      </BetaSectionCard>

      <BetaSectionCard title="Your access details" eyebrow="Invite Snapshot">
        <BetaDetailsTable rows={details} />
      </BetaSectionCard>

      <BetaSectionCard title="Fallback access" eyebrow="If the button does not work">
        <BetaBodyText>
          Copy and paste this link into your browser:
          <br />
          <Link href={inviteUrl} style={link}>
            {inviteUrl}
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
