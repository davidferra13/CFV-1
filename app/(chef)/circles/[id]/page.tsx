import { notFound } from 'next/navigation'
import { getCircleDetail } from '@/lib/hub/circle-detail-actions'
import { getChefCircles } from '@/lib/hub/chef-circle-actions'
// import { CircleDetailClient } from './circle-detail-client'
import { CircleRedesignShell } from './circle-redesign-shell'
import type { CircleRailItem } from '@/components/circles/redesign/circle-rail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const circle = await getCircleDetail(id)
  return { title: circle?.name ?? 'Circle' }
}

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [circle, circles] = await Promise.all([getCircleDetail(id), getChefCircles()])

  if (!circle) notFound()

  const railCircles: CircleRailItem[] = circles.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    hasActivity: !!c.last_message_at,
    needsAttention: c.needs_attention,
    unreadCount: c.unread_count,
  }))

  return <CircleRedesignShell circles={railCircles} activeCircleId={id} circle={circle} />
}
