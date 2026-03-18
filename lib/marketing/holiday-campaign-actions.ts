'use server'

// Holiday Campaign Draft Automation
// Runs daily via the sequences cron. For each chef with past clients near an
// upcoming holiday, creates a DRAFT marketing campaign pre-populated with the
// holiday outreach template. The chef reviews and sends - never auto-fired.
// This is AI-policy-compliant: system drafts, chef approves.

import { createServerClient } from '@/lib/supabase/server'
import { getUpcomingHolidays } from '@/lib/holidays/upcoming'
import { SYSTEM_TEMPLATES } from '@/lib/marketing/constants'

const HOLIDAY_OUTREACH_WINDOW_DAYS = 45 // how far ahead to start creating drafts

/**
 * For all active chefs, check upcoming holidays and auto-create draft campaigns
 * for holidays that are entering their outreach window and don't already have one.
 * Called from the sequences cron - no chef auth context, uses admin client.
 */
export async function processHolidayCampaignDrafts(): Promise<{
  drafted: number
  skipped: number
}> {
  const supabase = createServerClient({ admin: true })
  const db = supabase as any

  let drafted = 0
  let skipped = 0

  // Get holidays entering their outreach window in the next HOLIDAY_OUTREACH_WINDOW_DAYS days
  const upcomingHolidays = getUpcomingHolidays({
    lookaheadDays: HOLIDAY_OUTREACH_WINDOW_DAYS,
    minRelevance: 'high',
  }).filter((h) => h.inOutreachWindow)

  if (upcomingHolidays.length === 0) return { drafted, skipped }

  // Get all chef IDs that have at least one client
  const { data: chefs } = await db.from('chefs').select('id')

  if (!chefs || chefs.length === 0) return { drafted, skipped }

  // Use the "Holiday Availability" system template as the base
  const holidayTemplate = SYSTEM_TEMPLATES.find((t) => t.name === 'Holiday Availability')
  if (!holidayTemplate) return { drafted, skipped }

  for (const upcomingHoliday of upcomingHolidays) {
    const { holiday, date, daysUntil } = upcomingHoliday
    const draftName = `${holiday.name} Outreach - ${date.getFullYear()}`

    for (const chef of chefs) {
      try {
        // Check if this chef already has a campaign (draft or otherwise) for this holiday this season
        const seasonStart = new Date(date)
        seasonStart.setDate(seasonStart.getDate() - 60) // 60 days before holiday = season window

        const { data: existingCampaigns } = await db
          .from('marketing_campaigns')
          .select('id')
          .eq('chef_id', chef.id)
          .ilike('name', `%${holiday.name}%`)
          .gte('created_at', seasonStart.toISOString())
          .limit(1)

        if (existingCampaigns && existingCampaigns.length > 0) {
          skipped++
          continue
        }

        // Only create a draft if this chef has clients to send to
        const { count } = await db
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', chef.id)
          .eq('marketing_unsubscribed', false)
          .not('email', 'is', null)

        if (!count || count === 0) {
          skipped++
          continue
        }

        const urgencyNote =
          daysUntil <= 14
            ? `\n\n⚡ Only ${daysUntil} days until ${holiday.name} - reach out now.`
            : ''

        // Create the draft campaign
        await db.from('marketing_campaigns').insert({
          chef_id: chef.id,
          name: draftName,
          campaign_type: 'seasonal',
          subject: holidayTemplate.subject,
          body_html: holidayTemplate.body_html + urgencyNote,
          target_segment: { type: 'all_clients' },
          status: 'draft',
        })

        // Notify the chef (non-blocking)
        try {
          const { getChefAuthUserId } = await import('@/lib/notifications/actions')
          const chefUserId = await getChefAuthUserId(chef.id)
          if (chefUserId) {
            const { createNotification } = await import('@/lib/notifications/actions')
            await createNotification({
              tenantId: chef.id,
              recipientId: chefUserId,
              category: 'system',
              action: 'system_alert',
              title: `${holiday.name} outreach draft ready`,
              body: `A draft campaign for ${holiday.name} (${daysUntil} days away) is waiting in your Marketing tab.`,
              actionUrl: '/marketing',
            })
          }
        } catch {
          // Non-blocking - notification failure never blocks the draft creation
        }

        drafted++
      } catch (err) {
        console.error(`[holidayCampaignDrafts] Chef ${chef.id}, holiday ${holiday.name}:`, err)
      }
    }
  }

  return { drafted, skipped }
}
