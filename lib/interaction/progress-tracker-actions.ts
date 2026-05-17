'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  EventProgress,
  ProgressStep,
  ProgressTemplate,
  ClientProgressView,
} from './progress-tracker-types'

// ---------------------------------------------------------------------------
// Default step definitions (8-step service lifecycle)
// ---------------------------------------------------------------------------

const DEFAULT_STEPS: Omit<ProgressStep, 'id' | 'status' | 'completedAt'>[] = [
  {
    key: 'inquiry',
    label: 'Inquiry Received',
    description: 'Initial inquiry from client',
    order: 0,
    icon: 'inbox',
  },
  {
    key: 'quote',
    label: 'Quote Sent',
    description: 'Price quote prepared and sent',
    order: 1,
    icon: 'file-text',
  },
  {
    key: 'menu',
    label: 'Menu Finalized',
    description: 'Menu selections confirmed',
    order: 2,
    icon: 'utensils',
  },
  {
    key: 'contract',
    label: 'Contract Signed',
    description: 'Service agreement executed',
    order: 3,
    icon: 'pen-tool',
  },
  {
    key: 'deposit',
    label: 'Deposit Collected',
    description: 'Initial payment received',
    order: 4,
    icon: 'credit-card',
  },
  {
    key: 'prep',
    label: 'Prep Underway',
    description: 'Shopping and mise en place',
    order: 5,
    icon: 'shopping-cart',
  },
  {
    key: 'service',
    label: 'Service Complete',
    description: 'Dinner executed successfully',
    order: 6,
    icon: 'check-circle',
  },
  {
    key: 'closeout',
    label: 'Closeout',
    description: 'Final billing and follow-up',
    order: 7,
    icon: 'archive',
  },
]

function buildDefaultSteps(): ProgressStep[] {
  return DEFAULT_STEPS.map((s, i) => ({
    ...s,
    id: `default-${s.key}`,
    status: i === 0 ? ('active' as const) : ('pending' as const),
    completedAt: null,
  }))
}

function computePercent(steps: ProgressStep[]): number {
  if (steps.length === 0) return 0
  const completed = steps.filter((s) => s.status === 'completed').length
  return Math.round((completed / steps.length) * 100)
}

function mapRow(row: any): EventProgress {
  const steps = Array.isArray(row.steps) ? row.steps : JSON.parse(row.steps ?? '[]')
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    steps,
    currentStepKey: row.current_step_key,
    overallPercent: row.overall_percent,
    clientVisible: row.client_visible,
    lastUpdatedAt: row.last_updated_at,
  }
}

// ---------------------------------------------------------------------------
// 1. getEventProgress
// ---------------------------------------------------------------------------

export async function getEventProgress(eventId: string): Promise<EventProgress | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_progress')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapRow(data)
}

// ---------------------------------------------------------------------------
// 2. initializeProgress
// ---------------------------------------------------------------------------

export async function initializeProgress(
  eventId: string,
  templateId?: string
): Promise<EventProgress> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check if progress already exists
  const { data: existing } = await db
    .from('event_progress')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    const full = await getEventProgress(eventId)
    return full!
  }

  let steps: ProgressStep[]

  if (templateId) {
    const { data: tmpl, error: tmplErr } = await db
      .from('progress_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()

    if (tmplErr) throw tmplErr
    if (!tmpl) throw new Error('Template not found')

    const tmplSteps = Array.isArray(tmpl.steps) ? tmpl.steps : JSON.parse(tmpl.steps ?? '[]')
    steps = tmplSteps.map((s: any, i: number) => ({
      id: `tmpl-${s.key}`,
      key: s.key,
      label: s.label,
      description: s.description,
      order: i,
      status: i === 0 ? 'active' : 'pending',
      completedAt: null,
      icon: s.icon,
    }))
  } else {
    steps = buildDefaultSteps()
  }

  const { data, error } = await db
    .from('event_progress')
    .insert({
      tenant_id: user.tenantId!,
      event_id: eventId,
      steps: JSON.stringify(steps),
      current_step_key: steps[0]?.key ?? 'inquiry',
      overall_percent: 0,
      client_visible: true,
    })
    .select('*')
    .single()

  if (error) throw error

  return mapRow(data)
}

// ---------------------------------------------------------------------------
// 3. advanceStep
// ---------------------------------------------------------------------------

export async function advanceStep(eventId: string, stepKey: string): Promise<EventProgress> {
  const user = await requireChef()
  const db: any = createServerClient()

  const progress = await getEventProgress(eventId)
  if (!progress) throw new Error('Progress not initialized for this event')

  const steps = [...progress.steps]
  const idx = steps.findIndex((s) => s.key === stepKey)
  if (idx === -1) throw new Error(`Step "${stepKey}" not found`)

  // Mark this step completed
  steps[idx] = {
    ...steps[idx],
    status: 'completed',
    completedAt: new Date().toISOString(),
  }

  // Find next pending/active step and make it active
  let nextKey = progress.currentStepKey
  const nextStep = steps.find((s, i) => i > idx && s.status === 'pending')
  if (nextStep) {
    nextStep.status = 'active'
    nextKey = nextStep.key
  } else {
    // All done; keep current as last completed
    nextKey = stepKey
  }

  const percent = computePercent(steps)

  const { data, error } = await db
    .from('event_progress')
    .update({
      steps: JSON.stringify(steps),
      current_step_key: nextKey,
      overall_percent: percent,
      last_updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .select('*')
    .single()

  if (error) throw error

  return mapRow(data)
}

// ---------------------------------------------------------------------------
// 4. skipStep
// ---------------------------------------------------------------------------

export async function skipStep(eventId: string, stepKey: string): Promise<EventProgress> {
  const user = await requireChef()
  const db: any = createServerClient()

  const progress = await getEventProgress(eventId)
  if (!progress) throw new Error('Progress not initialized for this event')

  const steps = [...progress.steps]
  const idx = steps.findIndex((s) => s.key === stepKey)
  if (idx === -1) throw new Error(`Step "${stepKey}" not found`)

  steps[idx] = {
    ...steps[idx],
    status: 'skipped',
    completedAt: null,
  }

  // If skipped step was active, advance to next pending
  let nextKey = progress.currentStepKey
  if (progress.currentStepKey === stepKey) {
    const nextStep = steps.find((s, i) => i > idx && s.status === 'pending')
    if (nextStep) {
      nextStep.status = 'active'
      nextKey = nextStep.key
    }
  }

  const percent = computePercent(steps)

  const { data, error } = await db
    .from('event_progress')
    .update({
      steps: JSON.stringify(steps),
      current_step_key: nextKey,
      overall_percent: percent,
      last_updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .select('*')
    .single()

  if (error) throw error

  return mapRow(data)
}

// ---------------------------------------------------------------------------
// 5. getProgressTemplates
// ---------------------------------------------------------------------------

export async function getProgressTemplates(): Promise<ProgressTemplate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('progress_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    steps: Array.isArray(row.steps) ? row.steps : JSON.parse(row.steps ?? '[]'),
    isDefault: row.is_default,
    createdAt: row.created_at,
  })) as ProgressTemplate[]
}

// ---------------------------------------------------------------------------
// 6. createProgressTemplate
// ---------------------------------------------------------------------------

export async function createProgressTemplate(
  name: string,
  steps: { key: string; label: string; description: string; icon: string }[]
): Promise<ProgressTemplate> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!name.trim()) throw new Error('Template name is required')
  if (steps.length === 0) throw new Error('At least one step is required')

  const { data, error } = await db
    .from('progress_templates')
    .insert({
      tenant_id: user.tenantId!,
      name: name.trim(),
      steps: JSON.stringify(steps),
      is_default: false,
    })
    .select('*')
    .single()

  if (error) throw error

  return {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    steps: Array.isArray(data.steps) ? data.steps : JSON.parse(data.steps ?? '[]'),
    isDefault: data.is_default,
    createdAt: data.created_at,
  }
}

// ---------------------------------------------------------------------------
// 7. getClientProgressView
// ---------------------------------------------------------------------------

export async function getClientProgressView(eventId: string): Promise<ClientProgressView | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch progress
  const { data: prog, error: progErr } = await db
    .from('event_progress')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .maybeSingle()

  if (progErr) throw progErr
  if (!prog || !prog.client_visible) return null

  // Fetch event title
  const { data: evt } = await db.from('events').select('title').eq('id', eventId).maybeSingle()

  const steps: ProgressStep[] = Array.isArray(prog.steps)
    ? prog.steps
    : JSON.parse(prog.steps ?? '[]')

  // Find next uncompleted milestone
  const nextStep = steps.find((s) => s.status === 'pending' || s.status === 'active')

  return {
    eventTitle: evt?.title ?? 'Upcoming Event',
    currentStep: prog.current_step_key,
    overallPercent: prog.overall_percent,
    steps: steps.map((s) => ({
      label: s.label,
      status: s.status,
      description: s.description,
    })),
    nextMilestone: nextStep?.label ?? null,
  }
}
