// Ask Remy — Task Descriptions
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

  // ─── Remy-expanded tasks ────────────────────────────────────────────────────

  {
    type: 'client.list_recent',
    tier: 1,
    name: 'Recent Clients',
    description: 'List the 5 most recently added clients with their names.',
    inputSchema: '{ "limit": "number — optional, defaults to 5" }',
  },
  {
    type: 'client.details',
    tier: 1,
    name: 'Client Details',
    description:
      'Look up a specific client by name and return their profile details and event history.',
    inputSchema: '{ "clientName": "string — client full name or first name to look up" }',
  },
  {
    type: 'event.details',
    tier: 1,
    name: 'Event Details',
    description:
      'Get full details for a specific event including client, date, status, and guest count.',
    inputSchema: '{ "eventName": "string — event occasion or description to search for" }',
  },
  {
    type: 'event.list_by_status',
    tier: 1,
    name: 'Events by Status',
    description:
      'List events filtered by a specific status (draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled).',
    inputSchema:
      '{ "status": "string — one of: draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled" }',
  },
  {
    type: 'inquiry.list_open',
    tier: 1,
    name: 'Open Inquiries',
    description:
      'List all active inquiries that need attention (new, awaiting_chef, awaiting_client statuses).',
    inputSchema: '{}',
  },
  {
    type: 'inquiry.details',
    tier: 1,
    name: 'Inquiry Details',
    description:
      'Get details for a specific inquiry by searching for it by client name or description.',
    inputSchema: '{ "query": "string — client name or inquiry description to search for" }',
  },
  {
    type: 'finance.monthly_snapshot',
    tier: 1,
    name: 'Monthly Financial Snapshot',
    description:
      'Get a financial snapshot: total revenue, refunds, tips, and net revenue for the current period.',
    inputSchema: '{}',
  },
  {
    type: 'recipe.search',
    tier: 1,
    name: 'Search Recipes',
    description: 'Search for recipes by name or keyword.',
    inputSchema: '{ "query": "string — recipe name or keyword to search for" }',
  },
  {
    type: 'menu.list',
    tier: 1,
    name: 'List Menus',
    description: 'Show all menus, optionally filtered by status (draft, shared, locked, archived).',
    inputSchema: '{ "status": "string — optional, one of: draft, shared, locked, archived" }',
  },
  {
    type: 'scheduling.next_available',
    tier: 1,
    name: 'Next Available Date',
    description: 'Find the next date with no events booked, starting from a given date.',
    inputSchema:
      '{ "startDate": "string — optional, YYYY-MM-DD to start searching from, defaults to today" }',
  },

  // ─── Web / Internet tasks ────────────────────────────────────────────────────

  {
    type: 'web.search',
    tier: 1,
    name: 'Web Search',
    description:
      'Search the internet for information. Use this for food trends, recipes online, supplier info, industry news, competitor research, catering ideas, or any question that needs current web data.',
    inputSchema:
      '{ "query": "string — search query", "limit": "number — optional, max results, defaults to 5" }',
  },
  {
    type: 'web.read',
    tier: 1,
    name: 'Read Web Page',
    description:
      'Fetch and read the content of a specific URL. Use when the chef shares a link or when a web search result needs deeper reading.',
    inputSchema: '{ "url": "string — full URL to fetch and read" }',
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
