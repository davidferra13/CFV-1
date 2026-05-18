import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventOpsHub } from '@/lib/events/ops-hub-actions'
import { getEventDayDashboard } from '@/lib/operations/event-day-actions'
import { OpsHubView } from './ops-hub-view'
import { EventDayDashboardView } from '@/components/operations/event-day-dashboard'

export async function generateMetadata() {
  return { title: 'Event Operations | ChefFlow' }
}

export default async function EventOpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [opsHub, dayDashboard] = await Promise.all([getEventOpsHub(id), getEventDayDashboard(id)])
  if (!opsHub) notFound()
  return (
    <div className="space-y-6">
      {dayDashboard && <EventDayDashboardView data={dayDashboard} />}
      <OpsHubView data={opsHub} />
    </div>
  )
}
