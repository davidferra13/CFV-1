// Guest Leads Dashboard — /guest-leads
// Shows all guest pipeline leads captured via event QR codes.
// Chef can filter, convert leads to clients, and track status.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getGuestLeads, getGuestLeadStats } from '@/lib/guest-leads/actions'
import { GuestLeadsList } from '@/components/guest-leads/guest-leads-list'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Guest Leads - ChefFlow' }

export default async function GuestLeadsPage() {
  await requireChef()

  const [leads, stats] = await Promise.all([getGuestLeads(), getGuestLeadStats()])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Guest Leads</h1>
        <p className="text-stone-600 mt-1">
          People who scanned your QR code at events and expressed interest in booking.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
          <p className="text-sm text-stone-500">Total Leads</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
          <p className="text-sm text-stone-500">New</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.contacted}</p>
          <p className="text-sm text-stone-500">Contacted</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
          <p className="text-sm text-stone-500">Converted</p>
        </Card>
      </div>

      {/* Leads list */}
      {leads.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <p className="text-stone-400 text-lg mb-2">No guest leads yet</p>
            <p className="text-stone-500 text-sm">
              Display the QR code from your event pages at your next dinner. When guests scan it and
              fill out the form, they'll appear here.
            </p>
          </div>
        </Card>
      ) : (
        <GuestLeadsList leads={leads} />
      )}
    </div>
  )
}
