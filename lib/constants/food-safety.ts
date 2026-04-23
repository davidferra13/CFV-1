// Food Safety Standards - Queryable Reference Data
// ──────────────────────────────────────────────────────────────────────────────
// FDA Food Code 2022, ServSafe, and USDA safe handling guidelines.
// Pure deterministic reference data. No AI, no network, works offline.
//
// Used by: temperature log validation, HACCP plan engine, prep timeline,
//          Remy concierge food safety Q&A, event day checklists.
//
// This data rarely changes. FDA Food Code updates every ~4 years.
// Last verified against: FDA Food Code 2022, ServSafe 7th Edition.

// ── Types ────────────────────────────────────────────────────────────────────

export type ProteinCategory =
  | 'poultry'
  | 'ground-meat'
  | 'pork'
  | 'beef-steak'
  | 'beef-roast'
  | 'lamb'
  | 'veal'
  | 'fish'
  | 'shellfish'
  | 'eggs'
  | 'reheated'

export type CookingTemp = {
  /** Protein or food category */
  category: ProteinCategory
  /** Human-readable label */
  label: string
  /** Minimum internal temperature in Fahrenheit */
  minTempF: number
  /** Minimum internal temperature in Celsius */
  minTempC: number
  /** Required hold time at that temperature */
  holdTime: string
  /** Common items in this category */
  examples: string[]
  /** FDA Food Code reference */
  source: string
}

export type DangerZoneRule = {
  /** Rule identifier */
  id: string
  /** Human-readable name */
  label: string
  /** Temperature range in Fahrenheit */
  rangeFahrenheit: { min: number; max: number }
  /** Temperature range in Celsius */
  rangeCelsius: { min: number; max: number }
  /** Maximum time food can be in this zone */
  maxDuration: string
  /** What to do if exceeded */
  action: string
  /** FDA source */
  source: string
}

export type CoolingRequirement = {
  /** Stage of cooling */
  stage: string
  /** From temperature (F) */
  fromTempF: number
  /** To temperature (F) */
  toTempF: number
  /** Maximum time allowed */
  maxTime: string
  /** Methods to achieve this */
  methods: string[]
}

export type HoldingTemp = {
  /** Hot or cold holding */
  type: 'hot' | 'cold'
  /** Minimum/maximum temperature in Fahrenheit */
  tempF: number
  /** Minimum/maximum temperature in Celsius */
  tempC: number
  /** Direction: "at or above" vs "at or below" */
  direction: 'min' | 'max'
  /** Maximum duration without temperature check */
  checkInterval: string
  /** What happens if temp is out of range */
  correctiveAction: string
}

export type CrossContaminationRule = {
  /** Rule identifier */
  id: string
  /** What to keep separate */
  label: string
  /** Description */
  description: string
  /** Risk level */
  risk: 'critical' | 'high' | 'moderate'
}

export type HandwashingTrigger = {
  /** When to wash hands */
  trigger: string
  /** Duration */
  duration: string
}

// ── Cooking Temperatures (FDA Food Code 2022) ────────────────────────────────

export const COOKING_TEMPS: CookingTemp[] = [
  {
    category: 'poultry',
    label: 'Poultry (all)',
    minTempF: 165,
    minTempC: 74,
    holdTime: 'instantaneous (less than 1 second)',
    examples: ['chicken', 'turkey', 'duck', 'goose', 'quail', 'pheasant', 'cornish hen'],
    source: 'FDA Food Code 3-401.11(A)(1)',
  },
  {
    category: 'ground-meat',
    label: 'Ground Meat',
    minTempF: 155,
    minTempC: 68,
    holdTime: '17 seconds',
    examples: [
      'ground beef',
      'ground pork',
      'ground lamb',
      'ground veal',
      'sausage',
      'meatball',
      'meatloaf',
    ],
    source: 'FDA Food Code 3-401.11(A)(2)',
  },
  {
    category: 'pork',
    label: 'Pork (whole cuts)',
    minTempF: 145,
    minTempC: 63,
    holdTime: '15 seconds',
    examples: ['pork chop', 'pork loin', 'pork tenderloin', 'pork roast', 'ham (fresh)'],
    source: 'FDA Food Code 3-401.11(A)(3)',
  },
  {
    category: 'beef-steak',
    label: 'Beef Steaks (whole muscle)',
    minTempF: 145,
    minTempC: 63,
    holdTime: '15 seconds',
    examples: ['ribeye', 'sirloin', 'filet mignon', 'strip steak', 'flank', 't-bone'],
    source: 'FDA Food Code 3-401.11(A)(3)',
  },
  {
    category: 'beef-roast',
    label: 'Beef Roasts',
    minTempF: 145,
    minTempC: 63,
    holdTime: '4 minutes',
    examples: ['prime rib', 'standing rib roast', 'tenderloin roast', 'brisket'],
    source: 'FDA Food Code 3-401.11(B)',
  },
  {
    category: 'lamb',
    label: 'Lamb',
    minTempF: 145,
    minTempC: 63,
    holdTime: '15 seconds',
    examples: ['lamb chop', 'lamb rack', 'lamb leg', 'lamb shank'],
    source: 'FDA Food Code 3-401.11(A)(3)',
  },
  {
    category: 'veal',
    label: 'Veal',
    minTempF: 145,
    minTempC: 63,
    holdTime: '15 seconds',
    examples: ['veal chop', 'veal cutlet', 'osso buco'],
    source: 'FDA Food Code 3-401.11(A)(3)',
  },
  {
    category: 'fish',
    label: 'Fish',
    minTempF: 145,
    minTempC: 63,
    holdTime: '15 seconds',
    examples: ['salmon', 'cod', 'halibut', 'tuna', 'swordfish', 'trout', 'bass', 'snapper'],
    source: 'FDA Food Code 3-401.11(A)(3)',
  },
  {
    category: 'shellfish',
    label: 'Shellfish',
    minTempF: 145,
    minTempC: 63,
    holdTime: '15 seconds',
    examples: ['shrimp', 'lobster', 'crab', 'scallops', 'clams', 'mussels', 'oysters'],
    source: 'FDA Food Code 3-401.11(A)(3)',
  },
  {
    category: 'eggs',
    label: 'Eggs',
    minTempF: 155,
    minTempC: 68,
    holdTime: '17 seconds',
    examples: ['scrambled eggs', 'omelets', 'quiche', 'frittata'],
    source: 'FDA Food Code 3-401.11(A)(2)',
  },
  {
    category: 'reheated',
    label: 'Reheated Foods',
    minTempF: 165,
    minTempC: 74,
    holdTime: 'instantaneous',
    examples: ['any previously cooked and cooled food being reheated for service'],
    source: 'FDA Food Code 3-403.11',
  },
]

// ── Danger Zone ──────────────────────────────────────────────────────────────

export const DANGER_ZONE: DangerZoneRule = {
  id: 'danger-zone',
  label: 'Temperature Danger Zone',
  rangeFahrenheit: { min: 41, max: 135 },
  rangeCelsius: { min: 5, max: 57 },
  maxDuration: '4 hours cumulative',
  action:
    'Discard food that has been in the danger zone for more than 4 hours total. After 2 hours, food must be reheated to 165F or cooled below 41F.',
  source: 'FDA Food Code 3-501.19',
}

export const HIGH_AMBIENT_RULE: DangerZoneRule = {
  id: 'high-ambient',
  label: 'High Ambient Temperature Rule (90F+)',
  rangeFahrenheit: { min: 90, max: 999 },
  rangeCelsius: { min: 32, max: 999 },
  maxDuration: '1 hour',
  action:
    'When ambient temperature exceeds 90F (32C), food in the danger zone must be discarded after 1 hour instead of 4. Applies to outdoor events, hot kitchens without AC, and transport in summer.',
  source: 'FDA Food Code 3-501.19, USDA Food Safety Education',
}

// ── Cooling Requirements (2-Stage Method) ────────────────────────────────────

export const COOLING_REQUIREMENTS: CoolingRequirement[] = [
  {
    stage: 'Stage 1',
    fromTempF: 135,
    toTempF: 70,
    maxTime: '2 hours',
    methods: [
      'Ice bath with stirring',
      'Shallow pans (max 4 inches deep)',
      'Ice paddle (frozen paddle stirred through food)',
      'Blast chiller',
      'Add ice as an ingredient',
    ],
  },
  {
    stage: 'Stage 2',
    fromTempF: 70,
    toTempF: 41,
    maxTime: '4 hours',
    methods: [
      'Refrigeration in shallow pans',
      'Ice bath',
      'Loosely covered (allow heat to escape)',
      'Do not stack containers until fully cooled',
    ],
  },
]

// ── Holding Temperatures ─────────────────────────────────────────────────────

export const HOLDING_TEMPS: HoldingTemp[] = [
  {
    type: 'hot',
    tempF: 135,
    tempC: 57,
    direction: 'min',
    checkInterval: 'every 2 hours',
    correctiveAction:
      'Reheat to 165F within 2 hours or discard. Do not re-serve food that has dropped below 135F for more than 4 hours cumulative.',
  },
  {
    type: 'cold',
    tempF: 41,
    tempC: 5,
    direction: 'max',
    checkInterval: 'every 2 hours',
    correctiveAction:
      'If above 41F for less than 2 hours, rapidly cool. If above 41F for more than 4 hours cumulative, discard.',
  },
]

// ── Cross-Contamination Prevention ───────────────────────────────────────────

export const CROSS_CONTAMINATION_RULES: CrossContaminationRule[] = [
  {
    id: 'raw-cooked',
    label: 'Raw and cooked foods',
    description:
      'Never store raw meat above cooked/ready-to-eat foods. Raw proteins go on the lowest shelf.',
    risk: 'critical',
  },
  {
    id: 'allergen-separation',
    label: 'Allergen separation',
    description:
      'Use separate cutting boards, utensils, and prep surfaces for allergen-containing ingredients. Clean and sanitize between uses.',
    risk: 'critical',
  },
  {
    id: 'storage-order',
    label: 'Refrigerator storage order (top to bottom)',
    description:
      'Ready-to-eat foods (top), seafood, whole cuts of beef/pork/lamb, ground meats, poultry (bottom). Organized by minimum cooking temperature: lowest temp on top, highest on bottom.',
    risk: 'high',
  },
  {
    id: 'cutting-boards',
    label: 'Color-coded cutting boards',
    description:
      'Green: fruits/vegetables. Red: raw meat. Blue: raw fish. Yellow: raw poultry. White: dairy/bread. Brown: cooked meat.',
    risk: 'high',
  },
  {
    id: 'produce-wash',
    label: 'Produce washing',
    description:
      'Wash all fruits and vegetables under running water before cutting, even if you plan to peel them. Do not use soap or bleach.',
    risk: 'moderate',
  },
  {
    id: 'chemical-storage',
    label: 'Chemical separation',
    description:
      'Store cleaning chemicals below and away from all food items. Never in the same cabinet or shelf as food or food-contact surfaces.',
    risk: 'critical',
  },
]

// ── Handwashing Triggers ─────────────────────────────────────────────────────

export const HANDWASHING_TRIGGERS: HandwashingTrigger[] = [
  { trigger: 'Before starting food preparation', duration: '20 seconds minimum' },
  { trigger: 'After touching raw meat, poultry, or seafood', duration: '20 seconds minimum' },
  { trigger: 'After using the restroom', duration: '20 seconds minimum' },
  { trigger: 'After touching hair, face, or body', duration: '20 seconds minimum' },
  { trigger: 'After sneezing, coughing, or blowing nose', duration: '20 seconds minimum' },
  { trigger: 'After handling garbage or cleaning chemicals', duration: '20 seconds minimum' },
  { trigger: 'After eating, drinking, or smoking', duration: '20 seconds minimum' },
  {
    trigger: 'After touching phones, door handles, or other non-food surfaces',
    duration: '20 seconds minimum',
  },
  {
    trigger: 'When switching between raw proteins and ready-to-eat foods',
    duration: '20 seconds minimum',
  },
]

// ── Shelf Life (Common Proteins, Refrigerated at 41F/5C) ─────────────────────

export type ShelfLifeEntry = {
  item: string
  refrigeratedDays: { min: number; max: number }
  frozenMonths: { min: number; max: number }
  notes: string
}

export const SHELF_LIFE: ShelfLifeEntry[] = [
  {
    item: 'Fresh chicken (raw)',
    refrigeratedDays: { min: 1, max: 2 },
    frozenMonths: { min: 9, max: 12 },
    notes: 'Use or freeze within 2 days of purchase',
  },
  {
    item: 'Fresh ground meat (raw)',
    refrigeratedDays: { min: 1, max: 2 },
    frozenMonths: { min: 3, max: 4 },
    notes: 'Ground meat spoils faster due to higher surface area',
  },
  {
    item: 'Fresh beef steaks (raw)',
    refrigeratedDays: { min: 3, max: 5 },
    frozenMonths: { min: 6, max: 12 },
    notes: 'Vacuum-sealed can extend to 7 days refrigerated',
  },
  {
    item: 'Fresh pork (raw)',
    refrigeratedDays: { min: 3, max: 5 },
    frozenMonths: { min: 4, max: 6 },
    notes: '',
  },
  {
    item: 'Fresh fish (raw)',
    refrigeratedDays: { min: 1, max: 2 },
    frozenMonths: { min: 3, max: 6 },
    notes: 'Store on ice in coldest part of fridge',
  },
  {
    item: 'Fresh shellfish (raw)',
    refrigeratedDays: { min: 1, max: 2 },
    frozenMonths: { min: 3, max: 6 },
    notes: 'Live shellfish: use same day. Shucked: 1-2 days',
  },
  {
    item: 'Fresh eggs',
    refrigeratedDays: { min: 21, max: 35 },
    frozenMonths: { min: 0, max: 0 },
    notes: 'Check sell-by date. Float test: discard if egg floats',
  },
  {
    item: 'Cooked leftovers',
    refrigeratedDays: { min: 3, max: 4 },
    frozenMonths: { min: 2, max: 3 },
    notes: 'Cool within 2 hours, store in shallow airtight containers',
  },
  {
    item: 'Deli meats (opened)',
    refrigeratedDays: { min: 3, max: 5 },
    frozenMonths: { min: 1, max: 2 },
    notes: 'Listeria risk - consume quickly after opening',
  },
  {
    item: 'Fresh herbs',
    refrigeratedDays: { min: 5, max: 10 },
    frozenMonths: { min: 0, max: 0 },
    notes: 'Wrap in damp paper towel in sealed bag. Basil: room temp in water',
  },
  {
    item: 'Cut fruits and vegetables',
    refrigeratedDays: { min: 3, max: 5 },
    frozenMonths: { min: 8, max: 12 },
    notes: 'Store in airtight containers',
  },
  {
    item: 'Dairy (milk, cream)',
    refrigeratedDays: { min: 5, max: 7 },
    frozenMonths: { min: 0, max: 0 },
    notes: 'After opening. Check sell-by date',
  },
  {
    item: 'Hard cheese',
    refrigeratedDays: { min: 21, max: 42 },
    frozenMonths: { min: 6, max: 8 },
    notes: 'Wrap tightly. Cut mold off hard cheese (1 inch around). Discard soft cheese with mold',
  },
  {
    item: 'Soft cheese',
    refrigeratedDays: { min: 5, max: 7 },
    frozenMonths: { min: 0, max: 0 },
    notes: 'Brie, ricotta, cream cheese. Discard if any mold appears',
  },
]

// ── Lookup Helpers ───────────────────────────────────────────────────────────

/**
 * Find the cooking temperature for a protein/food item by keyword.
 * Returns the matching entry or null.
 */
export function getCookingTemp(item: string): CookingTemp | null {
  const lower = item.toLowerCase().trim()
  for (const temp of COOKING_TEMPS) {
    if (temp.category === lower) return temp
    if (temp.label.toLowerCase().includes(lower)) return temp
    if (temp.examples.some((ex) => lower.includes(ex) || ex.includes(lower))) return temp
  }
  return null
}

/**
 * Check if a temperature reading is safe for a given protein.
 * Returns { safe, message }.
 */
export function isTempSafe(item: string, tempF: number): { safe: boolean; message: string } {
  const requirement = getCookingTemp(item)
  if (!requirement) {
    return {
      safe: false,
      message: `Unknown food item: ${item}. Verify safe cooking temperature manually.`,
    }
  }

  if (tempF >= requirement.minTempF) {
    return {
      safe: true,
      message: `${tempF}F meets the ${requirement.minTempF}F minimum for ${requirement.label}.`,
    }
  }

  const deficit = requirement.minTempF - tempF
  return {
    safe: false,
    message: `${tempF}F is ${deficit}F below the ${requirement.minTempF}F minimum for ${requirement.label}. Continue cooking.`,
  }
}

/**
 * Check if a food item is in the danger zone.
 */
export function isInDangerZone(tempF: number): boolean {
  return tempF > DANGER_ZONE.rangeFahrenheit.min && tempF < DANGER_ZONE.rangeFahrenheit.max
}

/**
 * Check if high-ambient rule applies (food must be discarded after 1 hour, not 4).
 */
export function isHighAmbientRisk(ambientTempF: number): boolean {
  return ambientTempF >= 90
}

/**
 * Get shelf life info for a food item by keyword.
 */
export function getShelfLife(item: string): ShelfLifeEntry | null {
  const lower = item.toLowerCase().trim()
  for (const entry of SHELF_LIFE) {
    if (entry.item.toLowerCase().includes(lower) || lower.includes(entry.item.toLowerCase())) {
      return entry
    }
  }
  return null
}
