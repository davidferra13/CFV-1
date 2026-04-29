export type AiAccessDomain =
  | 'calendar'
  | 'clients'
  | 'documents'
  | 'events'
  | 'finance'
  | 'goals'
  | 'inquiries'
  | 'menus'
  | 'messages'
  | 'pricing'
  | 'recipes'
  | 'staff'
  | 'tasks'
  | 'vendors'
  | 'web'

export type AiPrivacyControl = 'allow_document_drafts' | 'allow_memory' | 'allow_suggestions'

export type AiToolPermission = {
  taskType: string
  reads: AiAccessDomain[]
  writes: AiAccessDomain[]
  requiresPrivateModel: boolean
  requiresApproval: boolean
  auditLabel: string
  controlledBy: AiPrivacyControl[]
}

export function getAiToolPermission(taskType: string): AiToolPermission {
  const normalizedTaskType = normalizeTaskType(taskType)
  const exact = AI_TOOL_PERMISSION_MANIFEST[normalizedTaskType]
  if (exact) return exact

  const inferred = inferAiToolPermission(normalizedTaskType)
  return inferred ?? createPermission(normalizedTaskType, 'Remy task', [], [], false, false)
}

export function hasAiToolPermission(taskType: string): boolean {
  const normalizedTaskType = normalizeTaskType(taskType)
  return Boolean(AI_TOOL_PERMISSION_MANIFEST[normalizedTaskType] || inferAiToolPermission(normalizedTaskType))
}

export function isAiToolControlledBy(taskType: string, control: AiPrivacyControl): boolean {
  return getAiToolPermission(taskType).controlledBy.includes(control)
}

export function getAiToolPermissionManifest(): AiToolPermission[] {
  return Object.values(AI_TOOL_PERMISSION_MANIFEST)
}

function inferAiToolPermission(taskType: string): AiToolPermission | null {
  if (taskType.startsWith('draft.')) {
    return createPermission(
      taskType,
      'Draft content',
      ['clients', 'events', 'messages'],
      ['messages'],
      true,
      true,
      ['allow_document_drafts']
    )
  }

  if (taskType.startsWith('email.')) {
    const writes: AiAccessDomain[] =
      taskType.includes('draft') || taskType === 'email.generic' ? ['messages'] : []
    return createPermission(
      taskType,
      'Email assistant',
      ['messages', 'clients'],
      writes,
      true,
      writes.length > 0,
      writes.length > 0 ? ['allow_document_drafts'] : []
    )
  }

  if (taskType.startsWith('client.')) {
    return createPermission(taskType, 'Client data', ['clients'], [], true, false)
  }

  if (taskType.startsWith('event.')) {
    const writes: AiAccessDomain[] = taskType.includes('create') ? ['events'] : []
    return createPermission(taskType, 'Event data', ['events', 'clients'], writes, true, true)
  }

  if (taskType.startsWith('recipe.')) {
    return createPermission(taskType, 'Recipe book search', ['recipes'], [], true, false)
  }

  if (taskType.startsWith('menu.')) {
    return createPermission(taskType, 'Menu data', ['menus', 'recipes'], [], true, false)
  }

  if (
    taskType.startsWith('finance.') ||
    taskType.startsWith('analytics.') ||
    taskType.startsWith('quote.') ||
    taskType.startsWith('price.')
  ) {
    return createPermission(
      taskType,
      'Pricing and finance data',
      ['finance', 'pricing', 'events', 'clients'],
      [],
      true,
      false
    )
  }

  if (taskType.startsWith('vendor.')) {
    return createPermission(taskType, 'Vendor data', ['vendors', 'pricing'], [], true, false)
  }

  if (taskType.startsWith('staff.')) {
    return createPermission(taskType, 'Staff data', ['staff', 'events'], [], true, false)
  }

  if (taskType.startsWith('document.')) {
    const writes: AiAccessDomain[] = taskType.includes('create') ? ['documents'] : []
    return createPermission(
      taskType,
      'Document data',
      ['documents'],
      writes,
      true,
      writes.length > 0,
      writes.length > 0 ? ['allow_document_drafts'] : []
    )
  }

  if (taskType.startsWith('agent.')) {
    return inferAgentToolPermission(taskType)
  }

  return null
}

function normalizeTaskType(taskType: string): string {
  return taskType.trim().toLowerCase()
}

function inferAgentToolPermission(taskType: string): AiToolPermission {
  if (taskType.includes('draft')) {
    return createPermission(
      taskType,
      'Agent draft',
      ['clients', 'events', 'messages'],
      ['messages'],
      true,
      true,
      ['allow_document_drafts']
    )
  }

  if (taskType.includes('client') || taskType.includes('intake')) {
    return createPermission(taskType, 'Agent client action', ['clients'], ['clients'], true, true)
  }

  if (taskType.includes('event')) {
    return createPermission(
      taskType,
      'Agent event action',
      ['events', 'clients'],
      ['events'],
      true,
      true
    )
  }

  if (taskType.includes('menu') || taskType.includes('dish')) {
    return createPermission(
      taskType,
      'Agent menu action',
      ['menus', 'recipes'],
      ['menus'],
      true,
      true
    )
  }

  if (taskType.includes('quote') || taskType.includes('expense') || taskType.includes('budget')) {
    return createPermission(
      taskType,
      'Agent financial action',
      ['finance', 'pricing'],
      ['finance'],
      true,
      true
    )
  }

  if (taskType.includes('staff')) {
    return createPermission(taskType, 'Agent staff action', ['staff'], ['staff'], true, true)
  }

  if (taskType.includes('doc')) {
    return createPermission(
      taskType,
      'Agent document action',
      ['documents'],
      ['documents'],
      true,
      true,
      ['allow_document_drafts']
    )
  }

  if (taskType.includes('todo') || taskType.includes('goal') || taskType.includes('followup')) {
    return createPermission(taskType, 'Agent workflow action', ['tasks'], ['tasks'], true, true)
  }

  return createPermission(taskType, 'Agent action', [], [], true, true)
}

function createPermission(
  taskType: string,
  auditLabel: string,
  reads: AiAccessDomain[],
  writes: AiAccessDomain[],
  requiresPrivateModel: boolean,
  requiresApproval: boolean,
  controlledBy: AiPrivacyControl[] = []
): AiToolPermission {
  return {
    taskType,
    reads,
    writes,
    requiresPrivateModel,
    requiresApproval,
    auditLabel,
    controlledBy,
  }
}

const AI_TOOL_PERMISSION_MANIFEST: Record<string, AiToolPermission> = {
  'client.search': createPermission('client.search', 'Find client', ['clients'], [], true, false),
  'client.details': createPermission(
    'client.details',
    'Client details',
    ['clients', 'events'],
    [],
    true,
    false
  ),
  'event.list_upcoming': createPermission(
    'event.list_upcoming',
    'Upcoming events',
    ['events', 'clients'],
    [],
    true,
    false
  ),
  'event.create_draft': createPermission(
    'event.create_draft',
    'Event draft',
    ['clients', 'events'],
    ['events'],
    true,
    true
  ),
  'recipe.search': createPermission(
    'recipe.search',
    'Recipe book search',
    ['recipes'],
    [],
    true,
    false
  ),
  'email.followup': createPermission(
    'email.followup',
    'Follow-up email draft',
    ['clients', 'messages'],
    ['messages'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'email.generic': createPermission(
    'email.generic',
    'Email draft',
    ['clients', 'messages'],
    ['messages'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'email.draft_reply': createPermission(
    'email.draft_reply',
    'Email reply draft',
    ['messages', 'clients'],
    ['messages'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'draft.menu_proposal': createPermission(
    'draft.menu_proposal',
    'Menu proposal draft',
    ['clients', 'events', 'menus', 'recipes', 'pricing'],
    ['documents'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'contract.generate': createPermission(
    'contract.generate',
    'Contract draft',
    ['clients', 'events', 'pricing'],
    ['documents'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'document.create_folder': createPermission(
    'document.create_folder',
    'Document folder',
    ['documents'],
    ['documents'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'agent.draft_email': createPermission(
    'agent.draft_email',
    'Agent email draft',
    ['clients', 'messages'],
    ['messages'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'agent.create_doc_folder': createPermission(
    'agent.create_doc_folder',
    'Agent document folder',
    ['documents'],
    ['documents'],
    true,
    true,
    ['allow_document_drafts']
  ),
  'web.search': createPermission('web.search', 'Web search', ['web'], [], false, false),
}
