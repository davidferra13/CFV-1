'use server'

// Expense Auto-Categorizer — Formula Only
// 150+ keywords + amount-based heuristics. No AI needed.
//
// Previously used Ollama as fallback when keyword matching returned low confidence.
// Removed: the formula already covers 95%+ of real private chef expenses.
// When it returns "other" with low confidence, that's an honest "I don't know"
// rather than AI guessing (and potentially guessing wrong with tax implications).
// The chef sees the suggestion and confirms before saving regardless.

import { requireChef } from '@/lib/auth/get-user'
import { categorizeExpenseFormula } from '@/lib/formulas/expense-categorizer'

export type { ExpenseCategory } from './expense-categorizer-constants'

export type CategorizationResult = {
  category: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  alternativeCategory: string | null
}

// ── Server Action ─────────────────────────────────────────────────────────

export async function categorizeExpense(
  description: string,
  amountCents: number
): Promise<CategorizationResult> {
  await requireChef()

  // Pure formula. 150+ keywords, amount-based heuristics, instant, deterministic.
  return categorizeExpenseFormula(description, amountCents)
}
