// Morning Briefing Email Cron
// Schedule: 0 12 * * * (8 AM ET daily)
// Generates a deterministic morning briefing and emails it to each chef.
// Formula > AI: no Ollama calls, pure database queries.

import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { MorningBriefingEmail } from '@/lib/email/templates/morning-briefing'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

function formatTimeSimple(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const today = new Date().toISOString().split('T')[0]

  const { data: chefs, error: chefsError } = await supabase
    .from('chefs')
    .select('id, auth_user_id, business_name')

  if (chefsError || !chefs) {
    console.error('[briefing-cron] Failed to fetch chefs:', chefsError)
    return NextResponse.json({ error: 'Failed to fetch chefs' }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  const dateDisplay = new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  for (const chef of chefs) {
    try {
      if (!chef.auth_user_id) {
        skipped++
        continue
      }

      // Check if chef has briefing emails enabled (default: off)
      const { data: setting } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', `briefing_email_enabled_${chef.id}`)
        .single()

      const emailEnabled = setting?.value === true || setting?.value === 'true'
      if (!emailEnabled) {
        skipped++
        continue
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(chef.auth_user_id)
      if (!authUser?.user?.email) {
        skipped++
        continue
      }

      // Fetch briefing data
      const [todayEventsResult, overdueResult, inquiriesResult, proposalsResult, weekResult] =
        await Promise.all([
          supabase
            .from('events')
            .select('id, title, start_time, guest_count, client:clients(full_name)')
            .eq('tenant_id', chef.id)
            .eq('event_date', today)
            .in('status', ['confirmed', 'paid', 'in_progress', 'accepted'])
            .order('start_time', { ascending: true }),
          supabase
            .from('events')
            .select('id')
            .eq('tenant_id', chef.id)
            .eq('status', 'accepted')
            .lt('event_date', today)
            .limit(5),
          supabase
            .from('inquiries')
            .select('id')
            .eq('chef_id', chef.id)
            .in('status', ['new', 'contacted'])
            .limit(5),
          supabase
            .from('events')
            .select('id')
            .eq('tenant_id', chef.id)
            .eq('status', 'proposed')
            .limit(5),
          supabase
            .from('events')
            .select('id')
            .eq('tenant_id', chef.id)
            .gte('event_date', today)
            .lte(
              'event_date',
              new Date(new Date(today + 'T00:00:00').getTime() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            )
            .in('status', ['confirmed', 'paid', 'accepted', 'in_progress']),
        ])

      const events = ((todayEventsResult.data ?? []) as any[]).map((e) => ({
        title: e.title ?? 'Untitled',
        time: e.start_time ?? null,
        client_name: e.client?.full_name ?? null,
        guest_count: e.guest_count ?? null,
      }))

      const actionItems: Array<{ label: string; count: number }> = []
      const overdueCount = (overdueResult.data ?? []).length
      const inquiryCount = (inquiriesResult.data ?? []).length
      const proposalCount = (proposalsResult.data ?? []).length
      if (overdueCount > 0)
        actionItems.push({
          label: `overdue payment${overdueCount !== 1 ? 's' : ''}`,
          count: overdueCount,
        })
      if (inquiryCount > 0)
        actionItems.push({
          label: `pending inquir${inquiryCount !== 1 ? 'ies' : 'y'}`,
          count: inquiryCount,
        })
      if (proposalCount > 0)
        actionItems.push({
          label: `unsigned proposal${proposalCount !== 1 ? 's' : ''}`,
          count: proposalCount,
        })

      const weekEventCount = (weekResult.data ?? []).length

      const chefGreeting = chef.business_name ? `${greeting}, ${chef.business_name}` : greeting

      const result = await sendEmail({
        to: authUser.user.email,
        subject: `Morning Briefing - ${dateDisplay}`,
        react: createElement(MorningBriefingEmail, {
          greeting: chefGreeting,
          dateDisplay,
          events,
          actionItems,
          weekEventCount,
          briefingUrl: `${APP_URL}/briefing`,
        }),
      })

      if (result.success) {
        sent++
      } else {
        console.error('[briefing-cron] Email failed for', chef.id, result.error)
        failed++
      }
    } catch (err) {
      console.error(`[briefing-cron] Failed for chef ${chef.id}:`, err)
      failed++
    }
  }

  console.info(`[briefing-cron] Complete: ${sent} sent, ${failed} failed, ${skipped} skipped`)

  return NextResponse.json({
    success: true,
    date: today,
    chefs: chefs.length,
    sent,
    failed,
    skipped,
  })
}
