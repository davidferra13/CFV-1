// Client Menu Selection Page
// Gives clients four paths to a menu:
// 1. Browse chef's showcase menus → pick one
// 2. Submit preferences (cuisine, loves/hates, style)
// 3. "I know exactly what I want" → free text
// 4. "Surprise me!" → one-click

import { requireClient } from '@/lib/auth/get-user'
import { getClientEventById } from '@/lib/events/client-actions'
import { getShowcaseMenus } from '@/lib/menus/showcase-actions'
import { getMenuPreferences } from '@/lib/menus/preference-actions'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChooseMenuClient } from './choose-menu-client'

export default async function ChooseMenuPage({ params }: { params: { id: string } }) {
  await requireClient()

  const event = await getClientEventById(params.id)
  if (!event) notFound()

  // Don't allow menu selection on cancelled/completed events
  if (['cancelled', 'completed'].includes(event.status)) {
    redirect(`/my-events/${params.id}`)
  }

  // Fetch showcase menus and existing preferences in parallel
  const [showcaseMenus, existingPreferences] = await Promise.all([
    getShowcaseMenus(event.tenant_id).catch(() => []),
    getMenuPreferences(params.id),
  ])

  // Get chef name from the event's tenant
  const chefName = (event as any).chef_name ?? 'your chef'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/my-events/${params.id}`}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Event
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-100">Let&apos;s plan your menu</h1>
        <p className="text-stone-400 mt-1">
          {event.occasion ? `For ${event.occasion}` : 'For your upcoming event'}
        </p>
      </div>

      <ChooseMenuClient
        eventId={params.id}
        showcaseMenus={showcaseMenus}
        existingPreferences={existingPreferences}
        chefName={chefName}
      />
    </div>
  )
}
