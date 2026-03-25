// Server-side database client (PostgreSQL compatibility layer)
// Provides chainable query builder API backed by raw SQL via postgres.js.
// All consumer files use this for database access.

import { createCompatClient, type CompatClient } from '@/lib/db/compat'

export function createServerClient(_opts?: { admin?: boolean }): CompatClient {
  return createCompatClient()
}
