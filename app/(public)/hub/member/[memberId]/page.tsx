/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { checkRateLimit } from '@/lib/rateLimit'
import { getPublicHubMemberProfile } from '@/lib/hub/public-member-profile'

interface Props {
  params: Promise<{ memberId: string }>
  searchParams: Promise<{ group?: string }>
}

function formatDate(date: string | null): string {
  if (!date) return 'Date not shared'
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function HubMemberProfilePage({ params, searchParams }: Props) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  try {
    await checkRateLimit(`hub-member:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
        <p className="text-sm text-stone-400">Too many requests. Please try again later.</p>
      </div>
    )
  }

  const { memberId } = await params
  const { group: groupToken } = await searchParams

  if (!groupToken) {
    notFound()
  }

  const profile = await getPublicHubMemberProfile({ memberId, groupToken })

  if (!profile) {
    notFound()
  }

  const initials = profile.member.displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8 text-stone-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/hub/g/${profile.group.groupToken}`}
          className="inline-flex text-sm text-stone-400 transition-colors hover:text-stone-100"
        >
          Back to {profile.group.name}
        </Link>

        <section className="rounded-3xl border border-white/10 bg-stone-900/80 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-stone-800 text-lg font-semibold text-stone-200">
              {profile.member.avatarUrl ? (
                <img
                  src={profile.member.avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Circle Member
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold text-stone-50">
                {profile.member.displayName}
              </h1>
              <p className="mt-1 text-sm capitalize text-stone-400">{profile.member.role}</p>
              {profile.member.bio && (
                <p className="mt-3 text-sm leading-6 text-stone-300">{profile.member.bio}</p>
              )}
            </div>
          </div>

          {(profile.member.knownAllergies.length > 0 || profile.member.knownDietary.length > 0) && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {profile.member.knownAllergies.length > 0 && (
                <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                    Allergies
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.member.knownAllergies.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.member.knownDietary.length > 0 && (
                <div className="rounded-2xl border border-amber-900/30 bg-amber-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                    Dietary
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.member.knownDietary.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-stone-900/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            Shared Circle
          </h2>
          <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="font-medium text-stone-100">{profile.group.name}</p>
            <p className="mt-1 text-sm text-stone-500">
              Joined {formatDate(profile.member.joinedAt.slice(0, 10))}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-stone-900/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            Linked Events
          </h2>
          {profile.sharedEvents.length > 0 ? (
            <div className="mt-3 space-y-2">
              {profile.sharedEvents.map((event) => {
                const body = (
                  <>
                    <span className="block font-medium text-stone-100">
                      {event.occasion ?? 'Dinner event'}
                    </span>
                    <span className="mt-1 block text-sm text-stone-500">
                      {formatDate(event.eventDate)}
                      {event.locationCity ? ` in ${event.locationCity}` : ''}
                    </span>
                  </>
                )

                return event.href ? (
                  <Link
                    key={event.eventId}
                    href={event.href}
                    className="block rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    key={event.eventId}
                    className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    {body}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-400">
              No linked event details are visible for this circle yet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-stone-900/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            Attendance In This Circle
          </h2>
          {profile.eventHistory.length > 0 ? (
            <div className="mt-3 space-y-2">
              {profile.eventHistory.map((event) => (
                <div
                  key={`${event.eventId}-${event.eventDate ?? 'event'}`}
                  className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <p className="font-medium text-stone-100">{event.occasion ?? 'Dinner event'}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {formatDate(event.eventDate)}
                    {event.chefName ? ` with ${event.chefName}` : ''}
                  </p>
                  {event.rsvpStatus && (
                    <p className="mt-2 text-xs capitalize text-stone-500">
                      RSVP: {event.rsvpStatus}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-400">
              Attendance history appears after this member has event history linked to the circle.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
