import type { Json } from '@/types/database'
import {
  getDefaultTakeAChefCommissionPercent,
  normalizeTakeAChefCommissionPercent,
} from './take-a-chef-defaults'

export const TAKE_A_CHEF_PAYOUT_STATUS_VALUES = [
  'untracked',
  'pending',
  'scheduled',
  'paid',
  'issue',
] as const

export type TakeAChefPayoutStatus = (typeof TAKE_A_CHEF_PAYOUT_STATUS_VALUES)[number]

export type TakeAChefFinanceMeta = {
  grossBookingCents: number | null
  commissionPercent: number | null
  payoutAmountCents: number | null
  payoutStatus: TakeAChefPayoutStatus
  payoutArrivalDate: string | null
  payoutReference: string | null
  notes: string | null
  updatedAt: string | null
}

export type TakeAChefFinanceSummary = {
  grossBookingCents: number | null
  commissionPercent: number
  commissionPercentSource: 'stored' | 'derived' | 'default'
  loggedCommissionCents: number
  expectedCommissionCents: number | null
  expectedNetPayoutCents: number | null
  payoutAmountCents: number | null
  payoutStatus: TakeAChefPayoutStatus
  payoutArrivalDate: string | null
  payoutReference: string | null
  notes: string | null
  updatedAt: string | null
  commissionGapCents: number | null
  netPayoutGapCents: number | null
  commissionState: 'untracked' | 'missing' | 'matched' | 'mismatch'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseNullableCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value))
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed))
  }
  return null
}

function parseNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parseNullableDate(value: unknown): string | null {
  const parsed = parseNullableString(value)
  if (!parsed) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : null
}

export function normalizeTakeAChefPayoutStatus(value: unknown): TakeAChefPayoutStatus {
  if (
    typeof value === 'string' &&
    (TAKE_A_CHEF_PAYOUT_STATUS_VALUES as readonly string[]).includes(value)
  ) {
    return value as TakeAChefPayoutStatus
  }
  return 'untracked'
}

export function extractTakeAChefFinanceMeta(unknownFields: unknown): TakeAChefFinanceMeta {
  const root = asRecord(unknownFields)
  const nested =
    asRecord(root?.take_a_chef_finance) ?? asRecord(asRecord(root?.take_a_chef)?.finance)

  return {
    grossBookingCents: parseNullableCents(nested?.gross_booking_cents),
    commissionPercent:
      nested?.commission_percent == null
        ? null
        : normalizeTakeAChefCommissionPercent(nested.commission_percent),
    payoutAmountCents: parseNullableCents(nested?.payout_amount_cents),
    payoutStatus: normalizeTakeAChefPayoutStatus(nested?.payout_status),
    payoutArrivalDate: parseNullableDate(nested?.payout_arrival_date),
    payoutReference: parseNullableString(nested?.payout_reference),
    notes: parseNullableString(nested?.notes),
    updatedAt: parseNullableString(nested?.updated_at),
  }
}

export function mergeTakeAChefFinanceMeta(params: {
  unknownFields: unknown
  updates: Partial<TakeAChefFinanceMeta>
}): Json {
  const root = asRecord(params.unknownFields) || {}
  const current = extractTakeAChefFinanceMeta(root)

  const next: Record<string, Json> = {
    gross_booking_cents:
      params.updates.grossBookingCents === undefined
        ? current.grossBookingCents
        : params.updates.grossBookingCents,
    commission_percent:
      params.updates.commissionPercent === undefined
        ? current.commissionPercent
        : params.updates.commissionPercent == null
          ? null
          : normalizeTakeAChefCommissionPercent(params.updates.commissionPercent),
    payout_amount_cents:
      params.updates.payoutAmountCents === undefined
        ? current.payoutAmountCents
        : params.updates.payoutAmountCents,
    payout_status:
      params.updates.payoutStatus === undefined
        ? current.payoutStatus
        : normalizeTakeAChefPayoutStatus(params.updates.payoutStatus),
    payout_arrival_date:
      params.updates.payoutArrivalDate === undefined
        ? current.payoutArrivalDate
        : params.updates.payoutArrivalDate,
    payout_reference:
      params.updates.payoutReference === undefined
        ? current.payoutReference
        : params.updates.payoutReference,
    notes: params.updates.notes === undefined ? current.notes : params.updates.notes,
    updated_at:
      params.updates.updatedAt === undefined
        ? current.updatedAt
        : parseNullableString(params.updates.updatedAt),
  }

  return {
    ...root,
    take_a_chef_finance: next,
  } as Json
}

export function deriveTakeAChefCommissionPercent(params: {
  explicitCommissionPercent?: number | null
  grossBookingCents?: number | null
  loggedCommissionCents: number
  defaultCommissionPercent?: number
}): { commissionPercent: number; source: 'stored' | 'derived' | 'default' } {
  if (params.explicitCommissionPercent != null) {
    return {
      commissionPercent: normalizeTakeAChefCommissionPercent(params.explicitCommissionPercent),
      source: 'stored',
    }
  }

  if (
    params.grossBookingCents != null &&
    params.grossBookingCents > 0 &&
    params.loggedCommissionCents > 0
  ) {
    return {
      commissionPercent: normalizeTakeAChefCommissionPercent(
        (params.loggedCommissionCents / params.grossBookingCents) * 100
      ),
      source: 'derived',
    }
  }

  return {
    commissionPercent: normalizeTakeAChefCommissionPercent(
      params.defaultCommissionPercent ?? getDefaultTakeAChefCommissionPercent()
    ),
    source: 'default',
  }
}

export function calculateTakeAChefFinanceSummary(params: {
  grossBookingCents?: number | null
  explicitCommissionPercent?: number | null
  loggedCommissionCents: number
  payoutAmountCents?: number | null
  payoutStatus?: TakeAChefPayoutStatus
  payoutArrivalDate?: string | null
  payoutReference?: string | null
  notes?: string | null
  updatedAt?: string | null
  defaultCommissionPercent?: number
}): TakeAChefFinanceSummary {
  const grossBookingCents = parseNullableCents(params.grossBookingCents)
  const payoutAmountCents = parseNullableCents(params.payoutAmountCents)
  const { commissionPercent, source } = deriveTakeAChefCommissionPercent({
    explicitCommissionPercent: params.explicitCommissionPercent ?? null,
    grossBookingCents,
    loggedCommissionCents: Math.max(0, Math.round(params.loggedCommissionCents || 0)),
    defaultCommissionPercent: params.defaultCommissionPercent,
  })

  const expectedCommissionCents =
    grossBookingCents != null ? Math.round((grossBookingCents * commissionPercent) / 100) : null
  const expectedNetPayoutCents =
    grossBookingCents != null && expectedCommissionCents != null
      ? grossBookingCents - expectedCommissionCents
      : null
  const commissionGapCents =
    expectedCommissionCents != null
      ? Math.max(0, Math.round(params.loggedCommissionCents || 0)) - expectedCommissionCents
      : null
  const netPayoutGapCents =
    payoutAmountCents != null && expectedNetPayoutCents != null
      ? payoutAmountCents - expectedNetPayoutCents
      : null

  let commissionState: TakeAChefFinanceSummary['commissionState'] = 'untracked'
  if (expectedCommissionCents != null) {
    if (params.loggedCommissionCents <= 0) {
      commissionState = 'missing'
    } else if (Math.abs(commissionGapCents ?? 0) <= 100) {
      commissionState = 'matched'
    } else {
      commissionState = 'mismatch'
    }
  }

  return {
    grossBookingCents,
    commissionPercent,
    commissionPercentSource: source,
    loggedCommissionCents: Math.max(0, Math.round(params.loggedCommissionCents || 0)),
    expectedCommissionCents,
    expectedNetPayoutCents,
    payoutAmountCents,
    payoutStatus: normalizeTakeAChefPayoutStatus(params.payoutStatus),
    payoutArrivalDate: parseNullableDate(params.payoutArrivalDate),
    payoutReference: parseNullableString(params.payoutReference),
    notes: parseNullableString(params.notes),
    updatedAt: parseNullableString(params.updatedAt),
    commissionGapCents,
    netPayoutGapCents,
    commissionState,
  }
}
