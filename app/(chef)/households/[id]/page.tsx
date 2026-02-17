// Chef Household Detail - View and manage a single household

import { requireChef } from '@/lib/auth/get-user'
import { getHousehold } from '@/lib/households/actions'
import { getClients } from '@/lib/clients/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { HouseholdForm } from '@/components/households/household-form'
import { HouseholdDetailMembers } from './household-detail-members'

export default async function HouseholdDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const [household, clients] = await Promise.all([
    getHousehold(params.id),
    getClients(),
  ])

  if (!household) {
    notFound()
  }

  // Filter out clients already in this household
  const availableClients = clients.filter(
    (c) => !household.members.some((m) => m.client_id === c.id)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/households" className="text-sm text-brand-600 hover:text-brand-700 mb-2 inline-block">
            ← Back to Households
          </Link>
          <h1 className="text-3xl font-bold text-stone-900">{household.name}</h1>
          <p className="text-stone-600 mt-1">
            {household.members.length} member{household.members.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Members */}
      <HouseholdDetailMembers
        household={household}
        availableClients={availableClients}
      />

      {/* Edit Household */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Edit Household</h2>
        <HouseholdForm
          clients={clients}
          household={household}
        />
      </Card>
    </div>
  )
}
