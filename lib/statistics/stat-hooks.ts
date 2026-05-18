import { collectStatisticsSnapshot } from './stat-collector'
import type {
  StatisticsHookEntity,
  StatisticsHookInput,
  StatisticsHookResult,
  StatisticsSnapshot,
  StatisticsSourceRows,
} from './stat-types'

const SCOPE_BY_ENTITY: Record<StatisticsHookEntity, StatisticsHookResult['affectedScopes']> = {
  event: [
    'revenue',
    'event_count',
    'average_ticket',
    'client_ltv',
    'dish_rankings',
    'busiest_months',
    'growth_trajectory',
  ],
  client: ['client_ltv'],
  menu: ['dish_rankings'],
  dish: ['dish_rankings'],
  expense: ['client_ltv', 'dish_rankings'],
  ledger_entry: ['revenue', 'average_ticket', 'client_ltv', 'dish_rankings', 'growth_trajectory'],
  payment: ['revenue', 'average_ticket', 'client_ltv', 'dish_rankings', 'growth_trajectory'],
}

export function getStatisticsScopesForEntity(
  entity: StatisticsHookEntity
): StatisticsHookResult['affectedScopes'] {
  return SCOPE_BY_ENTITY[entity]
}

export function markStatisticsExhaustDirty(input: StatisticsHookInput): StatisticsHookResult {
  return {
    accepted: true,
    tenantId: input.tenantId,
    affectedScopes: getStatisticsScopesForEntity(input.entity),
    shouldRecompute: true,
  }
}

export function collectStatisticsExhaustFromRows(rows: StatisticsSourceRows): StatisticsSnapshot {
  return collectStatisticsSnapshot(rows)
}

export async function afterStatisticsMutation(
  input: StatisticsHookInput
): Promise<StatisticsHookResult> {
  return markStatisticsExhaustDirty(input)
}

export async function afterEventStatisticsMutation(
  tenantId: string,
  eventId: string,
  occurredAt?: string
): Promise<StatisticsHookResult> {
  return afterStatisticsMutation({
    tenantId,
    entity: 'event',
    eventId,
    entityId: eventId,
    occurredAt,
  })
}

export async function afterClientStatisticsMutation(
  tenantId: string,
  clientId: string,
  occurredAt?: string
): Promise<StatisticsHookResult> {
  return afterStatisticsMutation({
    tenantId,
    entity: 'client',
    clientId,
    entityId: clientId,
    occurredAt,
  })
}

export async function afterMenuStatisticsMutation(
  tenantId: string,
  menuId: string,
  eventId?: string,
  occurredAt?: string
): Promise<StatisticsHookResult> {
  return afterStatisticsMutation({
    tenantId,
    entity: 'menu',
    entityId: menuId,
    eventId,
    occurredAt,
  })
}

export async function afterDishStatisticsMutation(
  tenantId: string,
  dishId: string,
  eventId?: string,
  occurredAt?: string
): Promise<StatisticsHookResult> {
  return afterStatisticsMutation({
    tenantId,
    entity: 'dish',
    entityId: dishId,
    eventId,
    occurredAt,
  })
}

export async function afterFinancialStatisticsMutation(
  tenantId: string,
  entity: 'expense' | 'ledger_entry' | 'payment',
  entityId: string,
  eventId?: string,
  occurredAt?: string
): Promise<StatisticsHookResult> {
  return afterStatisticsMutation({
    tenantId,
    entity,
    entityId,
    eventId,
    occurredAt,
  })
}
