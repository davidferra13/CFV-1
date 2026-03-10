'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  computeLaborForecast,
  type LaborForecastInput,
  type LaborForecastResult,
} from '@/lib/staff/labor-forecast-shared'
import { createServerClient } from '@/lib/supabase/server'

export async function forecastLaborHours(input: LaborForecastInput): Promise<LaborForecastResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const result = computeLaborForecast(input)

  try {
    const { data: staffMembers } = await supabase
      .from('staff_members')
      .select('role, hourly_rate_cents')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active')
      .gt('hourly_rate_cents', 0)

    if (staffMembers && staffMembers.length > 0) {
      const roleRates: Record<string, { total: number; count: number }> = {}
      for (const staffMember of staffMembers) {
        const category = mapStaffRoleToCategory(staffMember.role)
        if (!roleRates[category]) {
          roleRates[category] = { total: 0, count: 0 }
        }
        roleRates[category].total += staffMember.hourly_rate_cents
        roleRates[category].count++
      }

      for (const role of result.roles) {
        const actual = roleRates[role.role]
        if (actual && actual.count > 0) {
          const avgRate = Math.round(actual.total / actual.count)
          role.estimatedCostCents = role.totalHours * avgRate
        }
      }

      result.totalCostCents = result.roles.reduce((sum, role) => sum + role.estimatedCostCents, 0)
      result.notes.push('Costs based on your staff roster average rates')
    }
  } catch (err) {
    console.error('[forecastLaborHours] Could not load staff rates:', err)
  }

  return result
}

function mapStaffRoleToCategory(role: string): string {
  switch (role) {
    case 'sous_chef':
    case 'kitchen_assistant':
      return 'kitchen'
    case 'service_staff':
    case 'server':
      return 'server'
    case 'bartender':
      return 'bartender'
    case 'dishwasher':
      return 'dishwasher'
    default:
      return 'kitchen'
  }
}
