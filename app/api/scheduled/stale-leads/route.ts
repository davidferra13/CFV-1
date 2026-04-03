// Stale Marketplace Lead Alert - Scheduled Cron Endpoint
// GET /api/scheduled/stale-leads
// POST /api/scheduled/stale-leads
//
// Fires one grouped in-app notification per chef when they have marketplace
// leads (Take a Chef, Bark, Thumbtack, etc.) that have been sitting in
// 'new' or 'awaiting_chef' status for more than 24 hours with no action.
//
// Designed to run hourly. Uses deduplicated notification logic to avoid
// spamming if a lead is already stale from a previous run.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

const STALE_THRESHOLD_HOURS = 24
const MARKETPLACE_CHANNELS = [
  'take_a_chef',
  'privatechefmanager',
  'yhangry',
  'bark',
  'thumbtack',
  'cozymeal',
  'gigsalad',
  'theknot',
  'hireachef',
  'cuisineistchef',
] as const

const CHANNEL_LABELS: Record<string, string> = {
  take_a_chef: 'Take a Chef',
  private_chef_manager: 'Private Chef Manager',
  yhangry: 'Yhangry',
  bark: 'Bark',
  thumbtack: 'Thumbtack',
  cozymeal: 'Cozymeal',
  gigsalad: 'GigSalad',
  theknot: 'The Knot',
  hireachef: 'Hire a Chef',
  cuisineist: 'Cuisineist',
}

async function handleStaleLeads(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()
  const db = createServerClient({ admin: true })

  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString()

  // Find all marketplace leads older than 24h that haven't been actioned
  const { data: staleLeads, error } = await db
    .from('inquiries')
    .select('id, tenant_id, channel, confirmed_occasion, confirmed_date, created_at')
    .in('channel', [...MARKETPLACE_CHANNELS])
    .in('status', ['new', 'awaiting_chef'])
    .lt('created_at', staleThreshold)

  if (error) {
    console.error('[Stale Leads Cron] Query failed:', error)
    await recordCronError('stale-leads', 'Failed to query stale leads', Date.now() - startedAt)
    return NextResponse.json({ error: 'Failed to query stale leads' }, { status: 500 })
  }

  if (!staleLeads || staleLeads.length === 0) {
    await recordCronHeartbeat('stale-leads', { processed: 0, notified: 0 }, Date.now() - startedAt)
    return NextResponse.json({ message: 'No stale marketplace leads', processed: 0 })
  }

  // Group by tenant so we send one notification per chef (not one per lead)
  const byTenant = new Map<
    string,
    Array<{ id: string; channel: string; occasion: string | null; ageHours: number }>
  >()

  for (const lead of staleLeads) {
    const ageHours = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 3_600_000)
    const existing = byTenant.get(lead.tenant_id) ?? []
    existing.push({
      id: lead.id,
      channel: lead.channel,
      occasion: lead.confirmed_occasion ?? null,
      ageHours,
    })
    byTenant.set(lead.tenant_id, existing)
  }

  const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')

  let notified = 0
  let errors = 0

  for (const [tenantId, leads] of byTenant.entries()) {
    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (!chefUserId) continue

      // Check if we already sent a stale-lead notification in the last 6 hours
      // to avoid spamming the chef on every hourly run
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      const { data: recentNotif } = await db
        .from('notifications')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('action', 'marketplace_lead_stale')
        .gte('created_at', sixHoursAgo)
        .limit(1)
        .maybeSingle()

      if (recentNotif) continue // already notified recently

      // Build a human-readable summary
      const count = leads.length
      const oldest = leads.reduce((a, b) => (a.ageHours > b.ageHours ? a : b))
      const oldestLabel = CHANNEL_LABELS[oldest.channel] ?? oldest.channel
      const title =
        count === 1
          ? `1 stale marketplace lead on ${oldestLabel}`
          : `${count} stale marketplace leads need attention`

      const platformSet = [...new Set(leads.map((l) => CHANNEL_LABELS[l.channel] ?? l.channel))]
      const platformSummary = platformSet.join(', ')

      const body =
        count === 1
          ? `A lead on ${oldestLabel} has had no response for ${oldest.ageHours} hours.`
          : `Leads on ${platformSummary} have been waiting over 24 hours without a response.`

      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'lead',
        action: 'marketplace_lead_stale',
        title,
        body,
        actionUrl: '/marketplace',
      })

      notified++
    } catch (err) {
      const e = err as Error
      console.error(`[Stale Leads Cron] Failed for tenant ${tenantId}:`, e.message)
      await recordSideEffectFailure({
        source: 'stale-leads-cron',
        operation: 'notify_stale_leads',
        severity: 'medium',
        tenantId,
        errorMessage: e.message,
      })
      errors++
    }
  }

  const result = { processed: staleLeads.length, tenants: byTenant.size, notified, errors }
  await recordCronHeartbeat('stale-leads', result, Date.now() - startedAt)
  return NextResponse.json(result)
}

export { handleStaleLeads as GET, handleStaleLeads as POST }
