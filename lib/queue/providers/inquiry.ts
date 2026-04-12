// Priority Queue - Inquiry Provider
// Surfaces: new inquiries, awaiting_chef, overdue follow-ups, unresolved unknown_fields

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'
import { dateToDateString } from '@/lib/utils/format'

function ageLabel(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** Build a short summary from whatever confirmed facts exist on the inquiry */
function inquirySummary(inq: {
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_location: string | null
  confirmed_guest_count: number | null
}): string | null {
  const parts: string[] = []
  if (inq.confirmed_occasion) parts.push(inq.confirmed_occasion)
  if (inq.confirmed_date) {
    try {
      parts.push(
        new Date(
          dateToDateString(inq.confirmed_date as Date | string) + 'T00:00:00'
        ).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      )
    } catch {
      parts.push(inq.confirmed_date)
    }
  }
  if (inq.confirmed_location) parts.push(inq.confirmed_location)
  if (inq.confirmed_guest_count) parts.push(`${inq.confirmed_guest_count} guests`)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Friendly channel label for display */
function channelLabel(channel: string): string {
  switch (channel) {
    case 'take_a_chef':
      return 'TakeAChef'
    case 'yhangry':
      return 'Yhangry'
    case 'email':
      return 'email'
    case 'phone':
      return 'phone'
    case 'website':
      return 'website'
    case 'referral':
      return 'referral'
    default:
      return channel
  }
}

export async function getInquiryQueueItems(db: any, tenantId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  const { data: inquiries } = await db
    .from('inquiries')
    .select(
      `
      id, status, channel, created_at, follow_up_due_at,
      unknown_fields, confirmed_occasion, confirmed_date,
      confirmed_location, confirmed_guest_count,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

  if (!inquiries) return items

  for (const inq of inquiries) {
    const clientName = (inq.client as any)?.full_name ?? 'Unknown contact'
    const hoursSinceCreated = (now.getTime() - new Date(inq.created_at).getTime()) / 3600000
    const summary = inquirySummary(inq as any)
    const chLabel = channelLabel(inq.channel)

    // New inquiries - chef has not responded yet
    if (inq.status === 'new') {
      const isTac = inq.channel === 'take_a_chef'
      const isYhangry = inq.channel === 'yhangry'
      const isPlatform = isTac || isYhangry
      // Platform leads get a priority boost - platform expectations for response time
      const platformBoost = isPlatform ? 0.15 : 0
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(0, (isPlatform ? 12 : 24) - hoursSinceCreated),
        impactWeight: 0.8 + platformBoost,
        isBlocking: true,
        hoursSinceCreated,
        revenueCents: 0,
        isExpiring: false,
      }
      const score = computeScore(inputs)
      const platformStale = isPlatform && hoursSinceCreated > 24
      const platformUrgent = isPlatform && hoursSinceCreated > 12

      // Build a descriptive title using whatever facts are available
      let title: string
      let description: string
      if (isTac) {
        title = `New TakeAChef lead from ${clientName}${platformStale ? ' - STALE' : ''}`
        description = `${clientName} requested via TakeAChef - untouched ${ageLabel(hoursSinceCreated)}.`
      } else if (isYhangry) {
        title = summary ? `Yhangry: ${summary}` : `New Yhangry inquiry`
        description = `Yhangry lead - untouched ${ageLabel(hoursSinceCreated)}. First response sets the tone.`
      } else if (summary) {
        title = `${clientName}: ${summary}`
        description = `Reached out via ${chLabel} - untouched ${ageLabel(hoursSinceCreated)}.`
      } else {
        title = `New inquiry from ${clientName}`
        description = `${clientName} reached out via ${chLabel}. First response sets the tone.`
      }

      items.push({
        id: `inquiry:inquiry:${inq.id}:respond_new`,
        domain: 'inquiry',
        urgency: platformStale ? 'critical' : platformUrgent ? 'high' : urgencyFromScore(score),
        score: score + (isPlatform ? 20 : 0),
        title,
        description,
        href: `/inquiries/${inq.id}`,
        icon: 'MessageSquare',
        context: {
          primaryLabel: clientName,
          secondaryLabel: isPlatform
            ? `${chLabel} - ${ageLabel(hoursSinceCreated)}`
            : `via ${chLabel}`,
        },
        createdAt: inq.created_at,
        dueAt: null,
        blocks: 'Entire inquiry pipeline',
        entityId: inq.id,
        entityType: 'inquiry',
      })
    }

    // Awaiting chef - client has replied, ball is in chef's court
    if (inq.status === 'awaiting_chef') {
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(0, 12 - hoursSinceCreated),
        impactWeight: 0.85,
        isBlocking: true,
        hoursSinceCreated,
        revenueCents: 0,
        isExpiring: false,
      }
      const score = computeScore(inputs)
      items.push({
        id: `inquiry:inquiry:${inq.id}:reply_client`,
        domain: 'inquiry',
        urgency: urgencyFromScore(score),
        score,
        title: summary ? `Reply to ${clientName}: ${summary}` : `Reply to ${clientName}`,
        description: `${clientName} is waiting for your response.`,
        href: `/inquiries/${inq.id}`,
        icon: 'MessageSquareDashed',
        context: { primaryLabel: clientName, secondaryLabel: 'Awaiting your reply' },
        createdAt: inq.created_at,
        dueAt: null,
        blocks: 'Client booking decision',
        entityId: inq.id,
        entityType: 'inquiry',
      })
    }

    // Overdue follow-up (surface if due within 48 hours)
    if (inq.follow_up_due_at && inq.status === 'awaiting_client') {
      const dueDate = new Date(inq.follow_up_due_at)
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / 3600000
      if (hoursUntilDue < 48) {
        const inputs: ScoreInputs = {
          hoursUntilDue,
          impactWeight: 0.6,
          isBlocking: false,
          hoursSinceCreated,
          revenueCents: 0,
          isExpiring: true,
        }
        const score = computeScore(inputs)
        items.push({
          id: `inquiry:inquiry:${inq.id}:follow_up`,
          domain: 'inquiry',
          urgency: urgencyFromScore(score),
          score,
          title: summary ? `Follow up: ${summary}` : `Follow up with ${clientName}`,
          description: `Scheduled follow-up with ${clientName} is ${hoursUntilDue < 0 ? 'overdue' : 'due soon'}.`,
          href: `/inquiries/${inq.id}`,
          icon: 'Clock',
          context: { primaryLabel: clientName },
          createdAt: inq.created_at,
          dueAt: inq.follow_up_due_at,
          entityId: inq.id,
          entityType: 'inquiry',
        })
      }
    }
  }

  return items
}
