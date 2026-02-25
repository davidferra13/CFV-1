// Chef Menus List - Protected by layout

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Menus - ChefFlow' }
import { getMenuCostSummaries, getMenus } from '@/lib/menus/actions'
import { MenusClientWrapper } from './menus-client-wrapper'

export default async function MenusPage() {
  const user = await requireChef()
  const [menus, costSummaries] = await Promise.all([getMenus(), getMenuCostSummaries()])

  const eventIds = Array.from(
    new Set(menus.map((menu) => menu.event_id).filter(Boolean))
  ) as string[]
  let eventsById: Record<
    string,
    { id: string; occasion: string | null; event_date: string; status: string }
  > = {}

  if (eventIds.length > 0) {
    const supabase = createServerClient()
    const { data: events } = await supabase
      .from('events')
      .select('id, occasion, event_date, status')
      .in('id', eventIds)
      .eq('tenant_id', user.tenantId!)

    eventsById = Object.fromEntries((events || []).map((event) => [event.id, event]))
  }

  const costByMenuId = Object.fromEntries(
    costSummaries.map((summary) => [summary.menu_id, summary])
  )

  return <MenusClientWrapper menus={menus} eventsById={eventsById} costByMenuId={costByMenuId} />
}
