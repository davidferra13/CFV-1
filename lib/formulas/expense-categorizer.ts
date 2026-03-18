// Expense Auto-Categorizer - Deterministic Keyword Lookup
// Maps expense descriptions to categories using keyword matching.
// No AI needed - this is the same logic every accounting app uses.
// Matches the CategorizationResult type from the AI version exactly.

import type { ExpenseCategory } from '@/lib/ai/expense-categorizer-constants'

// ── Types (match the AI version exactly) ───────────────────────────────────

export type CategorizationResult = {
  category: ExpenseCategory
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  alternativeCategory: ExpenseCategory | null
}

// ── Keyword → Category Map ─────────────────────────────────────────────────
// Each entry: array of keywords that indicate this category.
// Keywords are checked as case-insensitive substrings.
// More specific keywords come first for priority matching.

const KEYWORD_MAP: Array<{ category: ExpenseCategory; keywords: string[]; alt?: ExpenseCategory }> =
  [
    // ── Food Cost (groceries, ingredients, produce, proteins) ──
    {
      category: 'food_cost',
      keywords: [
        // Stores
        'whole foods',
        'trader joe',
        "trader joe's",
        'costco',
        'safeway',
        'kroger',
        'publix',
        'aldi',
        'wegmans',
        'sprouts',
        'heb',
        'h-e-b',
        'walmart grocery',
        'target grocery',
        'food lion',
        'stop & shop',
        'piggly wiggly',
        'albertsons',
        'giant',
        'ralphs',
        'vons',
        'market basket',
        'shoprite',
        'meijer',
        'winco',
        "fry's",
        "sam's club",
        "bj's wholesale",
        'restaurant depot',
        'sysco',
        'us foods',
        'cheney brothers',
        'gordon food service',
        'gfs',
        'fresh market',
        'farmers market',
        'fish market',
        'butcher',
        'bakery',
        'deli',
        // Ingredients
        'grocery',
        'groceries',
        'produce',
        'vegetables',
        'fruits',
        'meat',
        'chicken',
        'beef',
        'pork',
        'lamb',
        'fish',
        'salmon',
        'shrimp',
        'seafood',
        'shellfish',
        'lobster',
        'crab',
        'scallops',
        'dairy',
        'milk',
        'cream',
        'butter',
        'cheese',
        'eggs',
        'yogurt',
        'bread',
        'flour',
        'sugar',
        'rice',
        'pasta',
        'noodles',
        'spices',
        'seasoning',
        'herbs',
        'oil',
        'olive oil',
        'vinegar',
        'sauce',
        'stock',
        'broth',
        'wine for cooking',
        'cooking wine',
        'truffle',
        'saffron',
        'vanilla',
        'chocolate',
        'cocoa',
        'ingredients',
        'food supplies',
        'pantry',
      ],
    },
    // ── Supplies (disposables, packaging, cleaning, small tools) ──
    {
      category: 'supplies',
      keywords: [
        'disposable',
        'paper towel',
        'napkin',
        'foil',
        'aluminum foil',
        'plastic wrap',
        'cling wrap',
        'parchment',
        'parchment paper',
        'zip lock',
        'ziplock',
        'ziploc',
        'food container',
        'takeout container',
        'to-go container',
        'to go box',
        'packaging',
        'bags',
        'cleaning',
        'cleaner',
        'sanitizer',
        'hand sanitizer',
        'bleach',
        'soap',
        'dish soap',
        'sponge',
        'scrubber',
        'gloves',
        'latex gloves',
        'nitrile gloves',
        'apron',
        'chef hat',
        'hairnet',
        'thermometer',
        'probe',
        'lighter',
        'matches',
        'sterno',
        'chafing fuel',
        'charcoal',
        'propane',
        'butane',
        'label',
        'labels',
        'marker',
        'tape',
        'masking tape',
        'trash bag',
        'garbage bag',
        'bin liner',
      ],
      alt: 'food_cost',
    },
    // ── Equipment (durable kitchen items, appliances) ──
    {
      category: 'equipment',
      keywords: [
        'knife',
        'knives',
        'wusthof',
        'shun',
        'victorinox',
        'henckels',
        'pan',
        'skillet',
        'cast iron',
        'dutch oven',
        'stock pot',
        'sheet pan',
        'baking sheet',
        'cutting board',
        'mandoline',
        'blender',
        'vitamix',
        'food processor',
        'cuisinart',
        'kitchenaid',
        'kitchen aid',
        'stand mixer',
        'immersion blender',
        'sous vide',
        'anova',
        'instant pot',
        'pressure cooker',
        'thermapen',
        'scale',
        'kitchen scale',
        'tongs',
        'spatula',
        'ladle',
        'whisk',
        'peeler',
        'grater',
        'mandoline',
        'slicer',
        'meat grinder',
        'grill',
        'smoker',
        'torch',
        'blowtorch',
        'chafing dish',
        'serving platter',
        'serving tray',
        'appliance',
        'oven',
        'range',
        'cooktop',
        'induction',
        'refrigerator',
        'freezer',
        'ice maker',
        'vacuum sealer',
        'food saver',
        'dehydrator',
      ],
      alt: 'supplies',
    },
    // ── Transport (travel to events, grocery runs) ──
    {
      category: 'transport',
      keywords: [
        'gas',
        'gasoline',
        'fuel',
        'diesel',
        'gas station',
        'shell',
        'chevron',
        'bp',
        'exxon',
        'mobil',
        'mileage',
        'miles',
        'toll',
        'tolls',
        'ez pass',
        'ezpass',
        'parking',
        'garage',
        'meter',
        'uber',
        'lyft',
        'rideshare',
        'taxi',
        'cab',
        'car wash',
        'oil change',
        'car maintenance',
        'tire',
        'rental car',
        'hertz',
        'enterprise',
        'avis',
        'moving van',
        'u-haul',
        'uhaul',
        'delivery fee',
        'shipping',
      ],
    },
    // ── Marketing (promotion, branding, photography) ──
    {
      category: 'marketing',
      keywords: [
        'website',
        'domain',
        'squarespace',
        'wix',
        'wordpress',
        'self-hosted',
        'hosting',
        'ssl',
        'email marketing',
        'mailchimp',
        'constant contact',
        'photography',
        'photographer',
        'photo shoot',
        'photoshoot',
        'videography',
        'video',
        'content creation',
        'business card',
        'brochure',
        'flyer',
        'banner',
        'signage',
        'social media',
        'instagram',
        'facebook',
        'tiktok',
        'google ads',
        'facebook ads',
        'advertising',
        'ad spend',
        'seo',
        'branding',
        'logo',
        'design',
        'graphic design',
        'print',
        'printing',
        'vistaprint',
        'networking',
        'event sponsorship',
      ],
    },
    // ── Professional Services (accountant, lawyer, consultants) ──
    {
      category: 'professional_services',
      keywords: [
        'accountant',
        'accounting',
        'cpa',
        'bookkeeper',
        'bookkeeping',
        'attorney',
        'lawyer',
        'legal',
        'legal fee',
        'consultant',
        'consulting',
        'advisory',
        'tax preparation',
        'tax prep',
        'turbotax',
        'quickbooks',
        'freshbooks',
        'xero',
      ],
    },
    // ── Staff (wages, helpers, contractors) ──
    {
      category: 'staff',
      keywords: [
        'wages',
        'salary',
        'payroll',
        'payment to',
        'sous chef',
        'helper',
        'assistant',
        'server',
        'bartender',
        'dishwasher',
        'prep cook',
        'line cook',
        'contractor',
        'temp worker',
        'day labor',
        'tip',
        'gratuity',
        'bonus',
        'staffing',
        'staffing agency',
      ],
    },
    // ── Utilities ──
    {
      category: 'utilities',
      keywords: [
        'electric',
        'electricity',
        'power bill',
        'utility bill',
        'water bill',
        'gas bill',
        'natural gas',
        'internet',
        'wifi',
        'phone bill',
        'cell phone',
        'comcast',
        'verizon',
        'at&t',
        'spectrum',
      ],
    },
    // ── Insurance ──
    {
      category: 'insurance',
      keywords: [
        'insurance',
        'liability',
        'general liability',
        'equipment insurance',
        'business insurance',
        'food liability',
        'professional liability',
        'premium',
        'policy',
      ],
    },
    // ── Licenses & Permits ──
    {
      category: 'licenses_permits',
      keywords: [
        'license',
        'permit',
        'food handler',
        'servsafe',
        'health permit',
        'business license',
        'health inspection',
        'certification',
        'food safety cert',
        'food manager',
        'liquor license',
        'alcohol permit',
        'registration',
        'renewal fee',
      ],
    },
    // ── Rent ──
    {
      category: 'rent',
      keywords: [
        'rent',
        'kitchen rental',
        'commercial kitchen',
        'shared kitchen',
        'commissary',
        'kitchen space',
        'lease',
        'storage unit',
        'cold storage',
        'warehouse',
      ],
    },
  ]

// ── Categorizer ────────────────────────────────────────────────────────────

/**
 * Categorizes an expense description using keyword matching.
 * Pure lookup - no AI, no network, instant, deterministic.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function categorizeExpenseFormula(
  description: string,
  amountCents: number
): CategorizationResult {
  const descLower = description.toLowerCase().trim()

  if (!descLower) {
    return {
      category: 'other',
      confidence: 'low',
      reasoning: 'No description provided.',
      alternativeCategory: null,
    }
  }

  // Score each category by how many keywords match
  const scores: Array<{ category: ExpenseCategory; matches: number; alt?: ExpenseCategory }> = []

  for (const entry of KEYWORD_MAP) {
    let matchCount = 0
    for (const keyword of entry.keywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        matchCount++
      }
    }
    if (matchCount > 0) {
      scores.push({ category: entry.category, matches: matchCount, alt: entry.alt })
    }
  }

  if (scores.length === 0) {
    return {
      category: 'other',
      confidence: 'low',
      reasoning: `No keyword match found for "${description}". Categorized as Other.`,
      alternativeCategory: null,
    }
  }

  // Sort by match count (most matches = best fit)
  scores.sort((a, b) => b.matches - a.matches)

  const best = scores[0]
  const runner = scores.length > 1 ? scores[1] : null

  // Confidence based on match strength
  let confidence: 'high' | 'medium' | 'low'
  if (best.matches >= 3) {
    confidence = 'high'
  } else if (best.matches >= 2) {
    confidence = 'medium'
  } else {
    confidence = runner && runner.matches === best.matches ? 'low' : 'medium'
  }

  // Amount-based heuristics for edge cases
  const amountDollars = amountCents / 100

  // Small purchases at known grocery stores are almost certainly food
  if (best.category === 'food_cost' && amountDollars < 500) {
    confidence = 'high'
  }

  // Large purchases might be equipment, not supplies
  if (best.category === 'supplies' && amountDollars > 500) {
    return {
      category: 'equipment',
      confidence: 'medium',
      reasoning: `"${description}" matched supplies keywords, but at $${amountDollars.toFixed(2)} it may be durable equipment.`,
      alternativeCategory: 'supplies',
    }
  }

  const alternativeCategory = runner?.category ?? best.alt ?? null

  return {
    category: best.category,
    confidence,
    reasoning: `Matched ${best.matches} keyword${best.matches > 1 ? 's' : ''} for ${best.category.replace('_', ' ')}.`,
    alternativeCategory: alternativeCategory !== best.category ? alternativeCategory : null,
  }
}
