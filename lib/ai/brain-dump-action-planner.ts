'use server'

// Brain Dump Action Planner
// Maps extracted intents to executable Remy commands with approval tiers.
// Produces an ActionPlan the chef reviews before execution.

import type { BrainDumpIntent, BrainDumpExtraction } from '@/lib/ai/brain-dump-intent-schema'
import { INTENT_TO_COMMAND_MAP } from '@/lib/ai/brain-dump-intent-schema'
import type { ResolvedEntity } from '@/lib/ai/brain-dump-entity-resolver'
import type { ApprovalTier } from '@/lib/ai/command-types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlannedAction {
  id: string
  intentType: BrainDumpIntent['type']
  command: string
  tier: ApprovalTier
  description: string
  inputs: Record<string, unknown>
  resolvedEntities: ResolvedEntity[]
  status: 'pending' | 'approved' | 'skipped' | 'executed' | 'failed'
  dependsOn: string[] // IDs of actions that must complete first
  warnings: string[]
}

export interface ActionPlan {
  id: string
  rawInput: string
  actions: PlannedAction[]
  unresolved: string[] // things that couldn't be mapped
  ambiguities: Array<{
    question: string
    options: string[]
    actionId: string
  }>
  summary: string
  createdAt: string
}

// ─── Planner ────────────────────────────────────────────────────────────────

let actionCounter = 0

function nextId(): string {
  actionCounter++
  return `action_${actionCounter}`
}

function buildActionFromIntent(
  intent: BrainDumpIntent,
  resolvedEntities: {
    clients: Map<string, ResolvedEntity>
    events: Map<string, ResolvedEntity>
    recipes: Map<string, ResolvedEntity>
  }
): PlannedAction {
  const mapping = INTENT_TO_COMMAND_MAP[intent.type]
  const action: PlannedAction = {
    id: nextId(),
    intentType: intent.type,
    command: mapping.commands[0], // Default to first command
    tier: mapping.defaultTier,
    description: '',
    inputs: {},
    resolvedEntities: [],
    status: 'pending',
    dependsOn: [],
    warnings: [],
  }

  switch (intent.type) {
    case 'event_info': {
      action.command = intent.isNewEvent ? 'event.create' : 'event.update'
      action.description = intent.isNewEvent
        ? `Create event: ${intent.eventType || 'dinner'} on ${intent.date || 'TBD'}`
        : `Update event: ${intent.date || ''} ${intent.notes || ''}`

      // Resolve client
      if (intent.clientName) {
        const resolved = resolvedEntities.clients.get(intent.clientName.toLowerCase())
        if (resolved) {
          action.resolvedEntities.push(resolved)
          action.inputs.clientId = resolved.id
        } else {
          action.warnings.push(`Client "${intent.clientName}" not found in your records`)
        }
      }

      action.inputs.eventDate = intent.date
      action.inputs.occasion = intent.eventType
      action.inputs.guestCount = intent.guestCount
      action.inputs.location = intent.location
      action.inputs.notes = intent.notes
      if (intent.budget) action.inputs.budget = intent.budget
      break
    }

    case 'client_info': {
      action.command = intent.action === 'create' ? 'client.create' : 'client.update'
      action.description = `${intent.action === 'create' ? 'Create' : 'Update'} client: ${intent.clientName}`

      if (intent.action === 'update') {
        const resolved = resolvedEntities.clients.get(intent.clientName.toLowerCase())
        if (resolved) {
          action.resolvedEntities.push(resolved)
          action.inputs.clientId = resolved.id
        } else {
          action.warnings.push(
            `Client "${intent.clientName}" not found. Will create new client instead.`
          )
          action.command = 'client.create'
        }
      }

      action.inputs.fullName = intent.clientName
      if (intent.dietary) action.inputs.dietaryRestrictions = intent.dietary
      if (intent.allergies) {
        action.inputs.allergies = intent.allergies
        action.warnings.push(`ALLERGY: ${intent.allergies.join(', ')} (safety-critical, verify)`)
      }
      if (intent.preferences) action.inputs.vibeNotes = intent.preferences
      if (intent.contactInfo) action.inputs.contactInfo = intent.contactInfo
      break
    }

    case 'menu_intent': {
      action.description = `Menu: ${intent.dishes.join(', ')}`
      action.inputs.dishes = intent.dishes
      action.inputs.theme = intent.theme
      action.inputs.constraints = intent.constraints

      // Resolve recipe references
      for (const dish of intent.dishes) {
        const resolved = resolvedEntities.recipes.get(dish.toLowerCase())
        if (resolved) {
          action.resolvedEntities.push(resolved)
        }
      }

      // If event referenced, resolve it
      if (intent.forEvent) {
        const resolved = resolvedEntities.events.get(intent.forEvent.toLowerCase())
        if (resolved) {
          action.resolvedEntities.push(resolved)
          action.inputs.eventId = resolved.id
        }
      }
      break
    }

    case 'shopping_items': {
      action.description = `Shopping: ${intent.items.map((i) => i.name).join(', ')}`
      action.inputs.items = intent.items
      break
    }

    case 'prep_task': {
      action.description = `Prep: ${intent.tasks.map((t) => t.task).join(', ')}`
      action.inputs.tasks = intent.tasks
      break
    }

    case 'timeline_item': {
      action.description = `Timeline: ${intent.entries.map((e) => e.activity).join(', ')}`
      action.inputs.entries = intent.entries
      break
    }

    case 'task': {
      action.description = `Task: ${intent.description}`
      action.inputs.title = intent.description
      action.inputs.dueDate = intent.deadline
      action.inputs.priority = intent.priority
      break
    }

    case 'communication': {
      action.description = `${intent.action}: ${intent.recipientName}`
      action.tier = 3 // All comms are Tier 3
      action.inputs.recipientName = intent.recipientName
      action.inputs.action = intent.action
      action.inputs.content = intent.content

      const resolved = resolvedEntities.clients.get(intent.recipientName.toLowerCase())
      if (resolved) {
        action.resolvedEntities.push(resolved)
        action.inputs.clientId = resolved.id
      }
      break
    }

    case 'note': {
      action.description = `Note: ${intent.content.slice(0, 60)}...`
      action.inputs.content = intent.content
      action.inputs.category = intent.category
      break
    }

    case 'staff_action': {
      if (intent.action === 'add') {
        action.command = 'staff.create'
        action.description = `Add staff: ${intent.staffName} (${intent.role || 'other'})`
        action.inputs.name = intent.staffName
        action.inputs.role = intent.role || 'other'
        if (intent.hourlyRate) action.inputs.hourlyRateCents = Math.round(intent.hourlyRate * 100)
      } else if (intent.action === 'assign') {
        action.command = 'staff.assign'
        action.description = `Assign ${intent.staffName} to event`
        if (intent.forEvent) {
          const resolved = resolvedEntities.events.get(intent.forEvent.toLowerCase())
          if (resolved) {
            action.resolvedEntities.push(resolved)
            action.inputs.eventId = resolved.id
          }
        }
        if (intent.hours) action.inputs.scheduledHours = intent.hours
      } else {
        action.command = 'staff.record_hours'
        action.description = `Record ${intent.hours || '?'}h for ${intent.staffName}`
        if (intent.hours) action.inputs.actualHours = intent.hours
      }
      if (intent.notes) action.inputs.notes = intent.notes
      break
    }

    case 'quote_action': {
      if (intent.action === 'create') {
        action.command = 'quote.create'
        action.tier = 3
        action.description = `Quote for ${intent.clientName}: $${intent.totalDollars || intent.perPersonDollars || '?'}`
        const resolved = resolvedEntities.clients.get(intent.clientName.toLowerCase())
        if (resolved) {
          action.resolvedEntities.push(resolved)
          action.inputs.clientId = resolved.id
        } else {
          action.warnings.push(`Client "${intent.clientName}" not found`)
        }
        action.inputs.pricingModel =
          intent.pricingModel || (intent.perPersonDollars ? 'per_person' : 'flat_rate')
        if (intent.totalDollars)
          action.inputs.totalQuotedCents = Math.round(intent.totalDollars * 100)
        if (intent.perPersonDollars)
          action.inputs.pricePerPersonCents = Math.round(intent.perPersonDollars * 100)
        if (intent.guestCount) action.inputs.guestCount = intent.guestCount
        if (intent.depositPercentage) action.inputs.depositPercentage = intent.depositPercentage
        if (intent.notes) action.inputs.pricingNotes = intent.notes
        // Auto-compute total if per_person + guest count provided
        if (intent.perPersonDollars && intent.guestCount && !intent.totalDollars) {
          action.inputs.totalQuotedCents = Math.round(
            intent.perPersonDollars * intent.guestCount * 100
          )
        }
      } else {
        action.command = 'quote.transition'
        action.tier = 3
        action.description = `${intent.action === 'send' ? 'Send' : 'Update'} quote for ${intent.clientName}`
        action.inputs.newStatus = intent.action === 'send' ? 'sent' : 'draft'
      }
      break
    }

    case 'equipment_action': {
      if (intent.action === 'add') {
        action.command = 'equipment.create'
        action.description = `Add equipment: ${intent.name}`
        action.inputs.name = intent.name
        if (intent.category) action.inputs.category = intent.category
        if (intent.priceDollars)
          action.inputs.purchasePriceCents = Math.round(intent.priceDollars * 100)
      } else {
        action.command = 'equipment.log_maintenance'
        action.tier = 1
        action.description = `Maintenance: ${intent.name}`
      }
      if (intent.notes) action.inputs.notes = intent.notes
      break
    }
  }

  return action
}

// ─── Dependency Resolution ──────────────────────────────────────────────────

function addDependencies(actions: PlannedAction[]): void {
  // Event creation must happen before menu/timeline/prep that reference it
  const eventCreates = actions.filter((a) => a.command === 'event.create')
  const eventDependents = actions.filter((a) =>
    [
      'menu.create',
      'menu.add_dish',
      'timeline.create',
      'prep.create_task',
      'shopping.generate',
      'staff.assign',
      'prep.create_block',
      'contract.generate',
      'packing.mark_packed',
    ].includes(a.command)
  )

  if (eventCreates.length === 1 && eventDependents.length > 0) {
    for (const dep of eventDependents) {
      dep.dependsOn.push(eventCreates[0].id)
    }
  }

  // Client creation must happen before event/quote creation that uses that client
  const clientCreates = actions.filter((a) => a.command === 'client.create')
  const clientDependents = actions.filter(
    (a) =>
      ['event.create', 'quote.create'].includes(a.command) &&
      a.warnings.some((w) => w.includes('not found'))
  )

  for (const dep of clientDependents) {
    for (const cc of clientCreates) {
      if (dep.inputs.clientId === undefined) {
        dep.dependsOn.push(cc.id)
      }
    }
  }

  // Quote creation depends on event creation (if quote references the event)
  const quoteCreates = actions.filter((a) => a.command === 'quote.create')
  if (eventCreates.length === 1 && quoteCreates.length > 0) {
    for (const qc of quoteCreates) {
      if (!qc.inputs.eventId) {
        qc.dependsOn.push(eventCreates[0].id)
      }
    }
  }

  // Menu creation before adding dishes
  const menuCreates = actions.filter((a) => a.command === 'menu.create')
  const dishAdds = actions.filter((a) => a.command === 'menu.add_dish')
  if (menuCreates.length === 1 && dishAdds.length > 0) {
    for (const da of dishAdds) {
      da.dependsOn.push(menuCreates[0].id)
    }
  }
}

// ─── Build Plan ─────────────────────────────────────────────────────────────

export async function buildActionPlan(
  rawInput: string,
  extraction: BrainDumpExtraction,
  resolvedEntities: {
    clients: Map<string, ResolvedEntity>
    events: Map<string, ResolvedEntity>
    recipes: Map<string, ResolvedEntity>
  },
  ambiguities: Array<{ query: string; candidates: ResolvedEntity[] }>
): Promise<ActionPlan> {
  // Reset counter for each plan
  actionCounter = 0

  const actions: PlannedAction[] = extraction.intents.map((intent) =>
    buildActionFromIntent(intent, resolvedEntities)
  )

  // Add dependency edges
  addDependencies(actions)

  // Build ambiguity questions
  const planAmbiguities = ambiguities.map((a) => ({
    question: `Which "${a.query}" did you mean?`,
    options: a.candidates.map((c) => `${c.name} (${c.type})`),
    actionId:
      actions.find(
        (act) =>
          act.resolvedEntities.some((e) => e.matchedFrom === a.query) ||
          act.warnings.some((w) => w.includes(a.query))
      )?.id || '',
  }))

  // Generate summary
  const tierCounts = { 1: 0, 2: 0, 3: 0 }
  for (const a of actions) tierCounts[a.tier]++

  const summaryParts: string[] = []
  summaryParts.push(`${actions.length} action${actions.length === 1 ? '' : 's'} planned`)
  if (tierCounts[1]) summaryParts.push(`${tierCounts[1]} auto`)
  if (tierCounts[2]) summaryParts.push(`${tierCounts[2]} need confirmation`)
  if (tierCounts[3]) summaryParts.push(`${tierCounts[3]} need approval`)
  if (ambiguities.length) summaryParts.push(`${ambiguities.length} need clarification`)
  if (extraction.unstructured.length)
    summaryParts.push(`${extraction.unstructured.length} unclassified`)

  return {
    id: `plan_${Date.now()}`,
    rawInput,
    actions,
    unresolved: extraction.unstructured,
    ambiguities: planAmbiguities,
    summary: summaryParts.join('. '),
    createdAt: new Date().toISOString(),
  }
}
