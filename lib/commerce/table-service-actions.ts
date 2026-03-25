'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { assertPosRoleAccess } from './pos-authorization'
import type {
  DiningCheck,
  DiningCheckStatus,
  DiningLayoutZone,
  DiningTable,
  DiningTableStatus,
  DiningZone,
  OpenDiningCheckWithTable,
} from './table-service-types'

const DINING_TABLE_STATUSES = ['available', 'seated', 'reserved', 'out_of_service'] as const

const DINING_CHECK_STATUSES = ['open', 'closed', 'voided'] as const

function normalizeTableStatus(raw: unknown): DiningTableStatus {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (DINING_TABLE_STATUSES.includes(value as DiningTableStatus)) {
    return value as DiningTableStatus
  }
  return 'available'
}

function normalizeCheckStatus(raw: unknown): DiningCheckStatus {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (DINING_CHECK_STATUSES.includes(value as DiningCheckStatus)) {
    return value as DiningCheckStatus
  }
  return 'open'
}

function toDiningZone(row: any): DiningZone {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}

function toDiningTable(row: any): DiningTable {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    zoneId: String(row.zone_id),
    tableLabel: String(row.table_label),
    seatCapacity: Number(row.seat_capacity ?? 1),
    sortOrder: Number(row.sort_order ?? 0),
    status: normalizeTableStatus(row.status),
    isActive: row.is_active !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}

function toDiningCheck(row: any): DiningCheck {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tableId: String(row.table_id),
    registerSessionId: row.register_session_id ? String(row.register_session_id) : null,
    saleId: row.sale_id ? String(row.sale_id) : null,
    status: normalizeCheckStatus(row.status),
    guestName: row.guest_name ? String(row.guest_name) : null,
    guestCount: row.guest_count == null ? null : Number(row.guest_count),
    notes: row.notes ? String(row.notes) : null,
    openedAt: String(row.opened_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}

function requireNonEmpty(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${label} is required`)
  }
  return normalized
}

function parseSeatCapacity(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 30) {
    throw new Error('Seat capacity must be an integer between 1 and 30')
  }
  return value
}

function parseSortOrder(value: number | undefined) {
  if (value == null) return 0
  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    throw new Error('Sort order must be an integer between 0 and 1000')
  }
  return value
}

function isUniqueViolation(error: unknown) {
  return (error as { code?: string } | null)?.code === '23505'
}

export async function listDiningLayout(): Promise<DiningLayoutZone[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const [zonesRes, tablesRes, checksRes] = await Promise.all([
    db
      .from('commerce_dining_zones' as any)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    db
      .from('commerce_dining_tables' as any)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    db
      .from('commerce_dining_checks' as any)
      .select('id, table_id, guest_name')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'open'),
  ])

  if (zonesRes.error) throw new Error(`Failed to load dining zones: ${zonesRes.error.message}`)
  if (tablesRes.error) throw new Error(`Failed to load dining tables: ${tablesRes.error.message}`)
  if (checksRes.error)
    throw new Error(`Failed to load open dining checks: ${checksRes.error.message}`)

  const checksByTableId = new Map<string, { id: string; guestName: string | null }>()
  for (const row of checksRes.data ?? []) {
    const tableId = String((row as any).table_id ?? '')
    if (!tableId || checksByTableId.has(tableId)) continue
    checksByTableId.set(tableId, {
      id: String((row as any).id ?? ''),
      guestName: (row as any).guest_name ? String((row as any).guest_name) : null,
    })
  }

  const tablesByZone = new Map<string, DiningLayoutZone['tables']>()
  for (const row of tablesRes.data ?? []) {
    const table = toDiningTable(row)
    const openCheck = checksByTableId.get(table.id)
    const list = tablesByZone.get(table.zoneId) ?? []
    list.push({
      ...table,
      openCheckId: openCheck?.id ?? null,
      openGuestName: openCheck?.guestName ?? null,
    })
    tablesByZone.set(table.zoneId, list)
  }

  return (zonesRes.data ?? []).map((row: any) => {
    const zone = toDiningZone(row)
    return {
      ...zone,
      tables: tablesByZone.get(zone.id) ?? [],
    }
  })
}

export async function listOpenDiningChecks(input?: {
  limit?: number
}): Promise<OpenDiningCheckWithTable[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const limit =
    Number.isInteger(input?.limit) && (input?.limit as number) > 0
      ? Math.min(200, input?.limit as number)
      : 100

  const [checksRes, tablesRes] = await Promise.all([
    db
      .from('commerce_dining_checks' as any)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'open')
      .order('opened_at', { ascending: true })
      .limit(limit),
    db
      .from('commerce_dining_tables' as any)
      .select('id, table_label, status')
      .eq('tenant_id', user.tenantId!),
  ])

  if (checksRes.error) throw new Error(`Failed to list open checks: ${checksRes.error.message}`)
  if (tablesRes.error) throw new Error(`Failed to load dining tables: ${tablesRes.error.message}`)

  const tableMap = new Map<string, { tableLabel: string; status: DiningTableStatus }>()
  for (const row of tablesRes.data ?? []) {
    tableMap.set(String((row as any).id), {
      tableLabel: String((row as any).table_label ?? ''),
      status: normalizeTableStatus((row as any).status),
    })
  }

  return (checksRes.data ?? []).map((row: any) => {
    const check = toDiningCheck(row)
    const table = tableMap.get(check.tableId)
    return {
      ...check,
      tableLabel: table?.tableLabel ?? 'Unknown Table',
      tableStatus: table?.status ?? 'available',
    }
  })
}

export async function createDiningZone(input: { name: string; sortOrder?: number }) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  await assertPosRoleAccess({
    db,
    user,
    action: 'manage dining zones',
    requiredLevel: 'lead',
  })

  const name = requireNonEmpty(String(input.name ?? ''), 'Zone name')
  if (name.length > 64) {
    throw new Error('Zone name must be 64 characters or fewer')
  }

  const { error } = await (db.from('commerce_dining_zones' as any).insert({
    tenant_id: user.tenantId!,
    name,
    sort_order: parseSortOrder(input.sortOrder),
  } as any) as any)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error('A zone with this name already exists')
    }
    throw new Error(`Failed to create zone: ${error.message}`)
  }

  revalidatePath('/commerce/table-service')
}

export async function createDiningTable(input: {
  zoneId: string
  tableLabel: string
  seatCapacity: number
  sortOrder?: number
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  await assertPosRoleAccess({
    db,
    user,
    action: 'manage dining tables',
    requiredLevel: 'lead',
  })

  const zoneId = requireNonEmpty(String(input.zoneId ?? ''), 'Zone')
  const tableLabel = requireNonEmpty(String(input.tableLabel ?? ''), 'Table label')
  if (tableLabel.length > 32) {
    throw new Error('Table label must be 32 characters or fewer')
  }

  const { data: zone, error: zoneErr } = await (db
    .from('commerce_dining_zones' as any)
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('id', zoneId)
    .maybeSingle() as any)
  if (zoneErr || !zone) {
    throw new Error('Zone not found')
  }

  const { error } = await (db.from('commerce_dining_tables' as any).insert({
    tenant_id: user.tenantId!,
    zone_id: zoneId,
    table_label: tableLabel,
    seat_capacity: parseSeatCapacity(input.seatCapacity),
    sort_order: parseSortOrder(input.sortOrder),
    status: 'available',
  } as any) as any)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error('A table with this label already exists')
    }
    throw new Error(`Failed to create table: ${error.message}`)
  }

  revalidatePath('/commerce/table-service')
}

export async function setDiningTableStatus(input: { tableId: string; status: DiningTableStatus }) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  await assertPosRoleAccess({
    db,
    user,
    action: 'update dining table status',
    requiredLevel: 'lead',
  })

  const tableId = requireNonEmpty(String(input.tableId ?? ''), 'Table')
  const status = normalizeTableStatus(input.status)

  const { error } = await (db
    .from('commerce_dining_tables' as any)
    .update({ status } as any)
    .eq('tenant_id', user.tenantId!)
    .eq('id', tableId) as any)

  if (error) throw new Error(`Failed to update table status: ${error.message}`)
  revalidatePath('/commerce/table-service')
}

export async function openDiningCheck(input: {
  tableId: string
  registerSessionId?: string
  guestName?: string
  guestCount?: number
  notes?: string
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  await assertPosRoleAccess({
    db,
    user,
    action: 'open dining checks',
    requiredLevel: 'cashier',
  })

  const tableId = requireNonEmpty(String(input.tableId ?? ''), 'Table')

  const { data: table, error: tableErr } = await (db
    .from('commerce_dining_tables' as any)
    .select('id, status, is_active')
    .eq('tenant_id', user.tenantId!)
    .eq('id', tableId)
    .maybeSingle() as any)

  if (tableErr || !table) throw new Error('Table not found')
  if (!(table as any).is_active) throw new Error('Table is inactive')
  if (String((table as any).status ?? '') === 'out_of_service') {
    throw new Error('Table is marked out of service')
  }

  const guestName = String(input.guestName ?? '').trim() || null
  const guestCount =
    input.guestCount == null || String(input.guestCount).trim() === ''
      ? null
      : parseSeatCapacity(Number(input.guestCount))
  const notes = String(input.notes ?? '').trim() || null

  const { data: inserted, error } = await (db
    .from('commerce_dining_checks' as any)
    .insert({
      tenant_id: user.tenantId!,
      table_id: tableId,
      register_session_id: input.registerSessionId ?? null,
      status: 'open',
      guest_name: guestName,
      guest_count: guestCount,
      notes,
      opened_by: user.id,
    } as any)
    .select('*')
    .single() as any)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error('This table already has an open check')
    }
    throw new Error(`Failed to open dining check: ${error.message}`)
  }

  await (db
    .from('commerce_dining_tables' as any)
    .update({ status: 'seated' } as any)
    .eq('tenant_id', user.tenantId!)
    .eq('id', tableId)
    .neq('status', 'out_of_service') as any)

  revalidatePath('/commerce/table-service')
  revalidatePath('/commerce/register')
  return toDiningCheck(inserted)
}

export async function closeDiningCheck(input: {
  checkId: string
  saleId?: string
  notes?: string
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  await assertPosRoleAccess({
    db,
    user,
    action: 'close dining checks',
    requiredLevel: 'cashier',
  })

  const checkId = requireNonEmpty(String(input.checkId ?? ''), 'Check')
  const { data: check, error: checkErr } = await (db
    .from('commerce_dining_checks' as any)
    .select('id, table_id, status, notes')
    .eq('tenant_id', user.tenantId!)
    .eq('id', checkId)
    .maybeSingle() as any)

  if (checkErr || !check) throw new Error('Dining check not found')
  if (normalizeCheckStatus((check as any).status) !== 'open') {
    throw new Error('Dining check is already closed')
  }

  const closeNotes = String(input.notes ?? '').trim()
  const existingNotes = String((check as any).notes ?? '').trim()
  const mergedNotes = [existingNotes, closeNotes].filter(Boolean).join('\n')
  const closedAt = new Date().toISOString()

  const { error } = await (db
    .from('commerce_dining_checks' as any)
    .update({
      status: 'closed',
      sale_id: input.saleId ?? null,
      closed_at: closedAt,
      closed_by: user.id,
      notes: mergedNotes || null,
    } as any)
    .eq('tenant_id', user.tenantId!)
    .eq('id', checkId)
    .eq('status', 'open') as any)
  if (error) throw new Error(`Failed to close dining check: ${error.message}`)

  const { count: openCount } = await (db
    .from('commerce_dining_checks' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('table_id', (check as any).table_id)
    .eq('status', 'open') as any)

  if ((openCount ?? 0) === 0) {
    await (db
      .from('commerce_dining_tables' as any)
      .update({ status: 'available' } as any)
      .eq('tenant_id', user.tenantId!)
      .eq('id', (check as any).table_id)
      .neq('status', 'out_of_service') as any)
  }

  revalidatePath('/commerce/table-service')
  revalidatePath('/commerce/register')
}
