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
    description:
      "Search the chef's existing recipe book by name or keyword. Returns only recipes the chef has manually saved. NEVER generates, fabricates, or suggests new recipes.",
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
      'Search the internet for public information. Use this for food trends, supplier info, industry news, competitor research, or any question that needs current web data. NEVER use this to search for recipes — AI does not generate, suggest, or retrieve recipes from anywhere.',
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

  // ─── Operations Intelligence ─────────────────────────────────────────────────

  {
    type: 'ops.portion_calc',
    tier: 1,
    name: 'Portion Calculator',
    description:
      'Scale a recipe to a specific number of guests. Adjusts all ingredient quantities proportionally.',
    inputSchema:
      '{ "recipeName": "string — recipe name to scale", "guestCount": "number — target number of guests/servings" }',
  },
  {
    type: 'ops.packing_list',
    tier: 1,
    name: 'Packing List',
    description:
      'Generate a comprehensive packing list for an event including equipment, service ware, transport supplies, and safety items.',
    inputSchema: '{ "eventName": "string — event name or occasion" }',
  },
  {
    type: 'ops.cross_contamination',
    tier: 1,
    name: 'Cross-Contamination Risk Analysis',
    description:
      "Analyze cross-contamination risks for an event based on the client's allergies and the menu. Flags critical risks and suggests safe practices.",
    inputSchema: '{ "eventName": "string — event name or occasion" }',
  },

  // ─── Analytics Intelligence ──────────────────────────────────────────────────

  {
    type: 'analytics.break_even',
    tier: 1,
    name: 'Break-Even Analysis',
    description:
      'Calculate the break-even point for an event — how many guests needed to cover costs, plus profit margin.',
    inputSchema: '{ "eventName": "string — event name or occasion" }',
  },
  {
    type: 'analytics.client_ltv',
    tier: 1,
    name: 'Client Lifetime Value',
    description:
      "Calculate a client's total revenue, event count, average event value, tenure, and loyalty tier.",
    inputSchema: '{ "clientName": "string — client name" }',
  },
  {
    type: 'analytics.recipe_cost',
    tier: 1,
    name: 'Recipe Cost Optimization',
    description:
      "Analyze a recipe's ingredient costs and suggest substitutions to reduce costs without sacrificing quality. Requires Ollama.",
    inputSchema: '{ "recipeName": "string — recipe name to optimize" }',
  },

  // ─── Client-Facing Intelligence ──────────────────────────────────────────────

  {
    type: 'client.event_recap',
    tier: 1,
    name: 'Event Recap',
    description:
      'Get a comprehensive recap of an event including client, date, menu, status, and financials.',
    inputSchema: '{ "eventName": "string — event name or occasion" }',
  },
  {
    type: 'client.menu_explanation',
    tier: 1,
    name: 'Menu Explanation',
    description: "Get a detailed breakdown of a menu's courses, descriptions, and dietary tags.",
    inputSchema: '{ "menuName": "string — menu name to explain" }',
  },

  // ─── Navigation & Awareness ───────────────────────────────────────────────

  {
    type: 'nav.go',
    tier: 1,
    name: 'Navigate To Page',
    description:
      'Navigate the chef to a specific page in ChefFlow. Use when the chef says "take me to", "show me", "go to", "open", or asks where something is. Returns the route so the UI can navigate.',
    inputSchema:
      '{ "route": "string — app route to navigate to, e.g. /events, /clients/new, /financials" }',
  },
  {
    type: 'loyalty.status',
    tier: 1,
    name: 'Loyalty Status',
    description:
      "Look up a client's loyalty program status: tier (Bronze/Silver/Gold/Platinum), points balance, points to next tier, lifetime events, and rewards available.",
    inputSchema: '{ "clientName": "string — client name to look up loyalty status for" }',
  },
  {
    type: 'safety.event_allergens',
    tier: 1,
    name: 'Event Allergen Check',
    description:
      "Cross-reference ALL guests' allergies and dietary restrictions against the event's menu items. Flags dangerous conflicts and suggests accommodations. Use for any multi-guest event safety check.",
    inputSchema: '{ "eventName": "string — event occasion or description to check allergens for" }',
  },
  {
    type: 'waitlist.list',
    tier: 1,
    name: 'View Waitlist',
    description:
      'Show all clients currently on the waitlist — their requested dates, occasions, and status.',
    inputSchema: '{}',
  },
  {
    type: 'quote.compare',
    tier: 1,
    name: 'Compare Quotes',
    description:
      'Show all quote versions for an event side-by-side — pricing, items, deposit, and status for each version.',
    inputSchema: '{ "eventName": "string — event occasion or description to compare quotes for" }',
  },

  // ─── Email Awareness ────────────────────────────────────────────────────────

  {
    type: 'email.recent',
    tier: 1,
    name: 'Recent Emails',
    description:
      "Show the chef's most recent emails with sender, subject, and classification. Use when the chef asks what emails came in, what's new, or wants to see their inbox.",
    inputSchema: '{ "limit": "number — optional, max emails to show, defaults to 10" }',
  },
  {
    type: 'email.search',
    tier: 1,
    name: 'Search Emails',
    description:
      'Search emails by sender name, email address, subject, or body content. Use when the chef asks about a specific email, what someone said, or looks for a specific message.',
    inputSchema: '{ "query": "string — search term (name, email, subject, or keyword)" }',
  },
  {
    type: 'email.thread',
    tier: 1,
    name: 'Email Thread',
    description:
      'Show the full email conversation thread. Use when the chef wants to see the back-and-forth with a client or review an email chain.',
    inputSchema: '{ "threadId": "string — Gmail thread ID to look up" }',
  },
  {
    type: 'email.inbox_summary',
    tier: 1,
    name: 'Inbox Summary',
    description:
      "Get an overview of the chef's email inbox: total emails, new inquiries, client replies, spam filtered, and last sync time. Use when the chef asks to summarize their inbox or wants a communication overview.",
    inputSchema: '{}',
  },
  {
    type: 'email.draft_reply',
    tier: 2,
    name: 'Draft Email Reply',
    description:
      "Draft a reply to a specific email. Loads the original email and any thread context to write a contextual, warm response in the chef's voice. Draft only — never auto-sent.",
    inputSchema: '{ "messageId": "string — Gmail message ID to reply to" }',
    tierNote: 'ALWAYS tier 2 — chef reviews and sends manually. Never auto-send.',
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
  // Import agent actions dynamically to avoid circular deps in this non-server file
  let agentSection = ''
  try {
    const { ensureAgentActionsRegistered } = require('@/lib/ai/agent-actions')
    const { buildAgentTaskListForPrompt } = require('@/lib/ai/agent-registry')
    ensureAgentActionsRegistered()
    agentSection = buildAgentTaskListForPrompt()
  } catch {
    // Agent actions not available — skip
  }

  const legacySection = TASK_DESCRIPTIONS.map(
    (t) =>
      `- ${t.type} (Tier ${t.tier}, "${t.name}"): ${t.description}\n  Inputs: ${t.inputSchema}${t.tierNote ? `\n  IMPORTANT: ${t.tierNote}` : ''}`
  ).join('\n\n')

  return legacySection + agentSection
}

export function getTaskName(taskType: string): string {
  // Check agent registry first
  try {
    const { getAgentAction } = require('@/lib/ai/agent-registry')
    const { ensureAgentActionsRegistered } = require('@/lib/ai/agent-actions')
    ensureAgentActionsRegistered()
    const action = getAgentAction(taskType)
    if (action) return action.name
  } catch {
    // Agent registry not available — fall through
  }
  return TASK_DESCRIPTIONS.find((t) => t.type === taskType)?.name ?? taskType
}
