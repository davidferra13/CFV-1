// Client Milestone Server Actions
// CRUD for personal milestones, upcoming detection, outreach suggestions

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type MilestoneType =
  | 'birthday'
  | 'anniversary'
  | 'child_born'
  | 'booking_anniversary'
  | 'other'

export type Milestone = {
  type: MilestoneType
  label: string
  date: string // ISO date string
  notes?: string
}

export type UpcomingMilestone = {
  clientId: string
  clientName: string
  preferredName: string | null
  milestone: Milestone
  daysUntil: number
}

export type OutreachSuggestion = {
  clientId: string
  clientName: string
  preferredName: string | null
  milestone: Milestone
  daysUntil: number
  suggestion: string
}

// --- Schemas ---

const MilestoneSchema = z.object({
  type: z.enum(['birthday', 'anniversary', 'child_born', 'booking_anniversary', 'other']),
  label: z.string().min(1, 'Label is required'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

const MilestonesArraySchema = z.array(MilestoneSchema)

// --- Actions ---

/**
 * Update the milestones JSONB array on a client record
 */
export async function updateClientMilestones(clientId: string, milestones: Milestone[]) {
  const user = await requireChef()
  const validated = MilestonesArraySchema.parse(milestones)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('clients')
    .update({ personal_milestones: validated as any })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateClientMilestones] Error:', error)
    throw new Error('Failed to update milestones')
  }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Get upcoming milestones across all clients within N days
 * Handles recurring annual milestones (birthday, anniversary) by matching month+day
 */
export async function getUpcomingMilestones(daysAhead: number = 30): Promise<UpcomingMilestone[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, full_name, preferred_name, personal_milestones')
    .eq('tenant_id', user.tenantId!)
    .not('personal_milestones', 'is', null)

  if (error || !clients) {
    console.error('[getUpcomingMilestones] Error:', error)
    return []
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming: UpcomingMilestone[] = []

  for (const client of clients) {
    const milestones = client.personal_milestones as Milestone[] | null
    if (!milestones || !Array.isArray(milestones)) continue

    for (const milestone of milestones) {
      if (!milestone.date) continue

      const milestoneDate = new Date(milestone.date)
      const isRecurring = ['birthday', 'anniversary', 'booking_anniversary'].includes(
        milestone.type
      )

      let nextOccurrence: Date
      if (isRecurring) {
        // Match on month+day, set to current year
        nextOccurrence = new Date(
          today.getFullYear(),
          milestoneDate.getMonth(),
          milestoneDate.getDate()
        )
        // If it already passed this year, check next year
        if (nextOccurrence < today) {
          nextOccurrence = new Date(
            today.getFullYear() + 1,
            milestoneDate.getMonth(),
            milestoneDate.getDate()
          )
        }
      } else {
        nextOccurrence = milestoneDate
      }

      const diffMs = nextOccurrence.getTime() - today.getTime()
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (daysUntil >= 0 && daysUntil <= daysAhead) {
        upcoming.push({
          clientId: client.id,
          clientName: client.full_name,
          preferredName: client.preferred_name,
          milestone,
          daysUntil,
        })
      }
    }
  }

  // Sort by soonest first
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil)

  return upcoming
}

/**
 * Get outreach suggestions based on upcoming milestones
 * Returns actionable suggestions for the chef's dashboard
 */
export async function getMilestoneOutreachSuggestions(): Promise<OutreachSuggestion[]> {
  const upcoming = await getUpcomingMilestones(30)

  return upcoming.map((item) => {
    const name = item.preferredName || item.clientName.split(' ')[0]
    let suggestion: string

    switch (item.milestone.type) {
      case 'birthday':
        if (item.daysUntil <= 14) {
          suggestion = `${name}'s birthday is ${item.daysUntil === 0 ? 'today' : `in ${item.daysUntil} days`}. Consider reaching out about a birthday dinner.`
        } else {
          suggestion = `${name}'s birthday is coming up on ${new Date(item.milestone.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Good time to plant the seed.`
        }
        break
      case 'anniversary':
        suggestion = `${name}'s anniversary is ${item.daysUntil === 0 ? 'today' : `in ${item.daysUntil} days`}. They might want to book a special dinner.`
        break
      case 'booking_anniversary': {
        const yearsAgo = new Date().getFullYear() - new Date(item.milestone.date).getFullYear()
        suggestion = `This is ${name}'s ${yearsAgo > 0 ? ordinal(yearsAgo) + ' year' : 'anniversary'} booking with you. Consider a loyalty gesture.`
        break
      }
      case 'child_born':
        suggestion = `${name}'s child's birthday (${item.milestone.label}) is ${item.daysUntil === 0 ? 'today' : `in ${item.daysUntil} days`}. Family celebration opportunity.`
        break
      default:
        suggestion = `${name}: ${item.milestone.label} is ${item.daysUntil === 0 ? 'today' : `in ${item.daysUntil} days`}.`
    }

    return {
      ...item,
      suggestion,
    }
  })
}

/**
 * Update client preferred name and family fields
 */
export async function updateClientPersonalInfo(
  clientId: string,
  data: {
    preferred_name?: string | null
    partner_preferred_name?: string | null
    family_notes?: string | null
    additional_addresses?: any[]
  }
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateClientPersonalInfo] Error:', error)
    throw new Error('Failed to update client info')
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

// --- Helpers ---

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
