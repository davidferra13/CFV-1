// Kitchen Rental Tracking Page
// Logs commercial kitchen bookings (hours, cost, purpose, optional event link).

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listKitchenRentals } from '@/lib/kitchen-rentals/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { KitchenRentalForm } from './kitchen-rental-form'
import { DeleteKitchenRentalButton } from './delete-kitchen-rental-button'

export const metadata: Metadata = { title: 'Kitchen Rentals | ChefFlow' }

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function KitchenRentalsPage() {
  const user = await requireChef()
  const rentals = await listKitchenRentals()

  const totalCents = rentals.reduce((s: any, r: any) => s + r.cost_cents, 0)
  const totalHours = rentals.reduce((s: any, r: any) => s + (r.hours_booked ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Kitchen Rentals</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track commercial kitchen bookings - hours, costs, and event linkages.
        </p>
      </div>

      {/* Summary */}
      {rentals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-stone-500">Total bookings</p>
              <p className="text-2xl font-bold text-stone-100">{rentals.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-stone-500">Total hours</p>
              <p className="text-2xl font-bold text-stone-100">{totalHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-stone-500">Total cost</p>
              <p className="text-2xl font-bold text-stone-100">{formatCents(totalCents)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rental list */}
      {rentals.length === 0 ? (
        <p className="text-sm text-stone-500">No kitchen rentals logged yet.</p>
      ) : (
        <div className="space-y-3">
          {rentals.map((rental: any) => (
            <Card key={rental.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{rental.facility_name}</span>
                      <span className="text-sm text-stone-500">
                        {format(new Date(rental.rental_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </span>
                      {rental.hours_booked && (
                        <span className="text-sm text-stone-500">{rental.hours_booked}h</span>
                      )}
                      <span className="font-medium text-stone-300">
                        {formatCents(rental.cost_cents)}
                      </span>
                    </div>
                    {rental.purpose && (
                      <p className="mt-0.5 text-sm text-stone-400">{rental.purpose}</p>
                    )}
                    {rental.address && (
                      <p className="mt-0.5 text-xs text-stone-400">{rental.address}</p>
                    )}
                    {rental.booking_confirmation && (
                      <p className="mt-0.5 text-xs text-stone-400">
                        Confirmation: {rental.booking_confirmation}
                      </p>
                    )}
                    {rental.notes && (
                      <p className="mt-0.5 text-xs text-stone-400">{rental.notes}</p>
                    )}
                  </div>
                  <DeleteKitchenRentalButton id={rental.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log a Rental</CardTitle>
        </CardHeader>
        <CardContent>
          <KitchenRentalForm chefId={user.entityId} />
        </CardContent>
      </Card>
    </div>
  )
}
