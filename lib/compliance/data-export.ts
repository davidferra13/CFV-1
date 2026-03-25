'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

/**
 * Comprehensive data export for GDPR/data portability compliance.
 * Exports all tenant-scoped data across all major table groups.
 */
export async function exportMyData(): Promise<Record<string, unknown>> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.entityId

  // Helper to safely query a table - returns empty array if table doesn't exist
  // Capped at 10 000 rows per table to prevent unbounded memory usage / DoS
  const MAX_EXPORT_ROWS = 10_000

  async function safeQuery(
    table: string,
    columns: string = '*',
    fkColumn: string = 'tenant_id'
  ): Promise<Record<string, unknown>[]> {
    try {
      const { data } = await (db as any)
        .from(table)
        .select(columns)
        .eq(fkColumn, tenantId)
        .limit(MAX_EXPORT_ROWS)
      return (data || []) as Record<string, unknown>[]
    } catch {
      return []
    }
  }

  // Run all queries in parallel groups for performance
  const [
    // Core business
    chefProfile,
    clients,
    inquiries,
    events,
    // Financial
    ledgerEntries,
    expenses,
    quotes,
    // Menus & recipes
    menus,
    recipes,
    ingredients,
    // Communication
    messages,
    // Staff
    staffMembers,
    // Documents
    contracts,
    chefDocuments,
    // Operational
    afterActionReviews,
    chefTodos,
    equipmentInventory,
    // Calendar
    calendarEntries,
    // Activity log (last 5000 entries)
    activityLog,
  ] = await Promise.all([
    // Core
    db
      .from('chefs')
      .select('business_name, email, phone, display_name, bio, created_at')
      .eq('id', tenantId)
      .single()
      .then((r: any) => r.data),
    safeQuery('clients', '*', 'chef_id'),
    safeQuery('inquiries'),
    safeQuery('events'),
    // Financial
    safeQuery('ledger_entries'),
    safeQuery('expenses'),
    safeQuery('quotes'),
    // Menus & recipes
    safeQuery('menus'),
    safeQuery('recipes', '*', 'chef_id'),
    safeQuery('ingredients'),
    // Communication
    safeQuery('messages'),
    // Staff
    safeQuery('staff_members'),
    // Documents
    safeQuery('contracts'),
    safeQuery('chef_documents'),
    // Operational
    safeQuery('after_action_reviews'),
    safeQuery('chef_todos'),
    safeQuery('equipment_inventory'),
    // Calendar
    safeQuery('calendar_entries'),
    // Activity
    db
      .from('chef_activity_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5000)
      .then((r: any) => r.data || []),
  ])

  // Second batch - less critical tables
  const [
    dishes,
    components,
    automationRules,
    notifications,
    retainers,
    temperatureLogs,
    clientNotes,
    clientTags,
  ] = await Promise.all([
    safeQuery('dishes'),
    safeQuery('components'),
    safeQuery('automation_rules'),
    safeQuery('notifications'),
    safeQuery('retainers'),
    safeQuery('temperature_logs'),
    safeQuery('client_notes'),
    safeQuery('client_tags'),
  ])

  return {
    exported_at: new Date().toISOString(),
    export_format_version: '2.0',
    chef_id: tenantId,
    data: {
      profile: chefProfile,
      clients,
      inquiries,
      events,
      financial: {
        ledger_entries: ledgerEntries,
        expenses,
        quotes,
      },
      menus: {
        menus,
        dishes,
        components,
      },
      recipes: {
        recipes,
        ingredients,
      },
      communication: {
        messages,
      },
      staff: staffMembers,
      documents: {
        contracts,
        chef_documents: chefDocuments,
      },
      operational: {
        after_action_reviews: afterActionReviews,
        todos: chefTodos,
        equipment: equipmentInventory,
        temperature_logs: temperatureLogs,
      },
      calendar: calendarEntries,
      retainers,
      automation_rules: automationRules,
      notifications,
      client_notes: clientNotes,
      client_tags: clientTags,
      activity_log: activityLog,
    },
  }
}
