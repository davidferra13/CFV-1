// Guest CRM - Guest list with search, tags, comp indicators
// Part of the Guest CRM System

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listGuests } from '@/lib/guests/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GuestSearch } from '@/components/guests/guest-search'
import { GuestForm } from '@/components/guests/guest-form'

export const metadata: Metadata = { title: 'Guests' }

const TAG_STYLES: Record<string, string> = {
  gold: 'bg-amber-950 text-amber-400 ring-1 ring-inset ring-amber-800',
  brand: 'bg-brand-950 text-brand-400 ring-1 ring-inset ring-brand-800',
  green: 'bg-emerald-950 text-emerald-400 ring-1 ring-inset ring-emerald-800',
  red: 'bg-red-950 text-red-400 ring-1 ring-inset ring-red-800',
  purple: 'bg-purple-950 text-purple-400 ring-1 ring-inset ring-purple-800',
}

export default async function GuestsPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireChef()
  const query = searchParams.q ?? ''
  const guests = await listGuests(query || undefined)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Guests</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track guest visits, manage comps, and build lasting relationships.
        </p>
      </div>

      {/* Quick search with live dropdown */}
      <GuestSearch />

      {/* Server-side filter fallback */}
      <form method="get" action="/guests" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Filter by name or phone..."
          title="Filter guests"
          className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Filter
        </button>
        {query && (
          <Link
            href="/guests"
            className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors inline-flex items-center"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Guest list */}
      {guests.length === 0 ? (
        <p className="text-sm text-stone-500">
          {query ? 'No guests match your search.' : 'No guests yet. Add your first guest below.'}
        </p>
      ) : (
        <div className="space-y-3">
          {guests.map((guest: any) => {
            const activeComps = (guest.guest_comps ?? []).filter((c: any) => !c.redeemed_at)
            const tags = guest.guest_tags ?? []

            return (
              <Link key={guest.id} href={`/guests/${guest.id}`}>
                <Card interactive className="mb-3">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-100">{guest.name}</span>
                          {activeComps.length > 0 && (
                            <Badge variant="warning">
                              {activeComps.length} comp{activeComps.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-stone-500">
                          {guest.phone && <span>{guest.phone}</span>}
                          {guest.email && <span>{guest.email}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {tags.map((t: any) => (
                          <span
                            key={t.tag}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              TAG_STYLES[t.color || ''] || TAG_STYLES.brand
                            }`}
                          >
                            {t.tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Add new guest */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Guest</CardTitle>
        </CardHeader>
        <CardContent>
          <GuestForm />
        </CardContent>
      </Card>
    </div>
  )
}
