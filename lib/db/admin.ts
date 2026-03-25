// Admin database client (PostgreSQL compatibility layer)
// No RLS since we connect directly to PostgreSQL.

import { createCompatClient, type CompatClient } from '@/lib/db/compat'

export function createAdminClient(): CompatClient {
  return createCompatClient()
}
