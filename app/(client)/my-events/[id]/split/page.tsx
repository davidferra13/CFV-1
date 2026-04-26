import { requireClient } from '@/lib/auth/get-user'
import { getClientSplitView } from '@/lib/payments/split-share-actions'
import { notFound } from 'next/navigation'
import { ClientSplitPageClient } from './client-split-client'

export default async function ClientSplitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireClient()
  const { id } = await params

  const data = await getClientSplitView(id)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <ClientSplitPageClient data={data} eventId={id} />
    </div>
  )
}
