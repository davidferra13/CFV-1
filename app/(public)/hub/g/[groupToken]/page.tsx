import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies, headers } from 'next/headers'
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
import { getRsvpSummary } from '@/lib/hub/rsvp-actions'
import { createServerClient } from '@/lib/db/server'
import type { HubGroupMember } from '@/lib/hub/types'
import type { DinnerCircleConfig } from '@/lib/dinner-circles/types'
import { HubGroupView } from './hub-group-view'
import { HubBridgeView } from '@/components/hub/hub-bridge-view'
import { CircleArchiveView } from '@/components/hub/circle-archive-view'

interface Props {
  params: Promise<{ groupToken: string }>
}

const EMPTY_HOUSEHOLD_SUMMARY = {
  members: [],
  allAllergies: [],
  allDietary: [],
  profilesNotAnswered: 0,
  profilesConfirmedNone: 0,
}

function sanitizeMembersForPublicRoute(
  members: HubGroupMember[],
  viewerProfileToken: string | null
): HubGroupMember[] {
  return members.map((member) => {
    const isViewer = Boolean(
      viewerProfileToken && member.profile?.profile_token === viewerProfileToken
    )
    const profile = member.profile

    return {
      id: member.id,
      group_id: member.group_id,
      profile_id: member.profile_id,
      role: member.role,
      can_post: member.can_post,
      can_invite: member.can_invite,
      can_pin: member.can_pin,
      last_read_at: null,
      notifications_muted: isViewer ? member.notifications_muted : false,
      notify_email: isViewer ? member.notify_email : undefined,
      notify_push: isViewer ? member.notify_push : undefined,
      quiet_hours_start: isViewer ? member.quiet_hours_start : undefined,
      quiet_hours_end: isViewer ? member.quiet_hours_end : undefined,
      digest_mode: isViewer ? member.digest_mode : undefined,
      on_behalf_of_profile_id: undefined,
      is_co_host: member.is_co_host,
      rsvp_status: isViewer ? member.rsvp_status : undefined,
      joined_at: member.joined_at,
      profile: profile
        ? ({
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            ...(isViewer ? { profile_token: profile.profile_token } : {}),
          } as HubGroupMember['profile'])
        : undefined,
    }
  })
}

function sanitizeCircleConfigForPublicRoute(
  config: DinnerCircleConfig | null
): DinnerCircleConfig | null {
  if (!config) return null

  return {
    ...(config.theme
      ? {
          theme: {
            palette: config.theme.palette,
            accentColor: config.theme.accentColor,
            backgroundMode: config.theme.backgroundMode,
            mutedImageUrl: config.theme.mutedImageUrl ?? null,
          },
        }
      : {}),
    ...(config.publicPage
      ? {
          publicPage: {
            story: config.publicPage.story,
            pastLinks: config.publicPage.pastLinks.map((link) => ({
              label: link.label,
              url: link.url,
            })),
            showGuestMap: config.publicPage.showGuestMap,
          },
        }
      : {}),
    ...(config.layout
      ? {
          layout: {
            name: config.layout.name,
            reusable: false,
            chefNotes: '',
            zones: config.layout.zones.map((zone) => ({
              id: zone.id,
              label: zone.label,
              kind: zone.kind,
              x: zone.x,
              y: zone.y,
              w: zone.w,
              h: zone.h,
            })),
            timeline: config.layout.timeline.map((item) => ({
              time: item.time,
              title: item.title,
              zoneId: item.zoneId,
            })),
          },
        }
      : {}),
  }
}

export default async function HubGroupPage({ params }: Props) {
  const { groupToken } = await params
  const headersList = await headers()
  const cookieStore = await cookies()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const cookieProfileToken = cookieStore.get('hub_profile_token')?.value?.trim() || null

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

  const viewerMember = cookieProfileToken
    ? members.find((member) => member.profile?.profile_token === cookieProfileToken)
    : undefined
  const viewerProfileToken = viewerMember ? cookieProfileToken : null
  const sanitizedMembers = sanitizeMembersForPublicRoute(members, viewerProfileToken)
  const isViewerOperationalManager = viewerMember
    ? ['owner', 'admin', 'chef'].includes(viewerMember.role)
    : false

  const pendingQuote = await getPendingQuoteForCircle(groupToken)
  const linkedEventId = group.event_id ?? groupEvents[0]?.event_id ?? null
  const [circleConfig, rsvpSummary] = await Promise.all([
    group.group_type === 'community' || !linkedEventId
      ? Promise.resolve(null)
      : getDinnerCircleConfig(linkedEventId).catch(() => null),
    linkedEventId ? getRsvpSummary(group.id).catch(() => null) : Promise.resolve(null),
  ])

  // Branch: bridge groups get the slim intro view, not the full Dinner Circle
  if (group.group_type === 'bridge') {
    return (
      <div className="min-h-screen bg-stone-950 p-4">
        <HubBridgeView
          group={group}
          members={sanitizedMembers}
          profileToken={viewerProfileToken}
          currentProfileId={viewerMember?.profile_id ?? null}
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
      members={sanitizedMembers}
      notes={notes}
      media={media}
      availability={availability}
      groupEvents={groupEvents}
      mealBoardEntries={mealBoardResult.entries}
      mealBoardError={mealBoardResult.error}
      householdSummary={
        isViewerOperationalManager ? householdSummaryResult.summary : EMPTY_HOUSEHOLD_SUMMARY
      }
      householdSummaryError={householdSummaryResult.error}
      profileToken={viewerProfileToken ?? undefined}
      guestStatus={viewerMember ? guestStatus : null}
      lifecycleStages={lifecycleClient?.stages || []}
      linkedEventId={linkedEventId}
      circleConfig={sanitizeCircleConfigForPublicRoute(circleConfig)}
      chefProof={chefProof}
      pendingQuote={pendingQuote}
      rsvpSummary={rsvpSummary}
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
    robots: { index: false, follow: false },
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
