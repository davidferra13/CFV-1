'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type TriggerType =
  | 'post_inquiry'
  | 'post_event'
  | 'post_quote'
  | 'anniversary'
  | 'dormant_30d'
  | 'dormant_60d'
  | 'manual'

export interface SequenceInput {
  name: string
  trigger_type: TriggerType
  is_active?: boolean
}

export interface StepInput {
  step_number: number
  delay_days: number
  subject_template: string
  body_template: string
}

// Template variables available for substitution
const TEMPLATE_VARS: Record<string, string> = {
  '{{client_name}}': 'Client Name',
  '{{client_email}}': 'client@example.com',
  '{{chef_name}}': 'Chef Name',
  '{{event_date}}': '2026-04-15',
  '{{event_type}}': 'Dinner Party',
  '{{inquiry_date}}': '2026-04-01',
  '{{guest_count}}': '12',
}

function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value)
  }
  return result
}

const REVALIDATE_PATH = '/email/sequences'

// ============================================
// SEQUENCE CRUD
// ============================================

export async function getSequences() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('email_sequences')
    .select(
      `
      *,
      email_sequence_steps(count),
      email_sequence_enrollments(count)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getSequences] Error:', error)
    throw new Error('Failed to load sequences')
  }

  return data ?? []
}

export async function getSequence(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('email_sequences')
    .select(
      `
      *,
      email_sequence_steps(*)
    `
    )
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getSequence] Error:', error)
    throw new Error('Failed to load sequence')
  }

  // Sort steps by step_number
  if (data?.email_sequence_steps) {
    data.email_sequence_steps.sort((a: any, b: any) => a.step_number - b.step_number)
  }

  return data
}

export async function createSequence(input: SequenceInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('email_sequences')
    .insert({
      chef_id: user.tenantId!,
      name: input.name,
      trigger_type: input.trigger_type,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('[createSequence] Error:', error)
    throw new Error('Failed to create sequence')
  }

  revalidatePath(REVALIDATE_PATH)
  return data
}

export async function updateSequence(id: string, input: Partial<SequenceInput>) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('email_sequences')
    .update(input)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateSequence] Error:', error)
    throw new Error('Failed to update sequence')
  }

  revalidatePath(REVALIDATE_PATH)
  return data
}

export async function deleteSequence(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await (supabase as any)
    .from('email_sequences')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteSequence] Error:', error)
    throw new Error('Failed to delete sequence')
  }

  revalidatePath(REVALIDATE_PATH)
}

// ============================================
// STEP CRUD
// ============================================

export async function addStep(sequenceId: string, input: StepInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership
  const { data: seq } = await (supabase as any)
    .from('email_sequences')
    .select('id')
    .eq('id', sequenceId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!seq) throw new Error('Sequence not found')

  const { data, error } = await (supabase as any)
    .from('email_sequence_steps')
    .insert({
      sequence_id: sequenceId,
      step_number: input.step_number,
      delay_days: input.delay_days,
      subject_template: input.subject_template,
      body_template: input.body_template,
    })
    .select()
    .single()

  if (error) {
    console.error('[addStep] Error:', error)
    throw new Error('Failed to add step')
  }

  revalidatePath(REVALIDATE_PATH)
  return data
}

export async function updateStep(stepId: string, input: Partial<Omit<StepInput, 'step_number'>>) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership via join
  const { data: step } = await (supabase as any)
    .from('email_sequence_steps')
    .select('id, sequence_id, email_sequences!inner(chef_id)')
    .eq('id', stepId)
    .single()

  if (!step || (step as any).email_sequences?.chef_id !== user.tenantId!) {
    throw new Error('Step not found')
  }

  const { data, error } = await (supabase as any)
    .from('email_sequence_steps')
    .update(input)
    .eq('id', stepId)
    .select()
    .single()

  if (error) {
    console.error('[updateStep] Error:', error)
    throw new Error('Failed to update step')
  }

  revalidatePath(REVALIDATE_PATH)
  return data
}

export async function removeStep(stepId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership
  const { data: step } = await (supabase as any)
    .from('email_sequence_steps')
    .select('id, sequence_id, email_sequences!inner(chef_id)')
    .eq('id', stepId)
    .single()

  if (!step || (step as any).email_sequences?.chef_id !== user.tenantId!) {
    throw new Error('Step not found')
  }

  const { error } = await (supabase as any).from('email_sequence_steps').delete().eq('id', stepId)

  if (error) {
    console.error('[removeStep] Error:', error)
    throw new Error('Failed to remove step')
  }

  revalidatePath(REVALIDATE_PATH)
}

export async function reorderSteps(sequenceId: string, stepIds: string[]) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership
  const { data: seq } = await (supabase as any)
    .from('email_sequences')
    .select('id')
    .eq('id', sequenceId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!seq) throw new Error('Sequence not found')

  // Update each step's step_number to match its index in the array
  const updates = stepIds.map((id, index) =>
    (supabase as any)
      .from('email_sequence_steps')
      .update({ step_number: index + 1 })
      .eq('id', id)
      .eq('sequence_id', sequenceId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r: any) => r.error)
  if (failed?.error) {
    console.error('[reorderSteps] Error:', failed.error)
    throw new Error('Failed to reorder steps')
  }

  revalidatePath(REVALIDATE_PATH)
}

// ============================================
// ENROLLMENT MANAGEMENT
// ============================================

export async function enrollClient(sequenceId: string, clientId: string, inquiryId?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify sequence ownership
  const { data: seq } = await (supabase as any)
    .from('email_sequences')
    .select('id')
    .eq('id', sequenceId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!seq) throw new Error('Sequence not found')

  // Get first step delay to calculate next_send_at
  const { data: firstStep } = await (supabase as any)
    .from('email_sequence_steps')
    .select('delay_days')
    .eq('sequence_id', sequenceId)
    .eq('step_number', 1)
    .single()

  const delayDays = firstStep?.delay_days ?? 0
  const nextSendAt = new Date()
  nextSendAt.setDate(nextSendAt.getDate() + delayDays)

  const { data, error } = await (supabase as any)
    .from('email_sequence_enrollments')
    .insert({
      chef_id: user.tenantId!,
      sequence_id: sequenceId,
      client_id: clientId,
      inquiry_id: inquiryId ?? null,
      current_step: 1,
      status: 'active',
      next_send_at: nextSendAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[enrollClient] Error:', error)
    throw new Error('Failed to enroll client')
  }

  revalidatePath(REVALIDATE_PATH)
  return data
}

export async function getEnrollments(sequenceId?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = (supabase as any)
    .from('email_sequence_enrollments')
    .select(
      `
      *,
      email_sequences(name, trigger_type),
      clients(full_name, email)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('enrolled_at', { ascending: false })

  if (sequenceId) {
    query = query.eq('sequence_id', sequenceId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getEnrollments] Error:', error)
    throw new Error('Failed to load enrollments')
  }

  return data ?? []
}

export async function pauseEnrollment(enrollmentId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('email_sequence_enrollments')
    .update({ status: 'paused', next_send_at: null })
    .eq('id', enrollmentId)
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .select()
    .single()

  if (error) {
    console.error('[pauseEnrollment] Error:', error)
    throw new Error('Failed to pause enrollment')
  }

  revalidatePath(REVALIDATE_PATH)
  return data
}

export async function cancelEnrollment(enrollmentId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('email_sequence_enrollments')
    .update({ status: 'cancelled', next_send_at: null })
    .eq('id', enrollmentId)
    .eq('chef_id', user.tenantId!)
    .in('status', ['active', 'paused'])
    .select()
    .single()

  if (error) {
    console.error('[cancelEnrollment] Error:', error)
    throw new Error('Failed to cancel enrollment')
  }

  revalidatePath(REVALIDATE_PATH)
  return data
}

// ============================================
// STATS & PREVIEW
// ============================================

export async function getSequenceStats(sequenceId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership
  const { data: seq } = await (supabase as any)
    .from('email_sequences')
    .select('id')
    .eq('id', sequenceId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!seq) throw new Error('Sequence not found')

  const { data: enrollments, error } = await (supabase as any)
    .from('email_sequence_enrollments')
    .select('status')
    .eq('sequence_id', sequenceId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[getSequenceStats] Error:', error)
    throw new Error('Failed to load stats')
  }

  const all = enrollments ?? []
  const enrolled = all.length
  const completed = all.filter((e: any) => e.status === 'completed').length
  const paused = all.filter((e: any) => e.status === 'paused').length
  const active = all.filter((e: any) => e.status === 'active').length
  const cancelled = all.filter((e: any) => e.status === 'cancelled').length
  const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0

  return { enrolled, active, completed, paused, cancelled, completionRate }
}

export async function previewStep(stepId: string, clientId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get step
  const { data: step } = await (supabase as any)
    .from('email_sequence_steps')
    .select('*, email_sequences!inner(chef_id)')
    .eq('id', stepId)
    .single()

  if (!step || (step as any).email_sequences?.chef_id !== user.tenantId!) {
    throw new Error('Step not found')
  }

  // Get client info
  const { data: client } = await (supabase as any)
    .from('clients')
    .select('full_name, email')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Get chef info
  const { data: chef } = await (supabase as any)
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const vars: Record<string, string> = {
    '{{client_name}}': client?.full_name ?? 'Client',
    '{{client_email}}': client?.email ?? '',
    '{{chef_name}}': chef?.business_name ?? 'Your Chef',
    '{{event_date}}': 'TBD',
    '{{event_type}}': 'Event',
    '{{inquiry_date}}': new Date().toLocaleDateString(),
    '{{guest_count}}': 'TBD',
  }

  return {
    subject: replaceTemplateVars(step.subject_template, vars),
    body: replaceTemplateVars(step.body_template, vars),
  }
}
