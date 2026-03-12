import * as React from 'react'
import {
  BetaBodyText,
  BetaLifecycleLayout,
  BetaSectionCard,
  BetaTimeline,
  BetaTrackerCard,
  type BetaTrackerItem,
} from './beta-email-kit'

type BetaOnboardingCompleteEmailProps = {
  name: string
  dashboardUrl: string
  stageLabel: string
  trackerItems: BetaTrackerItem[]
}

export function BetaOnboardingCompleteEmail({
  name,
  dashboardUrl,
  stageLabel,
  trackerItems,
}: BetaOnboardingCompleteEmailProps) {
  return (
    <BetaLifecycleLayout
      preview="Your ChefFlow onboarding is complete and your workspace is ready to use live."
      statusLabel="Onboarding Complete"
      statusTone="success"
      headline="You are fully onboarded."
      intro={`Hi ${name}, your beta onboarding is complete and your ChefFlow workspace is ready to run live.`}
      action={{ label: 'Open ChefFlow', href: dashboardUrl }}
      footerReason="You are receiving this because your ChefFlow beta onboarding has been completed."
    >
      <BetaTrackerCard
        stageLabel={stageLabel}
        progressPercent={100}
        nextAction="Move into the dashboard and start running the workflows you set up during onboarding."
        items={trackerItems}
      />

      <BetaSectionCard title="What is now live" eyebrow="Activation">
        <BetaTimeline
          items={[
            {
              title: 'Your core workspace is active',
              detail: 'You can work from the dashboard instead of staying inside setup flows.',
            },
            {
              title: 'Your onboarding context is preserved',
              detail:
                'Everything you configured during launch is now part of the live operating environment.',
            },
            {
              title: 'Support remains open',
              detail:
                'Beta access still includes direct support and product feedback loops while you settle into real usage.',
            },
          ]}
        />
      </BetaSectionCard>

      <BetaSectionCard title="Recommended next actions" eyebrow="First Week">
        <BetaBodyText>
          Use the dashboard for real work immediately. The best next move is to run one real
          workflow end to end, then expand into the next operational area once that first path is
          stable.
        </BetaBodyText>
      </BetaSectionCard>
    </BetaLifecycleLayout>
  )
}
