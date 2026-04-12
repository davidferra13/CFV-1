/**
 * Test Data Factories — P0 Test Infrastructure
 *
 * Generates realistic test data for unit and integration tests.
 * These create plain objects (NOT database records). For DB-backed
 * factories, see test-db.ts.
 *
 * Usage:
 *   import { factories } from '../helpers/factories.js'
 *   const chef = factories.chef()
 *   const event = factories.event({ tenant_id: chef.id })
 */

import { randomUUID } from 'node:crypto'

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

let counter = 0
function seq() {
  return ++counter
}

function uuid() {
  return randomUUID()
}

function email(prefix = 'test') {
  return `${prefix}-${seq()}-${Date.now()}@chefflow.test`
}

function futureDate(daysAhead = 30) {
  const _d = new Date()
  const d = new Date(_d.getFullYear(), _d.getMonth(), _d.getDate() + daysAhead)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pastDate(daysAgo = 30) {
  const _d = new Date()
  const d = new Date(_d.getFullYear(), _d.getMonth(), _d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

export const factories = {
  /** Chef / tenant owner */
  chef(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      email: email('chef'),
      business_name: `Test Kitchen ${seq()}`,
      first_name: 'Chef',
      last_name: `Test${seq()}`,
      phone: '555-0100',
      subscription_status: null as string | null,
      trial_ends_at: null as string | null,
      account_status: 'active',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Auth user (Auth.js.users shape) */
  authUser(overrides: Record<string, unknown> = {}) {
    return {
      id: uuid(),
      email: email('user'),
      ...overrides,
    }
  },

  /** User role mapping */
  userRole(overrides: Record<string, unknown> = {}) {
    return {
      id: uuid(),
      auth_user_id: uuid(),
      role: 'chef' as string,
      entity_id: uuid(),
      ...overrides,
    }
  },

  /** Client record */
  client(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      first_name: 'Client',
      last_name: `Test${seq()}`,
      email: email('client'),
      phone: '555-0200',
      dietary_restrictions: null as string | null,
      allergies: null as string | null,
      notes: null as string | null,
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Event record */
  event(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      client_id: uuid(),
      occasion: 'Dinner Party',
      event_date: futureDate(),
      event_time: '18:00',
      guest_count: 8,
      status: 'draft' as string,
      location: '123 Test St',
      quoted_price_cents: 150000, // $1,500.00
      notes: null as string | null,
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Inquiry record */
  inquiry(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      client_id: uuid(),
      source: 'website' as string,
      occasion: 'Birthday Dinner',
      event_date: futureDate(60),
      guest_count: 12,
      budget_cents: 200000,
      status: 'new' as string,
      notes: 'Test inquiry',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Quote record */
  quote(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      event_id: uuid(),
      client_id: uuid(),
      total_cents: 200000,
      status: 'draft' as string,
      valid_until: futureDate(14),
      notes: null as string | null,
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Ledger entry */
  ledgerEntry(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      client_id: uuid(),
      event_id: uuid(),
      entry_type: 'payment' as string,
      amount_cents: 50000, // $500.00
      payment_method: 'card' as string,
      description: 'Test payment',
      transaction_reference: `txn-${id}`,
      is_refund: false,
      refund_reason: null as string | null,
      refunded_entry_id: null as string | null,
      internal_notes: null as string | null,
      created_by: uuid(),
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Recipe record */
  recipe(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      name: `Test Recipe ${seq()}`,
      servings: 4,
      prep_time_minutes: 30,
      cook_time_minutes: 45,
      instructions: 'Mix and cook',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Menu record */
  menu(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      name: `Test Menu ${seq()}`,
      description: 'A test menu',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Staff member record */
  staffMember(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      chef_id: uuid(),
      first_name: 'Staff',
      last_name: `Member${seq()}`,
      email: email('staff'),
      role: 'sous_chef' as string,
      hourly_rate_cents: 2500,
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  /** Expense record */
  expense(overrides: Record<string, unknown> = {}) {
    const id = uuid()
    return {
      id,
      tenant_id: uuid(),
      amount_cents: 5000,
      category: 'Ingredients',
      description: 'Test expense',
      expense_date: pastDate(5),
      created_at: new Date().toISOString(),
      ...overrides,
    }
  },

  // ─── Composite helpers ───────────────────────────────────────────────────

  /** Create a connected chef + auth user + role mapping */
  chefWithAuth(overrides: Record<string, unknown> = {}) {
    const chef = factories.chef(overrides)
    const auth = factories.authUser({ email: chef.email })
    const role = factories.userRole({
      auth_user_id: auth.id,
      role: 'chef',
      entity_id: chef.id,
    })
    return { chef, auth, role }
  },

  /** Create a connected client + auth user + role mapping under a tenant */
  clientWithAuth(tenantId: string, overrides: Record<string, unknown> = {}) {
    const client = factories.client({ tenant_id: tenantId, ...overrides })
    const auth = factories.authUser({ email: client.email })
    const role = factories.userRole({
      auth_user_id: auth.id,
      role: 'client',
      entity_id: client.id,
    })
    return { client, auth, role }
  },

  /** Create a set of ledger entries that represent a typical event payment flow */
  paymentFlow(tenantId: string, clientId: string, eventId: string) {
    const deposit = factories.ledgerEntry({
      tenant_id: tenantId,
      client_id: clientId,
      event_id: eventId,
      entry_type: 'deposit',
      amount_cents: 50000,
      description: 'Deposit (50%)',
    })
    const finalPayment = factories.ledgerEntry({
      tenant_id: tenantId,
      client_id: clientId,
      event_id: eventId,
      entry_type: 'final_payment',
      amount_cents: 50000,
      description: 'Final payment',
    })
    const tip = factories.ledgerEntry({
      tenant_id: tenantId,
      client_id: clientId,
      event_id: eventId,
      entry_type: 'tip',
      amount_cents: 15000,
      description: 'Tip',
    })
    return { deposit, finalPayment, tip }
  },
}
