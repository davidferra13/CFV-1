// Add New Partner - Form for creating a referral partner

import { requireChef } from '@/lib/auth/get-user'
import { PartnerForm } from '@/components/partners/partner-form'

export default async function NewPartnerPage() {
  await requireChef()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Add New Partner</h1>
        <p className="text-stone-400 mt-1">
          Track an Airbnb host, hotel, business, or individual who refers clients to you.
        </p>
      </div>

      <PartnerForm />
    </div>
  )
}
