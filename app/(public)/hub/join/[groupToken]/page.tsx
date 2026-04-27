import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { getGroupByToken, getGroupMemberCount } from '@/lib/hub/group-actions'
import {
  getInviteRoleLabel,
  resolveHubInviteAttribution,
  type HubInviteCopyRole,
} from '@/lib/hub/invite-links'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { JoinGroupForm } from './join-form'

interface Props {
  params: Promise<{ groupToken: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function JoinGroupPage({ params, searchParams }: Props) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'

  try {
    await checkRateLimit(`hub-join:${ip}`, 15, 15 * 60 * 1000)
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
        <p className="text-sm text-stone-400">Too many requests. Please try again later.</p>
      </div>
    )
  }

  const { groupToken } = await params
  const { invite: inviteToken } = await searchParams
  const group = await getGroupByToken(groupToken)

  if (!group || !group.is_active) {
    notFound()
  }

  const memberCount = await getGroupMemberCount(group.id)
  const isBridge = group.group_type === 'bridge'
  const inviteAttribution = inviteToken
    ? await resolveHubInviteAttribution({
        groupToken,
        inviteToken,
      }).catch(() => null)
    : null
  const inviteLabel = inviteAttribution
    ? getInviteRoleLabel(inviteAttribution.copyRole as HubInviteCopyRole)
    : isBridge
      ? 'Private Introduction'
      : 'Dinner Circle'
  const inviteDescription = inviteAttribution
    ? `${inviteAttribution.copyRole === 'chef' ? `Chef ${inviteAttribution.inviterDisplayName}` : inviteAttribution.inviterDisplayName} sent this link so you can join the thread without any extra setup.`
    : group.description ||
      (isBridge
        ? 'Step into the intro thread and keep the conversation moving in one clean place.'
        : 'Join the shared dinner thread, get updates from the chef or host, and keep the whole plan in one place.')
  const primaryColor = group.theme?.primary_color ?? '#e88f47'
  const pageStyle = {
    '--hub-primary': primaryColor,
    background:
      group.theme?.background_gradient ??
      'linear-gradient(180deg, rgba(28,25,23,1) 0%, rgba(12,10,9,1) 100%)',
  } as CSSProperties

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6" style={pageStyle}>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-stone-950/55 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.35)] backdrop-blur">
          <div
            className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full blur-3xl"
            style={{ backgroundColor: `${primaryColor}30` }}
          />
          <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-white/5 blur-3xl" />

          <div className="relative space-y-6">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-200">
                {inviteLabel}
              </span>

              <div className="flex items-center gap-4">
                {group.emoji ? (
                  <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 text-4xl shadow-inner shadow-black/20">
                    {group.emoji}
                  </div>
                ) : null}

                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.04em] text-stone-50 sm:text-4xl">
                    {group.name}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300 sm:text-base">
                    {inviteDescription}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Members
                </p>
                <p className="mt-2 text-2xl font-semibold text-stone-50">{memberCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Access
                </p>
                <p className="mt-2 text-sm font-medium text-stone-100">No app download</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Join Time
                </p>
                <p className="mt-2 text-sm font-medium text-stone-100">About 20 seconds</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                isBridge ? 'Private thread' : 'Live updates',
                isBridge ? 'Direct context' : 'Dietary notes',
                isBridge ? 'Warm intro' : 'Guest coordination',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-stone-900/85 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8">
          <JoinGroupForm
            groupToken={groupToken}
            groupName={group.name}
            isBridge={isBridge}
            inviteToken={inviteToken ?? null}
            inviter={
              inviteAttribution
                ? {
                    displayName: inviteAttribution.inviterDisplayName,
                    copyRole: inviteAttribution.copyRole,
                  }
                : null
            }
          />
        </section>
      </div>

      <p className="mt-5 text-center text-xs text-stone-500">
        Powered by{' '}
        <span className="font-medium" style={{ color: primaryColor }}>
          ChefFlow
        </span>
      </p>
    </div>
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
