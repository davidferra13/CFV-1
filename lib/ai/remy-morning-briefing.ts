'use server'

// Remy - Morning Briefing Generator (Phase 2B)
// Generates a daily briefing from business data. 100% deterministic - no LLM.
// Designed to run at a configurable time (default 7 AM) via cron.

import { createServerClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/get-user'

interface BriefingSection {
  heading: string
  items: string[]
  priority: 'high' | 'normal' | 'info'
}

export async function generateMorningBriefing(tenantId: string): Promise<string> {
  // Tenant isolation: verify tenantId matches session when called from user context
  const sessionUser = await getCurrentUser()
  if (sessionUser && tenantId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  const db: any = createServerClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const thisWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const sections: BriefingSection[] = []

  // 1. Today's events
  const { data: todayEvents } = await db
    .from('events')
    .select(
      'occasion, event_date, guest_count, status, prep_list_ready, grocery_list_ready, client:clients(full_name)'
    )
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', today)
    .lt('event_date', tomorrow)
    .order('event_date', { ascending: true })
    .limit(5)

  if (todayEvents && todayEvents.length > 0) {
    const items = todayEvents.map((e: any) => {
      const missing: string[] = []
      if (!e.prep_list_ready) missing.push('prep list')
      if (!e.grocery_list_ready) missing.push('grocery list')
      const warn = missing.length > 0 ? ` [NEEDS: ${missing.join(', ')}]` : ''
      return `${e.occasion ?? 'Event'} for ${e.client?.full_name ?? 'Unknown'} (${e.guest_count ?? '?'} guests, ${e.status})${warn}`
    })
    sections.push({ heading: "Today's Events", items, priority: 'high' })
  }

  // 2. Tomorrow's events (prep awareness)
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const { data: tomorrowEvents } = await db
    .from('events')
    .select('occasion, event_date, guest_count, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', tomorrow)
    .lt('event_date', dayAfterTomorrow)
    .order('event_date', { ascending: true })
    .limit(5)

  if (tomorrowEvents && tomorrowEvents.length > 0) {
    const items = tomorrowEvents.map(
      (e: any) =>
        `${e.occasion ?? 'Event'} for ${e.client?.full_name ?? 'Unknown'} (${e.guest_count ?? '?'} guests)`
    )
    sections.push({ heading: 'Tomorrow', items, priority: 'normal' })
  }

  // 3. Overdue invoices
  const { data: overdue } = await db
    .from('invoices')
    .select('invoice_number, due_date, total_cents, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .lt('due_date', today)
    .limit(5)

  if (overdue && overdue.length > 0) {
    const items = overdue.map((inv: any) => {
      const days = Math.floor(
        (Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      const amount = (inv.total_cents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      return `${inv.client?.full_name ?? 'Unknown'}: ${amount} (${days}d overdue)`
    })
    sections.push({ heading: 'Overdue Invoices', items, priority: 'high' })
  }

  // 4. Inquiries needing response
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  const { data: staleInquiries } = await db
    .from('inquiries')
    .select('lead_name, event_type, updated_at')
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_chef'])
    .lte('updated_at', twoDaysAgo)
    .limit(5)

  if (staleInquiries && staleInquiries.length > 0) {
    const items = staleInquiries.map((inq: any) => {
      const days = Math.floor(
        (Date.now() - new Date(inq.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      return `${inq.lead_name ?? 'Unknown'}${inq.event_type ? ` (${inq.event_type})` : ''} - ${days}d waiting`
    })
    sections.push({ heading: 'Inquiries Waiting', items, priority: 'normal' })
  }

  // 5. Client birthdays this week
  const { data: clients } = await db
    .from('clients')
    .select('full_name, date_of_birth')
    .eq('tenant_id', tenantId)
    .not('date_of_birth', 'is', null)
    .limit(100)

  const birthdayItems: string[] = []
  for (const c of clients ?? []) {
    if (!c.date_of_birth) continue
    const dob = new Date(c.date_of_birth)
    const bdThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
    if (bdThisYear >= now && bdThisYear <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      const daysUntil = Math.ceil((bdThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const label =
        daysUntil === 0 ? 'today!' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
      birthdayItems.push(`${c.full_name} - ${label}`)
    }
  }
  if (birthdayItems.length > 0) {
    sections.push({ heading: 'Client Birthdays', items: birthdayItems, priority: 'info' })
  }

  // 6. This week's event count
  const { count: weekEventCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .gte('event_date', today)
    .lte('event_date', thisWeek)

  // Build the briefing text
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const lines: string[] = [`**Good morning, chef** - ${dayName}, ${dateStr}\n`]

  if (sections.length === 0 && (weekEventCount ?? 0) === 0) {
    lines.push(
      'Clear skies today. No events, no urgent items. Good time for admin, outreach, or creative work.'
    )
    return lines.join('\n')
  }

  if (weekEventCount && weekEventCount > 0) {
    lines.push(`**${weekEventCount} event${weekEventCount !== 1 ? 's' : ''} this week.**\n`)
  }

  for (const section of sections) {
    const icon = section.priority === 'high' ? '**' : section.priority === 'info' ? '' : ''
    lines.push(`${icon}${section.heading}:${icon}`)
    for (const item of section.items) {
      lines.push(`- ${item}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}
