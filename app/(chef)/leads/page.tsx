// Website Leads - Unclaimed contact form submissions
// Any chef can view the shared pool and claim leads into their inquiry pipeline.
// Manual leads bypass this page and go straight to the inquiry form.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getOperatorEvaluationInbox, getUnclaimedSubmissions } from '@/lib/contact/claim'
import { LeadsList } from '@/components/leads/leads-list'
import { OperatorEvaluationInbox } from '@/components/leads/operator-evaluation-inbox'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Leads' }

export default async function LeadsPage() {
  await requireChef()
  const [submissions, operatorEvaluationInbox] = await Promise.all([
    getUnclaimedSubmissions(),
    getOperatorEvaluationInbox(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Leads</h1>
          <p className="text-stone-400 mt-1">
            General website leads stay claimable here, and founder-reviewed operator walkthrough
            requests stay in their own evaluation lane.
          </p>
        </div>
        <Link href="/inquiries/new">
          <Button>+ Log Manual Lead</Button>
        </Link>
      </div>

      {operatorEvaluationInbox.isOwner ? (
        <section id="operator-evaluations" className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-stone-100">Operator evaluation inbox</h2>
            <p className="mt-1 text-sm text-stone-400">
              Walkthrough requests from operator acquisition pages stay here for founder triage
              instead of falling into generic support or inquiry handling.
            </p>
          </div>
          <OperatorEvaluationInbox submissions={operatorEvaluationInbox.submissions} />
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-100">General website leads</h2>
          <p className="mt-1 text-sm text-stone-400">
            Claim inbound public contact leads here to move them into your inquiry pipeline.
          </p>
        </div>
        <LeadsList submissions={submissions} />
      </section>
    </div>
  )
}
