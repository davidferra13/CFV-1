// Priority Queue — Inquiry Provider
// Surfaces: new inquiries, awaiting_chef, overdue follow-ups, unresolved unknown_fields

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

export async function getInquiryQueueItems(
  supabase: SupabaseClient,
  tenantId: string
): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(`
      id, status, channel, created_at, follow_up_due_at,
      unknown_fields, confirmed_occasion,
      client:clients(id, full_name)
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

  if (!inquiries) return items

  for (const inq of inquiries) {
    const clientName = (inq.client as any)?.full_name ?? 'Unknown contact'
    const hoursSinceCreated = (now.getTime() - new Date(inq.created_at).getTime()) / 3600000

    // New inquiries — chef has not responded yet
    if (inq.status === 'new') {
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(0, 24 - hoursSinceCreated),
        impactWeight: 0.8,
        isBlocking: true,
        hoursSinceCreated,
        revenueCents: 0,
        isExpiring: false,
      }
      const score = computeScore(inputs)
      items.push({
        id: `inquiry:inquiry:${inq.id}:respond_new`,
        domain: 'inquiry',
        urgency: urgencyFromScore(score),
        score,
        title: 'Respond to new inquiry',
        description: `${clientName} reached out via ${inq.channel}. First response sets the tone.`,
        href: `/inquiries/${inq.id}`,
        icon: 'MessageSquare',
        context: {
          primaryLabel: clientName,
          secondaryLabel: `via ${inq.channel}`,
        },
        createdAt: inq.created_at,
        dueAt: null,
        blocks: 'Entire inquiry pipeline',
        entityId: inq.id,
        entityType: 'inquiry',
      })
    }

    // Awaiting chef — client has replied, ball is in chef's court
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
        title: 'Reply to client',
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
          title: 'Follow up on inquiry',
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
