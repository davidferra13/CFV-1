// Priority Queue -- Prospect Provider
// Surfaces overdue follow-ups, hot pipeline leads, untouched new leads, and cold re-engage candidates.
// Domain: 'prospect' (pre-inquiry pipeline leads)

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

function ageLabel(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

type ProspectRow = {
  id: string
  name: string
  status: string
  pipeline_stage: string | null
  next_follow_up_at: string | null
  last_called_at: string | null
  created_at: string
  contact_person: string | null
  email: string | null
  phone: string | null
  lead_score: number | null
}

export async function getProspectQueueItems(db: any, tenantId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  const { data } = await db
    .from('prospects')
    .select(
      'id, name, status, pipeline_stage, next_follow_up_at, last_called_at, created_at, contact_person, email, phone, lead_score'
    )
    .eq('chef_id', tenantId)
    .in('status', ['follow_up', 'new', 'queued', 'called'])
    .not('status', 'in', '("converted","dead","not_interested")')
    .order('created_at', { ascending: true })

  const prospects = (data ?? []) as ProspectRow[]

  if (prospects.length === 0) return items

  for (const p of prospects) {
    const hoursSinceCreated = (now.getTime() - new Date(p.created_at).getTime()) / 3600000
    const displayName = p.contact_person || p.name

    // Follow-up overdue
    if (p.status === 'follow_up' && p.next_follow_up_at) {
      const dueDate = new Date(p.next_follow_up_at)
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / 3600000
      const overdue = hoursUntilDue < 0

      const inputs: ScoreInputs = {
        hoursUntilDue,
        impactWeight: 0.7,
        isBlocking: false,
        hoursSinceCreated,
        revenueCents: 0,
        isExpiring: true,
      }
      const score = computeScore(inputs)

      items.push({
        id: `inquiry:prospect:${p.id}:follow_up`,
        domain: 'prospect',
        urgency: urgencyFromScore(score),
        score,
        title: `Follow up with ${displayName}`,
        description: `Prospect follow-up is ${overdue ? 'overdue' : 'due'}. ${p.pipeline_stage ?? 'Unknown'} stage.`,
        href: '/prospecting',
        icon: 'PhoneOutgoing',
        context: {
          primaryLabel: displayName,
          secondaryLabel: p.pipeline_stage ?? undefined,
        },
        createdAt: p.created_at,
        dueAt: p.next_follow_up_at,
        entityId: p.id,
        entityType: 'prospect',
      })
      continue
    }

    // Hot pipeline (responded or meeting_set)
    if (p.pipeline_stage === 'responded' || p.pipeline_stage === 'meeting_set') {
      const inputs: ScoreInputs = {
        hoursUntilDue: null,
        impactWeight: 0.75,
        isBlocking: false,
        hoursSinceCreated,
        revenueCents: 0,
        isExpiring: false,
      }
      const score = computeScore(inputs)

      const title =
        p.pipeline_stage === 'meeting_set'
          ? `Meeting with ${displayName}`
          : `${displayName} responded`

      items.push({
        id: `inquiry:prospect:${p.id}:hot_pipeline`,
        domain: 'prospect',
        urgency: urgencyFromScore(score),
        score,
        title,
        description: `Hot prospect in ${p.pipeline_stage} stage. ${ageLabel(hoursSinceCreated)} old.`,
        href: '/prospecting',
        icon: 'UserCheck',
        context: {
          primaryLabel: displayName,
          secondaryLabel: p.pipeline_stage,
        },
        createdAt: p.created_at,
        dueAt: null,
        entityId: p.id,
        entityType: 'prospect',
      })
      continue
    }

    // New/untouched (older than 72 hours only)
    if ((p.status === 'new' || p.status === 'queued') && hoursSinceCreated > 72) {
      const inputs: ScoreInputs = {
        hoursUntilDue: null,
        impactWeight: 0.5,
        isBlocking: false,
        hoursSinceCreated,
        revenueCents: 0,
        isExpiring: false,
      }
      const score = computeScore(inputs)

      items.push({
        id: `inquiry:prospect:${p.id}:new_lead`,
        domain: 'prospect',
        urgency: urgencyFromScore(score),
        score,
        title: `New lead: ${displayName}`,
        description: `Untouched prospect, ${ageLabel(hoursSinceCreated)} old. Needs initial outreach.`,
        href: '/prospecting',
        icon: 'UserPlus',
        context: {
          primaryLabel: displayName,
          secondaryLabel: p.email ?? p.phone ?? undefined,
        },
        createdAt: p.created_at,
        dueAt: null,
        entityId: p.id,
        entityType: 'prospect',
      })
      continue
    }

    // Cold re-engage (called, last_called_at older than 7 days)
    if (p.status === 'called' && p.last_called_at) {
      const hoursSinceLastCall = (now.getTime() - new Date(p.last_called_at).getTime()) / 3600000
      if (hoursSinceLastCall > 168) {
        const inputs: ScoreInputs = {
          hoursUntilDue: null,
          impactWeight: 0.3,
          isBlocking: false,
          hoursSinceCreated,
          revenueCents: 0,
          isExpiring: false,
        }
        const score = computeScore(inputs)

        items.push({
          id: `inquiry:prospect:${p.id}:re_engage`,
          domain: 'prospect',
          urgency: urgencyFromScore(score),
          score,
          title: `Re-engage ${displayName}`,
          description: `Last called ${ageLabel(hoursSinceLastCall)}. Consider a follow-up touch.`,
          href: '/prospecting',
          icon: 'PhoneCall',
          context: {
            primaryLabel: displayName,
            secondaryLabel: `Last call ${ageLabel(hoursSinceLastCall)}`,
          },
          createdAt: p.created_at,
          dueAt: null,
          entityId: p.id,
          entityType: 'prospect',
        })
      }
    }
  }

  return items
}
