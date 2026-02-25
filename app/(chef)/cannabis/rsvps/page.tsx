import { CannabisPageWrapper } from '@/components/cannabis/cannabis-portal-header'
import { getCannabisRSVPDashboardData } from '@/lib/chef/cannabis-actions'
import { CannabisRsvpsDashboardClient } from './rsvps-dashboard-client'

export default async function CannabisRsvpsPage({
  searchParams,
}: {
  searchParams?: { eventId?: string }
}) {
  const selectedEventId = typeof searchParams?.eventId === 'string' ? searchParams.eventId : null
  const data = await getCannabisRSVPDashboardData(selectedEventId)

  return (
    <CannabisPageWrapper>
      <CannabisRsvpsDashboardClient initialData={data} />
    </CannabisPageWrapper>
  )
}
