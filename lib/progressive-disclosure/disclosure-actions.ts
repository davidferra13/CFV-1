'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { ComplexityLevel } from './complexity-config'
import { COMPLEXITY_PRESETS } from './complexity-config'

const VALID_LEVELS: ComplexityLevel[] = ['starter', 'standard', 'pro']

/** Get current complexity level for the authenticated chef */
export async function getComplexityLevel(): Promise<ComplexityLevel> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_preferences')
    .select('complexity_level')
    .eq('chef_id', user.entityId)
    .single()
  return (data?.complexity_level as ComplexityLevel) ?? 'pro'
}

/** Set complexity level for the authenticated chef */
export async function setComplexityLevel(
  level: ComplexityLevel
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (!VALID_LEVELS.includes(level)) {
    return { success: false, error: 'Invalid complexity level' }
  }

  const db: any = createServerClient()
  const payload = { complexity_level: level, updated_at: new Date().toISOString() }
  const { data: existing } = await db
    .from('chef_preferences')
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  const { error } = existing
    ? await db.from('chef_preferences').update(payload).eq('chef_id', user.entityId)
    : await db.from('chef_preferences').insert({
        chef_id: user.entityId,
        tenant_id: user.tenantId ?? user.entityId,
        ...payload,
      })

  if (error) {
    console.error('[setComplexityLevel] failed:', error)
    return { success: false, error: 'Failed to update complexity level' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  revalidatePath('/settings')
  revalidateTag(`chef-layout-${user.entityId}`)
  revalidateTag(`chef-prefs-${user.entityId}`)
  return { success: true }
}

export type FeatureSuggestion = {
  id: string
  name: string
  description: string
  href: string
  category: string
}

const ALL_SUGGESTIONS: FeatureSuggestion[] = [
  {
    id: 'calendar',
    name: 'Calendar',
    description:
      'See all your events on a visual timeline. Plan prep days and avoid scheduling conflicts.',
    href: '/calendar',
    category: 'Planning',
  },
  {
    id: 'inbox',
    name: 'Inbox',
    description: 'All client conversations in one place. Never miss a message or booking detail.',
    href: '/inbox',
    category: 'Communication',
  },
  {
    id: 'quotes',
    name: 'Quotes',
    description: 'Create professional quotes for clients. Track which ones convert to bookings.',
    href: '/quotes',
    category: 'Sales',
  },
  {
    id: 'contracts',
    name: 'Contracts',
    description: 'Send and track event contracts. Protect your business with signed agreements.',
    href: '/contracts',
    category: 'Protection',
  },
  {
    id: 'circles',
    name: 'Dinner Circles',
    description:
      'Group your clients and events into circles for better organization and communication.',
    href: '/circles',
    category: 'Organization',
  },
  {
    id: 'finance',
    name: 'Finance',
    description:
      'Track revenue, expenses, and profitability. See how your business is really doing.',
    href: '/finance',
    category: 'Money',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description:
      'Understand your business patterns. See your busiest months, top clients, and trends.',
    href: '/analytics',
    category: 'Intelligence',
  },
  {
    id: 'network',
    name: 'Chef Network',
    description:
      'Connect with other chefs. Share referrals, get advice, and build your professional circle.',
    href: '/network',
    category: 'Community',
  },
]

/** Get feature suggestions for features the chef has not visited */
export async function getFeatureSuggestions(): Promise<FeatureSuggestion[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get dismissed suggestions
  const { data: dismissed } = await db
    .from('chef_preferences')
    .select('dismissed_suggestions')
    .eq('chef_id', user.entityId)
    .single()

  const dismissedSet = new Set<string>(
    Array.isArray(dismissed?.dismissed_suggestions) ? dismissed.dismissed_suggestions : []
  )

  // Get pages this chef has visited from usage tracking
  const { data: visits } = await db
    .from('page_visits')
    .select('route')
    .eq('tenant_id', user.tenantId ?? user.entityId)
    .limit(500)

  const visitedRoutes = new Set<string>((visits ?? []).map((v: { route: string }) => v.route))

  return ALL_SUGGESTIONS.filter((s) => !dismissedSet.has(s.id) && !visitedRoutes.has(s.href))
}

/** Dismiss a feature suggestion so it does not appear again */
export async function dismissSuggestion(
  featureId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('chef_preferences')
    .select('dismissed_suggestions')
    .eq('chef_id', user.entityId)
    .single()

  const current: string[] = Array.isArray(existing?.dismissed_suggestions)
    ? existing.dismissed_suggestions
    : []

  if (current.includes(featureId)) {
    return { success: true }
  }

  const updated = [...current, featureId]
  const payload = { dismissed_suggestions: updated, updated_at: new Date().toISOString() }

  const { error } = existing
    ? await db.from('chef_preferences').update(payload).eq('chef_id', user.entityId)
    : await db.from('chef_preferences').insert({
        chef_id: user.entityId,
        tenant_id: user.tenantId ?? user.entityId,
        ...payload,
      })

  if (error) {
    console.error('[dismissSuggestion] failed:', error)
    return { success: false, error: 'Failed to dismiss suggestion' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
