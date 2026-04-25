import * as React from 'react'
import { sendEmail } from '@/lib/email/send'
import { SupportContributionStartedEmail } from '@/lib/email/templates/support-contribution-started'
import { SupportContributionEndedEmail } from '@/lib/email/templates/support-contribution-ended'
import { formatSupportAmount } from '@/lib/monetization/offers'

type SupportEmailChef = {
  email?: string | null
  display_name?: string | null
  business_name?: string | null
}

function getChefName(chef: SupportEmailChef): string | null {
  return chef.display_name ?? chef.business_name ?? null
}

export async function sendSupportStartedEmail(
  chef: SupportEmailChef,
  amountCents: number,
  recurring: boolean
): Promise<boolean> {
  if (!chef.email) return false

  const contributionLabel = recurring
    ? `${formatSupportAmount(amountCents)} monthly`
    : formatSupportAmount(amountCents)

  return sendEmail({
    to: chef.email,
    subject: 'Thank you for supporting ChefFlow',
    react: React.createElement(SupportContributionStartedEmail, {
      chefName: getChefName(chef),
      contributionLabel,
    }),
    isTransactional: true,
  })
}

export async function sendSupportEndedEmail(chef: SupportEmailChef): Promise<boolean> {
  if (!chef.email) return false

  return sendEmail({
    to: chef.email,
    subject: 'Your ChefFlow support has ended',
    react: React.createElement(SupportContributionEndedEmail, {
      chefName: getChefName(chef),
    }),
    isTransactional: true,
  })
}
