import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { postRemyMessage } from '@/lib/hub/remy-circle-actions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db: any = createServerClient({ admin: true })
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // Find circles with events in the next 3 days
  const { data: circles } = await db
    .from('hub_groups')
    .select('id, tenant_id, event_id, group_type')
    .not('event_id', 'is', null)
    .eq('is_active', true)

  if (!circles || circles.length === 0) {
    return NextResponse.json({ nudges: 0 })
  }

  let nudgeCount = 0

  for (const circle of circles) {
    // Get event date
    const { data: event } = await db
      .from('events')
      .select('event_date, status, guest_count, menu_id')
      .eq('id', circle.event_id)
      .single()

    if (!event?.event_date) continue
    const eventDate = new Date(event.event_date)
    if (eventDate < now || eventDate > threeDaysFromNow) continue
    if (event.status === 'completed' || event.status === 'cancelled') continue

    const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Check what nudges have already been sent (dedup via system_metadata)
    const { data: existingNudges } = await db
      .from('hub_messages')
      .select('system_metadata')
      .eq('group_id', circle.id)
      .eq('source', 'remy')
      .not('system_metadata', 'is', null)

    const sentIntents = new Set(
      (existingNudges ?? []).map((n: any) => n.system_metadata?.remy_intent).filter(Boolean)
    )

    // Timeline reminder: 3 days
    if (hoursUntil <= 72 && hoursUntil > 24 && !sentIntents.has('timeline_3day')) {
      const daysUntil = Math.ceil(hoursUntil / 24)
      await postRemyMessage({
        groupId: circle.id,
        tenantId: circle.tenant_id,
        body: `Dinner is in ${daysUntil} days! If anyone has dietary updates or questions about the menu, now is a great time to share them.`,
        visible: 'circle',
        intent: 'timeline',
        messageType: 'notification',
      })
      nudgeCount++
    }

    // Timeline reminder: 1 day
    if (hoursUntil <= 24 && hoursUntil > 4 && !sentIntents.has('timeline_1day')) {
      await postRemyMessage({
        groupId: circle.id,
        tenantId: circle.tenant_id,
        body: `Dinner is tomorrow! Chef is prepping and everything is coming together. If you have any last-minute questions, I'm here.`,
        visible: 'circle',
        intent: 'timeline',
        messageType: 'notification',
      })
      nudgeCount++
    }

    // Dietary conflict check
    if (!sentIntents.has('dietary_alert') && event.menu_id) {
      // Load member allergies
      const { data: members } = await db
        .from('hub_group_members')
        .select('hub_guest_profiles!profile_id(known_allergies)')
        .eq('group_id', circle.id)

      const allAllergies = (members ?? [])
        .flatMap((m: any) => m.hub_guest_profiles?.known_allergies ?? [])
        .filter(Boolean)

      if (allAllergies.length > 0) {
        // Load menu dishes
        const { data: courses } = await db
          .from('menu_courses')
          .select('menu_dishes(name)')
          .eq('menu_id', event.menu_id)

        const dishNames = (courses ?? []).flatMap((c: any) =>
          (c.menu_dishes ?? []).map((d: any) => d.name?.toLowerCase() ?? '')
        )

        // Simple keyword check for common allergens in dish names
        const allergenKeywords: Record<string, string[]> = {
          shellfish: ['shrimp', 'lobster', 'crab', 'mussel', 'clam', 'oyster', 'scallop'],
          nuts: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'peanut'],
          dairy: ['cheese', 'cream', 'butter', 'milk', 'yogurt'],
          gluten: ['bread', 'pasta', 'flour', 'wheat', 'crouton'],
        }

        const conflicts: string[] = []
        for (const allergy of allAllergies) {
          const lower = allergy.toLowerCase()
          const keywords = allergenKeywords[lower] ?? [lower]
          for (const dish of dishNames) {
            for (const kw of keywords) {
              if (dish.includes(kw)) {
                conflicts.push(`${allergy} detected in "${dish}"`)
              }
            }
          }
        }

        if (conflicts.length > 0) {
          await postRemyMessage({
            groupId: circle.id,
            tenantId: circle.tenant_id,
            body: `Dietary heads up for Chef: ${conflicts.join('; ')}. Please verify accommodations are in place.`,
            visible: 'chef_only',
            intent: 'dietary_alert',
            messageType: 'notification',
          })
          nudgeCount++
        }
      }
    }
  }

  return NextResponse.json({ nudges: nudgeCount, checked: circles.length })
}
