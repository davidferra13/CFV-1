// Chef Households Page - List all households

import { requireChef } from '@/lib/auth/get-user'
import { getHouseholds } from '@/lib/households/actions'
import { getClients } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'
import { HouseholdCard } from '@/components/households/household-card'
import { HouseholdForm } from '@/components/households/household-form'
import { Users } from 'lucide-react'

export default async function HouseholdsPage() {
  await requireChef()

  const [households, clients] = await Promise.all([
    getHouseholds(),
    getClients(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Households</h1>
        <p className="text-stone-600 mt-1">
          Group clients into families, couples, and regular groups
        </p>
      </div>

      {/* Household List */}
      {households.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {households.map((household) => (
            <HouseholdCard key={household.id} household={household} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-stone-700 mb-1">No households yet</h2>
          <p className="text-sm text-stone-500 mb-6">
            Create a household to group clients who book together -- couples, families, or regular groups.
          </p>
        </div>
      )}

      {/* Create Household Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Create New Household</h2>
        <HouseholdForm clients={clients} />
      </Card>
    </div>
  )
}
