'use server'

// lib/compliance/compliance-infrastructure-actions.ts
// Server actions for the Legal Readiness Center compliance infrastructure.
// Covers: checklist tracking, document storage references, regulatory requirement mapping.
// Admin-gated: all write actions require requireAdmin().
// Read actions for tenant-scoped data use requireChef().

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  CHEF_REGULATORY_REQUIREMENTS,
  summarizeComplianceItems,
  type ComplianceCategory,
  type ComplianceItem,
  type ComplianceItemStatus,
  type ComplianceSeverity,
  type ComplianceSummary,
} from './compliance-types'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ---------------------------------------------------------------------------
// Read: list items for a tenant
// ---------------------------------------------------------------------------

/**
 * Get all compliance checklist items for the current chef tenant.
 * Readable by chef, not admin-gated.
 */
export async function getComplianceItems(filters?: {
  category?: ComplianceCategory
  status?: ComplianceItemStatus
  severity?: ComplianceSeverity
}): Promise<ActionResult<{ items: ComplianceItem[]; summary: ComplianceSummary }>> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const db = createServerClient({ admin: true }) as any
  let query = db
    .from('legal_compliance_items')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('severity', { ascending: true }) // critical first
    .order('created_at', { ascending: true })

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.severity) query = query.eq('severity', filters.severity)

  const { data, error } = await query
  if (error) return { success: false, error: error.message }

  const items: ComplianceItem[] = (data ?? []).map(rowToItem)
  return { success: true, data: { items, summary: summarizeComplianceItems(items) } }
}

// ---------------------------------------------------------------------------
// Write: upsert checklist item (admin only)
// ---------------------------------------------------------------------------

export async function upsertComplianceItem(
  input: Omit<ComplianceItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const db = createServerClient({ admin: true }) as any

  const { data, error } = await db
    .from('legal_compliance_items')
    .upsert(
      {
        tenant_id: input.tenantId,
        category: input.category,
        subcategory: input.subcategory ?? null,
        item_key: input.itemKey,
        title: input.title,
        description: input.description ?? null,
        regulatory_body: input.regulatoryBody ?? null,
        jurisdiction: input.jurisdiction ?? null,
        applicable_states: input.applicableStates ?? null,
        status: input.status,
        document_ref: input.documentRef ?? null,
        document_expires_at: input.documentExpiresAt ?? null,
        renewal_frequency_days: input.renewalFrequencyDays ?? null,
        next_renewal_due: input.nextRenewalDue ?? null,
        last_completed_at: input.lastCompletedAt ?? null,
        completed_by: input.completedBy ?? null,
        severity: input.severity,
        requires_professional_review: input.requiresProfessionalReview,
        notes: input.notes ?? null,
      },
      { onConflict: 'tenant_id,item_key' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[compliance] upsertComplianceItem failed:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/legal')
  return { success: true, data: { id: data.id } }
}

// ---------------------------------------------------------------------------
// Write: update status (admin only)
// ---------------------------------------------------------------------------

export async function updateComplianceItemStatus(
  itemId: string,
  tenantId: string,
  status: ComplianceItemStatus,
  opts?: { documentRef?: string; notes?: string; completedBy?: string }
): Promise<ActionResult> {
  await requireAdmin()

  const db = createServerClient({ admin: true }) as any

  const updates: Record<string, unknown> = { status }
  if (status === 'completed') {
    updates.last_completed_at = new Date().toISOString()
    if (opts?.completedBy) updates.completed_by = opts.completedBy
  }
  if (opts?.documentRef) updates.document_ref = opts.documentRef
  if (opts?.notes !== undefined) updates.notes = opts.notes

  const { error } = await db
    .from('legal_compliance_items')
    .update(updates)
    .eq('id', itemId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/legal')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Write: attach document reference (admin only)
// ---------------------------------------------------------------------------

/**
 * Store a reference (path or URL) to a compliance document.
 * Never stores binary content — just a pointer.
 */
export async function attachComplianceDocumentRef(
  itemId: string,
  tenantId: string,
  documentRef: string,
  documentExpiresAt?: string | null
): Promise<ActionResult> {
  await requireAdmin()

  const db = createServerClient({ admin: true }) as any

  const { error } = await db
    .from('legal_compliance_items')
    .update({
      document_ref: documentRef,
      document_expires_at: documentExpiresAt ?? null,
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/legal')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Seed: initialize compliance checklist from regulatory requirements
// ---------------------------------------------------------------------------

/**
 * Seed the compliance checklist for a tenant with canonical regulatory requirements.
 * Admin only. Idempotent via upsert on (tenant_id, item_key).
 */
export async function seedComplianceChecklistForTenant(
  tenantId: string
): Promise<ActionResult<{ seededCount: number }>> {
  await requireAdmin()

  const db = createServerClient({ admin: true }) as any

  const rows = CHEF_REGULATORY_REQUIREMENTS.map((req) => ({
    tenant_id: tenantId,
    category: mapRegulatoryBodyToCategory(req.requirementTitle),
    item_key: req.id,
    title: req.requirementTitle,
    description: req.notes ?? null,
    regulatory_body: req.regulatoryBody,
    jurisdiction: req.jurisdiction,
    status: 'open',
    severity: inferSeverity(req.requirementTitle),
    requires_professional_review:
      req.requirementTitle.toLowerCase().includes('insurance') ||
      req.requirementTitle.toLowerCase().includes('tax'),
    notes: req.notes ?? null,
  }))

  const { data, error } = await db
    .from('legal_compliance_items')
    .upsert(rows, { onConflict: 'tenant_id,item_key', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('[compliance] seedComplianceChecklistForTenant failed:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/legal')
  return { success: true, data: { seededCount: data?.length ?? rows.length } }
}

// ---------------------------------------------------------------------------
// Read: regulatory requirement map
// ---------------------------------------------------------------------------

/**
 * Returns the canonical regulatory requirements for private chef businesses.
 * No DB query — deterministic static data.
 */
export async function getChefRegulatoryRequirements() {
  await requireChef()
  return { success: true as const, data: CHEF_REGULATORY_REQUIREMENTS }
}

// ---------------------------------------------------------------------------
// Admin: get compliance overview across all tenants
// ---------------------------------------------------------------------------

export async function getAdminComplianceOverview(): Promise<
  ActionResult<{
    totalItems: number
    openItems: number
    criticalOpenItems: number
    overdueTenants: string[]
  }>
> {
  await requireAdmin()

  const db = createServerClient({ admin: true }) as any

  const { data, error } = await db
    .from('legal_compliance_items')
    .select('tenant_id, status, severity')

  if (error) return { success: false, error: error.message }

  const rows = data ?? []
  const totalItems = rows.length
  const openItems = rows.filter((r: any) => r.status === 'open').length
  const criticalOpenItems = rows.filter(
    (r: any) => r.severity === 'critical' && ['open', 'overdue'].includes(r.status)
  ).length

  const overdueTenantSet = new Set<string>()
  for (const row of rows) {
    if (row.status === 'overdue') overdueTenantSet.add(row.tenant_id)
  }

  return {
    success: true,
    data: {
      totalItems,
      openItems,
      criticalOpenItems,
      overdueTenants: Array.from(overdueTenantSet),
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToItem(row: Record<string, any>): ComplianceItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    subcategory: row.subcategory ?? null,
    itemKey: row.item_key,
    title: row.title,
    description: row.description ?? null,
    regulatoryBody: row.regulatory_body ?? null,
    jurisdiction: row.jurisdiction ?? null,
    applicableStates: row.applicable_states ?? null,
    status: row.status,
    documentRef: row.document_ref ?? null,
    documentExpiresAt: row.document_expires_at ?? null,
    renewalFrequencyDays: row.renewal_frequency_days ?? null,
    nextRenewalDue: row.next_renewal_due ?? null,
    lastCompletedAt: row.last_completed_at ?? null,
    completedBy: row.completed_by ?? null,
    severity: row.severity,
    requiresProfessionalReview: row.requires_professional_review,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRegulatoryBodyToCategory(title: string): ComplianceCategory {
  const t = title.toLowerCase()
  if (t.includes('food') || t.includes('health') || t.includes('sanit')) return 'food_safety'
  if (t.includes('insurance')) return 'insurance'
  if (t.includes('license')) return 'business_license'
  if (t.includes('tax') || t.includes('ein')) return 'tax'
  if (t.includes('privacy') || t.includes('data')) return 'data_privacy'
  if (t.includes('permit')) return 'permits'
  if (t.includes('certif')) return 'certifications'
  return 'other'
}

function inferSeverity(title: string): ComplianceSeverity {
  const t = title.toLowerCase()
  if (t.includes('food') && t.includes('certif')) return 'critical'
  if (t.includes('insurance')) return 'high'
  if (t.includes('license')) return 'high'
  if (t.includes('tax') || t.includes('ein')) return 'high'
  return 'medium'
}
