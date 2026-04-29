import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getRetainerDetail } from '@/lib/retainers/actions'
import { RetainerForm } from '@/components/retainers/retainer-form'

export const metadata: Metadata = { title: 'Edit Retainer' }

export default async function EditRetainerPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  let retainer: Awaited<ReturnType<typeof getRetainerDetail>>
  try {
    retainer = await getRetainerDetail(params.id)
  } catch {
    notFound()
  }

  if (retainer.status !== 'draft') {
    redirect(`/finance/retainers/${retainer.id}`)
  }

  const currentClient = {
    id: retainer.client_id,
    full_name: retainer.clients?.full_name || 'Current client',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Edit Retainer</h1>
          <p className="text-stone-500 mt-1">{retainer.name}</p>
        </div>
        <Link
          href={`/finance/retainers/${retainer.id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          Back to Retainer
        </Link>
      </div>

      <RetainerForm
        clients={[currentClient]}
        mode="edit"
        retainer={retainer}
        chefId={user.tenantId!}
      />
    </div>
  )
}
