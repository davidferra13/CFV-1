// Leads - Unified lead pipeline
// Website leads (unclaimed contact form submissions), operator evaluations,
// and guest referrals (QR code scans from events) all live here.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getOperatorEvaluationInbox, getUnclaimedSubmissions } from '@/lib/contact/claim'
import { getGuestLeads, getGuestLeadStats } from '@/lib/guests/lead-actions'
import { LeadsList } from '@/components/leads/leads-list'
import { OperatorEvaluationInbox } from '@/components/leads/operator-evaluation-inbox'
import { GuestLeadsList } from '@/components/guest-leads/guest-leads-list'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Leads' }

export default async function LeadsPage() {
  await requireChef()
  const [submissions, operatorEvaluationInbox, guestLeads, guestLeadStats] = await Promise.all([
    getUnclaimedSubmissions(),
    getOperatorEvaluationInbox(),
    getGuestLeads(),
    getGuestLeadStats(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Inquiries</h1>
          <p className="text-stone-400 mt-1">
            Website inquiries, operator evaluations, and guest referrals in one place.
          </p>
        </div>
        <Link href="/inquiries/new">
          <Button>+ Log Inquiry</Button>
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
          <h2 className="text-2xl font-semibold text-stone-100">Website inquiries</h2>
          <p className="mt-1 text-sm text-stone-400">
            Claim inbound contact submissions here to move them into your inquiry pipeline.
          </p>
        </div>
        <LeadsList submissions={submissions} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-100">Guest referrals</h2>
          <p className="mt-1 text-sm text-stone-400">
            People who scanned your QR code at events and expressed interest in booking.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{guestLeadStats.total}</p>
            <p className="text-sm text-stone-500">Total Referrals</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-brand-600">{guestLeadStats.new}</p>
            <p className="text-sm text-stone-500">New</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{guestLeadStats.contacted}</p>
            <p className="text-sm text-stone-500">Contacted</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{guestLeadStats.converted}</p>
            <p className="text-sm text-stone-500">Converted</p>
          </Card>
        </div>

        {guestLeads.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <p className="text-stone-400 text-lg mb-2">No guest referrals yet</p>
              <p className="text-stone-500 text-sm">
                Display the QR code from your event pages at your next dinner. When guests scan it
                and fill out the form, they will appear here.
              </p>
            </div>
          </Card>
        ) : (
          <GuestLeadsList leads={guestLeads} />
        )}
      </section>
    </div>
  )
}
