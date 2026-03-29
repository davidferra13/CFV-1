// Ask Remy - Task Descriptions
// No 'use server' - imported by both intent parser (for system prompt) and UI (for labels)

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
    inputSchema: '{ "query": "string - client name or partial name to search for" }',
  },
  {
    type: 'calendar.availability',
    tier: 1,
    name: 'Check Availability',
    description: 'Check if a specific date is free (no confirmed events booked).',
    inputSchema: '{ "date": "string - YYYY-MM-DD format, e.g. 2026-03-15" }',
  },
  {
    type: 'event.list_upcoming',
    tier: 1,
    name: 'List Upcoming Events',
    description: "Show the chef's next upcoming events with status and client names.",
    inputSchema: '{ "limit": "number - optional, max events to return, defaults to 5" }',
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
      'Generate a personalized follow-up email draft to a specific client. Draft only - never sent automatically.',
    inputSchema: '{ "clientName": "string - client full name or first name" }',
    tierNote: 'ALWAYS tier 2, even if the chef says "send" - never auto-send emails.',
  },
  {
    type: 'event.create_draft',
    tier: 2,
    name: 'Create Event Draft',
    description:
      'Parse a natural language event description into a structured event draft for chef review.',
    inputSchema:
      '{ "description": "string - full event description including date, guests, occasion, location, client name" }',
    tierNote: 'ALWAYS tier 2 - chef must review and confirm before saving.',
  },

  // ─── Remy-expanded tasks ────────────────────────────────────────────────────

  {
    type: 'client.list_recent',
    tier: 1,
    name: 'Recent Clients',
    description: 'List the 5 most recently added clients with their names.',
    inputSchema: '{ "limit": "number - optional, defaults to 5" }',
  },
  {
    type: 'client.details',
    tier: 1,
    name: 'Client Details',
    description:
      'Look up a specific client by name and return their profile details and event history.',
    inputSchema: '{ "clientName": "string - client full name or first name to look up" }',
  },
  {
    type: 'event.details',
    tier: 1,
    name: 'Event Details',
    description:
      'Get full details for a specific event including client, date, status, and guest count.',
    inputSchema: '{ "eventName": "string - event occasion or description to search for" }',
  },
  {
    type: 'event.list_by_status',
    tier: 1,
    name: 'Events by Status',
    description:
      'List events filtered by a specific status (draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled).',
    inputSchema:
      '{ "status": "string - one of: draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled" }',
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
    inputSchema: '{ "query": "string - client name or inquiry description to search for" }',
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
    inputSchema: '{ "query": "string - recipe name or keyword to search for" }',
  },
  {
    type: 'menu.list',
    tier: 1,
    name: 'List Menus',
    description: 'Show all menus, optionally filtered by status (draft, shared, locked, archived).',
    inputSchema: '{ "status": "string - optional, one of: draft, shared, locked, archived" }',
  },
  {
    type: 'scheduling.next_available',
    tier: 1,
    name: 'Next Available Date',
    description: 'Find the next date with no events booked, starting from a given date.',
    inputSchema:
      '{ "startDate": "string - optional, YYYY-MM-DD to start searching from, defaults to today" }',
  },

  // ─── Web / Internet tasks ────────────────────────────────────────────────────

  {
    type: 'web.search',
    tier: 1,
    name: 'Web Search',
    description:
      'Search the internet for public information. Use this for food trends, supplier info, industry news, competitor research, or any question that needs current web data. NEVER use this to search for recipes - AI does not generate, suggest, or retrieve recipes from anywhere.',
    inputSchema:
      '{ "query": "string - search query", "limit": "number - optional, max results, defaults to 5" }',
  },
  {
    type: 'web.read',
    tier: 1,
    name: 'Read Web Page',
    description:
      'Fetch and read the content of a specific URL. Use when the chef shares a link or when a web search result needs deeper reading.',
    inputSchema: '{ "url": "string - full URL to fetch and read" }',
  },

  // ─── Phase 2 tasks ──────────────────────────────────────────────────────────

  {
    type: 'dietary.check',
    tier: 1,
    name: 'Dietary/Allergy Check',
    description:
      "Cross-check a client's dietary restrictions and allergies against menu items. Flags dangerous conflicts. Use when the chef mentions allergies, dietary needs, or asks to check a menu for a client.",
    inputSchema: '{ "clientName": "string - client name to look up restrictions for" }',
  },
  {
    type: 'chef.favorite_chefs',
    tier: 1,
    name: 'Inspiration Board',
    description:
      "Show the chef's saved inspirations. These can be chefs, bakers, operators, or hospitality brands they admire and learn from.",
    inputSchema: '{}',
  },
  {
    type: 'chef.culinary_profile',
    tier: 1,
    name: 'Culinary Profile',
    description:
      "Show the chef's culinary identity - their cooking philosophy, signature dishes, favorite cuisines, techniques, and food memories.",
    inputSchema: '{}',
  },
  {
    type: 'prep.timeline',
    tier: 2,
    name: 'Prep Timeline',
    description:
      'Generate a detailed prep timeline for an event - includes shopping, prep, cooking, plating, and service times. Requires Ollama.',
    inputSchema: '{ "eventName": "string - event name or occasion to generate a timeline for" }',
    tierNote: 'ALWAYS tier 2 - chef should review the timeline before committing to it.',
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
      '{ "items": "string - comma-separated list of grocery items, e.g. 2 lbs chicken, 1 bunch cilantro" }',
  },
  {
    type: 'document.search',
    tier: 1,
    name: 'Search Documents',
    description: "Search the chef's saved documents by title.",
    inputSchema: '{ "query": "string - document title or keyword to search for" }',
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
    inputSchema: '{ "name": "string - folder name" }',
    tierNote: 'Tier 2 - chef confirms before creating.',
  },
  {
    type: 'email.generic',
    tier: 2,
    name: 'Draft Email',
    description:
      "Draft a general email based on the chef's description. Draft only - never auto-sent.",
    inputSchema: '{ "description": "string - what the email should be about and who it is for" }',
    tierNote: 'ALWAYS tier 2 - never auto-send emails.',
  },

  // ─── Food Safety & Dietary Intelligence ─────────────────────────────────────

  {
    type: 'food.safety',
    tier: 1,
    name: 'Food Safety Reference',
    description:
      'Look up FDA food safety data: safe cooking temperatures for proteins, shelf life for food categories, danger zone checks, and cooling requirements. Uses the FDA Food Code 2022. Ask about any protein or food item.',
    inputSchema:
      '{ "query": "string - food item to look up (e.g. chicken, salmon, ground beef)", "tempF": "number - optional, a specific temperature in Fahrenheit to check safety for" }',
  },
  {
    type: 'food.dietary_ingredients',
    tier: 1,
    name: 'Ingredient Dietary Check',
    description:
      'Check if a list of ingredients is compatible with a specific diet (vegan, keto, gluten-free, etc.) or check against all 13 diets at once. Uses deterministic dietary rule sets with 1000+ keywords. No AI involved.',
    inputSchema:
      '{ "ingredients": "string[] - list of ingredient names to check", "diet": "string - optional, specific diet to check against (vegan, keto, paleo, gluten-free, dairy-free, etc.). If omitted, checks all 13 diets." }',
  },

  // ─── Operations Intelligence ─────────────────────────────────────────────────

  {
    type: 'ops.portion_calc',
    tier: 1,
    name: 'Portion Calculator',
    description:
      'Scale a recipe to a specific number of guests. Adjusts all ingredient quantities proportionally.',
    inputSchema:
      '{ "recipeName": "string - recipe name to scale", "guestCount": "number - target number of guests/servings" }',
  },
  {
    type: 'ops.packing_list',
    tier: 1,
    name: 'Packing List',
    description:
      'Generate a comprehensive packing list for an event including equipment, service ware, transport supplies, and safety items.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'ops.cross_contamination',
    tier: 1,
    name: 'Cross-Contamination Risk Analysis',
    description:
      "Analyze cross-contamination risks for an event based on the client's allergies and the menu. Flags critical risks and suggests safe practices.",
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },

  // ─── Analytics Intelligence ──────────────────────────────────────────────────

  {
    type: 'analytics.break_even',
    tier: 1,
    name: 'Break-Even Analysis',
    description:
      'Calculate the break-even point for an event - how many guests needed to cover costs, plus profit margin.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'analytics.client_ltv',
    tier: 1,
    name: 'Client Lifetime Value',
    description:
      "Calculate a client's total revenue, event count, average event value, tenure, and loyalty tier.",
    inputSchema: '{ "clientName": "string - client name" }',
  },
  {
    type: 'analytics.recipe_cost',
    tier: 1,
    name: 'Recipe Cost Optimization',
    description:
      "Analyze a recipe's ingredient costs and suggest substitutions to reduce costs without sacrificing quality. Requires Ollama.",
    inputSchema: '{ "recipeName": "string - recipe name to optimize" }',
  },

  // ─── Client-Facing Intelligence ──────────────────────────────────────────────

  {
    type: 'client.event_recap',
    tier: 1,
    name: 'Event Recap',
    description:
      'Get a comprehensive recap of an event including client, date, menu, status, and financials.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'client.menu_explanation',
    tier: 1,
    name: 'Menu Explanation',
    description: "Get a detailed breakdown of a menu's courses, descriptions, and dietary tags.",
    inputSchema: '{ "menuName": "string - menu name to explain" }',
  },

  // ─── Navigation & Awareness ───────────────────────────────────────────────

  {
    type: 'nav.go',
    tier: 1,
    name: 'Navigate To Page',
    description:
      'Navigate the chef to a specific page in ChefFlow. Use when the chef says "take me to", "show me", "go to", "open", or asks where something is. Returns the route so the UI can navigate.',
    inputSchema:
      '{ "route": "string - app route to navigate to, e.g. /events, /clients/new, /financials" }',
  },
  {
    type: 'loyalty.status',
    tier: 1,
    name: 'Loyalty Status',
    description:
      "Look up a client's loyalty program status: tier (Bronze/Silver/Gold/Platinum), points balance, points to next tier, lifetime events, and rewards available.",
    inputSchema: '{ "clientName": "string - client name to look up loyalty status for" }',
  },
  {
    type: 'safety.event_allergens',
    tier: 1,
    name: 'Event Allergen Check',
    description:
      "Cross-reference ALL guests' allergies and dietary restrictions against the event's menu items. Flags dangerous conflicts and suggests accommodations. Use for any multi-guest event safety check.",
    inputSchema: '{ "eventName": "string - event occasion or description to check allergens for" }',
  },
  {
    type: 'waitlist.list',
    tier: 1,
    name: 'View Waitlist',
    description:
      'Show all clients currently on the waitlist - their requested dates, occasions, and status.',
    inputSchema: '{}',
  },
  {
    type: 'quote.compare',
    tier: 1,
    name: 'Compare Quotes',
    description:
      'Show all quote versions for an event side-by-side - pricing, items, deposit, and status for each version.',
    inputSchema: '{ "eventName": "string - event occasion or description to compare quotes for" }',
  },

  // ─── Email Awareness ────────────────────────────────────────────────────────

  {
    type: 'email.recent',
    tier: 1,
    name: 'Recent Emails',
    description:
      "Show the chef's most recent emails with sender, subject, and classification. Use when the chef asks what emails came in, what's new, or wants to see their inbox.",
    inputSchema: '{ "limit": "number - optional, max emails to show, defaults to 10" }',
  },
  {
    type: 'email.search',
    tier: 1,
    name: 'Search Emails',
    description:
      'Search emails by sender name, email address, subject, or body content. Use when the chef asks about a specific email, what someone said, or looks for a specific message.',
    inputSchema: '{ "query": "string - search term (name, email, subject, or keyword)" }',
  },
  {
    type: 'email.thread',
    tier: 1,
    name: 'Email Thread',
    description:
      'Show the full email conversation thread. Use when the chef wants to see the back-and-forth with a client or review an email chain.',
    inputSchema: '{ "threadId": "string - Gmail thread ID to look up" }',
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
      "Draft a reply to a specific email. Loads the original email and any thread context to write a contextual, warm response in the chef's voice. Draft only - never auto-sent.",
    inputSchema: '{ "messageId": "string - Gmail message ID to reply to" }',
    tierNote: 'ALWAYS tier 2 - chef reviews and sends manually. Never auto-send.',
  },

  // ─── Communication Draft Templates ──────────────────────────────────────────

  {
    type: 'draft.thank_you',
    tier: 2,
    name: 'Thank-You Note',
    description:
      'Draft a heartfelt thank-you note to a client after an event. References specific event details.',
    inputSchema: '{ "clientName": "string - client name" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.referral_request',
    tier: 2,
    name: 'Referral Request',
    description:
      'Draft a warm, non-pushy referral request to a loyal client asking if they know anyone who might enjoy your services.',
    inputSchema: '{ "clientName": "string - client name" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.testimonial_request',
    tier: 2,
    name: 'Testimonial Request',
    description:
      'Draft a friendly testimonial request to a client who recently had a great experience.',
    inputSchema: '{ "clientName": "string - client name" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.quote_cover_letter',
    tier: 2,
    name: 'Quote Cover Letter',
    description: 'Draft a professional cover letter to accompany a quote/proposal for an event.',
    inputSchema: '{ "eventName": "string - event occasion or description" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.decline_response',
    tier: 2,
    name: 'Decline Response',
    description: 'Draft a gracious decline to a booking request when the chef cannot take the job.',
    inputSchema:
      '{ "clientName": "string - client name", "reason": "string - optional reason for declining" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.cancellation_response',
    tier: 2,
    name: 'Cancellation Response',
    description: 'Draft an empathetic response to a client who cancelled their event.',
    inputSchema: '{ "eventName": "string - event occasion or name to find the cancelled event" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.payment_reminder',
    tier: 2,
    name: 'Payment Reminder',
    description: 'Draft a friendly payment reminder to a client with an outstanding balance.',
    inputSchema: '{ "clientName": "string - client name" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.re_engagement',
    tier: 2,
    name: 'Re-Engagement Email',
    description: "Draft a warm re-engagement email to a client who hasn't booked in a while.",
    inputSchema: '{ "clientName": "string - client name" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.milestone_recognition',
    tier: 2,
    name: 'Milestone Recognition',
    description:
      'Draft a milestone celebration email for a loyal client (e.g., 5th event, 10th event, anniversary).',
    inputSchema:
      '{ "clientName": "string - client name", "milestone": "string - optional milestone description" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before sending.',
  },
  {
    type: 'draft.food_safety_incident',
    tier: 2,
    name: 'Food Safety Incident Report',
    description:
      'Draft a formal food safety incident report for internal records and regulatory purposes.',
    inputSchema: '{ "description": "string - description of the incident" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before filing.',
  },

  // ─── Phase 1: Wire Existing Features ──────────────────────────────────────

  {
    type: 'contract.generate',
    tier: 2,
    name: 'Generate Contract',
    description:
      'Generate a draft contract/proposal for an event. Includes service details, pricing, terms, and cancellation policy. Draft only - chef must review and consult attorney.',
    inputSchema: '{ "eventName": "string - event occasion or description" }',
    tierNote: 'ALWAYS tier 2 - legal document, chef must review.',
  },
  {
    type: 'contingency.plan',
    tier: 2,
    name: 'Contingency Planning',
    description:
      'Generate "if X goes wrong, do Y" contingency plans for an event. Identifies top risks based on venue, menu, dietary restrictions, and guest count.',
    inputSchema: '{ "eventName": "string - event occasion or description" }',
    tierNote: 'ALWAYS tier 2 - chef picks which plans to save.',
  },
  {
    type: 'seasonal.produce',
    tier: 1,
    name: 'Seasonal Produce',
    description:
      "Show what's in season right now - fruits, vegetables, herbs, seafood, and specialty items grouped by category with chef tips. Use when the chef asks what to source, what's in season, or what's at peak.",
    inputSchema: '{}',
  },
  {
    type: 'grocery.consolidate',
    tier: 2,
    name: 'Consolidated Grocery List',
    description:
      'Consolidate all recipe ingredients for an event into a single shopping list grouped by store section. Flags dietary conflicts and suggests substitutions.',
    inputSchema: '{ "eventName": "string - event occasion or description" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before shopping.',
  },

  // ─── Phase 2: Financial Intelligence ──────────────────────────────────────

  {
    type: 'finance.forecast',
    tier: 1,
    name: 'Revenue Forecast',
    description:
      'Project revenue for the next 30, 60, and 90 days based on upcoming events and quotes. Shows confidence level (high/medium/low) based on event status.',
    inputSchema: '{}',
  },
  {
    type: 'finance.pnl',
    tier: 1,
    name: 'P&L Report',
    description:
      'Profit & Loss report for a specific month - revenue, refunds, expenses by category, profit margin. Defaults to current month.',
    inputSchema:
      '{ "month": "number - optional, 1-12", "year": "number - optional, defaults to current year" }',
  },
  {
    type: 'finance.tax_summary',
    tier: 1,
    name: 'Tax Summary',
    description:
      'Tax preparation summary - all deductible expenses by category, mileage deduction at IRS rate, total deductible amount. Defaults to current year.',
    inputSchema: '{ "year": "number - optional, defaults to current year" }',
  },
  {
    type: 'finance.pricing',
    tier: 1,
    name: 'Pricing Analysis',
    description:
      "Analyze the chef's pricing - average per-head rate, min/max, breakdown by service style, and trend (increasing/decreasing/stable).",
    inputSchema: '{}',
  },

  // ─── Phase 3: Capacity & Scheduling ───────────────────────────────────────

  {
    type: 'capacity.utilization',
    tier: 1,
    name: 'Utilization Analysis',
    description:
      'Analyze workload density for the next N days - booked vs free days, double-booked days, consecutive event streaks, and whether the chef can take more work.',
    inputSchema: '{ "days": "number - optional, how many days to look ahead, defaults to 14" }',
  },

  // ─── Phase 4: Relationship Intelligence ───────────────────────────────────

  {
    type: 'relationship.milestones',
    tier: 1,
    name: 'Upcoming Milestones',
    description:
      'Surface upcoming client milestones - birthdays, anniversaries, Nth-event celebrations, and client anniversary dates within the next 2 weeks. Suggests personalized actions.',
    inputSchema: '{}',
  },
  {
    type: 'relationship.reengagement',
    tier: 1,
    name: 'Re-Engagement Scoring',
    description:
      'Rank dormant clients (no events in 90+ days) by rebooking likelihood based on loyalty, total spend, and recency. Suggests approach for each.',
    inputSchema: '{}',
  },
  {
    type: 'relationship.acquisition',
    tier: 1,
    name: 'Client Acquisition Funnel',
    description:
      'Analyze the inquiry-to-booking pipeline - conversion rate, best referral sources, revenue by source. Shows where the best clients come from.',
    inputSchema: '{}',
  },

  // ─── Phase 5: Entity Awareness ────────────────────────────────────────────

  {
    type: 'goals.dashboard',
    tier: 1,
    name: 'Goals Dashboard',
    description:
      "Show the chef's goals with progress tracking - revenue targets, event counts, client growth. Use when the chef asks how they're tracking.",
    inputSchema: '{}',
  },
  {
    type: 'equipment.list',
    tier: 1,
    name: 'Equipment List',
    description:
      "Show the chef's equipment with depreciation and maintenance status. Flags items due for maintenance or replacement.",
    inputSchema: '{}',
  },
  {
    type: 'equipment.maintenance',
    tier: 1,
    name: 'Equipment Maintenance Due',
    description: 'Show equipment items that are due or overdue for maintenance.',
    inputSchema: '{}',
  },
  {
    type: 'vendors.list',
    tier: 1,
    name: 'Vendor List',
    description:
      "Show the chef's vendors/suppliers. Use when the chef asks about their vendors, suppliers, or where to source ingredients.",
    inputSchema: '{}',
  },

  // ─── Phase 6: Multi-Event Intelligence ────────────────────────────────────

  {
    type: 'analytics.compare_events',
    tier: 1,
    name: 'Compare Events',
    description:
      'Compare two events side-by-side - revenue, expenses, profit, per-head rate, margin. Use when the chef asks which event was more profitable.',
    inputSchema:
      '{ "event1": "string - first event name/occasion", "event2": "string - second event name/occasion" }',
  },

  // ─── Phase 7: Day-of Support ──────────────────────────────────────────────

  {
    type: 'briefing.morning',
    tier: 1,
    name: 'Morning Briefing',
    description:
      "Full operational briefing for today - events with timelines, dietary reminders, staff confirmed, equipment needed, overdue todos, new inquiries, and pending payments. Use when the chef says good morning, what's today look like, or asks for their briefing.",
    inputSchema: '{}',
  },

  // ─── Phase 6: Workflow Chains ───────────────────────────────────────────

  {
    type: 'workflow.cancellation_impact',
    tier: 1,
    name: 'Cancellation Impact',
    description:
      'Analyze the financial and scheduling impact of a cancellation - lost revenue, monthly impact percentage, and rebooking opportunities from the waitlist.',
    inputSchema: '{ "eventName": "string - event occasion or description that was cancelled" }',
  },
  {
    type: 'workflow.post_event',
    tier: 1,
    name: 'Post-Event Sequence',
    description:
      'Show the post-event checklist - log expenses, save debrief, send thank-you, request testimonial, log mileage. Tracks what has and has not been done.',
    inputSchema: '{ "eventName": "string - event occasion or description" }',
  },

  // ─── Phase 8-9: Operational Intelligence ──────────────────────────────────

  {
    type: 'ops.ingredient_sub',
    tier: 1,
    name: 'Ingredient Substitution',
    description:
      'Find allergy-safe substitutions for an ingredient. Returns alternatives with reasons (e.g., dairy-free, nut-free, vegan). Use when the chef asks "what can I use instead of X?"',
    inputSchema: '{ "ingredient": "string - ingredient to find substitutions for" }',
  },

  // ─── Batch 2: Complete Domain Coverage ─────────────────────────────────────

  // Client Intelligence
  {
    type: 'client.spending',
    tier: 1,
    name: 'Client Spending Analysis',
    description: 'Show spending summary across all clients - top spenders, average spend, trends.',
    inputSchema: '{}',
  },
  {
    type: 'client.churn_risk',
    tier: 1,
    name: 'Client Churn Risk',
    description: 'Identify clients at risk of churning based on booking frequency and engagement.',
    inputSchema: '{}',
  },
  {
    type: 'client.birthdays',
    tier: 1,
    name: 'Upcoming Client Birthdays',
    description: 'Show client birthdays and milestones coming up in the next 30 days.',
    inputSchema: '{}',
  },
  {
    type: 'client.next_best_action',
    tier: 1,
    name: 'Next Best Actions',
    description:
      'AI-suggested next actions for each client - follow up, upsell, re-engage, celebrate.',
    inputSchema: '{}',
  },
  {
    type: 'client.cooling',
    tier: 1,
    name: 'Cooling Clients',
    description: 'Show clients going dormant - no recent bookings, declining engagement.',
    inputSchema: '{}',
  },
  {
    type: 'client.ltv_trajectory',
    tier: 1,
    name: 'Client LTV Trajectory',
    description: 'Show lifetime value projection and spending trajectory for a specific client.',
    inputSchema: '{ "clientName": "string - client name to look up" }',
  },
  {
    type: 'client.menu_history',
    tier: 1,
    name: 'Client Menu History',
    description: 'Show what menus/dishes a client has been served - avoid repeats, spot favorites.',
    inputSchema: '{ "clientName": "string - client name to look up" }',
  },
  {
    type: 'client.referral_health',
    tier: 1,
    name: 'Referral Health',
    description: 'Referral pipeline health - who refers, conversion rate, top referrers.',
    inputSchema: '{}',
  },
  {
    type: 'client.nda_status',
    tier: 1,
    name: 'NDA Status',
    description: 'Show NDA status for clients - signed, expiring, missing.',
    inputSchema: '{}',
  },
  {
    type: 'client.payment_plans',
    tier: 1,
    name: 'Client Payment Plans',
    description: 'Show payment plan installments for a specific event.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },

  // Event Intelligence
  {
    type: 'event.dietary_conflicts',
    tier: 1,
    name: 'Dietary Conflict Check',
    description: 'Check for allergen/dietary conflicts between guests and the event menu.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'event.debrief',
    tier: 1,
    name: 'Event Debrief',
    description: 'Get the post-event debrief form/blanks for an event.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'event.countdown',
    tier: 1,
    name: 'Event Countdown',
    description:
      'Show countdown timer and days until a specific event, or all upcoming countdowns.',
    inputSchema:
      '{ "eventName": "string - optional, event name. If omitted shows all countdowns" }',
  },
  {
    type: 'event.invoice',
    tier: 1,
    name: 'Invoice Lookup',
    description: 'Look up the invoice for an event - line items, payments, balance due.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },

  // Inquiry Intelligence
  {
    type: 'inquiry.follow_ups',
    tier: 1,
    name: 'Stale Inquiries',
    description: 'Show inquiries that need follow-up - going cold, no response in 3+ days.',
    inputSchema: '{}',
  },
  {
    type: 'inquiry.likelihood',
    tier: 1,
    name: 'Inquiry Likelihood',
    description: 'Rank open inquiries by booking likelihood score.',
    inputSchema: '{}',
  },

  // Menu Intelligence
  {
    type: 'menu.food_cost',
    tier: 1,
    name: 'Menu Food Cost',
    description:
      'Show food cost analysis - cost per guest, food cost %, recipe costs across menus.',
    inputSchema: '{}',
  },
  {
    type: 'menu.dish_index',
    tier: 1,
    name: 'Dish Index',
    description: 'Search all dishes across all menus - find which menu has a specific dish.',
    inputSchema: '{}',
  },
  {
    type: 'menu.showcase',
    tier: 1,
    name: 'Menu Templates',
    description: 'Show saved menu templates and showcase menus.',
    inputSchema: '{}',
  },

  // Recipe Intelligence
  {
    type: 'recipe.allergens',
    tier: 1,
    name: 'Recipe Allergens',
    description: 'Show allergen information tracked across all recipes.',
    inputSchema: '{}',
  },
  {
    type: 'recipe.nutrition',
    tier: 1,
    name: 'Recipe Nutrition',
    description: 'Look up nutritional information for a specific recipe.',
    inputSchema: '{ "recipeName": "string - recipe name to look up" }',
  },
  {
    type: 'recipe.production_logs',
    tier: 1,
    name: 'Production Logs',
    description: 'Show recent production/batch logs for recipe tracking.',
    inputSchema: '{}',
  },

  // Finance Intelligence
  {
    type: 'finance.cash_flow',
    tier: 1,
    name: 'Cash Flow Forecast',
    description: 'Project cash flow for the next 90 days - inflows, outflows, net position.',
    inputSchema: '{}',
  },
  {
    type: 'finance.mileage',
    tier: 1,
    name: 'Mileage Summary',
    description: 'Year-to-date mileage tracking summary for tax deduction.',
    inputSchema: '{}',
  },
  {
    type: 'finance.tips',
    tier: 1,
    name: 'Tip Summary',
    description: 'Year-to-date tip income summary.',
    inputSchema: '{}',
  },
  {
    type: 'finance.contractors',
    tier: 1,
    name: '1099 Contractor Summary',
    description: 'Contractor payment summary for 1099 reporting.',
    inputSchema: '{}',
  },
  {
    type: 'finance.disputes',
    tier: 1,
    name: 'Payment Disputes',
    description: 'Show active payment disputes and chargebacks.',
    inputSchema: '{}',
  },
  {
    type: 'finance.payment_plan',
    tier: 1,
    name: 'Payment Plan Lookup',
    description: 'Show payment plan installments for an event.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'finance.recurring_invoices',
    tier: 1,
    name: 'Recurring Invoices',
    description: 'Show all active recurring invoice schedules.',
    inputSchema: '{}',
  },
  {
    type: 'finance.tax_package',
    tier: 1,
    name: 'Tax Package',
    description:
      'Year-end tax package - deductible expenses, income categories, quarterly breakdown.',
    inputSchema: '{}',
  },
  {
    type: 'finance.payroll',
    tier: 1,
    name: 'Payroll Summary',
    description: 'Employee list and quarterly payroll tax (941) summaries.',
    inputSchema: '{}',
  },

  // Vendor Intelligence
  {
    type: 'vendor.invoices',
    tier: 1,
    name: 'Vendor Invoices',
    description: 'Show vendor invoices - what you owe suppliers.',
    inputSchema: '{ "vendorId": "string - optional, filter by vendor" }',
  },
  {
    type: 'vendor.price_insights',
    tier: 1,
    name: 'Vendor Price Insights',
    description: 'Price trend analysis across vendors - inflation, savings opportunities.',
    inputSchema: '{}',
  },
  {
    type: 'vendor.payment_aging',
    tier: 1,
    name: 'Vendor Payment Aging',
    description: 'Show outstanding vendor payments by age - current, 30, 60, 90+ days.',
    inputSchema: '{}',
  },
  {
    type: 'price.check',
    tier: 1,
    name: 'Check Current Price',
    description:
      'Look up the current price of one or more ingredients across tracked stores. Returns real-time pricing with store attribution.',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of ingredient names to look up prices for',
        },
      },
      required: ['ingredients'],
    }),
  },

  // Equipment Intelligence
  {
    type: 'equipment.rentals',
    tier: 1,
    name: 'Equipment Rentals',
    description: 'Show equipment rental history and costs, optionally for a specific event.',
    inputSchema: '{ "eventId": "string - optional, event name to filter by" }',
  },

  // Staff Intelligence
  {
    type: 'staff.availability',
    tier: 1,
    name: 'Staff Availability',
    description: 'Show which staff are available on a specific date.',
    inputSchema: '{ "date": "string - YYYY-MM-DD format, defaults to today" }',
  },
  {
    type: 'staff.briefing',
    tier: 1,
    name: 'Staff Briefing',
    description: 'Generate a staff briefing for an event - roles, timing, menu, guest notes.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'staff.clock_summary',
    tier: 1,
    name: 'Staff Clock Summary',
    description: 'Show time clock entries and hours worked for an event.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },
  {
    type: 'staff.performance',
    tier: 1,
    name: 'Staff Performance',
    description:
      'Performance scoreboard - reliability, quality, professionalism scores by staff member.',
    inputSchema: '{}',
  },
  {
    type: 'staff.labor_dashboard',
    tier: 1,
    name: 'Labor Dashboard',
    description: 'Monthly labor cost breakdown - hours, wages, labor-to-revenue ratio.',
    inputSchema: '{ "month": "number - optional, 1-12", "year": "number - optional" }',
  },

  // Scheduling Intelligence
  {
    type: 'scheduling.capacity',
    tier: 1,
    name: 'Capacity Check',
    description: 'Check booking capacity for a date, or show overall capacity settings.',
    inputSchema: '{ "date": "string - optional, YYYY-MM-DD to check specific date" }',
  },
  {
    type: 'scheduling.prep_blocks',
    tier: 1,
    name: 'Prep Blocks',
    description: 'Show prep time blocks for the week, or for a specific event.',
    inputSchema: '{ "eventId": "string - optional, event name to filter by" }',
  },
  {
    type: 'scheduling.protected_time',
    tier: 1,
    name: 'Protected Time',
    description: 'Show blocked-off personal/protected time periods.',
    inputSchema: '{}',
  },
  {
    type: 'scheduling.gaps',
    tier: 1,
    name: 'Scheduling Gaps',
    description: 'Find gaps and conflicts in your scheduling - missed prep, overlapping events.',
    inputSchema: '{}',
  },

  // Analytics Intelligence
  {
    type: 'analytics.pipeline',
    tier: 1,
    name: 'Pipeline Analytics',
    description: 'Inquiry funnel, quote acceptance rate, ghost rate, lead time stats.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.yoy',
    tier: 1,
    name: 'Year-over-Year Comparison',
    description: 'Compare revenue, events, clients year-over-year.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.demand_forecast',
    tier: 1,
    name: 'Demand Forecast',
    description: 'Seasonal demand heatmap - predict busy months based on historical data.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.benchmarks',
    tier: 1,
    name: 'Business Benchmarks',
    description: 'Key business benchmarks and conversion funnel metrics.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.pricing_suggestions',
    tier: 1,
    name: 'Pricing Suggestions',
    description: 'Data-driven pricing suggestion based on guest count and event type.',
    inputSchema:
      '{ "guestCount": "number - number of guests", "pricingModel": "string - per_person, flat_rate, or custom", "occasion": "string - optional, e.g. dinner, brunch, wedding" }',
  },
  {
    type: 'analytics.response_time',
    tier: 1,
    name: 'Response Time Metrics',
    description: 'How fast you respond to inquiries - average, median, trends.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.cost_trends',
    tier: 1,
    name: 'Food Cost Trends',
    description: 'Food cost percentage trend over the last 6 months.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.referrals',
    tier: 1,
    name: 'Referral Analytics',
    description:
      'Full referral analytics - funnel, top referrers, acquisition by source, time series.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.quote_loss',
    tier: 1,
    name: 'Quote Loss Analysis',
    description: 'Why quotes get declined - reason breakdown and trends.',
    inputSchema: '{}',
  },
  {
    type: 'analytics.service_mix',
    tier: 1,
    name: 'Revenue by Service Type',
    description: 'Revenue breakdown by service type (dinner party, brunch, wedding, etc.).',
    inputSchema: '{}',
  },

  // Goal Intelligence
  {
    type: 'goals.history',
    tier: 1,
    name: 'Goal History',
    description: 'Show progress snapshots for a specific goal over time.',
    inputSchema: '{ "goalId": "string - goal ID" }',
  },
  {
    type: 'goals.check_ins',
    tier: 1,
    name: 'Goal Check-ins',
    description: 'Show recent check-in entries for a specific goal.',
    inputSchema: '{ "goalId": "string - goal ID" }',
  },

  // Protection & Compliance
  {
    type: 'protection.certifications',
    tier: 1,
    name: 'Certification Status',
    description: 'Show food safety certifications - active, expiring soon, missing.',
    inputSchema: '{}',
  },
  {
    type: 'protection.business_health',
    tier: 1,
    name: 'Business Health Score',
    description:
      'Overall business health score and checklist - insurance, certs, contracts, compliance.',
    inputSchema: '{}',
  },

  // Loyalty Intelligence
  {
    type: 'loyalty.redemptions',
    tier: 1,
    name: 'Loyalty Redemptions',
    description: 'Show recent loyalty point redemptions and rewards claimed.',
    inputSchema: '{}',
  },
  {
    type: 'loyalty.gift_cards',
    tier: 1,
    name: 'Gift Cards',
    description: 'Show gift card inventory - balances, status, purchasers.',
    inputSchema: '{}',
  },

  // Inventory Intelligence
  {
    type: 'inventory.status',
    tier: 1,
    name: 'Inventory Status',
    description: 'Show inventory levels - items on hand, low stock alerts, reorder points.',
    inputSchema: '{}',
  },
  {
    type: 'inventory.purchase_orders',
    tier: 1,
    name: 'Purchase Orders',
    description: 'Show recent purchase orders - status, vendor, totals.',
    inputSchema: '{}',
  },

  // Commerce Intelligence
  {
    type: 'commerce.sales_summary',
    tier: 1,
    name: 'Sales Summary',
    description: "Show today's point-of-sale transactions and totals.",
    inputSchema: '{}',
  },

  // Guest Intelligence
  {
    type: 'guest.list',
    tier: 1,
    name: 'Guest List',
    description: 'Show guest list for an event - names, dietary restrictions, RSVP status.',
    inputSchema: '{ "eventName": "string - event name or occasion" }',
  },

  // Marketing Intelligence
  {
    type: 'marketing.campaigns',
    tier: 1,
    name: 'Campaign Status',
    description: 'Show marketing campaigns - send counts, open rates, click rates.',
    inputSchema: '{}',
  },
  {
    type: 'marketing.newsletters',
    tier: 1,
    name: 'Newsletter Status',
    description: 'Show sent newsletters and their performance.',
    inputSchema: '{}',
  },

  // Review Intelligence
  {
    type: 'reviews.summary',
    tier: 1,
    name: 'Reviews Summary',
    description: 'Show client reviews - ratings, comments, average score.',
    inputSchema: '{}',
  },

  // Gmail Intelligence
  {
    type: 'gmail.sender_reputation',
    tier: 1,
    name: 'Sender Reputation',
    description: 'Show email sender reputation scores - who sends important vs spam emails.',
    inputSchema: '{}',
  },

  // Notification Intelligence
  {
    type: 'notifications.preferences',
    tier: 1,
    name: 'Notification Preferences',
    description: 'Show current notification settings and preferences.',
    inputSchema: '{}',
  },

  // Document Intelligence
  {
    type: 'document.snapshots',
    tier: 1,
    name: 'Document Versions',
    description: 'Show version history/snapshots for a specific document.',
    inputSchema: '{ "documentId": "string - document ID" }',
  },

  // ─── Batch 3: Gap Closure ─────────────────────────────────────────────────

  // Hub Circles
  {
    type: 'circles.list',
    tier: 1,
    name: 'My Circles',
    description:
      'List all dinner circles/hub groups with member count, unread messages, and activity.',
    inputSchema: '{}',
  },
  {
    type: 'circles.unread',
    tier: 1,
    name: 'Circle Unread Count',
    description: 'Get total unread message count across all circles.',
    inputSchema: '{}',
  },
  {
    type: 'circles.events',
    tier: 1,
    name: 'Circle Events',
    description: 'List events linked to a specific circle.',
    inputSchema: '{ "circleName": "string - circle name to look up" }',
  },

  // Rate Card
  {
    type: 'rate_card.summary',
    tier: 1,
    name: 'Rate Card Summary',
    description:
      'Show rate card with default rate, service types, average per-head pricing from recent events.',
    inputSchema: '{}',
  },

  // Tasks / Kanban
  {
    type: 'tasks.list',
    tier: 1,
    name: 'Task List',
    description:
      'List tasks from the kanban board. Can filter by status (pending, in_progress, completed).',
    inputSchema: '{ "status": "string - optional filter: pending, in_progress, completed" }',
  },
  {
    type: 'tasks.by_date',
    tier: 1,
    name: 'Tasks by Date',
    description: 'List tasks due on a specific date.',
    inputSchema: '{ "date": "string - YYYY-MM-DD, defaults to today" }',
  },
  {
    type: 'tasks.overdue',
    tier: 1,
    name: 'Overdue Tasks',
    description: 'List tasks that are past due but not completed.',
    inputSchema: '{}',
  },

  // Travel
  {
    type: 'travel.plan',
    tier: 1,
    name: 'Travel Plan',
    description:
      'Get the travel/logistics plan for a specific event including legs, departure/arrival times.',
    inputSchema: '{ "eventName": "string - event occasion or ID" }',
  },
  {
    type: 'travel.upcoming',
    tier: 1,
    name: 'Upcoming Travel',
    description: 'List upcoming travel legs across all events.',
    inputSchema: '{}',
  },

  // Commerce / POS
  {
    type: 'commerce.products',
    tier: 1,
    name: 'Product Inventory',
    description: 'List active commerce products with pricing, cost, and stock levels.',
    inputSchema: '{}',
  },
  {
    type: 'commerce.recent_sales',
    tier: 1,
    name: 'Recent Sales',
    description: 'List recent POS transactions with totals and item counts.',
    inputSchema: '{}',
  },
  {
    type: 'commerce.daily_report',
    tier: 1,
    name: 'Daily Sales Report',
    description: "Today's sales report with total revenue, tax, average sale, and top products.",
    inputSchema: '{}',
  },
  {
    type: 'commerce.product_report',
    tier: 1,
    name: 'Product Sales Report',
    description:
      'Product-level sales report for the last 30 days with units sold, revenue, and margins.',
    inputSchema: '{}',
  },
  {
    type: 'commerce.inventory_low',
    tier: 1,
    name: 'Low Stock Alert',
    description: 'List products that are at or below their reorder point.',
    inputSchema: '{}',
  },

  // Daily Ops
  {
    type: 'daily.plan',
    tier: 1,
    name: 'Daily Plan',
    description: "Get today's daily operations plan with events, tasks, and priorities.",
    inputSchema: '{}',
  },
  {
    type: 'daily.stats',
    tier: 1,
    name: 'Daily Plan Stats',
    description: "Get statistics on today's daily plan completion rate.",
    inputSchema: '{}',
  },

  // Priority Queue
  {
    type: 'queue.status',
    tier: 1,
    name: 'Priority Queue',
    description:
      'Show the priority queue with items ranked by urgency (inquiries, events, quotes, messages).',
    inputSchema: '{}',
  },

  // Stations
  {
    type: 'stations.list',
    tier: 1,
    name: 'Kitchen Stations',
    description: 'List all kitchen stations with their menu items and components.',
    inputSchema: '{}',
  },
  {
    type: 'stations.detail',
    tier: 1,
    name: 'Station Detail',
    description:
      'Get full details for a specific station including assigned menu items and components.',
    inputSchema: '{ "stationName": "string - station name or ID" }',
  },
  {
    type: 'stations.ops_log',
    tier: 1,
    name: 'Operations Log',
    description:
      'Show the kitchen operations log with recent actions, optionally filtered by station.',
    inputSchema: '{ "stationName": "string - optional, filter by station name" }',
  },
  {
    type: 'stations.waste_log',
    tier: 1,
    name: 'Waste Summary',
    description: 'Show food waste summary for the last 30 days across all stations.',
    inputSchema: '{}',
  },

  // Testimonials
  {
    type: 'testimonials.list',
    tier: 1,
    name: 'Testimonials',
    description: 'List testimonials with ratings, approval status, and averages.',
    inputSchema: '{}',
  },
  {
    type: 'testimonials.pending',
    tier: 1,
    name: 'Pending Testimonials',
    description: 'List testimonials waiting for approval.',
    inputSchema: '{}',
  },

  // Partners / Referrals
  {
    type: 'partners.list',
    tier: 1,
    name: 'Referral Partners',
    description: 'List referral partners with type, status, and contact info.',
    inputSchema: '{}',
  },
  {
    type: 'partners.events',
    tier: 1,
    name: 'Partner Events',
    description: 'List events generated by a specific referral partner.',
    inputSchema: '{ "partnerName": "string - partner name or ID" }',
  },
  {
    type: 'partners.performance',
    tier: 1,
    name: 'Partner Performance',
    description: 'Rank referral partners by number of events generated.',
    inputSchema: '{}',
  },

  // Activity Feed
  {
    type: 'activity.feed',
    tier: 1,
    name: 'Activity Feed',
    description: 'Show recent activity across the platform (events, clients, finances, etc.).',
    inputSchema: '{}',
  },
  {
    type: 'activity.engagement',
    tier: 1,
    name: 'Engagement Stats',
    description: 'Show client engagement statistics and metrics.',
    inputSchema: '{}',
  },

  // AAR (After-Action Reviews)
  {
    type: 'aar.list',
    tier: 1,
    name: 'Recent AARs',
    description: 'List recent after-action reviews with ratings and event details.',
    inputSchema: '{}',
  },
  {
    type: 'aar.stats',
    tier: 1,
    name: 'AAR Statistics',
    description: 'Get aggregate AAR statistics (average ratings, completion rates).',
    inputSchema: '{}',
  },
  {
    type: 'aar.events_without',
    tier: 1,
    name: 'Events Missing AAR',
    description: 'List completed events that still need an after-action review filed.',
    inputSchema: '{}',
  },
  {
    type: 'aar.forgotten_items',
    tier: 1,
    name: 'Frequently Forgotten Items',
    description: 'Show items that are most frequently forgotten across events (from AAR data).',
    inputSchema: '{}',
  },

  // Waitlist
  {
    type: 'waitlist.status',
    tier: 1,
    name: 'Waitlist',
    description: 'Show clients currently on the waitlist.',
    inputSchema: '{}',
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
    // Agent actions not available - skip
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
    // Agent registry not available - fall through
  }
  return TASK_DESCRIPTIONS.find((t) => t.type === taskType)?.name ?? taskType
}
