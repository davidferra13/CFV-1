// Stub: module was removed but still imported in several files.
// Returns null-safe ChefServiceConfig to satisfy callers.

import { cache } from 'react'
import type { ChefServiceConfig } from '@/lib/chef-services/service-config-actions'

export const getServiceConfigForTenant = cache(
  async (_tenantId: string): Promise<ChefServiceConfig | null> => {
    return null
  }
)
