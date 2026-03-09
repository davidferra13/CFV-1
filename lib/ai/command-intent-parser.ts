'use server'

// Ask Remy — Intent Parser
// PRIVACY: Chef commands may contain client names, financial details — must stay local.
// Parses freeform chef input into a structured task plan using local Ollama only.

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { buildTaskListForPrompt } from '@/lib/ai/command-task-descriptions'
import { buildRouteLookupMap } from '@/lib/navigation/route-registry'
import type { CommandPlan, PlannedTask } from '@/lib/ai/command-types'

// ─── Zod Schema for Ollama Output ─────────────────────────────────────────────

const PlannedTaskSchema = z.object({
  id: z.string(),
  taskType: z.string(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  confidence: z.number().min(0).max(1),
  inputs: z.record(z.string(), z.unknown()),
  dependsOn: z.array(z.string()).default([]),
  holdReason: z.string().optional(),
})

const CommandPlanSchema = z.object({
  overallConfidence: z.number().min(0).max(1),
  tasks: z.array(PlannedTaskSchema),
})

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const taskList = buildTaskListForPrompt()
  return `You are an AI orchestrator for ChefFlow, a private chef business management platform.

Given a chef's natural language command, decompose it into a list of executable tasks.

AVAILABLE TASKS:
${taskList}

RULES:
1. Tasks with no dependencies should run in parallel — set dependsOn to [].
2. If task B needs data from task A (e.g. email needs a client lookup first), set B.dependsOn = ["t1"].
3. If confidence < 0.7 for any subtask, set that subtask tier to 3 and add a holdReason.
4. email.* tasks are ALWAYS tier 2 — even if the chef says "send". Never auto-send.
5. event.create_draft is ALWAYS tier 2.
6. If you cannot match part of the command to a known task, create a tier 3 entry with a clear holdReason.
7. Ambiguous entity (e.g. chef says "Sarah" but there are multiple clients named Sarah) → tier 3.
8. overallConfidence is your confidence in the full decomposition.
9. agent.* tasks are ALWAYS tier 2 — they modify data and require chef approval. No exceptions.
10. agent.ledger_write, agent.modify_roles, agent.delete_data, agent.send_email, agent.refund are ALWAYS tier 3.
11. When the chef says "create", "add", "make", "set up", "update", "change", "edit", "move", "transition", "log", "schedule", "record" — use agent.* write tasks.
12. For agent.* tasks, include all available info in the inputs even if incomplete — the executor handles missing fields.
13. Prefer agent.create_event over event.create_draft — it is more capable.
14. If a message asks to create/update clients and also mentions allergies/dietary info, do NOT route to dietary.check unless the chef explicitly asks to run a dietary/menu safety check.
15. If the chef asks to create more than one client/person in one message, emit one write task per person (multiple agent.create_client tasks OR a single intake task that clearly covers all people).
16. If the chef asks for a reminder/task ("remind me", "set a reminder", "don't let me forget"), include agent.create_todo.

OUTPUT FORMAT — return ONLY valid JSON, no markdown:
{
  "overallConfidence": 0.95,
  "tasks": [
    {
      "id": "t1",
      "taskType": "client.search",
      "tier": 1,
      "confidence": 0.95,
      "inputs": { "query": "<client name from chef's message>" },
      "dependsOn": []
    },
    {
      "id": "t2",
      "taskType": "email.followup",
      "tier": 2,
      "confidence": 0.90,
      "inputs": { "clientName": "<client name from chef's message>" },
      "dependsOn": ["t1"]
    }
  ]
}`
}

// ─── Deterministic Intent Bypass (Formula > AI) ─────────────────────────────
// Skips Ollama for common, unambiguous command patterns. Saves 2-5s per command.

interface DeterministicPattern {
  pattern: RegExp
  build: (match: RegExpMatchArray, raw: string) => CommandPlan
}

// Helper to reduce boilerplate for simple single-task patterns
function makeSimpleBuild(
  taskType: string,
  inputsFn?: (match: RegExpMatchArray) => Record<string, unknown>
): DeterministicPattern['build'] {
  return (match, raw) => ({
    rawInput: raw,
    overallConfidence: 0.95,
    tasks: [
      {
        id: 't1',
        taskType,
        tier: 1,
        confidence: 0.95,
        inputs: inputsFn ? inputsFn(match) : {},
        dependsOn: [],
      },
    ],
  })
}

const buildSimpleTask = makeSimpleBuild

const DETERMINISTIC_PATTERNS: DeterministicPattern[] = [
  // "Draft/write a [type] for [name]"
  {
    pattern:
      /^(?:draft|write)\s+(?:a\s+)?(?:thank[- ]?you|thank you note|follow[- ]?up|referral request|testimonial request|payment reminder|re-?engagement|decline|cancellation response|cover letter)\s+(?:for|to)\s+(.+?)(?:\s+for\s+(?:being|their|the|his|her|having|always)|$)/i,
    build: (match, raw) => {
      const draftTypeMap: Record<string, string> = {
        'thank you': 'draft.thank_you',
        'thank-you': 'draft.thank_you',
        thankyou: 'draft.thank_you',
        'follow up': 'email.followup',
        'follow-up': 'email.followup',
        followup: 'email.followup',
        referral: 'draft.referral_request',
        'referral request': 'draft.referral_request',
        testimonial: 'draft.testimonial_request',
        'testimonial request': 'draft.testimonial_request',
        'payment reminder': 'draft.payment_reminder',
        reengagement: 'draft.re_engagement',
        're-engagement': 'draft.re_engagement',
        're engagement': 'draft.re_engagement',
        decline: 'draft.decline_response',
        cancellation: 'draft.cancellation_response',
        'cancellation response': 'draft.cancellation_response',
        'cover letter': 'draft.quote_cover_letter',
      }
      const lower = raw.toLowerCase()
      let taskType = 'email.followup'
      for (const [key, type] of Object.entries(draftTypeMap)) {
        if (lower.includes(key)) {
          taskType = type
          break
        }
      }
      return {
        rawInput: raw,
        overallConfidence: 0.95,
        tasks: [
          {
            id: 't1',
            taskType: 'client.search',
            tier: 1,
            confidence: 0.95,
            inputs: { query: match[1].trim() },
            dependsOn: [],
          },
          {
            id: 't2',
            taskType,
            tier: 2,
            confidence: 0.95,
            inputs: { clientName: match[1].trim() },
            dependsOn: ['t1'],
          },
        ],
      }
    },
  },
  // "Check if [date] is free" / "Am I free on [date]"
  {
    pattern: /^(?:check if|is|am i free on|am i free)\s+(.+?)(?:\s+(?:is )?free)?$/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'calendar.check',
          tier: 1,
          confidence: 0.95,
          inputs: { date: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Find/search [name]" (client search)
  {
    pattern: /^(?:find|search for|look up|search)\s+(?:my\s+)?(?:client\s+)?(.+)/i,
    build: (match, raw) => {
      // Don't match web searches
      if (/^(?:the web|online|google|web for)/i.test(match[1])) return null as any
      return {
        rawInput: raw,
        overallConfidence: 0.92,
        tasks: [
          {
            id: 't1',
            taskType: 'client.search',
            tier: 1,
            confidence: 0.92,
            inputs: { query: match[1].trim() },
            dependsOn: [],
          },
        ],
      }
    },
  },
  // "Create/make/add a client named [name] ..." — routes to agent.create_client
  // which has full executor + commitAction flow (Ollama parses the NL description)
  {
    pattern:
      /^(?:please\s+)?(?:create|make|add)\s+(?:me\s+)?(?:a\s+)?(?:new\s+)?client\s+(?:named?\s+|called\s+)?(.+)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_client',
          tier: 2,
          confidence: 0.95,
          inputs: { description: _match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Create an event for [name] on [date]"
  {
    pattern: /^(?:create|make|add|set up)\s+(?:an?\s+)?event\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_event',
          tier: 2,
          confidence: 0.92,
          inputs: { description: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Scale [recipe] for [N] guests/people/portions"
  {
    pattern:
      /^(?:scale|portion)\s+(?:my\s+)?(.+?)\s+(?:for|to)\s+(\d+)\s+(?:guests?|people|portions?|servings?)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'ops.portion_calc',
          tier: 1,
          confidence: 0.95,
          inputs: { recipeName: match[1].trim(), guestCount: parseInt(match[2]) },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Packing list for [event]"
  {
    pattern: /^(?:generate|create|make|get)\s+(?:a\s+)?packing list\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'ops.packing_list',
          tier: 1,
          confidence: 0.95,
          inputs: { eventDescription: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Search the web for [query]" / "Google [query]"
  {
    pattern: /^(?:search the web|google|look up online|web search)\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'web.search',
          tier: 1,
          confidence: 0.95,
          inputs: { query: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Read [URL]"
  {
    pattern: /^(?:read|fetch|open)\s+(https?:\/\/.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.98,
      tasks: [
        {
          id: 't1',
          taskType: 'web.read',
          tier: 1,
          confidence: 0.98,
          inputs: { url: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Check dietary/allergies for [name]" / "Does [name] have allergies"
  {
    pattern:
      /^(?:check|show|what are)\s+(?:the\s+)?(?:dietary|allergies|allergy|restrictions)\s+(?:for|of)\s+(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'dietary.check',
          tier: 1,
          confidence: 0.95,
          inputs: { clientName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Show open tables" / "Open tables near me"
  {
    pattern: /^(?:show|list|find|browse|get)\s+(?:me\s+)?(?:the\s+)?open\s+tables?/i,
    build: buildSimpleTask('open_tables.browse'),
  },
  // "Open my table" / "Open my dinner" / "Make my circle discoverable"
  {
    pattern:
      /^(?:open|make|set)\s+(?:my\s+)?(?:table|dinner|circle)\s+(?:discoverable|open|public|visible)/i,
    build: buildSimpleTask('open_tables.enable'),
  },
  // "How many open table requests" / "Pending join requests"
  {
    pattern: /^(?:how many|show|list|any|pending)\s+(?:open\s+table\s+)?(?:join\s+)?requests?/i,
    build: buildSimpleTask('open_tables.requests'),
  },
  // "Break-even analysis for [event]"
  {
    pattern: /^break[- ]?even\s+(?:analysis\s+)?(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'analytics.break_even',
          tier: 1,
          confidence: 0.95,
          inputs: { eventDescription: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Remind me to [task]" / "Don't let me forget to [task]"
  {
    pattern: /^(?:remind me|don'?t let me forget|set a reminder)\s+(?:to\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_todo',
          tier: 2,
          confidence: 0.95,
          inputs: { title: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "If [date] is free, [action]" — conditional command chaining
  {
    pattern: /^if\s+(.+?)\s+(?:is\s+)?(?:free|available|open)[,.]?\s+(?:then\s+)?(.+)/i,
    build: (match, raw) => {
      const dateStr = match[1].trim()
      const actionStr = match[2].trim()

      // Parse the action part to determine what to do if the date is free
      // Default to event creation if the action mentions "create", "book", "schedule"
      let actionTask: { taskType: string; inputs: Record<string, unknown> } = {
        taskType: 'agent.create_event',
        inputs: { description: actionStr },
      }

      // Try to detect specific action types from the conditional action
      if (/^(?:draft|write)\s+/i.test(actionStr)) {
        actionTask = { taskType: 'email.followup', inputs: { description: actionStr } }
      } else if (/^(?:remind|set a reminder)/i.test(actionStr)) {
        actionTask = { taskType: 'agent.create_todo', inputs: { title: actionStr } }
      }

      return {
        rawInput: raw,
        overallConfidence: 0.9,
        tasks: [
          {
            id: 't1',
            taskType: 'calendar.check',
            tier: 1,
            confidence: 0.95,
            inputs: { date: dateStr },
            dependsOn: [],
          },
          {
            id: 't2',
            taskType: actionTask.taskType,
            tier: 2,
            confidence: 0.9,
            inputs: actionTask.inputs,
            dependsOn: ['t1'],
            holdReason: `Waiting to confirm ${dateStr} is available`,
          },
        ],
      }
    },
  },
  // "Show my inbox" / "Check emails" / "Inbox summary"
  {
    pattern: /^(?:show|check|summarize|read)\s+(?:my\s+)?(?:inbox|emails?|mail)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'email.inbox_summary',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Show my profile" / "My culinary profile"
  {
    pattern: /^(?:show|view|display)\s+(?:my\s+)?(?:culinary\s+)?profile/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'profile.culinary',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Show my favorite chefs" / "Who are my culinary heroes"
  {
    pattern: /^(?:show|list|who are)\s+(?:my\s+)?(?:favorite|fav|culinary)\s+(?:chefs|heroes)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'profile.favorite_chefs',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "What's [name]'s lifetime value" / "LTV for [name]"
  {
    pattern: /^(?:what'?s|calculate|show)\s+(.+?)(?:'s)?\s+(?:lifetime value|ltv|total spend)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'analytics.client_ltv',
          tier: 1,
          confidence: 0.95,
          inputs: { clientName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Prep timeline for [event/name]"
  {
    pattern: /^(?:generate|create|make|show)\s+(?:a\s+)?(?:prep\s+)?timeline\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'ops.prep_timeline',
          tier: 1,
          confidence: 0.95,
          inputs: { eventDescription: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Import [clients/list/contacts]" / "Bulk import"
  {
    pattern:
      /^(?:import|bulk import)\s+(?:my\s+)?(?:client\s+list|clients?|contacts?|list)\s*(?::\s*)?(.+)?/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.intake',
          tier: 2,
          confidence: 0.92,
          inputs: { description: match[1]?.trim() ?? raw },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Log/add expense [amount] for [event/category]"
  {
    pattern:
      /^(?:log|add|record)\s+(?:an?\s+)?expense\s+(?:of\s+)?\$?(\d+(?:\.\d+)?)\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_expense',
          tier: 2,
          confidence: 0.95,
          inputs: {
            amountCents: Math.round(parseFloat(match[1]) * 100),
            description: match[2].trim(),
          },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Log/add expense for [event]" (no amount)
  {
    pattern: /^(?:log|add|record)\s+(?:an?\s+)?expense\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_expense',
          tier: 2,
          confidence: 0.9,
          inputs: { description: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Add/create client [name]"
  {
    pattern: /^(?:add|create|new)\s+(?:a\s+)?client\s+(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_client',
          tier: 2,
          confidence: 0.95,
          inputs: { name: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Send/draft invoice for [name/event]"
  {
    pattern: /^(?:send|draft|create|generate)\s+(?:an?\s+)?invoice\s+(?:for|to)\s+(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'client.search',
          tier: 1,
          confidence: 0.92,
          inputs: { query: match[1].trim() },
          dependsOn: [],
        },
        {
          id: 't2',
          taskType: 'agent.create_invoice',
          tier: 2,
          confidence: 0.92,
          inputs: { clientName: match[1].trim() },
          dependsOn: ['t1'],
        },
      ],
    }),
  },
  // "Food safety incident" / "Write up incident"
  {
    pattern:
      /^(?:write up|log|record|report)\s+(?:a\s+|the\s+)?(?:food\s+)?(?:safety\s+)?incident\s*(?:from\s+)?(.+)?/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'ops.incident_report',
          tier: 2,
          confidence: 0.95,
          inputs: { description: match[1]?.trim() ?? raw },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Cross contamination check for [event/client]"
  {
    pattern:
      /^(?:check|run)\s+(?:a\s+)?(?:cross[- ]?contamination|allergen|allergy)\s+(?:check|risk|analysis)\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'dietary.cross_contamination',
          tier: 1,
          confidence: 0.95,
          inputs: { eventDescription: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Cost optimization for [recipe]" / "Optimize costs for [recipe]"
  {
    pattern: /^(?:cost\s+)?optimi[sz](?:e|ation)\s+(?:costs?\s+)?(?:for\s+)?(?:my\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'analytics.cost_optimization',
          tier: 1,
          confidence: 0.92,
          inputs: { recipeName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Recap [event/name]" / "Event recap"
  {
    pattern: /^(?:recap|debrief|review)\s+(?:the\s+)?(.+?)(?:\s+event|\s+dinner|\s+service)?$/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'analytics.event_recap',
          tier: 1,
          confidence: 0.92,
          inputs: { eventDescription: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Block off [date]" / "Block [date]"
  {
    pattern: /^(?:block|block off|hold|reserve)\s+(.+?)(?:\s+(?:for\s+)?(.+))?$/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'calendar.block',
          tier: 2,
          confidence: 0.92,
          inputs: { date: match[1].trim(), reason: match[2]?.trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Show/list my events" / "Upcoming events" / "What events do I have"
  {
    pattern: /^(?:show|list|display|what)\s+(?:are\s+)?(?:my\s+)?(?:upcoming\s+)?events/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'event.list',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Show/list my clients" / "Client list"
  {
    pattern: /^(?:show|list|display)\s+(?:my\s+)?(?:all\s+)?clients/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'client.list',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Navigate/go to [page]"
  {
    pattern: /^(?:go to|navigate to|take me to|open)\s+(?:the\s+)?(.+)/i,
    build: (match, raw) => {
      const dest = match[1].trim().toLowerCase()
      // Auto-generated from route-registry.ts (single source of truth)
      const routeMap: Record<string, string> = {
        ...buildRouteLookupMap(),
        // Aliases not in the registry
        hub: '/circles',
        rates: '/rate-card',
        pos: '/commerce/register',
        'daily ops': '/daily',
        waitlist: '/waitlist',
      }
      const route = routeMap[dest]
      if (!route) return null as any
      return {
        rawInput: raw,
        overallConfidence: 0.98,
        tasks: [
          {
            id: 't1',
            taskType: 'navigation.goto',
            tier: 1,
            confidence: 0.98,
            inputs: { route },
            dependsOn: [],
          },
        ],
      }
    },
  },

  // ─── Remy Intelligence Patterns ──────────────────────────────────────────

  // "What's in season" / "Seasonal produce"
  {
    pattern: /^(?:what'?s|show|list)\s+(?:in\s+season|seasonal\s+(?:produce|ingredients?|items?))/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.98,
      tasks: [
        {
          id: 't1',
          taskType: 'seasonal.produce',
          tier: 1,
          confidence: 0.98,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Revenue forecast" / "What does next month look like"
  {
    pattern:
      /^(?:revenue\s+forecast|forecast\s+revenue|what\s+does?\s+(?:next|my)\s+(?:month|quarter|week)\s+look\s+like|project\s+(?:my\s+)?revenue)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'finance.forecast',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "P&L" / "Profit and loss" / "How did I do this month"
  {
    pattern:
      /^(?:p\s*&?\s*l|profit\s+(?:and|&)\s+loss|how\s+did\s+i\s+do\s+(?:this|last)\s+month)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        { id: 't1', taskType: 'finance.pnl', tier: 1, confidence: 0.95, inputs: {}, dependsOn: [] },
      ],
    }),
  },
  // "Tax summary" / "Deductible expenses"
  {
    pattern: /^(?:tax\s+summary|deductible\s+expenses|tax\s+prep|prepare\s+(?:for\s+)?taxes)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'finance.tax_summary',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Pricing analysis" / "How does my pricing compare" / "Average per head"
  {
    pattern:
      /^(?:pricing\s+analysis|analyze\s+(?:my\s+)?pricing|average\s+per\s+head|(?:how\s+does?\s+)?my\s+pricing|should\s+i\s+raise\s+(?:my\s+)?rates)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'finance.pricing',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Can I take more work" / "Am I overbooked" / "Utilization"
  {
    pattern:
      /^(?:can\s+i\s+take\s+(?:more|another)|am\s+i\s+overbooked|utilization|workload|how\s+(?:busy|booked)\s+am\s+i)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'capacity.utilization',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Upcoming milestones" / "Any birthdays" / "Client anniversaries"
  {
    pattern:
      /^(?:upcoming\s+milestones?|any\s+(?:upcoming\s+)?birthdays?|client\s+anniversar|milestone\s+check)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'relationship.milestones',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Dormant clients" / "Who should I re-engage" / "Re-engagement"
  {
    pattern:
      /^(?:dormant\s+clients?|who\s+should\s+i\s+re-?engage|re-?engagement\s+(?:scoring|list|candidates)|clients?\s+to\s+re-?engage)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'relationship.reengagement',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Where do my clients come from" / "Acquisition funnel" / "Conversion rate"
  {
    pattern:
      /^(?:where\s+do\s+(?:my\s+)?(?:best\s+)?clients?\s+come\s+from|acquisition\s+funnel|conversion\s+rate|inquiry\s+(?:to\s+)?booking\s+(?:rate|conversion)|referral\s+sources?)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'relationship.acquisition',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Goals" / "How am I tracking"
  {
    pattern:
      /^(?:show\s+(?:my\s+)?goals?|how\s+am\s+i\s+tracking|goal\s+(?:progress|dashboard|status))/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'goals.dashboard',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Equipment" / "My equipment" / "Equipment maintenance"
  {
    pattern:
      /^(?:show\s+(?:my\s+)?equipment|equipment\s+(?:list|status)|what\s+equipment\s+do\s+i\s+(?:have|own))/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'equipment.list',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Equipment due for maintenance" / "Maintenance schedule"
  {
    pattern:
      /^(?:equipment\s+(?:due\s+for\s+)?maintenance|maintenance\s+(?:due|schedule|overdue)|what\s+needs?\s+maintenance)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'equipment.maintenance',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Vendors" / "My suppliers" / "Vendor list"
  {
    pattern:
      /^(?:show\s+(?:my\s+)?vendors?|vendor\s+list|my\s+suppliers?|show\s+(?:my\s+)?suppliers?)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'vendors.list',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "Generate contract for [event]"
  {
    pattern: /^(?:generate|create|draft)\s+(?:a\s+)?contract\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'contract.generate',
          tier: 2,
          confidence: 0.95,
          inputs: { eventName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Contingency plan for [event]" / "What if something goes wrong at [event]"
  {
    pattern:
      /^(?:contingency\s+plan|backup\s+plan|what\s+if\s+something\s+goes\s+wrong)\s+(?:for|at)\s+(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'contingency.plan',
          tier: 2,
          confidence: 0.95,
          inputs: { eventName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Consolidate grocery list for [event]" / "Shopping list for [event]"
  {
    pattern: /^(?:consolidate|combined?|full)\s+(?:grocery|shopping)\s+list\s+(?:for\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'grocery.consolidate',
          tier: 2,
          confidence: 0.95,
          inputs: { eventName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Compare [event1] to/and/vs [event2]"
  {
    pattern: /^compare\s+(?:the\s+)?(.+?)\s+(?:to|and|vs\.?|versus|with)\s+(?:the\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'analytics.compare_events',
          tier: 1,
          confidence: 0.92,
          inputs: { event1: match[1].trim(), event2: match[2].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Morning briefing" / "Good morning" / "What's today look like"
  {
    pattern:
      /^(?:morning\s+briefing|good\s+morning|what'?s\s+(?:today|my\s+day)\s+look\s+like|(?:daily|today'?s?)\s+briefing|brief\s+me)/i,
    build: (_match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'briefing.morning',
          tier: 1,
          confidence: 0.95,
          inputs: {},
          dependsOn: [],
        },
      ],
    }),
  },
  // "[Event] just cancelled" / "Cancellation impact for [event]"
  {
    pattern:
      /^(?:(?:the\s+)?(.+?)\s+(?:just\s+)?cancelled|cancellation\s+impact\s+(?:for|of)\s+(.+))/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.92,
      tasks: [
        {
          id: 't1',
          taskType: 'workflow.cancellation_impact',
          tier: 1,
          confidence: 0.92,
          inputs: { eventName: (match[1] ?? match[2]).trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "Post-event checklist for [event]" / "What do I need to do after [event]"
  {
    pattern:
      /^(?:post[- ]event\s+(?:checklist|sequence|steps?)|what\s+(?:do\s+i\s+need|should\s+i\s+do)\s+after)\s+(?:for\s+|the\s+)?(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'workflow.post_event',
          tier: 1,
          confidence: 0.95,
          inputs: { eventName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },
  // "What can I use instead of [ingredient]" / "Substitute for [ingredient]"
  {
    pattern:
      /^(?:what\s+can\s+i\s+use\s+instead\s+of|substitute\s+for|replacement\s+for|swap\s+(?:for|out))\s+(.+)/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'ops.ingredient_sub',
          tier: 1,
          confidence: 0.95,
          inputs: { ingredient: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },

  // ─── Batch 2: Complete Domain Coverage ─────────────────────────────────────

  // Client Intelligence
  {
    pattern: /^(client|customer)\s+spending/i,
    build: makeSimpleBuild('client.spending'),
  },
  {
    pattern: /^(churn|at.risk|losing)\s+(clients?|customers?)/i,
    build: makeSimpleBuild('client.churn_risk'),
  },
  {
    pattern: /^(who.?s?\s+at\s+risk|churn\s+risk)/i,
    build: makeSimpleBuild('client.churn_risk'),
  },
  {
    pattern: /^(upcoming\s+)?birthdays?/i,
    build: makeSimpleBuild('client.birthdays'),
  },
  {
    pattern: /^(next\s+best\s+action|what\s+should\s+i\s+do\s+next|nba)/i,
    build: makeSimpleBuild('client.next_best_action'),
  },
  {
    pattern: /^(cooling|dormant|inactive|going\s+cold)\s+(clients?|customers?)/i,
    build: makeSimpleBuild('client.cooling'),
  },
  {
    pattern: /^(who.?s?\s+going\s+cold|who\s+haven.?t\s+i\s+seen)/i,
    build: makeSimpleBuild('client.cooling'),
  },
  {
    pattern: /^(ltv|lifetime\s+value)\s+(trajectory|trend|projection)\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('client.ltv_trajectory', (m) => ({ clientName: m[3].trim() })),
  },
  {
    pattern: /^what\s+has\s+(.+)\s+been\s+served/i,
    build: makeSimpleBuild('client.menu_history', (m) => ({ clientName: m[1].trim() })),
  },
  {
    pattern: /^(menu\s+history|dish\s+history)\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('client.menu_history', (m) => ({ clientName: m[2].trim() })),
  },
  {
    pattern: /^referral\s+(health|pipeline|stats)/i,
    build: makeSimpleBuild('client.referral_health'),
  },
  {
    pattern: /^(nda|non.?disclosure)\s+(status|list)/i,
    build: makeSimpleBuild('client.nda_status'),
  },
  {
    pattern: /^(who\s+refers|top\s+referrers)/i,
    build: makeSimpleBuild('client.referral_health'),
  },

  // Event Intelligence
  {
    pattern: /^(dietary|allergen)\s+(conflict|check|clash)\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('event.dietary_conflicts', (m) => ({ eventName: m[3].trim() })),
  },
  {
    pattern: /^debrief\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('event.debrief', (m) => ({ eventName: m[1].trim() })),
  },
  {
    pattern: /^(countdown|days?\s+until)\s+(?:for\s+|to\s+)?(.+)/i,
    build: makeSimpleBuild('event.countdown', (m) => ({ eventName: m[2].trim() })),
  },
  {
    pattern: /^(how\s+many\s+days?\s+until|when\s+is)\s+(.+)/i,
    build: makeSimpleBuild('event.countdown', (m) => ({ eventName: m[2].trim() })),
  },
  {
    pattern: /^(show|get|pull\s+up)\s+(the\s+)?invoice\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('event.invoice', (m) => ({ eventName: m[3].trim() })),
  },
  {
    pattern: /^invoice\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('event.invoice', (m) => ({ eventName: m[1].trim() })),
  },

  // Inquiry Intelligence
  {
    pattern: /^(stale|cold|overdue)\s+(inquir|lead)/i,
    build: makeSimpleBuild('inquiry.follow_ups'),
  },
  {
    pattern: /^(follow.?ups?|who\s+needs?\s+follow.?up)/i,
    build: makeSimpleBuild('inquiry.follow_ups'),
  },
  {
    pattern: /^(inquiry|lead)\s+(likelihood|probability|scoring|rank)/i,
    build: makeSimpleBuild('inquiry.likelihood'),
  },

  // Menu Intelligence
  {
    pattern: /^(food\s+cost|menu\s+cost|cost\s+per\s+guest)/i,
    build: makeSimpleBuild('menu.food_cost'),
  },
  {
    pattern: /^(what.?s?\s+my\s+food\s+cost)/i,
    build: makeSimpleBuild('menu.food_cost'),
  },
  {
    pattern: /^(dish\s+index|all\s+dishes|search\s+dishes)/i,
    build: makeSimpleBuild('menu.dish_index'),
  },
  {
    pattern: /^(menu\s+templates?|showcase\s+menus?)/i,
    build: makeSimpleBuild('menu.showcase'),
  },

  // Recipe Intelligence
  {
    pattern: /^(recipe\s+)?allergens?(\s+list)?$/i,
    build: makeSimpleBuild('recipe.allergens'),
  },
  {
    pattern: /^nutrition\s+(?:for\s+|info\s+)?(.+)/i,
    build: makeSimpleBuild('recipe.nutrition', (m) => ({ recipeName: m[1].trim() })),
  },
  {
    pattern: /^production\s+(logs?|history)/i,
    build: makeSimpleBuild('recipe.production_logs'),
  },

  // Finance Intelligence
  {
    pattern: /^cash\s*flow(\s+(forecast|projection))?/i,
    build: makeSimpleBuild('finance.cash_flow'),
  },
  {
    pattern: /^mileage(\s+(summary|total|ytd))?/i,
    build: makeSimpleBuild('finance.mileage'),
  },
  {
    pattern: /^(how\s+many\s+miles|total\s+mileage)/i,
    build: makeSimpleBuild('finance.mileage'),
  },
  {
    pattern: /^tips?(\s+(summary|total|ytd))?$/i,
    build: makeSimpleBuild('finance.tips'),
  },
  {
    pattern: /^(1099|contractor)\s+(summary|payments?|report)/i,
    build: makeSimpleBuild('finance.contractors'),
  },
  {
    pattern: /^(disputes?|chargebacks?)/i,
    build: makeSimpleBuild('finance.disputes'),
  },
  {
    pattern: /^(payment\s+plan)\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('finance.payment_plan', (m) => ({ eventName: m[2].trim() })),
  },
  {
    pattern: /^recurring\s+(invoice|billing)/i,
    build: makeSimpleBuild('finance.recurring_invoices'),
  },
  {
    pattern: /^tax\s+(package|prep|year.?end)/i,
    build: makeSimpleBuild('finance.tax_package'),
  },
  {
    pattern: /^payroll(\s+(summary|report))?/i,
    build: makeSimpleBuild('finance.payroll'),
  },

  // Vendor Intelligence
  {
    pattern: /^(vendor|supplier)\s+invoices?/i,
    build: makeSimpleBuild('vendor.invoices'),
  },
  {
    pattern: /^(what\s+do\s+i\s+owe|outstanding\s+vendor)/i,
    build: makeSimpleBuild('vendor.invoices'),
  },
  {
    pattern: /^(vendor|supplier)\s+price\s+(insights?|trends?|analysis)/i,
    build: makeSimpleBuild('vendor.price_insights'),
  },
  {
    pattern: /^(vendor|supplier)\s+(payment\s+)?aging/i,
    build: makeSimpleBuild('vendor.payment_aging'),
  },

  // Equipment Intelligence
  {
    pattern: /^(equipment\s+)?rentals?(\s+(costs?|summary))?/i,
    build: makeSimpleBuild('equipment.rentals'),
  },

  // Staff Intelligence
  {
    pattern: /^(who.?s?\s+available|staff\s+availability)\s*(on\s+)?(.+)?/i,
    build: makeSimpleBuild('staff.availability', (m) => ({ date: m[3]?.trim() ?? '' })),
  },
  {
    pattern: /^staff\s+briefing\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('staff.briefing', (m) => ({ eventName: m[1].trim() })),
  },
  {
    pattern: /^(hours?\s+worked|time\s+clock|clock\s+summary)\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('staff.clock_summary', (m) => ({ eventName: m[2].trim() })),
  },
  {
    pattern: /^staff\s+(performance|scoreboard|ratings?)/i,
    build: makeSimpleBuild('staff.performance'),
  },
  {
    pattern: /^labor\s+(dashboard|costs?|breakdown)/i,
    build: makeSimpleBuild('staff.labor_dashboard'),
  },

  // Scheduling Intelligence
  {
    pattern: /^(capacity|how\s+booked\s+am\s+i|am\s+i\s+overbooked)/i,
    build: makeSimpleBuild('scheduling.capacity'),
  },
  {
    pattern: /^prep\s+(blocks?|schedule|time)/i,
    build: makeSimpleBuild('scheduling.prep_blocks'),
  },
  {
    pattern: /^(protected|blocked|personal)\s+(time|blocks?)/i,
    build: makeSimpleBuild('scheduling.protected_time'),
  },
  {
    pattern: /^scheduling\s+(gaps?|conflicts?)/i,
    build: makeSimpleBuild('scheduling.gaps'),
  },

  // Analytics Intelligence
  {
    pattern: /^(pipeline|funnel|conversion)\s+(analytics|stats|metrics)/i,
    build: makeSimpleBuild('analytics.pipeline'),
  },
  {
    pattern: /^(inquiry|lead)\s+funnel/i,
    build: makeSimpleBuild('analytics.pipeline'),
  },
  {
    pattern: /^(year.?over.?year|yoy|compared?\s+to\s+last\s+year)/i,
    build: makeSimpleBuild('analytics.yoy'),
  },
  {
    pattern: /^(demand\s+forecast|seasonal\s+heatmap|busy\s+months)/i,
    build: makeSimpleBuild('analytics.demand_forecast'),
  },
  {
    pattern: /^(benchmarks?|how\s+am\s+i\s+doing)/i,
    build: makeSimpleBuild('analytics.benchmarks'),
  },
  {
    pattern: /^(pricing\s+suggest|what\s+should\s+i\s+charge)/i,
    build: makeSimpleBuild('analytics.pricing_suggestions'),
  },
  {
    pattern: /^(response\s+time|how\s+fast\s+do\s+i\s+respond)/i,
    build: makeSimpleBuild('analytics.response_time'),
  },
  {
    pattern: /^(food\s+cost\s+trend|cost\s+trend)/i,
    build: makeSimpleBuild('analytics.cost_trends'),
  },
  {
    pattern: /^referral\s+(analytics|stats|data)/i,
    build: makeSimpleBuild('analytics.referrals'),
  },
  {
    pattern: /^(quote\s+loss|why\s+do\s+quotes?\s+(get\s+)?(declined|rejected|lost))/i,
    build: makeSimpleBuild('analytics.quote_loss'),
  },
  {
    pattern: /^(revenue\s+by\s+service|service\s+mix|service\s+type\s+breakdown)/i,
    build: makeSimpleBuild('analytics.service_mix'),
  },

  // Protection & Compliance
  {
    pattern: /^(certification|cert)\s+(status|expir|list)/i,
    build: makeSimpleBuild('protection.certifications'),
  },
  {
    pattern: /^(food\s+handler|servsafe|health\s+permit)/i,
    build: makeSimpleBuild('protection.certifications'),
  },
  {
    pattern: /^(business\s+health|health\s+score|health\s+check)/i,
    build: makeSimpleBuild('protection.business_health'),
  },

  // Loyalty Intelligence
  {
    pattern: /^(loyalty\s+)?redemptions?/i,
    build: makeSimpleBuild('loyalty.redemptions'),
  },
  {
    pattern: /^gift\s+cards?(\s+(status|balance|list))?/i,
    build: makeSimpleBuild('loyalty.gift_cards'),
  },

  // Inventory Intelligence
  {
    pattern: /^inventory(\s+(status|levels?|stock))?/i,
    build: makeSimpleBuild('inventory.status'),
  },
  {
    pattern: /^(low\s+stock|reorder|what\s+do\s+i\s+need\s+to\s+order)/i,
    build: makeSimpleBuild('inventory.status'),
  },
  {
    pattern: /^purchase\s+orders?/i,
    build: makeSimpleBuild('inventory.purchase_orders'),
  },

  // Commerce Intelligence
  {
    pattern: /^(sales?\s+summary|today.?s\s+sales?|pos\s+summary)/i,
    build: makeSimpleBuild('commerce.sales_summary'),
  },

  // Guest Intelligence
  {
    pattern: /^guest\s+list\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('guest.list', (m) => ({ eventName: m[1].trim() })),
  },
  {
    pattern: /^(who.?s?\s+coming\s+to|guests?\s+for)\s+(.+)/i,
    build: makeSimpleBuild('guest.list', (m) => ({ eventName: m[2].trim() })),
  },

  // Marketing Intelligence
  {
    pattern: /^(marketing\s+)?campaigns?(\s+(status|list|performance))?/i,
    build: makeSimpleBuild('marketing.campaigns'),
  },
  {
    pattern: /^newsletters?(\s+(status|performance|list))?/i,
    build: makeSimpleBuild('marketing.newsletters'),
  },

  // Review Intelligence
  {
    pattern: /^(reviews?|ratings?|feedback)(\s+(summary|list|status))?/i,
    build: makeSimpleBuild('reviews.summary'),
  },
  {
    pattern: /^(what\s+are\s+my\s+reviews?|how\s+am\s+i\s+rated)/i,
    build: makeSimpleBuild('reviews.summary'),
  },

  // Gmail Intelligence
  {
    pattern: /^(sender|email)\s+reputation/i,
    build: makeSimpleBuild('gmail.sender_reputation'),
  },

  // Notification Intelligence
  {
    pattern: /^notification\s+(preferences?|settings?)/i,
    build: makeSimpleBuild('notifications.preferences'),
  },

  // ─── Common conversational queries (covers test suite gaps) ───────────────

  // "[Name] details/info" or "Show [Name]" — client lookup
  {
    pattern: /^(?:show|view|display|pull up)\s+(?!my\s)(.+)/i,
    build: (match, raw) => {
      const q = match[1].trim()
      // Skip if it matches a known non-client pattern
      if (
        /^(?:recipes?|events?|calendar|inbox|emails?|dashboard|menu|inquir|loyalty|revenue|expense|financial)/i.test(
          q
        )
      )
        return null as any
      return {
        rawInput: raw,
        overallConfidence: 0.9,
        tasks: [
          {
            id: 't1',
            taskType: 'client.search',
            tier: 1,
            confidence: 0.9,
            inputs: { query: q },
            dependsOn: [],
          },
        ],
      }
    },
  },
  {
    pattern: /^(.+?)\s+(?:details?|info|information|profile)$/i,
    build: (match, raw) => {
      const q = match[1].trim()
      if (/^(?:my|event|recipe|menu|inquiry)/i.test(q)) return null as any
      return {
        rawInput: raw,
        overallConfidence: 0.9,
        tasks: [
          {
            id: 't1',
            taskType: 'client.search',
            tier: 1,
            confidence: 0.9,
            inputs: { query: q },
            dependsOn: [],
          },
        ],
      }
    },
  },

  // "[Name] dietary/allergies/restrictions" — dietary check
  {
    pattern: /^(.+?)\s+(?:dietary|allergies|allergy|restrictions?|diet)$/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'dietary.check',
          tier: 1,
          confidence: 0.95,
          inputs: { clientName: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },

  // "Upcoming events" / "My events" / "Next events"
  {
    pattern: /^(?:upcoming|next|my|list|show)\s+(?:upcoming\s+)?events?$/i,
    build: makeSimpleBuild('event.list_upcoming'),
  },
  // "[Name] events" — events for a specific client
  {
    pattern: /^(.+?)\s+events?$/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'client.search',
          tier: 1,
          confidence: 0.9,
          inputs: { query: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },

  // "Total revenue" / "Revenue" / "How much have I made"
  {
    pattern: /^(?:total\s+)?(?:revenue|income|earnings|how much (?:have i|did i) (?:make|earn))/i,
    build: makeSimpleBuild('finance.summary'),
  },
  // "Monthly expenses" / "Expenses" / "My expenses"
  {
    pattern: /^(?:monthly\s+)?(?:expenses?|costs?|spending)$/i,
    build: makeSimpleBuild('finance.monthly_snapshot'),
  },

  // "Show my calendar" / "My calendar" / "Calendar"
  {
    pattern: /^(?:show\s+)?(?:my\s+)?calendar$/i,
    build: makeSimpleBuild('calendar.availability'),
  },
  // "What is scheduled today/this week" / "Today's schedule"
  {
    pattern:
      /^(?:what(?:'s| is)\s+)?(?:scheduled|on (?:my )?(?:schedule|calendar)|today'?s?\s+schedule)/i,
    build: makeSimpleBuild('event.list_upcoming'),
  },

  // "Show my recipes" / "My recipes" / "List recipes"
  {
    pattern: /^(?:show|list|view)\s+(?:my\s+)?recipes?$/i,
    build: makeSimpleBuild('recipe.search'),
  },
  // "[keyword] recipes" — recipe search
  {
    pattern: /^(.+?)\s+recipes?$/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'recipe.search',
          tier: 1,
          confidence: 0.9,
          inputs: { query: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },

  // "Show pending inquiries" / "Open inquiries" / "My inquiries"
  {
    pattern: /^(?:show|list|view|open|pending|my)\s+(?:pending\s+|open\s+)?inquir(?:ies|y)$/i,
    build: makeSimpleBuild('inquiry.list_open'),
  },

  // "Show recipes page" / "Go to [page]" / "Open [page]" — navigation
  {
    pattern: /^(?:show|go to|open|navigate to)\s+(?:the\s+)?(.+?)\s+page$/i,
    build: (match, raw) => ({
      rawInput: raw,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'nav.go',
          tier: 1,
          confidence: 0.95,
          inputs: { destination: match[1].trim() },
          dependsOn: [],
        },
      ],
    }),
  },

  // "Email status" / "Email overview"
  {
    pattern: /^email\s+(?:status|overview|summary)$/i,
    build: makeSimpleBuild('email.inbox_summary'),
  },

  // "Loyalty status" / "My loyalty" / "Loyalty program"
  {
    pattern: /^(?:my\s+)?loyalty\s+(?:status|program|overview|summary)?$/i,
    build: makeSimpleBuild('loyalty.status'),
  },
  // "Top tier members" / "VIP clients"
  {
    pattern: /^(?:top|vip|best|highest)\s+(?:tier\s+)?(?:members?|clients?|customers?)/i,
    build: makeSimpleBuild('loyalty.status'),
  },

  // "How many clients" / "Client count"
  {
    pattern: /^(?:how many|total|count)\s+(?:of\s+)?(?:my\s+)?clients?/i,
    build: makeSimpleBuild('client.count'),
  },

  // ─── Batch 3: Gap Closure — Circles, Tasks, Travel, Commerce, Stations, etc. ─

  // Hub Circles
  {
    pattern: /^(?:show|list|my)\s+(?:hub\s+)?circles?/i,
    build: makeSimpleBuild('circles.list'),
  },
  {
    pattern: /^(?:circle|dinner\s+club)\s+(?:unread|messages?|notifications?)/i,
    build: makeSimpleBuild('circles.unread'),
  },
  {
    pattern: /^(?:circle|hub)\s+events?\s+(?:for|in)\s+(.+)/i,
    build: makeSimpleBuild('circles.events', (m) => ({ circleName: m[1].trim() })),
  },
  {
    pattern: /^(?:unread\s+)?(?:circle|hub)\s+(?:messages?|unread)/i,
    build: makeSimpleBuild('circles.unread'),
  },

  // Rate Card
  {
    pattern: /^(?:rate\s+card|my\s+rates?|pricing\s+card|what\s+do\s+i\s+charge)/i,
    build: makeSimpleBuild('rate_card.summary'),
  },

  // Tasks / Kanban
  {
    pattern: /^(?:show|list|my|open|pending)\s+(?:open\s+|pending\s+)?tasks?/i,
    build: makeSimpleBuild('tasks.list'),
  },
  {
    pattern: /^(?:overdue|late|missed)\s+tasks?/i,
    build: makeSimpleBuild('tasks.overdue'),
  },
  {
    pattern: /^(?:today'?s?\s+)?tasks?\s+(?:for\s+)?today/i,
    build: makeSimpleBuild('tasks.by_date'),
  },
  {
    pattern: /^tasks?\s+(?:for|on|due)\s+(.+)/i,
    build: makeSimpleBuild('tasks.by_date', (m) => ({ date: m[1].trim() })),
  },
  {
    pattern: /^what\s+(?:do\s+i\s+need\s+to\s+do|are\s+my\s+tasks?|needs?\s+doing)/i,
    build: makeSimpleBuild('tasks.list'),
  },

  // Travel
  {
    pattern: /^(?:travel|logistics)\s+(?:plan|details?)\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('travel.plan', (m) => ({ eventName: m[1].trim() })),
  },
  {
    pattern: /^(?:upcoming|next)\s+(?:travel|trips?|legs?)/i,
    build: makeSimpleBuild('travel.upcoming'),
  },
  {
    pattern: /^(?:show|list)\s+(?:my\s+)?(?:travel|trips?|logistics)/i,
    build: makeSimpleBuild('travel.upcoming'),
  },

  // Commerce / POS
  {
    pattern: /^(?:show|list|my)\s+(?:commerce\s+)?products?/i,
    build: makeSimpleBuild('commerce.products'),
  },
  {
    pattern: /^(?:recent|latest|today'?s?)\s+(?:sales?|transactions?)/i,
    build: makeSimpleBuild('commerce.recent_sales'),
  },
  {
    pattern: /^(?:daily|today'?s?)\s+(?:sales?\s+)?report/i,
    build: makeSimpleBuild('commerce.daily_report'),
  },
  {
    pattern: /^(?:product\s+)?(?:sales?\s+)?report/i,
    build: makeSimpleBuild('commerce.product_report'),
  },
  {
    pattern: /^(?:low\s+stock|out\s+of\s+stock|inventory\s+(?:low|alert))\s*(?:products?)?/i,
    build: makeSimpleBuild('commerce.inventory_low'),
  },
  {
    pattern: /^(?:what'?s?\s+selling|top\s+sellers?|best\s+sellers?)/i,
    build: makeSimpleBuild('commerce.product_report'),
  },

  // Daily Ops
  {
    pattern: /^(?:daily\s+plan|today'?s?\s+plan|what'?s?\s+(?:the|my)\s+plan)/i,
    build: makeSimpleBuild('daily.plan'),
  },
  {
    pattern: /^daily\s+(?:plan\s+)?stats?/i,
    build: makeSimpleBuild('daily.stats'),
  },

  // Priority Queue
  {
    pattern: /^(?:priority\s+)?queue/i,
    build: makeSimpleBuild('queue.status'),
  },
  {
    pattern: /^what'?s?\s+(?:most\s+)?(?:urgent|important|pressing)/i,
    build: makeSimpleBuild('queue.status'),
  },
  {
    pattern: /^(?:what\s+)?needs?\s+(?:my\s+)?(?:attention|action)/i,
    build: makeSimpleBuild('queue.status'),
  },

  // Stations
  {
    pattern: /^(?:show|list|my)\s+(?:kitchen\s+)?stations?/i,
    build: makeSimpleBuild('stations.list'),
  },
  {
    pattern: /^station\s+(?:detail|info|status)\s+(?:for\s+)?(.+)/i,
    build: makeSimpleBuild('stations.detail', (m) => ({ stationName: m[1].trim() })),
  },
  {
    pattern: /^(?:ops?\s+)?log(?:\s+(?:for|at)\s+(.+))?/i,
    build: makeSimpleBuild('stations.ops_log', (m) => (m[1] ? { stationName: m[1].trim() } : {})),
  },
  {
    pattern: /^waste\s+(?:log|report|summary|tracking)/i,
    build: makeSimpleBuild('stations.waste_log'),
  },
  {
    pattern: /^(?:how\s+much\s+)?(?:food\s+)?waste/i,
    build: makeSimpleBuild('stations.waste_log'),
  },

  // Testimonials
  {
    pattern: /^(?:show|list|my)\s+testimonials?/i,
    build: makeSimpleBuild('testimonials.list'),
  },
  {
    pattern: /^(?:pending|unapproved)\s+testimonials?/i,
    build: makeSimpleBuild('testimonials.pending'),
  },
  {
    pattern: /^(?:what\s+do\s+(?:people|guests?|clients?)\s+(?:say|think)|guest\s+feedback)/i,
    build: makeSimpleBuild('testimonials.list'),
  },

  // Partners / Referrals
  {
    pattern: /^(?:show|list|my)\s+(?:referral\s+)?partners?/i,
    build: makeSimpleBuild('partners.list'),
  },
  {
    pattern: /^partner\s+(?:events?|bookings?)\s+(?:for|from)\s+(.+)/i,
    build: makeSimpleBuild('partners.events', (m) => ({ partnerName: m[1].trim() })),
  },
  {
    pattern: /^partner\s+(?:performance|analytics|stats)/i,
    build: makeSimpleBuild('partners.performance'),
  },
  {
    pattern:
      /^(?:who\s+(?:refers|sends)\s+(?:me\s+)?(?:the\s+most|work)|top\s+(?:referral\s+)?partners?)/i,
    build: makeSimpleBuild('partners.performance'),
  },

  // Activity Feed
  {
    pattern: /^(?:activity|recent\s+activity|what'?s?\s+been\s+happening)/i,
    build: makeSimpleBuild('activity.feed'),
  },
  {
    pattern: /^engagement\s+(?:stats?|metrics?|data)/i,
    build: makeSimpleBuild('activity.engagement'),
  },

  // AAR (After-Action Reviews)
  {
    pattern: /^(?:show|list|recent)\s+(?:after[- ]action\s+)?reviews?|(?:recent\s+)?aars?/i,
    build: makeSimpleBuild('aar.list'),
  },
  {
    pattern: /^aar\s+stats?/i,
    build: makeSimpleBuild('aar.stats'),
  },
  {
    pattern: /^(?:events?\s+(?:without|needing|missing)\s+(?:an?\s+)?aar|unfiled\s+aars?)/i,
    build: makeSimpleBuild('aar.events_without'),
  },
  {
    pattern: /^(?:forgotten\s+items?|what\s+do\s+i\s+(?:always\s+)?forget)/i,
    build: makeSimpleBuild('aar.forgotten_items'),
  },

  // Waitlist
  {
    pattern: /^(?:show|list|my)\s+waitlist/i,
    build: makeSimpleBuild('waitlist.status'),
  },
  {
    pattern: /^(?:who'?s?\s+on\s+(?:the\s+)?waitlist|waitlisted\s+clients?)/i,
    build: makeSimpleBuild('waitlist.status'),
  },
]

// ─── Smart Relative Date Resolver (Formula > AI) ───────────────────────────
// Resolves "next Tuesday", "this weekend", "in 2 weeks" to actual dates
// so both deterministic patterns and Ollama get concrete dates.

function resolveRelativeDates(input: string): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  let result = input

  // "next [day]" → actual date
  result = result.replace(
    /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
    (_match, dayName: string) => {
      const targetDay = dayNames.indexOf(dayName.toLowerCase())
      const currentDay = today.getDay()
      let daysAhead = targetDay - currentDay
      if (daysAhead <= 0) daysAhead += 7 // Always next week
      const target = new Date(today)
      target.setDate(today.getDate() + daysAhead)
      return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
  )

  // "this [day]" → this week's occurrence (or today if it matches)
  result = result.replace(
    /\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
    (_match, dayName: string) => {
      const targetDay = dayNames.indexOf(dayName.toLowerCase())
      const currentDay = today.getDay()
      let daysAhead = targetDay - currentDay
      if (daysAhead < 0) daysAhead += 7
      const target = new Date(today)
      target.setDate(today.getDate() + daysAhead)
      return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
  )

  // "this weekend" → next Saturday
  result = result.replace(/\bthis\s+weekend\b/gi, () => {
    const currentDay = today.getDay()
    let daysToSat = 6 - currentDay
    if (daysToSat <= 0) daysToSat += 7
    const sat = new Date(today)
    sat.setDate(today.getDate() + daysToSat)
    return sat.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })

  // "tomorrow"
  result = result.replace(/\btomorrow\b/gi, () => {
    const tmrw = new Date(today)
    tmrw.setDate(today.getDate() + 1)
    return tmrw.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })

  // "today"
  result = result.replace(/\btoday\b/gi, () => {
    return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })

  // "in [N] days/weeks/months"
  result = result.replace(
    /\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/gi,
    (_match, num: string, unit: string) => {
      const n = parseInt(num)
      const target = new Date(today)
      if (unit.startsWith('day')) target.setDate(today.getDate() + n)
      else if (unit.startsWith('week')) target.setDate(today.getDate() + n * 7)
      else if (unit.startsWith('month')) target.setMonth(today.getMonth() + n)
      return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
  )

  // "next week" → next Monday
  result = result.replace(/\bnext\s+week\b/gi, () => {
    const currentDay = today.getDay()
    const daysToMon = currentDay === 0 ? 1 : 8 - currentDay
    const mon = new Date(today)
    mon.setDate(today.getDate() + daysToMon)
    return mon.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })

  // "next month" → 1st of next month
  result = result.replace(/\bnext\s+month\b/gi, () => {
    const target = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })

  return result
}

// ─── Natural Language Quantity Resolver (Formula > AI) ──────────────────────
// Converts "a dozen", "half a pound", "a couple" → actual numbers.

function resolveNaturalQuantities(input: string): string {
  let result = input

  const quantityMap: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /\ba dozen\b/gi, replacement: '12' },
    { pattern: /\bhalf a dozen\b/gi, replacement: '6' },
    { pattern: /\btwo dozen\b/gi, replacement: '24' },
    { pattern: /\bthree dozen\b/gi, replacement: '36' },
    { pattern: /\ba couple\b/gi, replacement: '2' },
    { pattern: /\ba few\b/gi, replacement: '3' },
    { pattern: /\bseveral\b/gi, replacement: '5' },
    { pattern: /\bhalf\s+a\s+pound\b/gi, replacement: '0.5 lb' },
    { pattern: /\ba\s+quarter\s+pound\b/gi, replacement: '0.25 lb' },
    { pattern: /\ba\s+pound\b/gi, replacement: '1 lb' },
    { pattern: /\bhalf\s+a\s+cup\b/gi, replacement: '0.5 cup' },
    { pattern: /\ba\s+quarter\s+cup\b/gi, replacement: '0.25 cup' },
    { pattern: /\ba\s+pinch\b/gi, replacement: '0.125 tsp' },
    { pattern: /\ba\s+dash\b/gi, replacement: '0.125 tsp' },
    { pattern: /\btwenty\b/gi, replacement: '20' },
    { pattern: /\bthirty\b/gi, replacement: '30' },
    { pattern: /\bforty\b/gi, replacement: '40' },
    { pattern: /\bfifty\b/gi, replacement: '50' },
    { pattern: /\bhundred\b/gi, replacement: '100' },
  ]

  for (const { pattern, replacement } of quantityMap) {
    result = result.replace(pattern, replacement)
  }

  return result
}

function tryDeterministicParse(rawInput: string): CommandPlan | null {
  const trimmed = rawInput.trim()
  for (const { pattern, build } of DETERMINISTIC_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      const result = build(match, rawInput)
      if (result) return result
    }
  }
  return null
}

// ─── Public Server Action ─────────────────────────────────────────────────────

export async function parseCommandIntent(rawInput: string): Promise<CommandPlan> {
  // Pre-process: resolve relative dates + natural quantities (Formula > AI)
  const withDates = resolveRelativeDates(rawInput)
  const resolved = resolveNaturalQuantities(withDates)

  // Try deterministic parse first (instant, free, no LLM)
  const deterministic = tryDeterministicParse(resolved)
  if (deterministic) return { ...deterministic, rawInput }

  const systemPrompt = buildSystemPrompt()
  const userContent = `Chef command: "${resolved}"\n\nDecompose this into tasks.`

  try {
    const parsed = await parseWithOllama(systemPrompt, userContent, CommandPlanSchema, {
      modelTier: 'fast',
    })

    // Validate that all dependsOn references actually exist in this plan
    const taskIds = new Set(parsed.tasks.map((t) => t.id))
    const validatedTasks: PlannedTask[] = parsed.tasks.map((task) => ({
      ...task,
      dependsOn: task.dependsOn.filter((dep) => taskIds.has(dep)),
    }))

    return {
      rawInput,
      overallConfidence: parsed.overallConfidence,
      tasks: validatedTasks,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[command-intent-parser] Parse error:', err)
    // Graceful fallback: single held task with explanation
    return {
      rawInput,
      overallConfidence: 0,
      tasks: [
        {
          id: 't1',
          taskType: 'unknown',
          tier: 3,
          confidence: 0,
          inputs: {},
          dependsOn: [],
          holdReason: 'Could not parse your command. Please rephrase and try again.',
        },
      ],
    }
  }
}
