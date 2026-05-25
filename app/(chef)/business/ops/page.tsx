import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getCredentials } from '@/lib/business-ops/credential-actions'
import { getInsurancePolicies } from '@/lib/business-ops/insurance-actions'
import { getTrustedStaff } from '@/lib/business-ops/staff-roster-actions'
import {
  getEquipmentInventory,
  getEquipmentValueSummary,
} from '@/lib/business-ops/equipment-actions'
import { CredentialTracker } from '@/components/business-ops/credential-tracker'
import { InsuranceTracker } from '@/components/business-ops/insurance-tracker'
import { TrustedStaffRoster } from '@/components/business-ops/trusted-staff-roster'
import { EquipmentInventory } from '@/components/business-ops/equipment-inventory'
import { TaxPrepCard } from '@/components/business-ops/tax-prep-card'

export const metadata = {
  title: 'Business Operations',
}

export default async function BusinessOpsPage() {
  await requireChef()

  const [credentials, policies, staff, equipment, equipmentSummary] = await Promise.all([
    getCredentials(),
    getInsurancePolicies(),
    getTrustedStaff(),
    getEquipmentInventory(true),
    getEquipmentValueSummary(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-stone-100">Business Operations</h1>
      <p className="text-sm text-stone-400">
        Track credentials, insurance, trusted contacts, equipment, and tax prep in one place.
      </p>

      <CredentialTracker initialData={credentials} />
      <InsuranceTracker initialData={policies} />
      <TrustedStaffRoster initialData={staff} />
      <EquipmentInventory initialData={equipment} valueSummary={equipmentSummary} />

      <Suspense
        fallback={
          <div className="bg-stone-800 rounded-lg border border-stone-700 p-4 text-stone-500 text-sm">
            Loading tax prep data...
          </div>
        }
      >
        <TaxPrepCard />
      </Suspense>
    </div>
  )
}
