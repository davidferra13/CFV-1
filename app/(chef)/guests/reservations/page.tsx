// Guest Reservations Page
// View and manage all upcoming and past reservations.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const metadata: Metadata = { title: 'Reservations — ChefFlow' }

export default async function ReservationsPage() {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from('guest_reservations')
      .select('*, guests(id, name, phone)')
      .eq('chef_id', user.tenantId!)
      .gte('reservation_date', today)
      .order('reservation_date', { ascending: true })
      .limit(50),
    supabase
      .from('guest_reservations')
      .select('*, guests(id, name, phone)')
      .eq('chef_id', user.tenantId!)
      .lt('reservation_date', today)
      .order('reservation_date', { ascending: false })
      .limit(20),
  ])

  const upcomingRes = upcoming ?? []
  const pastRes = past ?? []

  const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    confirmed: 'success',
    seated: 'success',
    completed: 'default',
    no_show: 'error',
    cancelled: 'error',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/guests" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Guest Directory
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">Reservations</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage upcoming reservations. Guest notes and comps are visible at check-in.
        </p>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Upcoming
            <Badge variant="default" className="ml-2">
              {upcomingRes.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingRes.length === 0 ? (
            <p className="text-sm text-stone-500">No upcoming reservations.</p>
          ) : (
            <div className="space-y-2">
              {upcomingRes.map((res: any) => {
                const guest = res.guests
                return (
                  <div
                    key={res.id}
                    className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                  >
                    <div>
                      {guest ? (
                        <Link
                          href={`/guests/${guest.id}`}
                          className="text-amber-600 hover:text-amber-500"
                        >
                          {guest.name}
                        </Link>
                      ) : (
                        <span className="text-stone-400">Unknown guest</span>
                      )}
                      <span className="text-stone-500 ml-2">
                        {new Date(res.reservation_date).toLocaleDateString()}
                      </span>
                      {res.reservation_time && (
                        <span className="text-stone-400 ml-1">{res.reservation_time}</span>
                      )}
                      {res.party_size && (
                        <span className="text-stone-500 ml-2">Party of {res.party_size}</span>
                      )}
                      {res.table_number && (
                        <span className="text-stone-500 ml-2">Table {res.table_number}</span>
                      )}
                    </div>
                    <Badge variant={STATUS_BADGE[res.status] ?? 'default'}>{res.status}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past */}
      {pastRes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastRes.map((res: any) => {
                const guest = res.guests
                return (
                  <div
                    key={res.id}
                    className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                  >
                    <div>
                      {guest ? (
                        <Link
                          href={`/guests/${guest.id}`}
                          className="text-amber-600 hover:text-amber-500"
                        >
                          {guest.name}
                        </Link>
                      ) : (
                        <span className="text-stone-400">Unknown guest</span>
                      )}
                      <span className="text-stone-500 ml-2">
                        {new Date(res.reservation_date).toLocaleDateString()}
                      </span>
                      {res.party_size && (
                        <span className="text-stone-500 ml-2">Party of {res.party_size}</span>
                      )}
                    </div>
                    <Badge variant={STATUS_BADGE[res.status] ?? 'default'}>{res.status}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
