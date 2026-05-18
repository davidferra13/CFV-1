import type { Metadata } from 'next'
import { CannabisPageWrapper } from '@/components/cannabis/cannabis-portal-header'
import { getCannabisRSVPDashboardData } from '@/lib/chef/cannabis-actions'
import { getCannabisGuestIntelligence } from '@/lib/cannabis/client-intelligence'
import { requireChef } from '@/lib/auth/get-user'
import { CannabisRsvpsDashboardClient } from './rsvps-dashboard-client'
import type { CannabisGuestIntelligence } from '@/lib/cannabis/client-intelligence'

export const metadata: Metadata = { title: 'Cannabis RSVPs | ChefFlow' }

export default async function CannabisRsvpsPage({
  searchParams,
}: {
  searchParams?: { eventId?: string }
}) {
  const selectedEventId = typeof searchParams?.eventId === 'string' ? searchParams.eventId : null
  const [data, user] = await Promise.all([
    getCannabisRSVPDashboardData(selectedEventId),
    requireChef(),
  ])

  // Fetch guest intelligence in parallel for all guests with emails
  const guestIntelMap: Record<string, CannabisGuestIntelligence> = {}
  if (data.guests.length > 0 && user.tenantId) {
    const emailsToFetch = data.guests.filter((g: any) => g.email).map((g: any) => g.email as string)

    const uniqueEmails = [...new Set(emailsToFetch)]

    const results = await Promise.all(
      uniqueEmails.map((email) =>
        getCannabisGuestIntelligence(email, user.tenantId!).catch(() => null)
      )
    )

    results.forEach((intel) => {
      if (intel) {
        guestIntelMap[intel.guestEmail.toLowerCase()] = intel
      }
    })
  }

  return (
    <CannabisPageWrapper>
      <CannabisRsvpsDashboardClient initialData={data} guestIntelligence={guestIntelMap} />
    </CannabisPageWrapper>
  )
}
