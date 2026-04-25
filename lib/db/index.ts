import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

// PostgreSQL OIDs for date/time types
// DATE (1082) is returned as an ISO string 'YYYY-MM-DD' so JS string comparisons work correctly.
// TIMESTAMP (1114) and TIMESTAMPTZ (1184) remain as Date objects for accurate arithmetic.
const DATE_OID = 1082

// Create postgres.js connection with connection pooling
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    statement_timeout: 30000, // 30s hard kill - prevents runaway queries from saturating the pool
  },
  types: {
    // Return DATE columns as 'YYYY-MM-DD' strings instead of Date objects.
    // All TypeScript types declare date columns as `string`, and in-memory JS comparisons
    // (e.g. event_date >= '2026-01-01') require string-to-string for correct behavior.
    // Without this, postgres.js 3.x returns Date objects which makes `Date >= string` always false.
    date: {
      to: DATE_OID,
      from: [DATE_OID],
      serialize: (v: string | Date) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
      parse: (v: string) => v, // keep as 'YYYY-MM-DD' string
    },
  },
})

const drizzleClient = client as unknown as Sql<{}>

export const db = drizzle(drizzleClient)

// Export the raw client for cases where we need raw SQL
export { client as pgClient }
