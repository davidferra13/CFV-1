import 'server-only'

const PROJECT_COMMAND_URL =
  process.env.PROJECT_COMMAND_URL?.replace(/\/$/, '') || 'http://127.0.0.1:63912'
const CHEF_FLOW_PROJECT_ID = 'chef-flow'
const REQUEST_TIMEOUT_MS = 8_000

export type ProjectIntentInput = {
  objective: string
  why?: string
  constraints?: string[]
  definitionOfDone?: string[]
  conversationId?: string
  source?: string
  run?: boolean
}

export type ProjectBrainIntent = {
  id: string
  projectId: string
  objective: string
  status: 'queued' | 'working' | 'blocked-retry' | 'completed'
  source: string
  createdAt: string
  updatedAt: string
}
async function projectCommandFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${PROJECT_COMMAND_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Project Command ${response.status}: ${detail || response.statusText}`
    )
  }
  return (await response.json()) as T
}
export function getChefFlowProjectBrain() {
  return projectCommandFetch(
    `/api/project-brain/${encodeURIComponent(CHEF_FLOW_PROJECT_ID)}`
  )
}

export function submitChefFlowProjectIntent(input: ProjectIntentInput) {
  const objective = input.objective.trim()
  if (!objective) throw new Error('Project intent objective is required')

  return projectCommandFetch<{
    created: boolean
    intent: ProjectBrainIntent
    run: { accepted: boolean; reason?: string; projectId?: string }
  }>(
    `/api/project-brain/${encodeURIComponent(CHEF_FLOW_PROJECT_ID)}/intents`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        objective,
        source: input.source || 'chefflow-remy',
      }),
    }
  )
}

export function runChefFlowProjectBrain() {
  return projectCommandFetch(
    `/api/project-brain/${encodeURIComponent(CHEF_FLOW_PROJECT_ID)}/run`,
    { method: 'POST', body: '{}' }
  )
}
