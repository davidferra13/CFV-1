// Dashboard Hero Zone - greeting, hero data, quick action bar
// Self-contained server component moved from page.tsx during decomposition.

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Store, UtensilsCrossed, ListChecks } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getCachedChefArchetype, getCachedIsPrivileged } from '@/lib/chef/layout-data-cache'
import { getDashboardPrimaryAction } from '@/lib/archetypes/ui-copy'
import { DashboardHero, type HeroData } from '@/components/dashboard/dashboard-hero'
import { getTenantDataPresence } from '@/lib/progressive-disclosure/tenant-data-presence'
import { isDashboardCreationActionVisible } from '@/lib/progressive-disclosure/nav-visibility'
import { getSupportStatus } from '@/lib/monetization/status'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/HeroZone] ${label} failed:`, err)
    return fallback
  }
}

async function getHeroData(
  user: Awaited<ReturnType<typeof requireChef>>,
  timeOfDay: string,
  firstName: string,
  supportBadge: string | null | undefined
): Promise<HeroData> {
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const weekEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() + 7).padStart(2, '0')}`

  const greeting =
    timeOfDay === 'morning'
      ? "Here's your day at a glance."
      : timeOfDay === 'afternoon'
        ? 'Your afternoon overview.'
        : 'End-of-day summary.'

  const [eventsResult, inquiriesResult, outstandingResult, nextEventResult] = await Promise.all([
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte('event_date', weekEnd)
      .not('status', 'eq', 'cancelled'),
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("converted","declined")'),
    db
      .from('event_financial_summary')
      .select('outstanding_balance_cents')
      .eq('tenant_id', tenantId)
      .gt('outstanding_balance_cents', 0)
      .then(({ data }: any) =>
        (data ?? []).reduce((sum: number, r: any) => sum + (r.outstanding_balance_cents || 0), 0)
      ),
    db
      .from('events')
      .select('id, occasion, event_date, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .not('status', 'in', '("cancelled","completed")')
      .order('event_date', { ascending: true })
      .limit(1)
      .then(({ data }: any) => (data && data.length > 0 ? data[0] : null)),
  ])

  let nextEvent: HeroData['nextEvent'] = null
  if (nextEventResult) {
    const target = new Date(`${nextEventResult.event_date}T00:00:00`)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const daysUntil = Math.ceil((target.getTime() - todayDate.getTime()) / 86400000)
    nextEvent = {
      occasion: nextEventResult.occasion ?? '',
      clientName: (nextEventResult.client as any)?.full_name ?? '',
      daysUntil,
      href: `/events/${nextEventResult.id}`,
    }
  }

  return {
    greeting,
    timeOfDay,
    firstName,
    tenantId,
    eventsThisWeek: eventsResult?.count ?? 0,
    openInquiries: inquiriesResult?.count ?? 0,
    outstandingCents: typeof outstandingResult === 'number' ? outstandingResult : 0,
    nextEvent,
    supportBadge: supportBadge ?? null,
  }
}

export interface HeroZoneProps {
  tenantId: string
  userId: string
  entityId: string
  email: string
}

export async function HeroZone({ tenantId, userId, entityId, email }: HeroZoneProps) {
  const user = await requireChef()
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = (email ?? '').split('@')[0].split('.')[0]

  const [archetype, presence, supportStatus, userIsPrivileged] = await Promise.all([
    safe('archetype', () => getCachedChefArchetype(entityId), null),
    safe('presence', () => getTenantDataPresence(tenantId), null),
    safe('supportStatus', () => getSupportStatus(entityId), null),
    safe('privilegedAccess', () => getCachedIsPrivileged(userId), false),
  ])

  const bypassProgressiveDisclosure = userIsPrivileged || process.env.DEMO_MODE_ENABLED === 'true'
  const primaryAction = getDashboardPrimaryAction(archetype)
  const showCreateMenuAction = isDashboardCreationActionVisible(
    '/menus/new',
    presence,
    bypassProgressiveDisclosure
  )
  const showStorefrontAction = isDashboardCreationActionVisible(
    '/commerce/storefront',
    presence,
    bypassProgressiveDisclosure
  )

  const heroData = await safe(
    'heroData',
    () => getHeroData(user, timeOfDay, firstName, supportStatus?.badgeLabel),
    {
      greeting: "Here's your day at a glance.",
      timeOfDay,
      firstName,
      tenantId,
      eventsThisWeek: 0,
      openInquiries: 0,
      outstandingCents: 0,
      nextEvent: null,
      supportBadge: null,
    }
  )

  return (
    <div className="space-y-4">
      <DashboardHero data={heroData} />

      {/* Quick action bar */}
      <div className="flex gap-2 items-center flex-wrap">
        <Link
          href="/daily"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-stone-700/60 text-stone-400 rounded-xl hover:bg-stone-800 hover:border-stone-600 hover:text-stone-200 transition-all font-medium text-sm"
        >
          <ListChecks className="h-4 w-4" />
          Daily Ops
        </Link>
        <Link
          href="/briefing"
          className="inline-flex items-center justify-center px-4 py-2 border border-stone-700/60 text-stone-400 rounded-xl hover:bg-stone-800 hover:border-stone-600 hover:text-stone-200 transition-all font-medium text-sm"
        >
          Briefing
        </Link>
        {showCreateMenuAction && (
          <Link
            href="/menus/new"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-stone-700/60 text-stone-400 rounded-xl hover:bg-stone-800 hover:border-stone-600 hover:text-stone-200 transition-all font-medium text-sm"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Create Menu
          </Link>
        )}
        {showStorefrontAction && (
          <Link
            href="/commerce/storefront"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-stone-700/60 text-stone-400 rounded-xl hover:bg-stone-800 hover:border-stone-600 hover:text-stone-200 transition-all font-medium text-sm"
          >
            <Store className="h-4 w-4" />
            Storefront
          </Link>
        )}
        <Link
          href={primaryAction.href}
          data-tour="chef-dashboard-home"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2 gradient-accent text-white rounded-xl font-medium text-sm glow-hover"
        >
          <Plus className="h-4 w-4" />
          {primaryAction.label}
        </Link>
      </div>
    </div>
  )
}
