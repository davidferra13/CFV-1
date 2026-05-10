// Help Center - contextual help hub with FAQ, Remy integration, video placeholders
// Replaces old /help route with richer content under /onboarding/help

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { HelpCenterClient } from './help-center-client'

export const metadata: Metadata = { title: 'Help Center' }

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  await requireChef()
  const params = await searchParams
  const fromPage = params.from ?? null

  return <HelpCenterClient fromPage={fromPage} />
}
