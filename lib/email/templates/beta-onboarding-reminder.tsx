import * as React from 'react'
import {
  BetaBodyText,
  BetaLifecycleLayout,
  BetaSectionCard,
  BetaTimeline,
  BetaTrackerCard,
  type BetaTrackerItem,
} from './beta-email-kit'

type BetaOnboardingReminderEmailProps = {
  name: string
  signInUrl: string
  stageLabel: string
  progressPercent: number
  nextAction: string
  trackerItems: BetaTrackerItem[]
}

export function BetaOnboardingReminderEmail({
  name,
  signInUrl,
  stageLabel,
  progressPercent,
  nextAction,
  trackerItems,
}: BetaOnboardingReminderEmailProps) {
  return (
    <BetaLifecycleLayout
      preview="Your ChefFlow onboarding is in progress. Here is the clearest next step."
      statusLabel="Onboarding In Progress"
      statusTone="active"
      headline="Your onboarding is in progress."
      intro={`Hi ${name}, your workspace is active and the setup path is moving. Here is the clearest next step so you can keep momentum without guessing.`}
      action={{ label: 'Continue onboarding', href: signInUrl }}
      footerReason="You are receiving this because your ChefFlow beta onboarding is active and still in progress."
    >
      <BetaTrackerCard
        stageLabel={stageLabel}
        progressPercent={progressPercent}
        nextAction={nextAction}
        items={trackerItems}
      />

      <BetaSectionCard title="How to move fastest" eyebrow="Momentum">
        <BetaTimeline
          items={[
            {
              title: 'Finish the current active step first',
              detail:
                'Do not spread effort across multiple sections. The fastest launch comes from finishing the next active milestone cleanly.',
            },
            {
              title: 'Use the setup hub after the launch wizard',
              detail:
                'That is where clients, recipes, loyalty, and staff become real working systems instead of placeholders.',
            },
            {
              title: 'Ask for help when you hit friction',
              detail:
                'If a workflow is unclear, reply before you lose momentum. We would rather guide the setup than have you stall.',
            },
          ]}
        />
      </BetaSectionCard>

      <BetaSectionCard title="What unlocks next" eyebrow="Why this matters">
        <BetaBodyText>
          Each onboarding milestone reduces manual setup later. Once your launch path is complete,
          the dashboard, proposals, clients, menus, and payments start feeling like one connected
          operating system instead of separate tools.
        </BetaBodyText>
      </BetaSectionCard>
    </BetaLifecycleLayout>
  )
}
