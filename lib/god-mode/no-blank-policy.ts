export type NoBlankFact = 'price' | 'recipe_cost' | 'allergy' | 'vendor_source' | 'prep_plan'

export interface NoBlankState {
  fact: NoBlankFact
  status: 'ready' | 'fallback' | 'missing'
  valueLabel: string
  action: string | null
}

export function noBlankState(fact: NoBlankFact, value: unknown): NoBlankState {
  if (value !== null && value !== undefined && value !== '') {
    return { fact, status: 'ready', valueLabel: String(value), action: null }
  }

  const actions: Record<NoBlankFact, string> = {
    price: 'use_pie_fallback_and_review_confidence',
    recipe_cost: 'add_yield_or_quantity',
    allergy: 'confirm_allergy_profile',
    vendor_source: 'add_manual_quote_or_source',
    prep_plan: 'generate_draft_prep_plan',
  }

  return {
    fact,
    status: fact === 'price' ? 'fallback' : 'missing',
    valueLabel: fact === 'price' ? 'Estimated fallback required' : 'Missing',
    action: actions[fact],
  }
}
