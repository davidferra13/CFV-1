// Stub: module was removed but still imported in several files.
// Returns null-safe ChefServiceConfig to satisfy callers.

import type { ChefServiceConfig } from '@/lib/chef-services/service-config-actions'

export async function getServiceConfigForTenant(
  _tenantId: string
): Promise<ChefServiceConfig | null> {
  return null
}
