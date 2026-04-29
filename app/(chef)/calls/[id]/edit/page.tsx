// Edit an existing call

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from '@/components/ui/icons'
import { getCallLoadState } from '@/lib/calls/actions'
import { CallForm } from '@/components/calls/call-form'

export const metadata: Metadata = { title: 'Edit Call' }

type Props = { params: { id: string } }

export default async function EditCallPage({ params }: Props) {
  const callResult = await getCallLoadState(params.id)

  if (callResult.status === 'unavailable') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Link
          href="/calls"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Calls
        </Link>
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 px-5 py-4">
          <p className="text-sm font-medium text-amber-200">Call editor unavailable</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">
            ChefFlow could not verify this call record right now, so editing is paused until the
            data source recovers.
          </p>
        </div>
      </div>
    )
  }

  const call = callResult.data

  if (!call) notFound()

  // Terminal calls cannot be edited
  if (['completed', 'no_show', 'cancelled'].includes(call.status)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href={`/calls/${call.id}`}
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to call
        </Link>
        <p className="text-sm text-stone-400">
          This call cannot be edited because it is {call.status}.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/calls/${call.id}`}
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to call
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Edit Call</h1>
      </div>

      <div className="bg-stone-900 rounded-xl border shadow-sm p-6">
        <CallForm existing={call} />
      </div>
    </div>
  )
}
