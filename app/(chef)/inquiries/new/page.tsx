// Quick Capture - Log a new inquiry fast
// Only channel + client name required. Everything else optional.
// The chef is logging this between tasks - friction kills adoption.

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getPartners, getPartnerLocations } from '@/lib/partners/actions'
import { InquiryForm } from '@/components/inquiries/inquiry-form'

export default async function NewInquiryPage() {
  const user = await requireChef()

  const [clients, partners] = await Promise.all([getClients(), getPartners({ status: 'active' })])

  // Build partner locations map for cascading dropdown
  const partnerLocations: Record<
    string,
    { id: string; name: string; city: string | null; state: string | null }[]
  > = {}
  for (const partner of partners) {
    if (partner.partner_locations && partner.partner_locations.length > 0) {
      partnerLocations[partner.id] = partner.partner_locations
        .filter((l: { is_active: boolean }) => l.is_active)
        .map((l: { id: string; name: string }) => ({
          id: l.id,
          name: l.name,
          city: null,
          state: null,
        }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">New Inquiry</h1>
        <p className="text-stone-400 mt-1">
          Capture the lead now, fill in details later. Only channel and name are required.
        </p>
      </div>

      <InquiryForm
        tenantId={user.tenantId!}
        clients={clients}
        partners={partners.map((p: any) => ({
          id: p.id,
          name: p.name,
          partner_type: p.partner_type,
        }))}
        partnerLocations={partnerLocations}
      />
    </div>
  )
}
