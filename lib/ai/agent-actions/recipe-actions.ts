// Remy Agent - Recipe Actions
// PERMANENTLY DISABLED - AI must never generate, fabricate, or create recipes.
// Recipes are the chef's creative work. AI can only search the chef's existing recipe book.
// All recipe write actions are now in restricted-actions.ts as permanently blocked.
//
// See CLAUDE.md § "AI Must NEVER Generate Recipes" for the full policy.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'

// Empty - all recipe write actions moved to restricted-actions.ts
export const recipeAgentActions: AgentActionDefinition[] = []
