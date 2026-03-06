// Edit an existing call

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from '@/components/ui/icons'
import { getCall } from '@/lib/calls/actions'
import { CallForm } from '@/components/calls/call-form'

export const metadata: Metadata = { title: 'Edit Call - ChefFlow' }

type Props = { params: { id: string } }

export default async function EditCallPage({ params }: Props) {
  const call = await getCall(params.id)

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
