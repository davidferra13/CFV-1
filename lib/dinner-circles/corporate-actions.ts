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
