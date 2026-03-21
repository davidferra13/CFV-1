'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { AlertCircle, MessageCircle, ExternalLink } from '@/components/ui/icons'
import type { FirstContactInquiry } from '@/lib/inquiries/actions'

interface NeedsFirstContactProps {
  inquiries: FirstContactInquiry[]
}

const CHANNEL_LABELS: Record<string, { label: string; color: string }> = {
  email: { label: 'Email', color: 'bg-brand-900 text-brand-300' },
  website: { label: 'Website', color: 'bg-green-900 text-green-300' },
  take_a_chef: { label: 'TakeAChef', color: 'bg-purple-900 text-purple-300' },
  yhangry: { label: 'Yhangry', color: 'bg-amber-900 text-amber-300' },
  instagram: { label: 'Instagram', color: 'bg-pink-900 text-pink-300' },
  text: { label: 'Text', color: 'bg-stone-800 text-stone-300' },
  phone: { label: 'Phone', color: 'bg-stone-800 text-stone-300' },
  referral: { label: 'Referral', color: 'bg-teal-900 text-teal-300' },
}

function getChannelBadge(channel: string) {
  const info = CHANNEL_LABELS[channel] || { label: channel, color: 'bg-stone-800 text-stone-300' }
  return (
    <span className={`text-xxs px-1.5 py-0.5 rounded font-medium ${info.color}`}>{info.label}</span>
  )
}

export function NeedsFirstContact({ inquiries }: NeedsFirstContactProps) {
  if (inquiries.length === 0) return null

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-amber-400">
          {inquiries.length} {inquiries.length === 1 ? 'lead needs' : 'leads need'} your first
          message
        </h2>
      </div>

      {/* Cards */}
      <div className="bg-stone-900 rounded-xl border border-amber-800/40 overflow-hidden">
        {inquiries.map((inq) => (
          <div
            key={inq.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-stone-800 last:border-b-0 hover:bg-stone-800/50 transition-colors"
          >
            {/* Avatar with pulse */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
                <span className="text-base font-medium text-amber-400">
                  {inq.clientName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-stone-100 truncate">{inq.clientName}</p>
                {getChannelBadge(inq.channel)}
                <span className="text-xxs px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400 font-medium">
                  No contact yet
                </span>
              </div>
              <p className="text-xs text-stone-400 truncate">
                {[
                  inq.confirmedOccasion,
                  inq.confirmedLocation,
                  inq.confirmedDate ? format(new Date(inq.confirmedDate), 'MMM d, yyyy') : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Details pending'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/inquiries/${inq.id}`}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-700 transition-colors"
                title="View inquiry details"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <Link
                href={`/inquiries/${inq.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Respond
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
