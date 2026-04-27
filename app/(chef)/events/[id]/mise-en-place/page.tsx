// Mise en Place Board
// "Everything in its place" - unified pre-service preparation command center.
// Station-organized view of every ingredient, tool, and task for an event.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getMiseEnPlace } from '@/lib/mise-en-place/actions'
import { MiseEnPlaceClient } from '@/components/mise-en-place/mise-en-place-client'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@/components/ui/icons'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

export default async function MiseEnPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  await requireChef()
  const { id: eventId } = await params
  const { returnTo } = await searchParams
  const backHref = sanitizeReturnTo(returnTo) || `/events/${eventId}?tab=prep`

  const { board, error } = await getMiseEnPlace(eventId)

  if (!board && error === 'Event not found.') {
    notFound()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Mise en Place</h1>
          {board && (
            <p className="text-sm text-muted-foreground">
              {board.eventName}
              {board.clientName ? ` for ${board.clientName}` : ''}
              {board.guestCount ? ` \u00B7 ${board.guestCount} guests` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && !board && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{error}</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Add a menu with courses and components to generate your mise en place board.
          </p>
          <Link href={`/events/${eventId}?tab=overview`}>
            <Button variant="secondary" size="sm" className="mt-3">
              Go to Event
            </Button>
          </Link>
        </div>
      )}

      {/* Board */}
      {board && <MiseEnPlaceClient board={board} />}
    </div>
  )
}
