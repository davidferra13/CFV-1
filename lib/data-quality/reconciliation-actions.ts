'use server'

// Data Reconciliation Server Actions
// Auth-gated wrappers for reconciliation engine functions.

import { requireChef } from '@/lib/auth/get-user'
import {
  findEventsWithoutExpenses,
  findInvoicesWithoutPayments,
  findClientsWithoutDietary,
  findEventsWithoutContracts,
  findEventsWithoutAAR,
  getReconciliationSummary,
  type GapItem,
  type ReconciliationSummary,
} from './reconciliation'

export async function getEventsWithoutExpenses(): Promise<GapItem[]> {
  const user = await requireChef()
  return findEventsWithoutExpenses(user.tenantId!)
}

export async function getInvoicesWithoutPayments(): Promise<GapItem[]> {
  const user = await requireChef()
  return findInvoicesWithoutPayments(user.tenantId!)
}

export async function getClientsWithoutDietary(): Promise<GapItem[]> {
  const user = await requireChef()
  return findClientsWithoutDietary(user.tenantId!)
}

export async function getEventsWithoutContracts(): Promise<GapItem[]> {
  const user = await requireChef()
  return findEventsWithoutContracts(user.tenantId!)
}

export async function getEventsWithoutAAR(): Promise<GapItem[]> {
  const user = await requireChef()
  return findEventsWithoutAAR(user.tenantId!)
}

export async function getFullReconciliation(): Promise<ReconciliationSummary> {
  const user = await requireChef()
  return getReconciliationSummary(user.tenantId!)
}
