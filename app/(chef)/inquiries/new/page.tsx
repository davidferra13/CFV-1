// Quick Capture — Log a new inquiry fast
// Only channel + client name required. Everything else optional.
// The chef is logging this between tasks — friction kills adoption.

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { InquiryForm } from '@/components/inquiries/inquiry-form'

export default async function NewInquiryPage() {
  await requireChef()

  const clients = await getClients()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Log New Inquiry</h1>
        <p className="text-stone-600 mt-1">
          Capture the lead now, fill in details later. Only channel and name are required.
        </p>
      </div>

      <InquiryForm clients={clients} />
    </div>
  )
}
