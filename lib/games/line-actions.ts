'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// Category → Station mapping for game items
const CATEGORY_TO_STATION: Record<string, 'grill' | 'saute' | 'prep' | 'oven'> = {
  protein: 'grill',
  fish: 'grill',
  vegetable: 'saute',
  sauce: 'saute',
  pasta: 'saute',
  salad: 'prep',
  appetizer: 'prep',
  garnish: 'prep',
  condiment: 'prep',
  cheese: 'prep',
  bread: 'oven',
  dessert: 'oven',
  pastry: 'oven',
  fruit: 'prep',
  beverage: 'prep',
  soup: 'saute',
  starch: 'oven',
  other: 'saute',
}

// Emoji by station for items without a natural emoji
const STATION_EMOJI: Record<string, string> = {
  grill: '🥩',
  saute: '🍳',
  prep: '🥗',
  oven: '🍞',
}

export type EventForGame = {
  id: string
  name: string
  date: string
  guestCount: number
  items: {
    name: string
    emoji: string
    station: 'grill' | 'saute' | 'prep' | 'oven'
  }[]
}

export async function getLineGameData(): Promise<{ events: EventForGame[] }> {
  try {
    const user = await requireChef()
    const supabase = createServerClient()

    const today = new Date().toISOString().split('T')[0]

    // Get upcoming events with menus
    const { data: events } = await supabase
      .from('events')
      .select('id, event_date, guest_count, occasion')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['accepted', 'paid', 'confirmed'])
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(5)

    if (!events || events.length === 0) return { events: [] }

    const result: EventForGame[] = []

    for (const event of events) {
      // Event → menus
      const { data: menus } = await supabase
        .from('menus')
        .select('id')
        .eq('event_id', event.id)
        .eq('tenant_id', user.tenantId!)

      if (!menus || menus.length === 0) continue

      const menuIds = menus.map((m) => m.id)

      // Menus → dishes
      const { data: dishes } = await supabase
        .from('dishes')
        .select('id')
        .in('menu_id', menuIds)
        .eq('tenant_id', user.tenantId!)

      if (!dishes || dishes.length === 0) continue

      const dishIds = dishes.map((d) => d.id)

      // Dishes → components (with optional recipe)
      const { data: components } = await supabase
        .from('components')
        .select('id, name, category')
        .in('dish_id', dishIds)
        .eq('tenant_id', user.tenantId!)

      if (!components || components.length === 0) continue

      const items = components.map((c) => {
        const station = CATEGORY_TO_STATION[c.category ?? 'other'] ?? 'saute'
        return {
          name: c.name,
          emoji: STATION_EMOJI[station],
          station,
        }
      })

      // Need at least 2 items to make a playable event
      if (items.length < 2) continue

      const eventDate = new Date(event.event_date + 'T00:00:00')
      const formatted = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

      result.push({
        id: event.id,
        name: event.occasion ?? 'Event',
        date: formatted,
        guestCount: event.guest_count ?? 0,
        items,
      })
    }

    return { events: result }
  } catch {
    // Non-blocking — game works fine without prep mode data
    return { events: [] }
  }
}
