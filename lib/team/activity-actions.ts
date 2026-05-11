'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type TeamActivityItem = {
  type: 'invited' | 'joined' | 'removed'
  memberName: string
  memberEmail: string
  timestamp: string
}

export async function getTeamActivity(limit = 20): Promise<TeamActivityItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { data, error } = await db
      .from('chef_team_members')
      .select('member_name, member_email, status, created_at, accepted_at')
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(limit * 2)

    if (error) {
      // Table might not exist; fall back to staff_members
      if (error.code === '42P01') {
        return getStaffFallbackActivity(user.tenantId!, limit)
      }
      return []
    }

    if (!data || data.length === 0) return []

    const activities: TeamActivityItem[] = []
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    for (const row of data as Array<any>) {
      const createdAt = new Date(row.created_at)

      // Members with accepted_at = "joined"
      if (row.accepted_at) {
        activities.push({
          type: 'joined',
          memberName: row.member_name || 'Team Member',
          memberEmail: row.member_email || '',
          timestamp: row.accepted_at,
        })
      }

      // Members with status='removed' = "removed"
      if (row.status === 'removed') {
        activities.push({
          type: 'removed',
          memberName: row.member_name || 'Team Member',
          memberEmail: row.member_email || '',
          timestamp: row.created_at,
        })
      } else if (createdAt >= ninetyDaysAgo) {
        // Members created in last 90 days = "invited"
        activities.push({
          type: 'invited',
          memberName: row.member_name || 'Team Member',
          memberEmail: row.member_email || '',
          timestamp: row.created_at,
        })
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return activities.slice(0, limit)
  } catch {
    return []
  }
}

async function getStaffFallbackActivity(
  tenantId: string,
  limit: number
): Promise<TeamActivityItem[]> {
  const db: any = createServerClient()

  try {
    const { data, error } = await db
      .from('staff_members')
      .select('name, email, status, created_at')
      .eq('chef_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const activities: TeamActivityItem[] = []

    for (const row of data as Array<any>) {
      const createdAt = new Date(row.created_at)
      if (createdAt >= ninetyDaysAgo) {
        activities.push({
          type: 'invited',
          memberName: row.name || 'Team Member',
          memberEmail: row.email || '',
          timestamp: row.created_at,
        })
      }
    }

    return activities
  } catch {
    return []
  }
}
