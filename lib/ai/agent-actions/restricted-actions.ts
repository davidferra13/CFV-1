// Remy Agent — Restricted Actions
// Actions that Remy CANNOT perform. Always returns tier 3 held with explanation.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'

function restrictedAction(
  taskType: string,
  name: string,
  description: string,
  explanation: string,
  howToDoIt: string
): AgentActionDefinition {
  return {
    taskType,
    name,
    tier: 3,
    safety: 'restricted',
    description,
    inputSchema: '{}',
    tierNote: `ALWAYS tier 3 — ${explanation}`,

    async executor() {
      return {
        preview: {
          actionType: taskType,
          summary: `Cannot do: ${name}`,
          fields: [
            { label: 'Why', value: explanation },
            { label: 'How To Do It', value: howToDoIt },
          ],
          safety: 'restricted' as const,
        },
        commitPayload: { _restricted: true },
      }
    },

    async commitAction() {
      return { success: false, message: explanation }
    },
  }
}

export const restrictedAgentActions: AgentActionDefinition[] = [
  restrictedAction(
    'agent.ledger_write',
    'Record Payment / Ledger Entry',
    'Record a payment, deposit, refund, tip, or adjustment to the financial ledger.',
    'Financial ledger entries must be recorded manually for audit accuracy. The ledger is immutable and append-only — AI cannot write to it.',
    'Go to the event page → Payments tab → Record Payment. Or navigate to Finance → Record Entry.'
  ),
  restrictedAction(
    'agent.modify_roles',
    'Change User Roles',
    'Modify user roles, permissions, or tenant access.',
    'Role and access changes require manual action for security. This protects tenant isolation.',
    'Go to Settings → Team to manage roles and permissions.'
  ),
  restrictedAction(
    'agent.delete_data',
    'Delete Records',
    'Permanently delete clients, events, recipes, or other records.',
    'Permanent data deletion requires manual confirmation on the relevant page. This prevents accidental data loss.',
    'Navigate to the specific record and use the delete button. Only draft-status records can be deleted.'
  ),
  restrictedAction(
    'agent.send_email',
    'Send Email Directly',
    'Send an email or message directly to a client.',
    'Remy drafts emails but never sends them automatically. All outbound communication requires chef review.',
    'Ask Remy to draft the email, then copy it and send from your email client.'
  ),
  restrictedAction(
    'agent.refund',
    'Issue Refund',
    'Process a refund or financial adjustment.',
    'Refunds are financial ledger operations that must be recorded manually for audit compliance.',
    'Go to the event page → Payments → Record Adjustment with a negative amount, or contact your payment processor.'
  ),

  // ─── Recipe Generation — PERMANENTLY RESTRICTED ──────────────────────────
  // Recipes are the chef's creative work. AI has zero role in authoring them.
  // AI may search/cost/scale recipes (read-only math), but never create or modify.

  restrictedAction(
    'agent.create_recipe',
    'Create Recipe',
    'Generate a new recipe from a description.',
    "AI cannot generate, fabricate, or create recipes — ever. Recipes are the chef's creative work and intellectual property. AI will never tell a chef what to cook or how to cook it.",
    'Go to Recipes → New Recipe and enter your recipe manually.'
  ),
  restrictedAction(
    'agent.update_recipe',
    'Update Recipe',
    'Update an existing recipe via AI.',
    "AI cannot modify recipe content — ever. Recipes are the chef's creative work. Only the chef edits recipes directly.",
    'Go to Recipes → find the recipe → Edit to update it manually.'
  ),
  restrictedAction(
    'agent.add_ingredient',
    'Add Ingredient to Recipe',
    'Add an ingredient to an existing recipe via AI.',
    'AI cannot add, remove, or modify recipe ingredients — ever. Recipe ingredients must be entered manually by the chef.',
    'Go to Recipes → find the recipe → Ingredients section to add ingredients manually.'
  ),
]
