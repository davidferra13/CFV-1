// Admin database client (Drizzle compatibility layer)
// Drop-in replacement for the old Supabase admin client.
// No RLS since we connect directly to PostgreSQL.

import { createCompatClient, type CompatClient } from '@/lib/db/compat'

export function createAdminClient(): CompatClient {
  return createCompatClient()
}
