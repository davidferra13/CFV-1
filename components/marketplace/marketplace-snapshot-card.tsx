'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PlatformSnapshotEntry } from '@/lib/marketplace/platform-record-readers'

const CAPTURE_TYPE_LABELS: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'info' }
> = {
  new_inquiry: { label: 'New Inquiry', variant: 'info' },
  booking_confirmed: { label: 'Booking Confirmed', variant: 'success' },
  client_message: { label: 'Client Message', variant: 'default' },
  payment: { label: 'Payment', variant: 'success' },
  customer_info: { label: 'Contact Revealed', variant: 'warning' },
  capture: { label: 'Page Capture', variant: 'info' },
}

interface MarketplaceSnapshotCardProps {
  snapshots: PlatformSnapshotEntry[]
}

export function MarketplaceSnapshotCard({ snapshots }: MarketplaceSnapshotCardProps) {
  if (snapshots.length === 0) return null

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-stone-300">Platform Activity Timeline</h3>

      <div className="space-y-2">
        {snapshots.map((snap) => {
          const typeInfo = CAPTURE_TYPE_LABELS[snap.captureType] || {
            label: snap.captureType,
            variant: 'default' as const,
          }
          const formattedDate = new Date(snap.snapshotAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })

          return (
            <div
              key={snap.id}
              className="flex items-start gap-3 text-sm border-l-2 border-stone-700 pl-3 py-1"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                  <span className="text-xs text-stone-500">{formattedDate}</span>
                  <Badge variant="default">{snap.source}</Badge>
                </div>

                {snap.summary && <p className="text-stone-300 text-xs truncate">{snap.summary}</p>}

                {/* Extracted details */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-stone-500">
                  {snap.clientName && <span>Client: {snap.clientName}</span>}
                  {snap.bookingDate && <span>Date: {snap.bookingDate}</span>}
                  {snap.guestCount && <span>Guests: {snap.guestCount}</span>}
                  {snap.location && <span>Location: {snap.location}</span>}
                  {snap.occasion && <span>Occasion: {snap.occasion}</span>}
                  {snap.amountCents != null && (
                    <span>Amount: ${(snap.amountCents / 100).toFixed(2)}</span>
                  )}
                  {snap.email && <span>Email: {snap.email}</span>}
                  {snap.phone && <span>Phone: {snap.phone}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
