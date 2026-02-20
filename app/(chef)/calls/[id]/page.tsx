// Call detail page — prep panel, status actions, outcome logging

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronLeft, Phone, Clock, User, Building2, Calendar, FileText } from 'lucide-react'
import { getCall } from '@/lib/calls/actions'
import { CallPrepPanel } from '@/components/calls/call-prep-panel'
import { CallOutcomeForm } from '@/components/calls/call-outcome-form'
import { CallStatusActions } from '@/components/calls/call-status-actions'
import { CallTypeBadge } from '@/components/calls/call-type-badge'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'Call Detail - ChefFlow' }
}

function getContactLabel(call: Awaited<ReturnType<typeof getCall>>): string {
  if (!call) return ''
  if (call.client) return call.client.full_name
  if (call.contact_name) return call.contact_name
  if (call.contact_company) return call.contact_company
  return 'Unknown contact'
}

const STATUS_PILL: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed:  'bg-green-100 text-green-700',
  completed:  'bg-gray-100 text-gray-600',
  no_show:    'bg-red-100 text-red-700',
  cancelled:  'bg-gray-100 text-gray-400',
}

export default async function CallDetailPage({ params }: Props) {
  const call = await getCall(params.id)

  if (!call) notFound()

  const contact = getContactLabel(call)
  const isTerminal = ['completed', 'no_show', 'cancelled'].includes(call.status)

  const title = call.title ?? `${call.call_type.replace(/_/g, ' ')} with ${contact}`

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link
        href="/calls"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Calls
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">{title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <CallTypeBadge type={call.call_type} />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_PILL[call.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {call.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {!isTerminal && (
            <Link
              href={`/calls/${call.id}/edit`}
              className="text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5"
            >
              Edit
            </Link>
          )}
        </div>

        {/* Meta grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <dt className="sr-only">Date & time</dt>
              <dd className="text-gray-800 font-medium">
                {format(new Date(call.scheduled_at), 'EEEE, MMM d, yyyy')}
              </dd>
              <dd className="text-gray-500">
                {format(new Date(call.scheduled_at), 'h:mm a')} · {call.duration_minutes} min
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <dt className="sr-only">Contact</dt>
              <dd className="text-gray-800 font-medium">{contact}</dd>
              {call.contact_phone && (
                <dd className="text-gray-500">{call.contact_phone}</dd>
              )}
              {call.contact_company && !call.client && (
                <dd className="text-gray-500">{call.contact_company}</dd>
              )}
            </div>
          </div>

          {call.inquiry && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <dt className="sr-only">Linked inquiry</dt>
                <dd>
                  <Link
                    href={`/inquiries/${call.inquiry.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Inquiry: {call.inquiry.confirmed_occasion ?? 'View →'}
                  </Link>
                </dd>
              </div>
            </div>
          )}

          {call.event && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <dt className="sr-only">Linked event</dt>
                <dd>
                  <Link
                    href={`/events/${call.event.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Event: {call.event.title}
                    {call.event.event_date && ` (${format(new Date(call.event.event_date), 'MMM d')})`}
                  </Link>
                </dd>
              </div>
            </div>
          )}
        </dl>

        {/* Status actions */}
        {!isTerminal && <CallStatusActions call={call} />}
      </div>

      {/* Prep panel */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <CallPrepPanel call={call} />
      </div>

      {/* Outcome */}
      {(call.status === 'scheduled' || call.status === 'confirmed' || call.status === 'completed') && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <CallOutcomeForm call={call} />
        </div>
      )}

      {/* Completed outcome display */}
      {call.status === 'completed' && call.next_action && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">Next action</p>
          <p className="text-sm text-amber-700 mt-1">{call.next_action}</p>
          {call.next_action_due_at && (
            <p className="text-xs text-amber-600 mt-1">
              Due: {format(new Date(call.next_action_due_at), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
