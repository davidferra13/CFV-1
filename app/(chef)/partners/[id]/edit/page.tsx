// Edit Partner Page

import { requireChef } from '@/lib/auth/get-user'
import { getPartnerById } from '@/lib/partners/actions'
import { notFound } from 'next/navigation'
import { PartnerForm } from '@/components/partners/partner-form'

export default async function EditPartnerPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const partner = await getPartnerById(params.id)
  if (!partner) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Edit Partner</h1>
        <p className="text-stone-600 mt-1">Update {(partner as any).name}&apos;s details</p>
      </div>

      <PartnerForm partner={partner as any} />
    </div>
  )
}
