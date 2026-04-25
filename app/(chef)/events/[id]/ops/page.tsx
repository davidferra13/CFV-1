import { notFound } from 'next/navigation'
import { getEventOpsHub } from '@/lib/events/ops-hub-actions'
import { OpsHubView } from './ops-hub-view'

export default async function EventOpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getEventOpsHub(id)
  if (!data) notFound()
  return <OpsHubView data={data} />
}
