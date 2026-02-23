// ChefFlow Feature Map — Pain Point → Feature Mapping
// No 'use server' — exports constants and pure functions.
// Used by Remy's landing page concierge to map visitor pain points to features.
// Maintain this file whenever new features are added.

export interface FeatureMapEntry {
  painPoint: string
  painKeywords: string[]
  solution: string
  featureName: string
  tier: 'free' | 'pro'
}

export const CHEFFLOW_FEATURE_MAP: FeatureMapEntry[] = [
  {
    painPoint: 'I juggle too many tools / everything is fragmented',
    painKeywords: [
      'tools',
      'apps',
      'fragmented',
      'spreadsheets',
      'scattered',
      'switching',
      'juggle',
      'multiple',
      'disorganized',
      'everywhere',
      'google sheets',
      'venmo',
      'notes app',
      'one place',
      'all in one',
    ],
    solution:
      'ChefFlow puts events, clients, menus, recipes, payments, and scheduling in one workspace. No more switching between spreadsheets, Venmo, email, and a notes app.',
    featureName: 'Unified Workspace',
    tier: 'free',
  },
  {
    painPoint: 'I lose track of client preferences and dietary needs',
    painKeywords: [
      'client',
      'preferences',
      'allergies',
      'dietary',
      'restrictions',
      'remember',
      'forget',
      'vegan',
      'gluten',
      'nut allergy',
      'food allergy',
      'special diet',
      'notes',
      'history',
    ],
    solution:
      'Every client has a profile with dietary restrictions, allergies, past events, preferences, and notes. When you create an event for them, their needs auto-populate. Remy remembers too.',
    featureName: 'Client Profiles',
    tier: 'free',
  },
  {
    painPoint: 'Invoicing and payments are messy',
    painKeywords: [
      'invoice',
      'payment',
      'billing',
      'venmo',
      'zelle',
      'chase',
      'chasing',
      'paid',
      'deposit',
      'collect',
      'money',
      'stripe',
      'charge',
      'get paid',
      'send invoice',
    ],
    solution:
      'Stripe-powered invoicing is built in. Send a professional quote link, the client approves, and payment lands in your account. No more chasing Venmo requests or texting about deposits.',
    featureName: 'Built-In Payments',
    tier: 'free',
  },
  {
    painPoint: "I can't keep up with inquiries and leads",
    painKeywords: [
      'inquiry',
      'inquiries',
      'leads',
      'prospects',
      'follow up',
      'follow-up',
      'lost',
      'missed',
      'fall through',
      'cracks',
      'new clients',
      'booking',
      'requests',
      'pipeline',
    ],
    solution:
      'Inquiries come in through your public page, email, or manual entry. Each one is tracked through a pipeline — from new lead to booked event. Nothing falls through the cracks, and Remy can help you draft responses.',
    featureName: 'Inquiry Pipeline',
    tier: 'free',
  },
  {
    painPoint: "I don't know how my business is actually doing",
    painKeywords: [
      'financials',
      'revenue',
      'profit',
      'numbers',
      'how much',
      'money',
      'expenses',
      'food cost',
      'margin',
      'analytics',
      'reports',
      'tracking',
      'business health',
      'snapshot',
    ],
    solution:
      'Built-in financials are computed from your actual events — revenue, expenses, profit margin, food cost %. Everything is derived from real data, not estimates. You always know where you stand.',
    featureName: 'Financial Dashboard',
    tier: 'free',
  },
  {
    painPoint: 'Proposals and quotes take forever',
    painKeywords: [
      'proposal',
      'quote',
      'estimate',
      'pdf',
      'contract',
      'send',
      'approve',
      'client approval',
      'pricing',
      'menu',
      'bid',
      'pitch',
      'presentation',
    ],
    solution:
      'Build a menu, set pricing, and send a professional quote link in minutes. The client reviews and approves online — no more PDF ping-pong or long email threads.',
    featureName: 'Quick Quotes',
    tier: 'free',
  },
  {
    painPoint: 'I worry about my data and privacy',
    painKeywords: [
      'privacy',
      'data',
      'secure',
      'security',
      'trust',
      'safe',
      'ai',
      'cloud',
      'who sees',
      'stored',
      'servers',
      'hack',
      'personal information',
      'client data',
    ],
    solution:
      "ChefFlow's AI assistant (Remy) runs on your own hardware via Ollama. Your client data, financials, and conversations never leave your machine. It's private by architecture, not by policy.",
    featureName: 'Private AI',
    tier: 'free',
  },
  {
    painPoint: 'Other platforms burned me / I tried other apps',
    painKeywords: [
      'burned',
      'disappointed',
      'tried',
      'other platforms',
      'other apps',
      'didnt work',
      "didn't work",
      'skeptical',
      'trust',
      'waste',
      'gave up',
      'another app',
      'too complicated',
      'clunky',
    ],
    solution:
      'ChefFlow was hand-coded by a private chef with 15 years of experience — not generated by AI. Every form, workflow, and feature exists because a real chef needed it. The platform works without AI — Remy is an optional assistant on top.',
    featureName: 'Built by a Chef',
    tier: 'free',
  },
  {
    painPoint: 'I need help with recipes and food costing',
    painKeywords: [
      'recipe',
      'recipes',
      'food cost',
      'costing',
      'ingredients',
      'portions',
      'scaling',
      'per plate',
      'cost per',
      'grocery',
      'shopping list',
      'menu planning',
    ],
    solution:
      'Build and store your recipes with ingredients, costs, and portions. ChefFlow calculates food cost per plate and per event. You can even generate grocery quotes with real store pricing.',
    featureName: 'Recipe & Costing',
    tier: 'free',
  },
  {
    painPoint: 'Scheduling and calendar management is a mess',
    painKeywords: [
      'schedule',
      'calendar',
      'double book',
      'availability',
      'dates',
      'when',
      'free',
      'busy',
      'conflict',
      'plan',
      'prep day',
      'travel',
      'time management',
    ],
    solution:
      'See all your events on a visual calendar with prep blocks, travel time, and availability at a glance. Clients can check your availability when they inquire, so you never double-book.',
    featureName: 'Calendar & Scheduling',
    tier: 'free',
  },
  {
    painPoint: 'I need to look more professional',
    painKeywords: [
      'professional',
      'brand',
      'website',
      'public page',
      'portfolio',
      'online presence',
      'look legit',
      'credibility',
      'image',
      'presentation',
      'polished',
    ],
    solution:
      'ChefFlow gives you a public chef profile page that clients can visit, see your style, and submit inquiries. Professional quotes go out as clean, branded links — not messy emails.',
    featureName: 'Public Chef Profile',
    tier: 'free',
  },
  {
    painPoint: 'I want AI to help me but I want control',
    painKeywords: [
      'ai help',
      'assistant',
      'automate',
      'draft',
      'suggest',
      'help me',
      'write for me',
      'email',
      'respond',
      'answer',
      'remy',
      'bot',
      'chatbot',
    ],
    solution:
      'Remy is your AI sous chef — it drafts emails, suggests menus, answers business questions, and spots patterns. But it never makes decisions for you. Everything Remy does is a suggestion that you approve or reject.',
    featureName: 'Remy AI Assistant',
    tier: 'free',
  },
]

/**
 * Formats the feature map into a block suitable for embedding in a system prompt.
 */
export function formatFeatureMapForPrompt(): string {
  const entries = CHEFFLOW_FEATURE_MAP.map(
    (f) =>
      `PAIN: "${f.painPoint}"\nSOLUTION: ${f.solution}\nFEATURE: ${f.featureName} (${f.tier === 'free' ? 'included free' : 'Pro tier'})`
  )

  return `CHEFFLOW FEATURE KNOWLEDGE (use this to answer visitor questions):\n\n${entries.join('\n\n')}`
}

/**
 * Returns a concise list of starter pain points for UI pill buttons.
 */
export function getStarterPainPoints(): Array<{ label: string; message: string }> {
  return [
    { label: 'Too many apps', message: "I'm juggling too many tools to run my business" },
    {
      label: 'Client tracking',
      message: 'I keep losing track of client preferences and allergies',
    },
    { label: 'Getting paid', message: 'Invoicing and collecting payments is a mess' },
    { label: 'Is my data safe?', message: 'How do you handle my data and privacy?' },
  ]
}
