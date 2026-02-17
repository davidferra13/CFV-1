// Website Leads — Unclaimed contact form submissions
// Any chef can view the shared pool and claim leads into their inquiry pipeline.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getUnclaimedSubmissions } from '@/lib/contact/claim'
import { LeadsList } from '@/components/leads/leads-list'

export const metadata: Metadata = { title: 'Leads - ChefFlow' }

export default async function LeadsPage() {
  await requireChef()
  const submissions = await getUnclaimedSubmissions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Website Leads</h1>
        <p className="text-stone-600 mt-1">
          Contact form submissions from your website. Claim a lead to add it to your inquiry pipeline.
        </p>
      </div>
      <LeadsList submissions={submissions} />
    </div>
  )
}
