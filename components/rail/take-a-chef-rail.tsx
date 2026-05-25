'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChefHat, Clock, Users, MapPin, ExternalLink } from '@/components/ui/icons'

export interface TacRailInquiry {
  id: string
  clientName: string
  status: string
  createdAt: string
  lastResponseAt: string | null
  guestCount: number | null
  eventDate: string | null
  location: string | null
  occasion: string | null
  dietaryRestrictions: string | null
  externalLink: string | null
  accountEmail: string | null
  hoursWaiting: number
  urgency: 'critical' | 'high' | 'normal'
}

export interface TacRailData {
  inquiries: TacRailInquiry[]
  totalActive: number
  avgResponseHours: number | null
  oldestUnrespondedHours: number | null
}

function formatHoursAgo(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.round(hours)}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getUrgencyClasses(urgency: 'critical' | 'high' | 'normal'): string {
  switch (urgency) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 animate-pulse'
    case 'high':
      return 'bg-amber-500/20 text-amber-400'
    case 'normal':
      return 'bg-emerald-500/20 text-emerald-400'
  }
}

function getAccountLabel(email: string | null): string | null {
  if (!email) return null
  const local = email.split('@')[0]
  return local ?? null
}

function InquiryCard({ inquiry }: { inquiry: TacRailInquiry }) {
  const urgencyClasses = getUrgencyClasses(inquiry.urgency)
  const accountLabel = getAccountLabel(inquiry.accountEmail)
  const tacLink = inquiry.externalLink ?? 'https://www.takeachef.com'

  return (
    <div
      className={cn(
        'min-w-[280px] rounded-lg border bg-stone-800/60 border-stone-700/50 p-3',
        'transition-colors hover:border-amber-500/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/inquiries/${inquiry.id}`} className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate">{inquiry.clientName}</p>
        </Link>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0',
            urgencyClasses
          )}
        >
          <Clock className="h-3 w-3" />
          {formatHoursAgo(inquiry.hoursWaiting)}
        </span>
      </div>

      <Link href={`/inquiries/${inquiry.id}`} className="block mt-2">
        {/* Event details row */}
        <div className="flex items-center gap-2 text-xs text-stone-400 truncate">
          {inquiry.eventDate && <span>{formatEventDate(inquiry.eventDate)}</span>}
          {inquiry.guestCount && (
            <span className="inline-flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {inquiry.guestCount}
            </span>
          )}
          {inquiry.location && (
            <span className="inline-flex items-center gap-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{inquiry.location}</span>
            </span>
          )}
        </div>

        {/* Occasion */}
        {inquiry.occasion && (
          <p className="mt-1 text-xs text-stone-500 truncate">{inquiry.occasion}</p>
        )}

        {/* Dietary restrictions */}
        {inquiry.dietaryRestrictions && (
          <span className="mt-1 inline-block rounded bg-stone-700/50 px-1.5 py-0.5 text-[10px] text-stone-400">
            {inquiry.dietaryRestrictions}
          </span>
        )}
      </Link>

      {/* Footer: account badge + external link */}
      <div className="mt-2 flex items-center justify-between">
        {accountLabel && (
          <span className="text-[10px] text-stone-500 truncate max-w-[120px]">{accountLabel}</span>
        )}
        <a
          href={tacLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          TAC
        </a>
      </div>
    </div>
  )
}

export function TakeAChefRail({ data }: { data: TacRailData }) {
  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-stone-200">Take a Chef</h3>
        </div>
        <Link
          href="/inquiries"
          className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Stats row */}
      <div className="mb-3 flex items-center gap-3 text-xs text-stone-400">
        <span>{data.totalActive} active</span>
        {data.avgResponseHours !== null && (
          <span>Avg response: {Math.round(data.avgResponseHours)}h</span>
        )}
        {data.oldestUnrespondedHours !== null && data.oldestUnrespondedHours > 24 && (
          <span className="text-red-400 font-medium">
            Oldest: {Math.round(data.oldestUnrespondedHours / 24)}d waiting
          </span>
        )}
      </div>

      {/* Cards: horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-x-visible">
        {data.inquiries.map((inquiry) => (
          <InquiryCard key={inquiry.id} inquiry={inquiry} />
        ))}
      </div>
    </div>
  )
}

export function TakeAChefRailSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-stone-700 animate-pulse" />
        <div className="h-4 w-24 rounded bg-stone-700 animate-pulse" />
      </div>
      <div className="mb-3 flex gap-3">
        <div className="h-3 w-16 rounded bg-stone-700/50 animate-pulse" />
        <div className="h-3 w-28 rounded bg-stone-700/50 animate-pulse" />
      </div>
      <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="min-w-[280px] h-[120px] rounded-lg border border-stone-700/50 bg-stone-800/40 animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
