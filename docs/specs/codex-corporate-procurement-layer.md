# Corporate Procurement Layer for Dinner Circles

> **Status:** ready-to-build
> **Priority:** P1
> **Persona:** Elena Petrova (corporate catering, procurement-constrained)
> **Risk:** LOW (JSONB extension + 1 additive migration + 1 new component + 2 small edits)

---

## Problem

Dinner Circles handle multi-stakeholder coordination (80% built) but lack:

1. **Approval gate tracking** with per-step assignees, deadlines, statuses
2. **Procurement fields** (PO number, payment terms, cost center, budget ceiling)
3. **Compliance document checklist** (insurance, W-9, food handler license status)
4. **Stakeholder contact directory** per event

These gaps block corporate/enterprise catering workflows where nothing moves without formal sign-off chains.

---

## Architecture Decision: JSONB-Only MVP

All corporate data lives inside the existing `event_share_settings.circle_config` JSONB column, extending `DinnerCircleConfig`. This means:

- **Zero new tables** for the config fields (company, contacts, docs, budget)
- **One new table** for approval gates (needs indexing, querying, and FK to events)
- Uses existing `updateDinnerCircleConfig` server action for config persistence
- Uses existing `deepMergeConfig` for partial updates

The approval gates table is necessary because gates need:

- Independent status queries ("show me all overdue gates across all events")
- Per-gate timestamps that survive config overwrites
- Potential future FK to `hub_guest_profiles` for assignees

---

## Scope

### Build

1. Extend `DinnerCircleConfig` type with corporate fields
2. New migration: `circle_approval_gates` table
3. New server actions file: `lib/dinner-circles/corporate-actions.ts`
4. New component: `components/events/corporate-procurement-panel.tsx`
5. Wire new panel into `dinner-circle-command-center.tsx`

### Do NOT Build (Deferred)

- Do NOT modify `lib/events/fsm.ts` or `lib/events/transitions.ts`
- Do NOT modify `lib/quotes/actions.ts` or `lib/quotes/client-actions.ts`
- Do NOT modify any auth, billing, or layout files
- Do NOT add client-facing approval UI in the hub view (deferred)
- Do NOT add escalation cron jobs
- Do NOT add @-mention system
- Do NOT add compliance document file uploads (just status tracking)

---

## File Changes (5 files total)

### FILE 1: `lib/dinner-circles/types.ts` (EDIT - add types)

Add these NEW types BEFORE the existing `DinnerCircleConfig` type (before line 152):

```typescript
export type CorporateApprovalGateStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'skipped'

export type CorporatePaymentTerms = 'net_15' | 'net_30' | 'net_60' | 'on_receipt' | 'prepaid'

export type CorporateDocType = 'insurance' | 'w9' | 'food_handler' | 'business_license' | 'other'

export type CorporateDocStatus = 'missing' | 'submitted' | 'approved' | 'expired'

export type CorporateContact = {
  name: string
  role: string
  email?: string
  phone?: string
  isDecisionMaker: boolean
}

export type CorporateRequiredDoc = {
  type: CorporateDocType
  label: string
  required: boolean
  status: CorporateDocStatus
  expiresAt?: string
  notes?: string
}

export type CorporateConfig = {
  enabled: boolean
  companyName?: string
  departmentName?: string
  poNumber?: string
  costCenter?: string
  paymentTerms?: CorporatePaymentTerms
  budgetCeilingCents?: number
  contacts: CorporateContact[]
  requiredDocs: CorporateRequiredDoc[]
}
```

Then add `corporate?: CorporateConfig` to `DinnerCircleConfig`. Add it after `vendorInquiries`:

```typescript
export type DinnerCircleConfig = {
  // ... all existing fields unchanged ...
  vendorInquiries?: DinnerCircleVendorInquiry[]
  corporate?: CorporateConfig // <-- ADD THIS LINE
}
```

**DO NOT** modify any existing types. Only add new ones and the one new field.

---

### FILE 2: `database/migrations/20260425000014_circle_approval_gates.sql` (NEW FILE)

```sql
-- Corporate approval gate tracking for Dinner Circle events.
-- Each gate represents one approval step (menu sign-off, budget approval, legal review, etc.).
-- Gates are ordered per event and tracked independently from the JSONB circle config.

CREATE TABLE IF NOT EXISTS circle_approval_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  gate_name TEXT NOT NULL,
  gate_order INTEGER NOT NULL DEFAULT 0,

  assignee_name TEXT,
  assignee_email TEXT,
  assignee_role TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'skipped')),

  deadline_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  notes TEXT,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_gates_event ON circle_approval_gates(event_id);
CREATE INDEX idx_approval_gates_tenant ON circle_approval_gates(tenant_id);
CREATE INDEX idx_approval_gates_pending ON circle_approval_gates(status)
  WHERE status NOT IN ('approved', 'skipped');
```

**DO NOT** modify any existing migration files.

---

### FILE 3: `lib/dinner-circles/corporate-actions.ts` (NEW FILE)

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateGateSchema = z.object({
  eventId: z.string().uuid(),
  gateName: z.string().min(1).max(200),
  gateOrder: z.number().int().min(0).default(0),
  assigneeName: z.string().max(200).optional(),
  assigneeEmail: z.string().email().max(320).optional().or(z.literal('')),
  assigneeRole: z.string().max(200).optional(),
  deadlineAt: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

const UpdateGateStatusSchema = z.object({
  gateId: z.string().uuid(),
  status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'skipped']),
  notes: z.string().max(2000).optional().or(z.literal('')),
  rejectionReason: z.string().max(2000).optional().or(z.literal('')),
})

const DeleteGateSchema = z.object({
  gateId: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getApprovalGates(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('circle_approval_gates')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('gate_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createApprovalGate(input: z.infer<typeof CreateGateSchema>) {
  const user = await requireChef()
  const validated = CreateGateSchema.parse(input)
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { error } = await db.from('circle_approval_gates').insert({
    event_id: validated.eventId,
    tenant_id: user.tenantId!,
    gate_name: validated.gateName.trim(),
    gate_order: validated.gateOrder,
    assignee_name: validated.assigneeName?.trim() || null,
    assignee_email: validated.assigneeEmail?.trim() || null,
    assignee_role: validated.assigneeRole?.trim() || null,
    deadline_at: validated.deadlineAt || null,
    notes: validated.notes?.trim() || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/events/${validated.eventId}`)
  return { success: true }
}

export async function updateApprovalGateStatus(input: z.infer<typeof UpdateGateStatusSchema>) {
  const user = await requireChef()
  const validated = UpdateGateStatusSchema.parse(input)
  const db: any = createServerClient()

  // Verify gate ownership via tenant
  const { data: gate } = await db
    .from('circle_approval_gates')
    .select('event_id')
    .eq('id', validated.gateId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!gate) throw new Error('Approval gate not found')

  const completedAt =
    validated.status === 'approved' ||
    validated.status === 'rejected' ||
    validated.status === 'skipped'
      ? new Date().toISOString()
      : null

  const { error } = await db
    .from('circle_approval_gates')
    .update({
      status: validated.status,
      notes: validated.notes?.trim() || null,
      rejection_reason: validated.rejectionReason?.trim() || null,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.gateId)

  if (error) throw new Error(error.message)

  revalidatePath(`/events/${gate.event_id}`)
  return { success: true }
}

export async function deleteApprovalGate(input: z.infer<typeof DeleteGateSchema>) {
  const user = await requireChef()
  const validated = DeleteGateSchema.parse(input)
  const db: any = createServerClient()

  const { data: gate } = await db
    .from('circle_approval_gates')
    .select('event_id')
    .eq('id', validated.gateId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!gate) throw new Error('Approval gate not found')

  const { error } = await db.from('circle_approval_gates').delete().eq('id', validated.gateId)

  if (error) throw new Error(error.message)

  revalidatePath(`/events/${gate.event_id}`)
  return { success: true }
}
```

**Key patterns used (match existing codebase):**

- `'use server'` directive
- `requireChef()` for auth + tenant
- `createServerClient()` for DB
- `.from().select().eq()` compat-shim API
- `revalidatePath` for cache bust
- Zod validation on all inputs
- `{ success: true }` return shape

---

### FILE 4: `components/events/corporate-procurement-panel.tsx` (NEW FILE)

```tsx
'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Briefcase, CheckCircle2, Clock, FileText, Plus, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateDinnerCircleConfig } from '@/lib/dinner-circles/actions'
import {
  createApprovalGate,
  updateApprovalGateStatus,
  deleteApprovalGate,
} from '@/lib/dinner-circles/corporate-actions'
import type {
  CorporateConfig,
  CorporateContact,
  CorporateRequiredDoc,
  CorporateDocStatus,
  DinnerCircleConfig,
} from '@/lib/dinner-circles/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApprovalGate = {
  id: string
  gate_name: string
  gate_order: number
  assignee_name: string | null
  assignee_email: string | null
  assignee_role: string | null
  status: string
  deadline_at: string | null
  completed_at: string | null
  notes: string | null
  rejection_reason: string | null
}

type Props = {
  eventId: string
  config: DinnerCircleConfig
  gates: ApprovalGate[]
}

const fieldClass =
  'w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

const statusColors: Record<string, string> = {
  pending: 'bg-stone-700 text-stone-300',
  in_review: 'bg-amber-900/50 text-amber-300',
  approved: 'bg-emerald-900/50 text-emerald-300',
  rejected: 'bg-red-900/50 text-red-300',
  skipped: 'bg-stone-800 text-stone-500',
}

const docStatusColors: Record<CorporateDocStatus, string> = {
  missing: 'bg-red-900/50 text-red-300',
  submitted: 'bg-amber-900/50 text-amber-300',
  approved: 'bg-emerald-900/50 text-emerald-300',
  expired: 'bg-red-900/50 text-red-300',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CorporateProcurementPanel({ eventId, config, gates: initialGates }: Props) {
  const corporate = config.corporate ?? {
    enabled: false,
    contacts: [],
    requiredDocs: [],
  }

  const [isPending, startTransition] = useTransition()
  const [gates, setGates] = useState<ApprovalGate[]>(initialGates)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Local state for corporate config fields
  const [companyName, setCompanyName] = useState(corporate.companyName ?? '')
  const [departmentName, setDepartmentName] = useState(corporate.departmentName ?? '')
  const [poNumber, setPoNumber] = useState(corporate.poNumber ?? '')
  const [costCenter, setCostCenter] = useState(corporate.costCenter ?? '')
  const [paymentTerms, setPaymentTerms] = useState(corporate.paymentTerms ?? '')
  const [budgetCeiling, setBudgetCeiling] = useState(
    corporate.budgetCeilingCents ? (corporate.budgetCeilingCents / 100).toFixed(2) : ''
  )
  const [contacts, setContacts] = useState<CorporateContact[]>(corporate.contacts ?? [])
  const [requiredDocs, setRequiredDocs] = useState<CorporateRequiredDoc[]>(
    corporate.requiredDocs ?? []
  )

  // New gate form state
  const [newGateName, setNewGateName] = useState('')
  const [newGateAssignee, setNewGateAssignee] = useState('')
  const [newGateRole, setNewGateRole] = useState('')
  const [newGateDeadline, setNewGateDeadline] = useState('')

  function saveCorporateConfig() {
    setStatusMsg(null)
    const budgetCents = budgetCeiling ? Math.round(Number(budgetCeiling) * 100) : undefined

    startTransition(async () => {
      try {
        await updateDinnerCircleConfig({
          eventId,
          patch: {
            corporate: {
              enabled: true,
              companyName: companyName.trim() || undefined,
              departmentName: departmentName.trim() || undefined,
              poNumber: poNumber.trim() || undefined,
              costCenter: costCenter.trim() || undefined,
              paymentTerms: paymentTerms || undefined,
              budgetCeilingCents:
                Number.isFinite(budgetCents) && budgetCents! > 0 ? budgetCents : undefined,
              contacts,
              requiredDocs,
            },
          },
        })
        setStatusMsg('Saved')
      } catch (err) {
        setStatusMsg(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  function addGate() {
    if (!newGateName.trim()) return

    startTransition(async () => {
      try {
        await createApprovalGate({
          eventId,
          gateName: newGateName.trim(),
          gateOrder: gates.length,
          assigneeName: newGateAssignee.trim() || undefined,
          assigneeRole: newGateRole.trim() || undefined,
          deadlineAt: newGateDeadline || undefined,
        })

        // Refresh gates (server action revalidates path)
        setNewGateName('')
        setNewGateAssignee('')
        setNewGateRole('')
        setNewGateDeadline('')

        // Optimistic: add to local list
        setGates((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            gate_name: newGateName.trim(),
            gate_order: prev.length,
            assignee_name: newGateAssignee.trim() || null,
            assignee_email: null,
            assignee_role: newGateRole.trim() || null,
            status: 'pending',
            deadline_at: newGateDeadline || null,
            completed_at: null,
            notes: null,
            rejection_reason: null,
          },
        ])
      } catch (err) {
        setStatusMsg(err instanceof Error ? err.message : 'Failed to add gate')
      }
    })
  }

  function setGateStatus(gateId: string, status: string) {
    startTransition(async () => {
      try {
        await updateApprovalGateStatus({ gateId, status: status as any })
        setGates((prev) =>
          prev.map((g) =>
            g.id === gateId
              ? {
                  ...g,
                  status,
                  completed_at: ['approved', 'rejected', 'skipped'].includes(status)
                    ? new Date().toISOString()
                    : null,
                }
              : g
          )
        )
      } catch (err) {
        setStatusMsg(err instanceof Error ? err.message : 'Status update failed')
      }
    })
  }

  function removeGate(gateId: string) {
    startTransition(async () => {
      try {
        await deleteApprovalGate({ gateId })
        setGates((prev) => prev.filter((g) => g.id !== gateId))
      } catch (err) {
        setStatusMsg(err instanceof Error ? err.message : 'Delete failed')
      }
    })
  }

  function addContact() {
    setContacts((prev) => [
      ...prev,
      { name: '', role: '', email: '', phone: '', isDecisionMaker: false },
    ])
  }

  function updateContact(index: number, patch: Partial<CorporateContact>) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index))
  }

  function addRequiredDoc() {
    setRequiredDocs((prev) => [
      ...prev,
      { type: 'other', label: '', required: true, status: 'missing' },
    ])
  }

  function updateDoc(index: number, patch: Partial<CorporateRequiredDoc>) {
    setRequiredDocs((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function removeDoc(index: number) {
    setRequiredDocs((prev) => prev.filter((_, i) => i !== index))
  }

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const approvedCount = gates.filter((g) => g.status === 'approved').length
  const totalGates = gates.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-100">
          <span className="text-brand-300">
            <Briefcase className="h-4 w-4" />
          </span>
          Corporate Procurement
        </div>
        {totalGates > 0 && (
          <span className="text-xs text-stone-400">
            {approvedCount}/{totalGates} gates approved
          </span>
        )}
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-stone-500">Company</label>
          <input
            className={fieldClass}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-500">Department</label>
          <input
            className={fieldClass}
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
            placeholder="Events & Hospitality"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-500">PO Number</label>
          <input
            className={fieldClass}
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="PO-2026-0042"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-500">Cost Center</label>
          <input
            className={fieldClass}
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            placeholder="CC-440"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-500">Payment Terms</label>
          <select
            className={fieldClass}
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="prepaid">Prepaid</option>
            <option value="on_receipt">On Receipt</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_60">Net 60</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-500">Budget Ceiling ($)</label>
          <input
            className={fieldClass}
            type="number"
            step="0.01"
            min="0"
            value={budgetCeiling}
            onChange={(e) => setBudgetCeiling(e.target.value)}
            placeholder="5000.00"
          />
        </div>
      </div>

      <Button variant="secondary" onClick={saveCorporateConfig} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Company Info'}
      </Button>

      {statusMsg && (
        <p className={`text-xs ${statusMsg === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}>
          {statusMsg}
        </p>
      )}

      {/* Approval Gates */}
      <div className="rounded-lg border border-stone-800 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-100">
          <span className="text-brand-300">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          Approval Gates
        </div>

        {gates.length === 0 && (
          <p className="mt-3 text-sm text-stone-400">
            No approval gates defined. Add gates to track sign-offs from procurement, legal, budget
            holders.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {gates.map((gate) => (
            <div
              key={gate.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-stone-950 px-3 py-2"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-200">{gate.gate_name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${statusColors[gate.status] ?? statusColors.pending}`}
                  >
                    {gate.status.replace('_', ' ')}
                  </span>
                  {gate.deadline_at && isOverdue(gate.deadline_at) && gate.status === 'pending' && (
                    <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-300">
                      overdue
                    </span>
                  )}
                </div>
                <div className="mt-1 flex gap-3 text-xs text-stone-500">
                  {gate.assignee_name && <span>{gate.assignee_name}</span>}
                  {gate.assignee_role && <span>({gate.assignee_role})</span>}
                  {gate.deadline_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(gate.deadline_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {gate.rejection_reason && (
                  <p className="mt-1 text-xs text-red-400">Rejected: {gate.rejection_reason}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {gate.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setGateStatus(gate.id, 'approved')}
                    className="rounded p-1 text-emerald-400 hover:bg-emerald-900/30"
                    title="Approve"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
                {gate.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setGateStatus(gate.id, 'rejected')}
                    className="rounded p-1 text-red-400 hover:bg-red-900/30"
                    title="Reject"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeGate(gate.id)}
                  className="rounded p-1 text-stone-600 hover:bg-stone-800 hover:text-stone-400"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Gate Form */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <input
            className={fieldClass}
            value={newGateName}
            onChange={(e) => setNewGateName(e.target.value)}
            placeholder="Gate name (e.g. Budget Approval)"
          />
          <input
            className={fieldClass}
            value={newGateAssignee}
            onChange={(e) => setNewGateAssignee(e.target.value)}
            placeholder="Assignee name"
          />
          <input
            className={fieldClass}
            value={newGateRole}
            onChange={(e) => setNewGateRole(e.target.value)}
            placeholder="Role (e.g. Procurement)"
          />
          <div className="flex gap-2">
            <input
              className={fieldClass}
              type="date"
              value={newGateDeadline}
              onChange={(e) => setNewGateDeadline(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={addGate}
              disabled={isPending || !newGateName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stakeholder Contacts */}
      <div className="rounded-lg border border-stone-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-100">
            <span className="text-brand-300">
              <Briefcase className="h-4 w-4" />
            </span>
            Stakeholder Contacts
          </div>
          <button
            type="button"
            onClick={addContact}
            className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>

        {contacts.length === 0 && (
          <p className="mt-3 text-sm text-stone-400">
            Track key contacts: event planner, procurement manager, budget approver.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {contacts.map((contact, i) => (
            <div key={i} className="grid grid-cols-5 gap-2">
              <input
                className={fieldClass}
                value={contact.name}
                onChange={(e) => updateContact(i, { name: e.target.value })}
                placeholder="Name"
              />
              <input
                className={fieldClass}
                value={contact.role}
                onChange={(e) => updateContact(i, { role: e.target.value })}
                placeholder="Role"
              />
              <input
                className={fieldClass}
                value={contact.email ?? ''}
                onChange={(e) => updateContact(i, { email: e.target.value })}
                placeholder="Email"
              />
              <input
                className={fieldClass}
                value={contact.phone ?? ''}
                onChange={(e) => updateContact(i, { phone: e.target.value })}
                placeholder="Phone"
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-stone-400">
                  <input
                    type="checkbox"
                    checked={contact.isDecisionMaker}
                    onChange={(e) => updateContact(i, { isDecisionMaker: e.target.checked })}
                  />
                  DM
                </label>
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="text-stone-600 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Required Documents */}
      <div className="rounded-lg border border-stone-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-100">
            <span className="text-brand-300">
              <FileText className="h-4 w-4" />
            </span>
            Compliance Documents
          </div>
          <button
            type="button"
            onClick={addRequiredDoc}
            className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>

        {requiredDocs.length === 0 && (
          <p className="mt-3 text-sm text-stone-400">
            Track compliance requirements: insurance, W-9, food handler certificates.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {requiredDocs.map((doc, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className={`${fieldClass} w-36`}
                value={doc.type}
                onChange={(e) => updateDoc(i, { type: e.target.value as any })}
              >
                <option value="insurance">Insurance</option>
                <option value="w9">W-9</option>
                <option value="food_handler">Food Handler</option>
                <option value="business_license">Business License</option>
                <option value="other">Other</option>
              </select>
              <input
                className={`${fieldClass} flex-1`}
                value={doc.label}
                onChange={(e) => updateDoc(i, { label: e.target.value })}
                placeholder="Document label"
              />
              <select
                className={`${fieldClass} w-28`}
                value={doc.status}
                onChange={(e) => updateDoc(i, { status: e.target.value as CorporateDocStatus })}
              >
                <option value="missing">Missing</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="expired">Expired</option>
              </select>
              <span className={`rounded-full px-2 py-0.5 text-xs ${docStatusColors[doc.status]}`}>
                {doc.status}
              </span>
              <button
                type="button"
                onClick={() => removeDoc(i)}
                className="text-stone-600 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

### FILE 5: `components/events/dinner-circle-command-center.tsx` (EDIT - wire in panel)

**Step A:** Add import at the top of the file (after existing imports, around line 28):

```typescript
import { CorporateProcurementPanel } from '@/components/events/corporate-procurement-panel'
```

**Step B:** Add `gates` prop to the Props type (line 33):

Change:

```typescript
type Props = {
  snapshot: DinnerCircleSnapshot
  collaborators: any[]
  ticketHolders: any[]
}
```

To:

```typescript
type Props = {
  snapshot: DinnerCircleSnapshot
  collaborators: any[]
  ticketHolders: any[]
  approvalGates?: any[]
}
```

**Step C:** Destructure `approvalGates` in the component function (line 128):

Change:

```typescript
export function DinnerCircleCommandCenter({ snapshot, collaborators, ticketHolders }: Props) {
```

To:

```typescript
export function DinnerCircleCommandCenter({ snapshot, collaborators, ticketHolders, approvalGates }: Props) {
```

**Step D:** Add the corporate procurement section INSIDE the `</section>` that contains the "Attendee Capture" panel, right before the closing `</div>` of the main container (around line 746, BEFORE `</div></Card>`):

```tsx
{
  /* Corporate Procurement (conditional) */
}
{
  ;(config.corporate?.enabled || (approvalGates ?? []).length > 0) && (
    <section className="rounded-lg border border-stone-800 p-4">
      <CorporateProcurementPanel
        eventId={snapshot.eventId}
        config={config}
        gates={approvalGates ?? []}
      />
    </section>
  )
}
```

**If `config.corporate` is undefined and there are no gates, this section does not render at all.** Zero visual change for non-corporate events.

---

## Wiring: Event Detail Page

The event detail page (`app/(chef)/events/[id]/page.tsx`) already fetches `getDinnerCircleConfig` (line 904) and passes the snapshot to `DinnerCircleCommandCenter` (line 1162-1166).

**Three edits to `app/(chef)/events/[id]/page.tsx`:**

**Edit 1:** Add import near the top (after the existing dinner-circle imports around line 166):

```typescript
import { getApprovalGates } from '@/lib/dinner-circles/corporate-actions'
```

**Edit 2:** Add data fetch. Find where `getDinnerCircleConfig(params.id)` is called (around line 904). After that call resolves, add:

```typescript
const approvalGates = await getApprovalGates(params.id).catch(() => [])
```

**Edit 3:** Pass gates to the command center. The existing render (lines 1162-1166) is:

```tsx
<DinnerCircleCommandCenter
  snapshot={dinnerCircleSnapshot}
  collaborators={eventCollaborators as any[]}
  ticketHolders={ticketList as any[]}
/>
```

Change to:

```tsx
<DinnerCircleCommandCenter
  snapshot={dinnerCircleSnapshot}
  collaborators={eventCollaborators as any[]}
  ticketHolders={ticketList as any[]}
  approvalGates={approvalGates}
/>
```

This is a 3-line change to an existing page. All other lines remain untouched.

---

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` exits 0
2. `npx next build --no-lint` exits 0
3. Navigate to any event detail page. The Corporate Procurement section should NOT appear (no config set).
4. Manually set `corporate: { enabled: true }` via the UI or by calling `updateDinnerCircleConfig`. The section should appear.
5. Add an approval gate. Verify it persists across page refresh.
6. Approve/reject a gate. Verify status updates.
7. Save company info fields. Verify persistence.

---

## What This Enables (Elena Petrova Outcomes)

| Elena's Problem                                     | How This Solves It                                           |
| --------------------------------------------------- | ------------------------------------------------------------ |
| "No visibility into where things are stuck"         | Approval gates with status + deadline + overdue flags        |
| "No procurement-aware workflow"                     | PO number, payment terms, cost center, budget ceiling fields |
| "Different stakeholders respond at different times" | Stakeholder contacts directory with roles                    |
| "No documentation system per event"                 | Compliance doc checklist with status tracking                |
| "No approval state visibility"                      | Gates show approved/pending/rejected per step                |
| "Timelines are unpredictable"                       | Deadline tracking with overdue highlighting                  |

### What's Left for Future Iterations

- Client-facing gate status in circle hub view
- Email notifications when gates are overdue
- Escalation cron (auto-notify when deadline passes)
- Multi-approver (gate requires N approvals, not just chef marking it)
- Budget ceiling vs. quote amount inline comparison
- Compliance document file upload (currently just status tracking)
