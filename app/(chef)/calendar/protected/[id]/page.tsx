import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProtectedTimeDetail } from '@/components/calendar/protected-time-detail'
import { getProtectedTimeBlock } from '@/lib/scheduling/protected-time-actions'

export const metadata: Metadata = {
  title: 'Protected Time',
}

type Props = {
  params: {
    id: string
  }
}

export default async function ProtectedTimePage({ params }: Props) {
  const block = await getProtectedTimeBlock(params.id)

  if (!block) notFound()

  return <ProtectedTimeDetail block={block} />
}
