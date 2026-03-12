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

type BetaDeclinedEmailProps = {
  name: string
  email: string
  businessName?: string | null
}

export function BetaDeclinedEmail({ name, email, businessName }: BetaDeclinedEmailProps) {
  const details: BetaDetailItem[] = [
    { label: 'Application name', value: name },
    { label: 'Email', value: email },
    { label: 'Business', value: businessName || 'Not provided' },
    { label: 'Current decision', value: 'Not moving forward right now' },
  ]

  return (
    <BetaLifecycleLayout
      preview="We are not moving your ChefFlow beta onboarding forward right now."
      statusLabel="Paused"
      statusTone="danger"
      headline="Your beta onboarding is paused for now."
      intro={`Hi ${name}, thank you again for applying. We are not moving your ChefFlow beta onboarding forward right now.`}
      action={{ label: 'Reply with updated details', href: 'mailto:support@cheflowhq.com' }}
      footerReason="You are receiving this because your ChefFlow beta application status changed."
    >
      <BetaSectionCard title="What this means" eyebrow="Current Status">
        <BetaBodyText>
          This is not a product rejection note. It means we are not advancing your onboarding at the
          moment. That can happen because of onboarding capacity, current cohort fit, timing, or
          readiness for the launch path.
        </BetaBodyText>
        <BetaBodyText>
          You do not need to do anything immediately unless your business timing, focus, or setup
          needs have changed and you want us to reassess.
        </BetaBodyText>
      </BetaSectionCard>

      <BetaSectionCard title="What usually happens next" eyebrow="Options">
        <BetaTimeline
          items={[
            {
              title: 'Stay in touch',
              detail:
                'If your timing changes, reply to this email and we can review the fit again.',
            },
            {
              title: 'Share updated context',
              detail:
                'If your business model, launch timing, or operating priorities changed, send those updates so we can reassess with better context.',
            },
            {
              title: 'Re-enter later cohorts',
              detail:
                'We can revisit onboarding when a later batch aligns better with your timing and the product scope.',
            },
          ]}
        />
      </BetaSectionCard>

      <BetaSectionCard title="Application snapshot" eyebrow="Reference">
        <BetaDetailsTable rows={details} />
      </BetaSectionCard>

      <BetaSectionCard title="Support path" eyebrow="If you want us to revisit it">
        <BetaBodyText>
          Reply to this email with updated timing, your current operating priorities, or the
          workflow you most need ChefFlow to solve.
        </BetaBodyText>
        <BetaBodyText>
          You can also contact{' '}
          <Link href="mailto:support@cheflowhq.com" style={link}>
            support@cheflowhq.com
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
