'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildSustainabilityWasteEthicsLedgerReadModel,
  type ClientSustainabilityPreferenceSourceRow,
  type EventLeftoverSourceRow,
  type EventPlanningSourceRow,
  type EventWasteLogSourceRow,
  type SourcingEntrySourceRow,
  type SustainabilityWasteEthicsLedgerReadModel,
} from './sustainability-waste-ethics-ledger'

export async function getSustainabilityWasteEthicsLedger(): Promise<SustainabilityWasteEthicsLedgerReadModel> {
  const user = await requireChef()
  const tenantId = user.entityId ?? user.tenantId!
  const chefId = user.entityId ?? user.tenantId!
  const db: any = createServerClient()

  const [wasteResult, leftoverResult, sourcingResult, eventResult, clientResult] =
    await Promise.all([
      db
        .from('event_waste_logs')
        .select(
          'id,event_id,item_name,category,quantity_description,estimated_cost_cents,reason,notes,logged_at'
        )
        .eq('tenant_id', tenantId)
        .order('logged_at', { ascending: false })
        .limit(60),
      db
        .from('event_leftovers')
        .select(
          'id,event_id,item_description,quantity,packaging_type,labeled,label_text,given_to,storage_instructions,created_at'
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(60),
      db
        .from('sourcing_entries')
        .select(
          'id,event_id,entry_date,ingredient_name,source_type,source_name,distance_miles,cost_cents,weight_lbs,is_organic,is_local,notes,created_at'
        )
        .eq('chef_id', chefId)
        .order('entry_date', { ascending: false })
        .limit(60),
      db
        .from('events')
        .select(
          'id,client_id,event_date,occasion,status,guest_count,allergies,dietary_restrictions'
        )
        .eq('tenant_id', tenantId)
        .order('event_date', { ascending: false })
        .limit(40),
      db
        .from('clients')
        .select('id,full_name,leftovers_preference,cleanup_expectations')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(60),
    ])

  const firstError =
    wasteResult.error ||
    leftoverResult.error ||
    sourcingResult.error ||
    eventResult.error ||
    clientResult.error

  if (firstError) {
    throw new Error('Failed to load sustainability ledger')
  }

  return buildSustainabilityWasteEthicsLedgerReadModel({
    tenantId,
    chefId,
    wasteLogs: (wasteResult.data ?? []) as EventWasteLogSourceRow[],
    leftovers: (leftoverResult.data ?? []) as EventLeftoverSourceRow[],
    sourcingEntries: (sourcingResult.data ?? []) as SourcingEntrySourceRow[],
    events: (eventResult.data ?? []) as EventPlanningSourceRow[],
    clients: (clientResult.data ?? []) as ClientSustainabilityPreferenceSourceRow[],
  })
}
