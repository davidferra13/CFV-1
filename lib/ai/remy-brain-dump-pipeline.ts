'use server'

// Remy Brain Dump Pipeline
// The main orchestrator: text in -> action plan out -> batch execution.
// Connects: chunker -> extractor -> entity resolver -> action planner -> executor
// PRIVACY: Brain dumps contain client PII - all processing via local Ollama.

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import {
  BrainDumpExtractionSchema,
  type BrainDumpExtraction,
} from '@/lib/ai/brain-dump-intent-schema'
import { resolveAllEntities, type ResolvedEntity } from '@/lib/ai/brain-dump-entity-resolver'
import {
  buildActionPlan,
  type ActionPlan,
  type PlannedAction,
} from '@/lib/ai/brain-dump-action-planner'
import { REMY_WRITE_REGISTRY } from '@/lib/ai/remy-write-registry'
import type { RemyWriteResult } from '@/lib/ai/remy-write-commands'

// ─── Step 1: Chunker ───────────────────────────────────────────────────────

function chunkText(text: string, maxChunkTokens: number = 500): string[] {
  // Rough token estimate: ~4 chars per token
  const maxChars = maxChunkTokens * 4

  if (text.length <= maxChars) return [text]

  // Split on paragraph boundaries first
  const paragraphs = text.split(/\n\s*\n/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim())
      current = para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }

  if (current.trim()) chunks.push(current.trim())

  // If any chunk is still too large, split on sentence boundaries
  const finalChunks: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      finalChunks.push(chunk)
    } else {
      const sentences = chunk.split(/(?<=[.!?])\s+/)
      let sentenceChunk = ''
      for (const sentence of sentences) {
        if ((sentenceChunk + ' ' + sentence).length > maxChars && sentenceChunk.length > 0) {
          finalChunks.push(sentenceChunk.trim())
          sentenceChunk = sentence
        } else {
          sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence
        }
      }
      if (sentenceChunk.trim()) finalChunks.push(sentenceChunk.trim())
    }
  }

  return finalChunks
}

// ─── Step 2: Multi-Intent Extractor ─────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a structured data extractor for a private chef's management system (ChefFlow).

Given a chef's "brain dump" (free-form text about their work), extract ALL actionable intents into structured categories.

CATEGORIES:
- event_info: event dates, locations, guest counts, types, client names, budgets
- client_info: client names, dietary restrictions, allergies (SAFETY-CRITICAL), preferences, contact info
- menu_intent: dish names, course structure, themes, dietary constraints
- shopping_items: items to buy, quantities, preferred stores
- prep_task: what to prep, when, how long
- timeline_item: day-of schedule entries
- task: general to-dos with deadlines
- communication: follow-ups, proposals, confirmations to send
- staff_action: adding team members, assigning staff to events, recording hours worked
- quote_action: creating price quotes, sending quotes to clients
- equipment_action: adding equipment to inventory, logging maintenance
- note: general context, ideas, reminders

RULES:
- Extract EVERY distinct intent. One dump can have 10+ intents.
- Allergies are SAFETY-CRITICAL. Flag every allergy mention.
- For client_info: determine if this is a new client (action: "create") or existing (action: "update")
- For event_info: determine if this creates a new event (isNewEvent: true) or updates existing (false)
- For staff_action: "add" for new team members, "assign" for event assignments, "record_hours" for post-event
- For quote_action: "create" for new quotes, "send" to send to client
- Menu dishes are NAMES ONLY. Never generate recipe content, instructions, or ingredients.
- Dollar amounts: extract as numbers (e.g. "$150/person" -> perPersonDollars: 150)
- If something doesn't fit any category, put it in unstructured.
- Be exhaustive. Missing an intent is worse than a false positive.`

async function extractIntents(text: string): Promise<BrainDumpExtraction> {
  try {
    const result = await parseWithOllama(
      EXTRACTION_SYSTEM_PROMPT,
      `Extract all actionable intents from this brain dump:\n\n${text}`,
      BrainDumpExtractionSchema,
      { modelTier: 'complex' }
    )
    return result
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err

    // Fallback: treat entire text as unstructured
    return {
      intents: [],
      unstructured: [text],
      confidence: 'low',
      warnings: ['AI extraction failed, text preserved as unstructured'],
    }
  }
}

// ─── Step 3-4: Resolve + Plan ───────────────────────────────────────────────

function collectNames(extraction: BrainDumpExtraction): {
  clientNames: string[]
  eventDescriptors: string[]
  recipeNames: string[]
} {
  const clientNames = new Set<string>()
  const eventDescriptors = new Set<string>()
  const recipeNames = new Set<string>()

  for (const intent of extraction.intents) {
    switch (intent.type) {
      case 'event_info':
        if (intent.clientName) clientNames.add(intent.clientName)
        if (intent.date) eventDescriptors.add(intent.date)
        break
      case 'client_info':
        clientNames.add(intent.clientName)
        break
      case 'menu_intent':
        for (const dish of intent.dishes) recipeNames.add(dish)
        if (intent.forEvent) eventDescriptors.add(intent.forEvent)
        break
      case 'shopping_items':
        if (intent.forEvent) eventDescriptors.add(intent.forEvent)
        break
      case 'prep_task':
        if (intent.forEvent) eventDescriptors.add(intent.forEvent)
        break
      case 'timeline_item':
        if (intent.forEvent) eventDescriptors.add(intent.forEvent)
        break
      case 'communication':
        clientNames.add(intent.recipientName)
        break
      case 'task':
        if (intent.assignee) clientNames.add(intent.assignee)
        break
      case 'staff_action':
        if (intent.forEvent) eventDescriptors.add(intent.forEvent)
        break
      case 'quote_action':
        clientNames.add(intent.clientName)
        break
      case 'equipment_action':
        // No entity resolution needed
        break
    }
  }

  return {
    clientNames: [...clientNames],
    eventDescriptors: [...eventDescriptors],
    recipeNames: [...recipeNames],
  }
}

// ─── Step 5-6: Execute Approved Actions ─────────────────────────────────────

export interface ExecutionResult {
  actionId: string
  command: string
  result: RemyWriteResult
}

export async function executePlan(plan: ActionPlan): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = []
  const completed = new Set<string>()

  // Topological sort by dependencies
  const pending = [...plan.actions.filter((a) => a.status === 'approved' || a.tier === 1)]
  const maxIterations = pending.length * 2
  let iterations = 0

  while (pending.length > 0 && iterations < maxIterations) {
    iterations++
    const ready = pending.filter((a) => a.dependsOn.every((dep) => completed.has(dep)))

    if (ready.length === 0) {
      // Circular dependency or unresolvable deps; execute remaining in order
      for (const a of pending) {
        const result = await executeAction(a, results)
        results.push({ actionId: a.id, command: a.command, result })
        completed.add(a.id)
      }
      break
    }

    // Execute ready actions (sequentially for safety)
    for (const action of ready) {
      const result = await executeAction(action, results)
      results.push({ actionId: action.id, command: action.command, result })
      completed.add(action.id)

      // Pass created IDs to dependent actions
      if (result.success && result.data) {
        propagateIds(action, result, plan.actions)
      }

      // Remove from pending
      const idx = pending.indexOf(action)
      if (idx >= 0) pending.splice(idx, 1)
    }
  }

  return results
}

async function executeAction(
  action: PlannedAction,
  priorResults: ExecutionResult[]
): Promise<RemyWriteResult> {
  const registry = REMY_WRITE_REGISTRY[action.command]

  if (!registry) {
    return {
      success: false,
      action: action.command,
      tier: action.tier,
      error: `Command "${action.command}" not yet implemented. Saved as note instead.`,
    }
  }

  try {
    return await registry.fn(action.inputs)
  } catch (err) {
    return {
      success: false,
      action: action.command,
      tier: action.tier,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

function propagateIds(
  completedAction: PlannedAction,
  result: RemyWriteResult,
  allActions: PlannedAction[]
): void {
  // When an event is created, pass its ID to dependent actions
  if (completedAction.command === 'event.create' && result.data?.eventId) {
    for (const action of allActions) {
      if (action.dependsOn.includes(completedAction.id)) {
        action.inputs.eventId = result.data.eventId
      }
    }
  }

  // When a client is created, pass ID to event/quote creation
  if (completedAction.command === 'client.create' && result.data?.clientId) {
    for (const action of allActions) {
      if (
        action.dependsOn.includes(completedAction.id) &&
        ['event.create', 'quote.create'].includes(action.command)
      ) {
        action.inputs.clientId = result.data.clientId
      }
    }
  }

  // When a menu is created, pass ID to dish additions
  if (completedAction.command === 'menu.create' && result.data?.menuId) {
    for (const action of allActions) {
      if (action.dependsOn.includes(completedAction.id) && action.command === 'menu.add_dish') {
        action.inputs.menuId = result.data.menuId
      }
    }
  }
}

// ─── Main Pipeline Entry Point ──────────────────────────────────────────────

export interface BrainDumpPipelineResult {
  plan: ActionPlan
  extraction: BrainDumpExtraction
  /** Set to true when ambiguities need resolution before execution */
  needsClarification: boolean
  /** Human-readable summary for Remy to present */
  remySummary: string
}

export async function processBrainDump(rawInput: string): Promise<BrainDumpPipelineResult> {
  // Step 1: Chunk
  const chunks = chunkText(rawInput)

  // Step 2: Extract intents from each chunk
  const extractions: BrainDumpExtraction[] = []
  for (const chunk of chunks) {
    const extraction = await extractIntents(chunk)
    extractions.push(extraction)
  }

  // Merge extractions
  const merged: BrainDumpExtraction = {
    intents: extractions.flatMap((e) => e.intents),
    unstructured: extractions.flatMap((e) => e.unstructured),
    confidence: extractions.every((e) => e.confidence === 'high')
      ? 'high'
      : extractions.some((e) => e.confidence === 'low')
        ? 'low'
        : 'medium',
    warnings: extractions.flatMap((e) => e.warnings),
  }

  // Step 3: Collect names and resolve entities
  const names = collectNames(merged)
  const resolved = await resolveAllEntities(names)

  // Build lookup maps
  const clientMap = new Map<string, ResolvedEntity>()
  for (const r of resolved.clients.resolved) {
    clientMap.set(r.matchedFrom.toLowerCase(), r)
  }
  const eventMap = new Map<string, ResolvedEntity>()
  for (const r of resolved.events.resolved) {
    eventMap.set(r.matchedFrom.toLowerCase(), r)
  }
  const recipeMap = new Map<string, ResolvedEntity>()
  for (const r of resolved.recipes.resolved) {
    recipeMap.set(r.matchedFrom.toLowerCase(), r)
  }

  // Collect all ambiguities
  const allAmbiguities = [
    ...resolved.clients.ambiguous,
    ...resolved.events.ambiguous,
    ...resolved.recipes.ambiguous,
  ]

  // Step 4: Build action plan
  const plan = await buildActionPlan(
    rawInput,
    merged,
    { clients: clientMap, events: eventMap, recipes: recipeMap },
    allAmbiguities
  )

  // Step 5: Build Remy summary
  const needsClarification =
    plan.ambiguities.length > 0 || plan.actions.some((a) => a.warnings.length > 0 && a.tier >= 2)

  const summaryLines: string[] = []
  summaryLines.push(`Got it, chef. Here's what I pulled from your brain dump:`)
  summaryLines.push('')

  // Group by category
  const byTier: Record<number, PlannedAction[]> = { 1: [], 2: [], 3: [] }
  for (const a of plan.actions) byTier[a.tier].push(a)

  if (byTier[1].length > 0) {
    summaryLines.push(`**I'll handle automatically:**`)
    for (const a of byTier[1]) summaryLines.push(`- ${a.description}`)
    summaryLines.push('')
  }

  if (byTier[2].length > 0) {
    summaryLines.push(`**Need your OK:**`)
    for (const a of byTier[2]) {
      const warnings = a.warnings.length > 0 ? ` (${a.warnings[0]})` : ''
      summaryLines.push(`- ${a.description}${warnings}`)
    }
    summaryLines.push('')
  }

  if (byTier[3].length > 0) {
    summaryLines.push(`**Need explicit approval:**`)
    for (const a of byTier[3]) summaryLines.push(`- ${a.description}`)
    summaryLines.push('')
  }

  if (plan.ambiguities.length > 0) {
    summaryLines.push(`**Need clarification:**`)
    for (const a of plan.ambiguities) {
      summaryLines.push(`- ${a.question} (${a.options.join(' / ')})`)
    }
    summaryLines.push('')
  }

  if (merged.unstructured.length > 0) {
    summaryLines.push(`**Couldn't classify (saved as notes):**`)
    for (const u of merged.unstructured) {
      summaryLines.push(`- "${u.slice(0, 80)}${u.length > 80 ? '...' : ''}"`)
    }
  }

  return {
    plan,
    extraction: merged,
    needsClarification,
    remySummary: summaryLines.join('\n'),
  }
}
