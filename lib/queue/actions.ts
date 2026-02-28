'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getDashboardWorkSurface } from '@/lib/workflow/actions'
import { buildPriorityQueue } from './build'
import type { PriorityQueue } from './types'

/**
 * Get the complete priority queue for the current chef.
 * Single entry point for the dashboard and queue page.
 *
 * Authentication: requireChef()
 * Tenant scoping: all providers receive tenantId
 * Performance: all providers run in parallel
 */
export async function getPriorityQueue(): Promise<PriorityQueue> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the work surface (it has its own requireChef call, cached per request)
  const workSurface = await getDashboardWorkSurface()

  return buildPriorityQueue(supabase, user.tenantId!, workSurface)
}
