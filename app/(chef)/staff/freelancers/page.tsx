// Freelancer Management Page
// View and manage freelance/temporary staff hired for specific events.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { getFreelancers } from '@/lib/staff/freelance-actions'
import { FreelancerRoster } from '@/components/staff/freelancer-roster'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Freelancers - ChefFlow' }

export default async function FreelancersPage() {
  await requireChef()
  await requireFocusAccess()

  const freelancers = await getFreelancers(false) // show all, including inactive

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Freelancers</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage freelance and temporary staff for your events. Track rates, agencies, tax
            documents, and payment terms.
          </p>
        </div>
        <Link href="/staff">
          <Button variant="ghost" size="sm">
            All Staff
          </Button>
        </Link>
      </div>

      <FreelancerRoster freelancers={freelancers} />
    </div>
  )
}
