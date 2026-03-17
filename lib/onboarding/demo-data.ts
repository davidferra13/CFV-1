import { requireChef } from '@/lib/auth/get-user'
import { hasDemoDataForTenant } from '@/lib/onboarding/demo-data-core'

export async function hasDemoData(): Promise<boolean> {
  const user = await requireChef()
  return hasDemoDataForTenant(user.tenantId ?? user.entityId)
}
