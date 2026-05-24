'use server'

import { requireChef } from '@/lib/auth/get-user'
import type { TenantContext } from './tenant-safe-types'

export async function getTenantContext(): Promise<TenantContext> {
  const chef = await requireChef()
  return {
    tenantId: chef.tenantId!,
    chefId: chef.id,
  }
}
