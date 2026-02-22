// @ts-nocheck
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
  inputs: z.record(z.unknown()),
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

// ─── Public Server Action ─────────────────────────────────────────────────────

export async function parseCommandIntent(rawInput: string): Promise<CommandPlan> {
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
