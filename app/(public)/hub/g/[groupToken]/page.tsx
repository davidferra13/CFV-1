import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { getGroupByToken, getGroupMembers, getGroupEvents } from '@/lib/hub/group-actions'
import { getGroupNotes } from '@/lib/hub/message-actions'
import { getGroupMedia } from '@/lib/hub/media-actions'
import { getGroupAvailability } from '@/lib/hub/availability-actions'
import { getMealBoard } from '@/lib/hub/meal-board-actions'
import { getCircleHouseholdSummary } from '@/lib/hub/household-actions'
import { getCriticalPathForGuest } from '@/lib/lifecycle/critical-path'
import { getLifecycleProgressForClient } from '@/lib/lifecycle/actions'
import { getCircleChefProofData } from '@/lib/hub/circle-chef-proof'
import { getDinnerCircleConfig } from '@/lib/dinner-circles/event-circle'
import { getPendingQuoteForCircle } from '@/lib/hub/circle-approval-actions'
import { createServerClient } from '@/lib/db/server'
import { HubGroupView } from './hub-group-view'
import { HubBridgeView } from '@/components/hub/hub-bridge-view'
import { CircleArchiveView } from '@/components/hub/circle-archive-view'

interface Props {
  params: Promise<{ groupToken: string }>
}

export default async function HubGroupPage({ params }: Props) {
  const { groupToken } = await params
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`hub-group:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const group = await getGroupByToken(groupToken)

  if (!group) {
    notFound()
  }

  // Circle was archived (event completed or manually closed): show archive timeline
  if (!group.is_active) {
    const archiveEvents = await getGroupEvents(group.id).catch(() => [])
    const archiveEvent = archiveEvents[0] as any | undefined

    return (
      <div className="min-h-screen bg-stone-950 p-6 space-y-6">
        <div className="max-w-2xl mx-auto">
          {archiveEvent ? (
            <CircleArchiveView
              groupId={group.id}
              eventId={archiveEvent.event_id}
              eventStatus={archiveEvent.status ?? 'completed'}
              eventDate={archiveEvent.event_date ?? null}
              occasion={archiveEvent.occasion ?? null}
              location={archiveEvent.location ?? null}
              guestCount={archiveEvent.guest_count ?? null}
              chefName={null}
              profileToken={groupToken}
            />
          ) : (
            <div className="text-center py-12">
              <h1 className="text-xl font-semibold text-stone-200 mb-2">This circle has ended</h1>
              <p className="text-stone-400 text-sm">Thanks for being part of it.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const [
    members,
    notes,
    media,
    availability,
    groupEvents,
    mealBoardResult,
    householdSummaryResult,
    guestStatus,
    lifecycleClient,
    chefProof,
  ] = await Promise.all([
    getGroupMembers(group.id).catch(() => []),
    getGroupNotes(group.id).catch(() => []),
    getGroupMedia({ groupId: group.id }).catch(() => []),
    getGroupAvailability(group.id).catch(() => []),
    getGroupEvents(group.id).catch(() => []),
    getMealBoard({ groupId: group.id, groupToken })
      .then((entries) => ({ entries, error: null as string | null }))
      .catch((error) => {
        console.error('[hub] Failed to load meal board', error)
        return { entries: [], error: 'Could not load meal board' }
      }),
    getCircleHouseholdSummary(group.id, groupToken)
      .then((summary) => ({ summary, error: null as string | null }))
      .catch((error) => {
        console.error('[hub] Failed to load household dietary summary', error)
        return { summary: null, error: 'Could not load household dietary data' }
      }),
    // Skip event lifecycle queries for community circles (no event, no tenant)
    group.group_type === 'community'
      ? Promise.resolve(null)
      : getCriticalPathForGuest(groupToken).catch(() => null),
    group.group_type === 'community'
      ? Promise.resolve(null)
      : getLifecycleProgressForClient(groupToken).catch(() => null),
    group.group_type === 'community' || !group.tenant_id
      ? Promise.resolve(null)
      : getCircleChefProofData({
          groupId: group.id,
          tenantId: group.tenant_id,
        }).catch(() => null),
  ])

  const pendingQuote = await getPendingQuoteForCircle(groupToken)
  const linkedEventId = group.event_id ?? groupEvents[0]?.event_id ?? null
  const circleConfig =
    group.group_type === 'community' || !linkedEventId
      ? null
      : await getDinnerCircleConfig(linkedEventId).catch(() => null)

  // Branch: bridge groups get the slim intro view, not the full Dinner Circle
  if (group.group_type === 'bridge') {
    return (
      <div className="min-h-screen bg-stone-950 p-4">
        <HubBridgeView
          group={group}
          members={members}
          profileToken={null}
          currentProfileId={null}
          bridgeId={null}
          introMode={null}
          bridgeStatus={null}
          isSourceChef={false}
          isTargetChef={false}
          targetCircleToken={null}
          clientDisplayName={group.name?.replace('Introduction: ', '') ?? null}
        />
      </div>
    )
  }

  return (
    <HubGroupView
      group={group}
      members={members}
      notes={notes}
      media={media}
      availability={availability}
      groupEvents={groupEvents}
      mealBoardEntries={mealBoardResult.entries}
      mealBoardError={mealBoardResult.error}
      householdSummary={householdSummaryResult.summary}
      householdSummaryError={householdSummaryResult.error}
      guestStatus={guestStatus}
      lifecycleStages={lifecycleClient?.stages || []}
      linkedEventId={linkedEventId}
      circleConfig={circleConfig}
      chefProof={chefProof}
      pendingQuote={pendingQuote}
    />
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupToken } = await params
  const db: any = createServerClient({ admin: true })
  const { data: group } = await db
    .from('hub_groups')
    .select('name, emoji, display_area, member_count, is_open_table, open_seats')
    .eq('group_token', groupToken)
    .eq('is_active', true)
    .single()

  if (!group) return { title: 'Dinner Circle' }

  const title = `${group.emoji ?? ''} ${group.name}`.trim()
  const memberText = group.member_count ? `${group.member_count} people joined` : ''
  const areaText = group.display_area ? `in ${group.display_area}` : ''
  const seatsText = group.is_open_table && group.open_seats ? `${group.open_seats} seats open` : ''
  const description =
    [memberText, areaText, seatsText].filter(Boolean).join(' - ') ||
    'Join this dinner circle on ChefFlow'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'ChefFlow',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export const dynamic = 'force-dynamic'
