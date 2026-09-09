'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { clockInWork, clockOutWork, getWorkLedgerSnapshot, reviewWorkSession } from './repository'
import { correctWorkSession, mergeWorkSessions, splitWorkSession } from './review-repository'
import {
  CorrectSessionSchema,
  ManualClockInSchema,
  MergeSessionsSchema,
  ReviewSessionSchema,
  SplitSessionSchema,
} from './validators'

const LEDGER_PATH = '/insights/time-analysis'

export async function getWorkLedger() {
  const user = await requireChef()
  return getWorkLedgerSnapshot(createServerClient() as any, user.tenantId!)
}

export async function clockIn(input: unknown) {
  const user = await requireChef()
  const validated = ManualClockInSchema.parse(input)
  const result = await clockInWork(
    createServerClient() as any,
    user.tenantId!,
    user.authUserId,
    validated
  )
  revalidatePath(LEDGER_PATH)
  return result
}

export async function clockOut() {
  const user = await requireChef()
  const result = await clockOutWork(createServerClient() as any, user.tenantId!, user.authUserId)
  revalidatePath(LEDGER_PATH)
  return result
}

export async function reviewSession(input: unknown) {
  const user = await requireChef()
  const validated = ReviewSessionSchema.parse(input)
  const result = await reviewWorkSession(
    createServerClient() as any,
    user.tenantId!,
    user.authUserId,
    validated.session_id,
    validated.decision,
    validated.reason
  )
  revalidatePath(LEDGER_PATH)
  return result
}

export async function correctSession(input: unknown) {
  const user = await requireChef()
  const validated = CorrectSessionSchema.parse(input)
  const result = await correctWorkSession(
    createServerClient() as any,
    user.tenantId!,
    user.authUserId,
    validated
  )
  revalidatePath(LEDGER_PATH)
  return result
}

export async function splitSession(input: unknown) {
  const user = await requireChef()
  const validated = SplitSessionSchema.parse(input)
  const result = await splitWorkSession(
    createServerClient() as any,
    user.tenantId!,
    user.authUserId,
    validated.session_id,
    validated.split_at,
    validated.reason
  )
  revalidatePath(LEDGER_PATH)
  return result
}

export async function mergeSessions(input: unknown) {
  const user = await requireChef()
  const validated = MergeSessionsSchema.parse(input)
  const result = await mergeWorkSessions(
    createServerClient() as any,
    user.tenantId!,
    user.authUserId,
    validated.session_ids as [string, string],
    validated.reason
  )
  revalidatePath(LEDGER_PATH)
  return result
}
