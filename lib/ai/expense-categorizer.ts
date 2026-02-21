'use server'

// Expense Auto-Categorizer
// When a chef manually types an expense description (no receipt scan), AI suggests
// the most appropriate expense category. Routed to Ollama (internal business data).
// Output is a SUGGESTION only — chef confirms before saving.

import { requireChef } from '@/lib/auth/get-user'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from './expense-categorizer-constants'
import { z } from 'zod'

export type { ExpenseCategory } from './expense-categorizer-constants'

// ── Zod schema ──────────────────────────────────────────────────────────────

const CategorizationResultSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
  alternativeCategory: z.enum(EXPENSE_CATEGORIES).nullable(),
})

export type CategorizationResult = z.infer<typeof CategorizationResultSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function categorizeExpense(
  description: string,
  amountCents: number
): Promise<CategorizationResult> {
  await requireChef()

  const systemPrompt = `You are an accounting assistant for a private chef business.
Classify the expense into exactly one category from this list:
${EXPENSE_CATEGORIES.map((c) => `  ${c}: ${EXPENSE_CATEGORY_LABELS[c]}`).join('\n')}

Rules:
- food_cost: any grocery, produce, protein, dairy, pantry ingredient
- supplies: disposables, packaging, cleaning products, small kitchen tools
- equipment: appliances, knives, pans, durable kitchen equipment
- transport: gas, mileage, rideshare, parking for events
- marketing: website, photography, ads, business cards, social
- professional_services: accountant, attorney, consultant fees
- staff: wages, payments to contractors or helpers
- utilities: kitchen rental utilities if billed separately
- insurance: liability insurance, equipment insurance
- licenses_permits: food handler, business license, health permit
- rent: kitchen rental space fees
- other: anything that doesn't clearly fit above

Return valid JSON only.`

  const userContent = `Expense description: "${description}"
Amount: $${(amountCents / 100).toFixed(2)}

Return JSON: { "category": "...", "confidence": "high|medium|low", "reasoning": "one sentence", "alternativeCategory": "...or null" }`

  try {
    return await parseWithOllama(systemPrompt, userContent, CategorizationResultSchema, {
      modelTier: 'fast',
      cache: true,
    })
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[expense-categorizer] Failed:', err)
    return {
      category: 'other',
      confidence: 'low',
      reasoning: 'AI categorization unavailable',
      alternativeCategory: null,
    }
  }
}
