'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  WizardConfig,
  WizardStep,
  IntakeFormConfig,
  FormFieldConfig,
  FormSubmission,
  FormWizardSummary,
} from './form-wizard-types'

// ---------------------------------------------------------------------------
// Wizard Config
// ---------------------------------------------------------------------------

export async function getWizardConfig(
  wizardId: string
): Promise<WizardConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('wizard_configs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('wizard_id', wizardId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? mapRowToWizard(data) : null
}

export async function upsertWizardConfig(
  wizardId: string,
  name: string,
  steps: WizardStep[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('wizard_configs')
    .upsert(
      {
        tenant_id: user.tenantId!,
        wizard_id: wizardId,
        name,
        steps,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,wizard_id' }
    )

  if (error) throw error
}

export async function updateWizardProgress(
  wizardId: string,
  currentStep: number,
  completedSteps: string[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('wizard_configs')
    .update({
      current_step: currentStep,
      completed_steps: completedSteps,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', user.tenantId!)
    .eq('wizard_id', wizardId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Intake Form Config
// ---------------------------------------------------------------------------

export async function getIntakeFormConfig(
  formId: string
): Promise<IntakeFormConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('intake_form_configs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('id', formId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? mapRowToIntakeForm(data) : null
}

export async function upsertIntakeForm(
  name: string,
  fields: FormFieldConfig[],
  successMessage?: string,
  redirectUrl?: string,
  active?: boolean
): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('intake_form_configs')
    .upsert(
      {
        tenant_id: user.tenantId!,
        name,
        fields,
        success_message: successMessage ?? null,
        redirect_url: redirectUrl ?? null,
        active: active ?? true,
      },
      { onConflict: 'tenant_id,name' }
    )
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

// ---------------------------------------------------------------------------
// Form Submissions
// ---------------------------------------------------------------------------

export async function submitIntakeForm(
  formId: string,
  formData: Record<string, unknown>
): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('form_submissions')
    .insert({
      tenant_id: user.tenantId!,
      form_id: formId,
      data: formData,
      submitted_by: user.userId,
      status: 'new',
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function getFormSubmissions(
  formId?: string,
  status?: string,
  limit?: number
): Promise<FormSubmission[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('form_submissions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('submitted_at', { ascending: false })
    .limit(limit ?? 50)

  if (formId) {
    query = query.eq('form_id', formId)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []).map(mapRowToSubmission)
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export async function getFormWizardSummary(): Promise<FormWizardSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [wizards, forms, submissions] = await Promise.all([
    db
      .from('wizard_configs')
      .select('id, completed_steps, steps')
      .eq('tenant_id', user.tenantId!),
    db
      .from('intake_form_configs')
      .select('id')
      .eq('tenant_id', user.tenantId!),
    db
      .from('form_submissions')
      .select('id')
      .eq('tenant_id', user.tenantId!),
  ])

  if (wizards.error) throw wizards.error
  if (forms.error) throw forms.error
  if (submissions.error) throw submissions.error

  const wizardRows = (wizards.data ?? []) as Array<{
    completed_steps: string[]
    steps: WizardStep[]
  }>
  const totalSteps = wizardRows.reduce(
    (sum, w) => sum + (Array.isArray(w.steps) ? w.steps.length : 0),
    0
  )
  const totalCompleted = wizardRows.reduce(
    (sum, w) =>
      sum + (Array.isArray(w.completed_steps) ? w.completed_steps.length : 0),
    0
  )

  return {
    totalWizards: wizardRows.length,
    totalForms: (forms.data ?? []).length,
    totalSubmissions: (submissions.data ?? []).length,
    completionRate: totalSteps > 0 ? totalCompleted / totalSteps : 0,
    avgStepsCompleted:
      wizardRows.length > 0 ? totalCompleted / wizardRows.length : 0,
  }
}

// ---------------------------------------------------------------------------
// Internal mappers
// ---------------------------------------------------------------------------

function mapRowToWizard(row: any): WizardConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    wizardId: row.wizard_id,
    name: row.name,
    steps: (row.steps ?? []) as WizardStep[],
    currentStep: row.current_step ?? 0,
    completedSteps: (row.completed_steps ?? []) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRowToIntakeForm(row: any): IntakeFormConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    fields: (row.fields ?? []) as FormFieldConfig[],
    successMessage: row.success_message ?? undefined,
    redirectUrl: row.redirect_url ?? undefined,
    active: row.active ?? true,
    createdAt: row.created_at,
  }
}

function mapRowToSubmission(row: any): FormSubmission {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    formId: row.form_id,
    data: (row.data ?? {}) as Record<string, unknown>,
    submittedBy: row.submitted_by ?? undefined,
    submittedAt: row.submitted_at,
    status: row.status,
  }
}
