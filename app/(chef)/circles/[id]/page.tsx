import { notFound } from 'next/navigation'
import { getCircleDetail } from '@/lib/hub/circle-detail-actions'
import { CircleDetailClient } from './circle-detail-client'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const circle = await getCircleDetail(id)
  return { title: circle?.name ?? 'Circle' }
}

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const circle = await getCircleDetail(id)

  if (!circle) notFound()

  return <CircleDetailClient circle={circle} />
}
