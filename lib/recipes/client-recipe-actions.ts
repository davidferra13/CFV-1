// Client Recipe Actions - Dish history (what chef has served you)

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ClientDishHistory = {
  id: string
  dishName: string
  servedDate: string
  reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | null
  notes: string | null
  eventName: string | null
  chefName: string | null
}

export async function getMyDishHistory(): Promise<ClientDishHistory[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('served_dish_history')
    .select(
      `
      id, dish_name, served_date, client_reaction, notes,
      event:events!served_dish_history_event_id_fkey(title),
      chef:chefs!served_dish_history_chef_id_fkey(business_name)
    `
    )
    .eq('client_id', user.entityId)
    .order('served_date', { ascending: false })

  if (error) {
    console.error('[getMyDishHistory] Query failed:', error)
    return []
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    dishName: d.dish_name,
    servedDate: d.served_date,
    reaction: d.client_reaction,
    notes: d.notes,
    eventName: d.event?.title || null,
    chefName: d.chef?.business_name || null,
  }))
}
