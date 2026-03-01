// Focus Mode — Progressive disclosure preset
// When ON: chef sees only core modules (dashboard, pipeline, events, culinary, clients, finance)
// When OFF: chef sees all modules they've enabled
// Admin always sees everything regardless of Focus Mode setting
//
// Uses the existing module system — no new infrastructure.
// Single source of truth for what's "core" vs "extended".

'use server'

import { revalidateTag } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { CHEF_LAYOUT_CACHE_TAG } from '@/lib/chef/layout-cache'
import { ALL_MODULE_SLUGS } from '@/lib/billing/modules'

/**
 * Core modules — the 12 workflows a private chef needs daily.
 * These are always visible when Focus Mode is ON.
 */
export const CORE_MODULES = [
  'dashboard',
  'pipeline',
  'events',
  'culinary',
  'clients',
  'finance',
] as const

/**
 * Extended modules — powerful features hidden in Focus Mode.
 * Still accessible when Focus Mode is OFF. Nothing is deleted.
 */
export const EXTENDED_MODULES = ['protection', 'more', 'commerce', 'social-hub'] as const

/**
 * Core standalone nav items — shown in Focus Mode.
 * These are the top-of-sidebar shortcuts that map to core workflows.
 */
export const CORE_NAV_HREFS = new Set([
  '/dashboard',
  '/commands', // Remy
  '/daily', // Daily Ops
  '/inbox', // Inbox
  '/clients', // Clients
  '/inquiries', // Inquiries
  '/chat', // Messaging
  '/schedule', // Calendar
  '/events', // All Events
  '/menus', // Menus
  '/activity', // Activity
  '/goals', // Goals
])

/**
 * Extended standalone nav items — hidden in Focus Mode, shown when OFF.
 * These still exist, just not visible by default.
 */
export const EXTENDED_NAV_HREFS = new Set([
  '/travel',
  '/staff',
  '/tasks',
  '/stations',
  '/commerce',
  '/commerce/register',
])

/**
 * Check if Focus Mode is enabled for the current chef.
 * Defaults to true (ON) for new users — clean sidebar out of the box.
 */
export async function isFocusModeEnabled(): Promise<boolean> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_preferences')
    .select('focus_mode')
    .eq('chef_id', user.entityId)
    .single()

  // Default to ON for new users (guided experience)
  return (data as any)?.focus_mode ?? true
}

/**
 * Toggle Focus Mode and update enabled modules accordingly.
 * ON: enables only core modules
 * OFF: enables all modules
 */
export async function toggleFocusMode(enabled: boolean): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const modules = enabled ? [...CORE_MODULES] : [...ALL_MODULE_SLUGS]

  await supabase
    .from('chef_preferences')
    .update({
      focus_mode: enabled,
      enabled_modules: modules,
    } as any)
    .eq('chef_id', user.entityId)

  revalidateTag(`${CHEF_LAYOUT_CACHE_TAG}-${user.entityId}`)
}
