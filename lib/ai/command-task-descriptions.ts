// Command Center — Task Descriptions
// No 'use server' — imported by both intent parser (for system prompt) and UI (for labels)

export interface TaskDescription {
  type: string
  tier: 1 | 2 | 3
  name: string
  description: string
  /** Shown in system prompt so Ollama knows what inputs each task expects */
  inputSchema: string
  /** Extra enforcement note for the system prompt */
  tierNote?: string
}

export const TASK_DESCRIPTIONS: TaskDescription[] = [
  {
    type: 'client.search',
    tier: 1,
    name: 'Find Client',
    description: 'Search for clients by name or partial name. Returns matching clients.',
    inputSchema: '{ "query": "string — client name or partial name to search for" }',
  },
  {
    type: 'calendar.availability',
    tier: 1,
    name: 'Check Availability',
    description: 'Check if a specific date is free (no confirmed events booked).',
    inputSchema: '{ "date": "string — YYYY-MM-DD format, e.g. 2026-03-15" }',
  },
  {
    type: 'event.list_upcoming',
    tier: 1,
    name: 'List Upcoming Events',
    description: "Show the chef's next upcoming events with status and client names.",
    inputSchema: '{ "limit": "number — optional, max events to return, defaults to 5" }',
  },
  {
    type: 'finance.summary',
    tier: 1,
    name: 'Revenue Summary',
    description: 'Get a summary of revenue, event count, and business performance.',
    inputSchema: '{}',
  },
  {
    type: 'email.followup',
    tier: 2,
    name: 'Draft Follow-Up Email',
    description:
      'Generate a personalized follow-up email draft to a specific client. Draft only — never sent automatically.',
    inputSchema: '{ "clientName": "string — client full name or first name" }',
    tierNote: 'ALWAYS tier 2, even if the chef says "send" — never auto-send emails.',
  },
  {
    type: 'event.create_draft',
    tier: 2,
    name: 'Create Event Draft',
    description:
      'Parse a natural language event description into a structured event draft for chef review.',
    inputSchema:
      '{ "description": "string — full event description including date, guests, occasion, location, client name" }',
    tierNote: 'ALWAYS tier 2 — chef must review and confirm before saving.',
  },
]

export function buildTaskListForPrompt(): string {
  return TASK_DESCRIPTIONS.map(
    (t) =>
      `- ${t.type} (Tier ${t.tier}, "${t.name}"): ${t.description}\n  Inputs: ${t.inputSchema}${t.tierNote ? `\n  IMPORTANT: ${t.tierNote}` : ''}`
  ).join('\n\n')
}

export function getTaskName(taskType: string): string {
  return TASK_DESCRIPTIONS.find((t) => t.type === taskType)?.name ?? taskType
}
