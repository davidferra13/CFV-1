'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  WorkflowType,
  WorkflowStep,
  SignatureWorkflow,
  WorkflowExecution,
  WorkflowSummary,
} from './signature-workflow-types'

const WORKFLOWS_TABLE = 'signature_workflows'
const EXECUTIONS_TABLE = 'workflow_executions'

const VALID_TYPES: WorkflowType[] = [
  'event_creation', 'menu_building', 'client_onboarding',
  'quote_approval', 'invoice_collection', 'prep_day', 'post_event',
]

function mapWorkflowRow(row: any): SignatureWorkflow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type as WorkflowType,
    name: row.name,
    steps: (row.steps ?? []) as WorkflowStep[],
    active: row.active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapExecutionRow(row: any): WorkflowExecution {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workflowId: row.workflow_id,
    entityId: row.entity_id ?? null,
    currentStep: row.current_step ?? 0,
    completedSteps: (row.completed_steps ?? []) as string[],
    startedAt: row.started_at,
    completedAt: row.completed_at ?? null,
  }
}

/** List workflows, optionally filtered by type. */
export async function getSignatureWorkflows(
  type?: WorkflowType
): Promise<SignatureWorkflow[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(WORKFLOWS_TABLE)
    .select('*')
    .where('tenant_id', user.tenantId)

  if (type) {
    if (!VALID_TYPES.includes(type)) return []
    query = query.where('type', type)
  }

  const rows = await query.orderBy('created_at', 'asc')
  return rows.map(mapWorkflowRow)
}

/** Create or update a signature workflow (upsert by tenant + type). */
export async function upsertSignatureWorkflow(
  type: WorkflowType,
  name: string,
  steps: WorkflowStep[],
  active?: boolean
): Promise<SignatureWorkflow> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid workflow type: ${type}`)
  }
  if (!name.trim()) {
    throw new Error('Workflow name is required')
  }

  const existing = await db
    .from(WORKFLOWS_TABLE)
    .select('id')
    .where('tenant_id', user.tenantId)
    .where('type', type)
    .first()

  const now = new Date().toISOString()

  if (existing) {
    await db
      .from(WORKFLOWS_TABLE)
      .where('id', existing.id)
      .update({
        name: name.trim(),
        steps: JSON.stringify(steps),
        active: active ?? true,
        updated_at: now,
      })

    const updated = await db
      .from(WORKFLOWS_TABLE)
      .select('*')
      .where('id', existing.id)
      .first()
    return mapWorkflowRow(updated)
  }

  const [inserted] = await db
    .from(WORKFLOWS_TABLE)
    .insert({
      tenant_id: user.tenantId,
      type,
      name: name.trim(),
      steps: JSON.stringify(steps),
      active: active ?? true,
      created_at: now,
      updated_at: now,
    })
    .returning('*')

  return mapWorkflowRow(inserted)
}

/** Start a new workflow execution. */
export async function startWorkflowExecution(
  workflowId: string,
  entityId?: string
): Promise<WorkflowExecution> {
  const user = await requireChef()
  const db: any = createServerClient()

  const workflow = await db
    .from(WORKFLOWS_TABLE)
    .select('id')
    .where('id', workflowId)
    .where('tenant_id', user.tenantId)
    .first()

  if (!workflow) {
    throw new Error('Workflow not found')
  }

  const [row] = await db
    .from(EXECUTIONS_TABLE)
    .insert({
      tenant_id: user.tenantId,
      workflow_id: workflowId,
      entity_id: entityId ?? null,
      current_step: 0,
      completed_steps: JSON.stringify([]),
      started_at: new Date().toISOString(),
    })
    .returning('*')

  return mapExecutionRow(row)
}

/** Mark a step as completed and advance to the next. */
export async function advanceWorkflowStep(
  executionId: string,
  completedStep: string
): Promise<WorkflowExecution> {
  const user = await requireChef()
  const db: any = createServerClient()

  const exec = await db
    .from(EXECUTIONS_TABLE)
    .select('*')
    .where('id', executionId)
    .where('tenant_id', user.tenantId)
    .first()

  if (!exec) {
    throw new Error('Execution not found')
  }

  const completed = [...((exec.completed_steps ?? []) as string[])]
  if (!completed.includes(completedStep)) {
    completed.push(completedStep)
  }

  const nextStep = (exec.current_step ?? 0) + 1

  const workflow = await db
    .from(WORKFLOWS_TABLE)
    .select('steps')
    .where('id', exec.workflow_id)
    .first()

  const totalSteps = ((workflow?.steps ?? []) as WorkflowStep[]).length
  const isComplete = nextStep >= totalSteps

  await db
    .from(EXECUTIONS_TABLE)
    .where('id', executionId)
    .update({
      current_step: nextStep,
      completed_steps: JSON.stringify(completed),
      ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
    })

  const updated = await db
    .from(EXECUTIONS_TABLE)
    .select('*')
    .where('id', executionId)
    .first()

  return mapExecutionRow(updated)
}

/** Get a single execution by ID. */
export async function getWorkflowExecution(
  executionId: string
): Promise<WorkflowExecution | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const row = await db
    .from(EXECUTIONS_TABLE)
    .select('*')
    .where('id', executionId)
    .where('tenant_id', user.tenantId)
    .first()

  return row ? mapExecutionRow(row) : null
}

/** List executions, optionally scoped to a workflow. */
export async function getWorkflowExecutions(
  workflowId?: string,
  limit?: number
): Promise<WorkflowExecution[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(EXECUTIONS_TABLE)
    .select('*')
    .where('tenant_id', user.tenantId)

  if (workflowId) {
    query = query.where('workflow_id', workflowId)
  }

  query = query.orderBy('started_at', 'desc')

  if (limit && limit > 0) {
    query = query.limit(limit)
  }

  const rows = await query
  return rows.map(mapExecutionRow)
}

/** Aggregate stats across all workflows for the tenant. */
export async function getWorkflowSummary(): Promise<WorkflowSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const workflows = await db
    .from(WORKFLOWS_TABLE)
    .select('id, active')
    .where('tenant_id', user.tenantId)

  const totalWorkflows = workflows.length
  const active = workflows.filter((w: any) => w.active).length

  const executions = await db
    .from(EXECUTIONS_TABLE)
    .select('started_at, completed_at')
    .where('tenant_id', user.tenantId)

  const totalExecutions = executions.length
  const completedExecs = executions.filter((e: any) => e.completed_at)
  const completionRate = totalExecutions > 0
    ? completedExecs.length / totalExecutions
    : 0

  let avgCompletionTime = 0
  if (completedExecs.length > 0) {
    const totalMs = completedExecs.reduce((sum: number, e: any) => {
      const start = new Date(e.started_at).getTime()
      const end = new Date(e.completed_at).getTime()
      return sum + (end - start)
    }, 0)
    avgCompletionTime = Math.round(totalMs / completedExecs.length / 60000)
  }

  return { totalWorkflows, active, totalExecutions, avgCompletionTime, completionRate }
}
