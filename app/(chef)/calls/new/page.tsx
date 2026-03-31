// Schedule a new call

import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from '@/components/ui/icons'
import { CallForm } from '@/components/calls/call-form'

export const metadata: Metadata = { title: 'Schedule Call' }

type Props = {
  searchParams: {
    client_id?: string
    client_name?: string
    inquiry_id?: string
    event_id?: string
  }
}

export default function NewCallPage({ searchParams }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/calls"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Calls
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Schedule a Call</h1>
        <p className="text-sm text-stone-400 mt-1">
          Set the time, contact, and prep agenda - all in one place.
        </p>
      </div>

      <div className="bg-stone-900 rounded-xl border shadow-sm p-6">
        <CallForm
          defaultClientId={searchParams.client_id}
          defaultClientName={searchParams.client_name}
          defaultInquiryId={searchParams.inquiry_id}
          defaultEventId={searchParams.event_id}
        />
      </div>
    </div>
  )
}
