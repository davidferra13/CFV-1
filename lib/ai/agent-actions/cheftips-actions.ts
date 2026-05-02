// Remy Agent - ChefTips Actions
// Add daily learning tips via conversational AI.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { addChefTip } from '@/lib/cheftips/actions'
import { CHEFTIP_CATEGORIES } from '@/lib/cheftips/types'
import type { ChefTipCategory } from '@/lib/cheftips/types'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

const validCategories = CHEFTIP_CATEGORIES.map((c) => c.value)

export const cheftipsAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.add_cheftip',
    name: 'Add ChefTip',
    tier: 2,
    safety: 'reversible',
    description:
      'Record a learning or insight as a ChefTip. Works for prep tricks, timing adjustments, technique discoveries, client management lessons, mistakes to avoid, or any culinary insight.',
    inputSchema:
      '{ "description": "string - e.g. Today I learned that resting dough at room temp for 20min before rolling gives better flakiness" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')

      const parsed = await parseWithOllama(
        `Extract the learning tip and optionally categorize it. Categories: ${validCategories.join(', ')}. If no category fits, use "general". Return ONLY JSON.`,
        description,
        z.object({
          tip: z.string(),
          category: z.string().optional(),
        }),
        { modelTier: 'standard' }
      )

      const category = validCategories.includes(parsed.category as ChefTipCategory)
        ? (parsed.category as ChefTipCategory)
        : 'general'

      return {
        preview: {
          actionType: 'agent.add_cheftip',
          summary: 'Save a ChefTip',
          fields: [
            { label: 'Tip', value: parsed.tip },
            { label: 'Category', value: category },
          ],
          safety: 'reversible' as const,
        },
        commitPayload: { tip: parsed.tip, category },
      }
    },

    async commitAction(payload) {
      const tip = String(payload.tip ?? '')
      const category = String(payload.category ?? 'general')

      const result = await addChefTip(tip, category ? [category] : [])

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to save tip' }
      }

      return {
        success: true,
        message: 'ChefTip saved to your learning log.',
        redirectUrl: '/culinary/cheftips',
      }
    },
  },
]
