import 'server-only'

import { pgClient } from '@/lib/db'
import type { TenantDataPresence } from './types'

const PRESENCE_CACHE_TTL_MS = 5_000
const presenceCache = new Map<string, { expiresAt: number; promise: Promise<TenantDataPresence> }>()

type PresenceRow = {
  has_events: boolean
  has_clients: boolean
  has_recipes: boolean
  has_menus: boolean
  has_inquiries: boolean
  has_quotes: boolean
  has_invoices: boolean
  has_expenses: boolean
  has_staff: boolean
  has_documents: boolean
  has_contracts: boolean
  has_leads: boolean
  has_conversations: boolean
  has_circles: boolean
  has_network: boolean
  has_inventory: boolean
  has_tasks: boolean
}

function toPresence(row: PresenceRow): TenantDataPresence {
  const flags = [
    row.has_events,
    row.has_clients,
    row.has_recipes,
    row.has_menus,
    row.has_inquiries,
    row.has_quotes,
    row.has_invoices,
    row.has_expenses,
    row.has_staff,
    row.has_documents,
    row.has_contracts,
    row.has_leads,
    row.has_conversations,
    row.has_circles,
    row.has_network,
    row.has_inventory,
    row.has_tasks,
  ]

  return {
    hasEvents: row.has_events,
    hasClients: row.has_clients,
    hasRecipes: row.has_recipes,
    hasMenus: row.has_menus,
    hasInquiries: row.has_inquiries,
    hasQuotes: row.has_quotes,
    hasInvoices: row.has_invoices,
    hasExpenses: row.has_expenses,
    hasStaff: row.has_staff,
    hasDocuments: row.has_documents,
    hasContracts: row.has_contracts,
    hasLeads: row.has_leads,
    hasConversations: row.has_conversations,
    hasCircles: row.has_circles,
    hasNetwork: row.has_network,
    hasInventory: row.has_inventory,
    hasTasks: row.has_tasks,
    populatedCount: flags.filter(Boolean).length,
  }
}

async function fetchTenantDataPresence(tenantId: string): Promise<TenantDataPresence> {
  const rows = await pgClient<PresenceRow[]>`
    SELECT
      EXISTS (SELECT 1 FROM events WHERE tenant_id = ${tenantId} LIMIT 1) AS has_events,
      EXISTS (SELECT 1 FROM clients WHERE tenant_id = ${tenantId} LIMIT 1) AS has_clients,
      EXISTS (SELECT 1 FROM recipes WHERE tenant_id = ${tenantId} LIMIT 1) AS has_recipes,
      EXISTS (SELECT 1 FROM menus WHERE tenant_id = ${tenantId} LIMIT 1) AS has_menus,
      EXISTS (SELECT 1 FROM inquiries WHERE tenant_id = ${tenantId} LIMIT 1) AS has_inquiries,
      EXISTS (SELECT 1 FROM quotes WHERE tenant_id = ${tenantId} LIMIT 1) AS has_quotes,
      (
        EXISTS (
          SELECT 1
          FROM events
          WHERE tenant_id = ${tenantId}
            AND (invoice_number IS NOT NULL OR invoice_issued_at IS NOT NULL)
          LIMIT 1
        )
        OR EXISTS (SELECT 1 FROM recurring_invoices WHERE chef_id = ${tenantId} LIMIT 1)
      ) AS has_invoices,
      EXISTS (SELECT 1 FROM expenses WHERE tenant_id = ${tenantId} LIMIT 1) AS has_expenses,
      EXISTS (SELECT 1 FROM staff_members WHERE chef_id = ${tenantId} LIMIT 1) AS has_staff,
      EXISTS (SELECT 1 FROM chef_documents WHERE tenant_id = ${tenantId} LIMIT 1) AS has_documents,
      EXISTS (SELECT 1 FROM event_contracts WHERE chef_id = ${tenantId} LIMIT 1) AS has_contracts,
      EXISTS (SELECT 1 FROM guest_leads WHERE tenant_id = ${tenantId} LIMIT 1) AS has_leads,
      EXISTS (SELECT 1 FROM conversations WHERE tenant_id = ${tenantId} LIMIT 1) AS has_conversations,
      EXISTS (SELECT 1 FROM hub_groups WHERE tenant_id = ${tenantId} LIMIT 1) AS has_circles,
      (
        EXISTS (SELECT 1 FROM chef_trusted_circle WHERE chef_id = ${tenantId} LIMIT 1)
        OR EXISTS (SELECT 1 FROM chef_network_posts WHERE author_chef_id = ${tenantId} LIMIT 1)
        OR EXISTS (
          SELECT 1
          FROM chef_network_contact_shares
          WHERE sender_chef_id = ${tenantId} OR recipient_chef_id = ${tenantId}
          LIMIT 1
        )
      ) AS has_network,
      (
        EXISTS (SELECT 1 FROM pantry_items WHERE tenant_id = ${tenantId} LIMIT 1)
        OR EXISTS (SELECT 1 FROM vendor_invoices WHERE chef_id = ${tenantId} LIMIT 1)
      ) AS has_inventory,
      (
        EXISTS (SELECT 1 FROM tasks WHERE chef_id = ${tenantId} LIMIT 1)
        OR EXISTS (SELECT 1 FROM chef_todos WHERE chef_id = ${tenantId} LIMIT 1)
      ) AS has_tasks
  `

  return toPresence(rows[0])
}

export function getTenantDataPresence(tenantId: string): Promise<TenantDataPresence> {
  const now = Date.now()
  const cached = presenceCache.get(tenantId)
  if (cached && cached.expiresAt > now) return cached.promise

  const promise = fetchTenantDataPresence(tenantId).catch((error) => {
    presenceCache.delete(tenantId)
    throw error
  })
  presenceCache.set(tenantId, { expiresAt: now + PRESENCE_CACHE_TTL_MS, promise })
  return promise
}

export type { TenantDataPresence } from './types'
