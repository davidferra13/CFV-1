// Priority Queue -- Contact Submission Provider
// Surfaces unclaimed general contact submissions to all chefs.
// Domain: 'inquiry' (pre-inquiry leads, no new domain type needed)

import type { QueueItem, ScoreInputs } from '../types'
import { CONTACT_INTAKE_LANES } from '@/lib/contact/operator-evaluation'
import { computeScore, urgencyFromScore } from '../score'

type ContactRow = {
  id: string
  name: string
  email: string | null
  subject: string | null
  created_at: string
}

export async function getContactQueueItems(db: any, _tenantId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  // contact_submissions not yet in generated types -- cast needed
  const { data } = await db
    .from('contact_submissions')
    .select('id, name, email, subject, created_at')
    .eq('intake_lane', CONTACT_INTAKE_LANES.GENERAL_CONTACT)
    .is('claimed_by_chef_id', null)
    .order('created_at', { ascending: false })

  const submissions = (data ?? []) as ContactRow[]

  if (submissions.length === 0) return items

  for (const sub of submissions) {
    const hoursSinceCreated = (now.getTime() - new Date(sub.created_at).getTime()) / 3600000

    const inputs: ScoreInputs = {
      hoursUntilDue: Math.max(0, 48 - hoursSinceCreated), // 48-hour response window
      impactWeight: 0.7, // potential new client
      isBlocking: false,
      hoursSinceCreated,
      revenueCents: 0,
      isExpiring: false,
    }
    const score = computeScore(inputs)

    items.push({
      id: `inquiry:contact_submission:${sub.id}:claim`,
      domain: 'inquiry',
      urgency: urgencyFromScore(score),
      score,
      title: 'New website lead',
      description: `${sub.name} submitted a contact form${sub.subject ? `: ${sub.subject}` : ''}. Claim to add to your pipeline.`,
      href: '/leads',
      icon: 'Globe',
      context: {
        primaryLabel: sub.name,
        secondaryLabel: sub.email ?? 'No email',
      },
      createdAt: sub.created_at,
      dueAt: null,
      entityId: sub.id,
      entityType: 'contact_submission',
    })
  }

  return items
}
