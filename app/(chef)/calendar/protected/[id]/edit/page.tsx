import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProtectedTimeEditForm } from '@/components/calendar/protected-time-edit-form'
import { getProtectedTimeBlock } from '@/lib/scheduling/protected-time-actions'

export const metadata: Metadata = {
  title: 'Edit Protected Time',
}

type Props = {
  params: {
    id: string
  }
}

export default async function EditProtectedTimePage({ params }: Props) {
  const block = await getProtectedTimeBlock(params.id)

  if (!block) notFound()

  return <ProtectedTimeEditForm block={block} />
}
