// Privacy Routing Audit Map
// Single source of truth for which AI modules must use local Ollama vs cloud Gemini.
// No 'use server' - importable from any context.
//
// Rules (from CLAUDE.md):
//   - Client PII (names, emails, phones, addresses) → Ollama
//   - Financials (budget, quotes, payments, revenue) → Ollama
//   - Health data (allergies, dietary restrictions)   → Ollama
//   - Client messages and conversation content        → Ollama
//   - Business analytics and lead scores              → Ollama
//   - Operational data (temp logs, staff data)        → Ollama
//   - Creative/marketing copy (no PII embedded)       → Gemini OK
//   - Vision/OCR (receipt images, documents)          → Gemini OK (no local multimodal yet)
//   - Public regulatory/template data                 → Gemini OK

import type { AIProvider } from './providers'
import type { ModelTier } from './providers'

export interface AIModuleRouting {
  provider: AIProvider
  modelTier: ModelTier
  dataSensitivity: 'critical' | 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Definitive routing map for every AI module in ChefFlow.
 * Used by the simulation system, privacy audits, and observability dashboard.
 */
export const AI_MODULE_ROUTING: Record<string, AIModuleRouting> = {
  // ── Ollama (Local) - Private Data ─────────────────────────────────

  // Client data parsing
  'parse-client': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'critical',
    reason: 'Client PII: names, emails, phones, addresses, dietary data',
  },
  'parse-clients-bulk': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'critical',
    reason: 'Batch client PII extraction',
  },
  'parse-brain-dump': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'critical',
    reason: 'Freeform notes with client PII and recipes',
  },
  'parse-inquiry': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'critical',
    reason: 'Inquiry details: budget, dietary, client expectations',
  },
  'parse-event-from-text': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Client name + financial data (quoted price, deposit)',
  },

  // Business intelligence
  'lead-scoring': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Budget, inquiry status, conversion rates',
  },
  'pricing-intelligence': {
    provider: 'ollama',
    modelTier: 'complex',
    dataSensitivity: 'high',
    reason: 'Event financials, comparable pricing history',
  },
  'business-insights': {
    provider: 'ollama',
    modelTier: 'complex',
    dataSensitivity: 'high',
    reason: 'Historical revenue, business analytics',
  },
  'client-preference-profile': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Full client history and preference data',
  },

  // Safety-critical
  'allergen-risk': {
    provider: 'ollama',
    modelTier: 'complex',
    dataSensitivity: 'critical',
    reason: 'Guest allergies + menu allergen cross-reference',
  },
  'temp-log-anomaly': {
    provider: 'ollama',
    modelTier: 'fast',
    dataSensitivity: 'medium',
    reason: 'Temperature log operational data',
  },

  // Communication triage
  'chat-insights': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'critical',
    reason: 'Client messages, allergies, budget mentions',
  },
  'sentiment-analysis': {
    provider: 'ollama',
    modelTier: 'fast',
    dataSensitivity: 'high',
    reason: 'Client message body sentiment',
  },
  'client-portal-triage': {
    provider: 'ollama',
    modelTier: 'fast',
    dataSensitivity: 'high',
    reason: 'Client portal message routing',
  },
  'campaign-outreach': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Client names, history, preferences for personalization',
  },
  'followup-draft': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Client name, dietary restrictions, allergies',
  },
  'copilot-actions': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Client names in recent events context',
  },

  // Financial
  'expense-categorizer': {
    provider: 'ollama',
    modelTier: 'fast',
    dataSensitivity: 'medium',
    reason: 'Expense descriptions and categories',
  },
  'tax-deduction-identifier': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Expense data for tax purposes',
  },
  'gratuity-framing': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'high',
    reason: 'Client name + event financial data',
  },

  // Document generation with PII
  'contract-generator': {
    provider: 'ollama',
    modelTier: 'complex',
    dataSensitivity: 'critical',
    reason: 'Client PII (name, email, phone) + address + financials',
  },
  'staff-briefing-ai': {
    provider: 'ollama',
    modelTier: 'complex',
    dataSensitivity: 'high',
    reason: 'Guest names, allergens, client vibe notes, staff names',
  },

  // Matching
  'carry-forward-match': {
    provider: 'ollama',
    modelTier: 'standard',
    dataSensitivity: 'medium',
    reason: 'Client info matching across events',
  },

  // Email classification
  'gmail-classify': {
    provider: 'ollama',
    modelTier: 'fast',
    dataSensitivity: 'high',
    reason: 'Known client email list + email body',
  },

  // ── Gemini (Cloud) - Non-PII Tasks ────────────────────────────────

  // Creative / marketing
  'menu-suggestions': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Occasion + guest count only, no PII',
  },
  'quote-draft': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Pricing logic, no client PII',
  },
  'recipe-scaling': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Recipe data only',
  },
  'grocery-consolidation': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Ingredient lists only',
  },
  'social-captions': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Marketing copy, no PII',
  },
  'chef-bio': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Chef own data (consented)',
  },
  'review-request': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Marketing template',
  },
  'testimonial-selection': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Anonymized quotes',
  },

  // Event planning (no client PII)
  'prep-timeline': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Recipe timing only',
  },
  'service-timeline': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Recipe timing only',
  },
  'contingency-ai': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Event logistics only',
  },
  'aar-generator': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Post-event analysis',
  },

  // Vision / OCR (no local multimodal model yet)
  'parse-receipt': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'medium',
    reason: 'Chef own receipts, requires vision model',
  },
  'parse-document-vision': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'medium',
    reason: 'Document OCR, requires vision model',
  },

  // Business documents (public/template data)
  'permit-checklist': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Public regulatory data',
  },
  'vendor-comparison': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Public vendor data',
  },
  'equipment-depreciation-explainer': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Equipment data, no PII',
  },
  'menu-nutritional': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Recipe nutritional data',
  },

  // Email drafting (ACE system - uses inquiry data, not raw PII)
  correspondence: {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'medium',
    reason: 'ACE uses controlled context, not raw client PII',
  },
  'parse-recipe': {
    provider: 'gemini',
    modelTier: 'standard',
    dataSensitivity: 'low',
    reason: 'Recipe text, ingredients, methods',
  },
}

/** Count modules by provider. */
export function getRoutingStats(): { ollama: number; gemini: number; total: number } {
  const entries = Object.values(AI_MODULE_ROUTING)
  const ollama = entries.filter((e) => e.provider === 'ollama').length
  const gemini = entries.filter((e) => e.provider === 'gemini').length
  return { ollama, gemini, total: entries.length }
}
