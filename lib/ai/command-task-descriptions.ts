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

  // ─── Phase 2 tasks ──────────────────────────────────────────────────────────

  {
    type: 'dietary.check',
    tier: 1,
    name: 'Dietary/Allergy Check',
    description:
      "Cross-check a client's dietary restrictions and allergies against menu items. Flags dangerous conflicts. Use when the chef mentions allergies, dietary needs, or asks to check a menu for a client.",
    inputSchema: '{ "clientName": "string — client name to look up restrictions for" }',
  },
  {
    type: 'chef.favorite_chefs',
    tier: 1,
    name: 'Favorite Chefs',
    description:
      "Show the chef's list of culinary heroes and inspirations. These are chefs they admire and draw inspiration from.",
    inputSchema: '{}',
  },
  {
    type: 'chef.culinary_profile',
    tier: 1,
    name: 'Culinary Profile',
    description:
      "Show the chef's culinary identity — their cooking philosophy, signature dishes, favorite cuisines, techniques, and food memories.",
    inputSchema: '{}',
  },
  {
    type: 'prep.timeline',
    tier: 2,
    name: 'Prep Timeline',
    description:
      'Generate a detailed prep timeline for an event — includes shopping, prep, cooking, plating, and service times. Requires Ollama.',
    inputSchema: '{ "eventName": "string — event name or occasion to generate a timeline for" }',
    tierNote: 'ALWAYS tier 2 — chef should review the timeline before committing to it.',
  },
  {
    type: 'nudge.list',
    tier: 1,
    name: 'Proactive Nudges',
    description:
      "Get a list of things that need the chef's attention: stale inquiries, upcoming events needing prep, follow-ups to send, dormant clients to re-engage.",
    inputSchema: '{}',
  },
  {
    type: 'grocery.quick_add',
    tier: 1,
    name: 'Quick-Add Grocery Items',
    description:
      'Parse a natural language grocery list into structured items with quantities, units, and categories.',
    inputSchema:
      '{ "items": "string — comma-separated list of grocery items, e.g. 2 lbs chicken, 1 bunch cilantro" }',
  },
  {
    type: 'document.search',
    tier: 1,
    name: 'Search Documents',
    description: "Search the chef's saved documents by title.",
    inputSchema: '{ "query": "string — document title or keyword to search for" }',
  },
  {
    type: 'document.list_folders',
    tier: 1,
    name: 'List Folders',
    description: 'Show all document folders the chef has created.',
    inputSchema: '{}',
  },
  {
    type: 'document.create_folder',
    tier: 2,
    name: 'Create Folder',
    description: 'Create a new document folder.',
    inputSchema: '{ "name": "string — folder name" }',
    tierNote: 'Tier 2 — chef confirms before creating.',
  },
  {
    type: 'email.generic',
    tier: 2,
    name: 'Draft Email',
    description:
      "Draft a general email based on the chef's description. Draft only — never auto-sent.",
    inputSchema: '{ "description": "string — what the email should be about and who it is for" }',
    tierNote: 'ALWAYS tier 2 — never auto-send emails.',
  },

  // ─── Communication Draft Templates ──────────────────────────────────────────

  {
    type: 'draft.thank_you',
    tier: 2,
    name: 'Thank-You Note',
    description:
      'Draft a heartfelt thank-you note to a client after an event. References specific event details.',
    inputSchema: '{ "clientName": "string — client name" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.referral_request',
    tier: 2,
    name: 'Referral Request',
    description:
      'Draft a warm, non-pushy referral request to a loyal client asking if they know anyone who might enjoy your services.',
    inputSchema: '{ "clientName": "string — client name" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.testimonial_request',
    tier: 2,
    name: 'Testimonial Request',
    description:
      'Draft a friendly testimonial request to a client who recently had a great experience.',
    inputSchema: '{ "clientName": "string — client name" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.quote_cover_letter',
    tier: 2,
    name: 'Quote Cover Letter',
    description: 'Draft a professional cover letter to accompany a quote/proposal for an event.',
    inputSchema: '{ "eventName": "string — event occasion or description" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.decline_response',
    tier: 2,
    name: 'Decline Response',
    description: 'Draft a gracious decline to a booking request when the chef cannot take the job.',
    inputSchema:
      '{ "clientName": "string — client name", "reason": "string — optional reason for declining" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.cancellation_response',
    tier: 2,
    name: 'Cancellation Response',
    description: 'Draft an empathetic response to a client who cancelled their event.',
    inputSchema: '{ "eventName": "string — event occasion or name to find the cancelled event" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.payment_reminder',
    tier: 2,
    name: 'Payment Reminder',
    description: 'Draft a friendly payment reminder to a client with an outstanding balance.',
    inputSchema: '{ "clientName": "string — client name" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.re_engagement',
    tier: 2,
    name: 'Re-Engagement Email',
    description: "Draft a warm re-engagement email to a client who hasn't booked in a while.",
    inputSchema: '{ "clientName": "string — client name" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.milestone_recognition',
    tier: 2,
    name: 'Milestone Recognition',
    description:
      'Draft a milestone celebration email for a loyal client (e.g., 5th event, 10th event, anniversary).',
    inputSchema:
      '{ "clientName": "string — client name", "milestone": "string — optional milestone description" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before sending.',
  },
  {
    type: 'draft.food_safety_incident',
    tier: 2,
    name: 'Food Safety Incident Report',
    description:
      'Draft a formal food safety incident report for internal records and regulatory purposes.',
    inputSchema: '{ "description": "string — description of the incident" }',
    tierNote: 'ALWAYS tier 2 — chef reviews before filing.',
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
