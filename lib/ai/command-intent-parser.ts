'use server'

// Ask Remy — Intent Parser
// PRIVACY: Chef commands may contain client names, financial details — must stay local.
// Parses freeform chef input into a structured task plan using local Ollama only.

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { buildTaskListForPrompt } from '@/lib/ai/command-task-descriptions'
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

const DETERMINISTIC_PATTERNS: DeterministicPattern[] = [
  // "Draft/write a [type] for [name]"
  {
    pattern:
      /^(?:draft|write)\s+(?:a\s+)?(?:thank[- ]?you|thank you note|follow[- ]?up|referral request|testimonial request|payment reminder|re-?engagement|decline|cancellation response|cover letter)\s+(?:for|to)\s+(.+)/i,
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
]

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
  // Try deterministic parse first (instant, free, no LLM)
  const deterministic = tryDeterministicParse(rawInput)
  if (deterministic) return deterministic

  const systemPrompt = buildSystemPrompt()
  const userContent = `Chef command: "${rawInput}"\n\nDecompose this into tasks.`

  try {
    const parsed = await parseWithOllama(systemPrompt, userContent, CommandPlanSchema, {
      modelTier: 'standard',
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
