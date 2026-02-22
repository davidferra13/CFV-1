/**
 * Culinary Composition Cheat Sheet — The Ultimate Word List
 *
 * Every word you could use to describe food, organized by category and
 * importance tier. Used to inspire dish composition — ensuring you hit
 * every dimension: texture, flavor, temperature, mouthfeel, aroma,
 * technique, visual, composition principles, and emotion.
 *
 * Tier 1 = foundational pillars (displayed HUGE)
 * Tier 2 = strong supporting concepts (large)
 * Tier 3 = the bulk of the board (medium)
 * Tier 4 = advanced / niche (small)
 */

export const CATEGORIES = [
  'texture',
  'flavor',
  'temperature',
  'mouthfeel',
  'aroma',
  'technique',
  'visual',
  'composition',
  'emotion',
  'sauce',
  'action',
] as const

export type WordCategory = (typeof CATEGORIES)[number]
export type WordTier = 1 | 2 | 3 | 4

export type CulinaryWord = {
  word: string
  tier: WordTier
  category: WordCategory
}

export const CATEGORY_LABELS: Record<WordCategory, string> = {
  texture: 'Texture',
  flavor: 'Flavor & Taste',
  temperature: 'Temperature & State',
  mouthfeel: 'Mouthfeel & Sensation',
  aroma: 'Aroma & Smell',
  technique: 'Technique',
  visual: 'Visual & Plating',
  composition: 'Composition Principles',
  emotion: 'Emotion & Experience',
  sauce: 'Sauce & Liquid',
  action: 'Cooking Actions',
}

export const CATEGORY_ICONS: Record<WordCategory, string> = {
  texture: '🤌',
  flavor: '👅',
  temperature: '🌡️',
  mouthfeel: '💋',
  aroma: '👃',
  technique: '🧪',
  visual: '🎨',
  composition: '⚖️',
  emotion: '💭',
  sauce: '🥄',
  action: '🔥',
}

export const TIER_LABELS: Record<WordTier, string> = {
  1: 'Foundational',
  2: 'Essential',
  3: 'Core',
  4: 'Advanced',
}

// ─────────────────────────────────────────────
// THE LIST
// ─────────────────────────────────────────────

export const DEFAULT_CULINARY_WORDS: CulinaryWord[] = [
  // ══════════════════════════════════════════
  // TEXTURE (~60 words)
  // ══════════════════════════════════════════
  { word: 'Crunchy', tier: 1, category: 'texture' },
  { word: 'Crispy', tier: 1, category: 'texture' },
  { word: 'Texture', tier: 1, category: 'texture' },
  { word: 'Creamy', tier: 2, category: 'texture' },
  { word: 'Silky', tier: 2, category: 'texture' },
  { word: 'Airy', tier: 2, category: 'texture' },
  { word: 'Smooth', tier: 3, category: 'texture' },
  { word: 'Velvety', tier: 3, category: 'texture' },
  { word: 'Chewy', tier: 3, category: 'texture' },
  { word: 'Tender', tier: 3, category: 'texture' },
  { word: 'Flaky', tier: 3, category: 'texture' },
  { word: 'Crumbly', tier: 3, category: 'texture' },
  { word: 'Brittle', tier: 3, category: 'texture' },
  { word: 'Snappy', tier: 3, category: 'texture' },
  { word: 'Light', tier: 3, category: 'texture' },
  { word: 'Dense', tier: 3, category: 'texture' },
  { word: 'Fluffy', tier: 3, category: 'texture' },
  { word: 'Foamy', tier: 3, category: 'texture' },
  { word: 'Gelatinous', tier: 3, category: 'texture' },
  { word: 'Sticky', tier: 3, category: 'texture' },
  { word: 'Gooey', tier: 3, category: 'texture' },
  { word: 'Firm', tier: 3, category: 'texture' },
  { word: 'Soft', tier: 3, category: 'texture' },
  { word: 'Craggy', tier: 3, category: 'texture' },
  { word: 'Toothy', tier: 3, category: 'texture' },
  { word: 'Al Dente', tier: 3, category: 'texture' },
  { word: 'Supple', tier: 3, category: 'texture' },
  { word: 'Yielding', tier: 3, category: 'texture' },
  { word: 'Melting', tier: 3, category: 'texture' },
  { word: 'Unctuous', tier: 3, category: 'texture' },
  { word: 'Meaty', tier: 3, category: 'texture' },
  { word: 'Succulent', tier: 3, category: 'texture' },
  { word: 'Juicy', tier: 3, category: 'texture' },
  { word: 'Buttery', tier: 3, category: 'texture' },
  { word: 'Delicate', tier: 3, category: 'texture' },
  { word: 'Crackly', tier: 3, category: 'texture' },
  { word: 'Shards', tier: 3, category: 'texture' },
  { word: 'Snap', tier: 3, category: 'texture' },
  { word: 'Shatteringly Crisp', tier: 3, category: 'texture' },
  { word: 'Slimy', tier: 3, category: 'texture' },
  { word: 'Mushy', tier: 3, category: 'texture' },
  { word: 'Gritty', tier: 3, category: 'texture' },
  { word: 'Chalky', tier: 3, category: 'texture' },
  { word: 'Rubbery', tier: 3, category: 'texture' },
  { word: 'Soggy', tier: 3, category: 'texture' },
  { word: 'Waxy', tier: 3, category: 'texture' },
  { word: 'Fibrous', tier: 3, category: 'texture' },
  { word: 'Stringy', tier: 3, category: 'texture' },
  { word: 'Grainy', tier: 3, category: 'texture' },
  { word: 'Pasty', tier: 3, category: 'texture' },
  { word: 'Pulpy', tier: 3, category: 'texture' },
  { word: 'Springy', tier: 3, category: 'texture' },
  { word: 'Bouncy', tier: 3, category: 'texture' },
  { word: 'Sandy', tier: 3, category: 'texture' },
  { word: 'Silken', tier: 3, category: 'texture' },
  { word: 'Pillowy', tier: 3, category: 'texture' },
  { word: 'Luscious', tier: 3, category: 'texture' },
  { word: 'Plush', tier: 3, category: 'texture' },
  { word: 'Rustic', tier: 3, category: 'texture' },
  { word: 'Crunch', tier: 3, category: 'texture' },
  { word: 'Splintery', tier: 3, category: 'texture' },
  { word: 'Burnt', tier: 3, category: 'texture' },
  { word: 'Tuile', tier: 4, category: 'texture' },

  // ══════════════════════════════════════════
  // FLAVOR & TASTE (~45 words)
  // ══════════════════════════════════════════
  { word: 'Umami', tier: 1, category: 'flavor' },
  { word: 'Sweet', tier: 1, category: 'flavor' },
  { word: 'Smoky', tier: 1, category: 'flavor' },
  { word: 'Bitter', tier: 2, category: 'flavor' },
  { word: 'Earthy', tier: 2, category: 'flavor' },
  { word: 'Herbaceous', tier: 2, category: 'flavor' },
  { word: 'Tangy', tier: 2, category: 'flavor' },
  { word: 'Sour', tier: 2, category: 'flavor' },
  { word: 'Bright', tier: 2, category: 'flavor' },
  { word: 'Savory', tier: 2, category: 'flavor' },
  { word: 'Spicy', tier: 2, category: 'flavor' },
  { word: 'Salty', tier: 3, category: 'flavor' },
  { word: 'Tart', tier: 3, category: 'flavor' },
  { word: 'Acidic', tier: 3, category: 'flavor' },
  { word: 'Briny', tier: 3, category: 'flavor' },
  { word: 'Nutty', tier: 3, category: 'flavor' },
  { word: 'Floral', tier: 3, category: 'flavor' },
  { word: 'Fruity', tier: 3, category: 'flavor' },
  { word: 'Peppery', tier: 3, category: 'flavor' },
  { word: 'Pungent', tier: 3, category: 'flavor' },
  { word: 'Funky', tier: 3, category: 'flavor' },
  { word: 'Fermented', tier: 3, category: 'flavor' },
  { word: 'Caramelized', tier: 3, category: 'flavor' },
  { word: 'Charred', tier: 3, category: 'flavor' },
  { word: 'Toasted', tier: 3, category: 'flavor' },
  { word: 'Malty', tier: 3, category: 'flavor' },
  { word: 'Honeyed', tier: 3, category: 'flavor' },
  { word: 'Mineral', tier: 3, category: 'flavor' },
  { word: 'Grassy', tier: 3, category: 'flavor' },
  { word: 'Vegetal', tier: 3, category: 'flavor' },
  { word: 'Woody', tier: 3, category: 'flavor' },
  { word: 'Citrusy', tier: 3, category: 'flavor' },
  { word: 'Vinegary', tier: 3, category: 'flavor' },
  { word: 'Sharp', tier: 3, category: 'flavor' },
  { word: 'Cloying', tier: 3, category: 'flavor' },
  { word: 'Acrid', tier: 3, category: 'flavor' },
  { word: 'Gamey', tier: 3, category: 'flavor' },
  { word: 'Metallic', tier: 3, category: 'flavor' },
  { word: 'Brothy', tier: 3, category: 'flavor' },
  { word: 'Mellow', tier: 3, category: 'flavor' },
  { word: 'Robust', tier: 3, category: 'flavor' },
  { word: 'Umami Bomb', tier: 3, category: 'flavor' },
  { word: 'Resinous', tier: 4, category: 'flavor' },
  { word: 'Balsamic', tier: 4, category: 'flavor' },

  // ══════════════════════════════════════════
  // TEMPERATURE & STATE (~12 words)
  // ══════════════════════════════════════════
  { word: 'Hot', tier: 3, category: 'temperature' },
  { word: 'Warm', tier: 3, category: 'temperature' },
  { word: 'Cool', tier: 3, category: 'temperature' },
  { word: 'Cold', tier: 3, category: 'temperature' },
  { word: 'Frozen', tier: 3, category: 'temperature' },
  { word: 'Chilled', tier: 3, category: 'temperature' },
  { word: 'Icy', tier: 3, category: 'temperature' },
  { word: 'Molten', tier: 3, category: 'temperature' },
  { word: 'Steaming', tier: 3, category: 'temperature' },
  { word: 'Room Temp', tier: 4, category: 'temperature' },
  { word: 'Tepid', tier: 4, category: 'temperature' },
  { word: 'Flash-Chilled', tier: 4, category: 'temperature' },

  // ══════════════════════════════════════════
  // MOUTHFEEL & SENSATION (~25 words)
  // ══════════════════════════════════════════
  { word: 'Fat', tier: 1, category: 'mouthfeel' },
  { word: 'Rich', tier: 2, category: 'mouthfeel' },
  { word: 'Mouth Feel', tier: 2, category: 'mouthfeel' },
  { word: 'Fatty', tier: 3, category: 'mouthfeel' },
  { word: 'Lean', tier: 3, category: 'mouthfeel' },
  { word: 'Clean', tier: 3, category: 'mouthfeel' },
  { word: 'Zingy', tier: 3, category: 'mouthfeel' },
  { word: 'Numbing', tier: 3, category: 'mouthfeel' },
  { word: 'Cooling', tier: 3, category: 'mouthfeel' },
  { word: 'Warming', tier: 3, category: 'mouthfeel' },
  { word: 'Fiery', tier: 3, category: 'mouthfeel' },
  { word: 'Mouth-Coating', tier: 3, category: 'mouthfeel' },
  { word: 'Astringent', tier: 3, category: 'mouthfeel' },
  { word: 'Refreshing', tier: 3, category: 'mouthfeel' },
  { word: 'Lingering', tier: 3, category: 'mouthfeel' },
  { word: 'Tingly', tier: 3, category: 'mouthfeel' },
  { word: 'Electric', tier: 3, category: 'mouthfeel' },
  { word: 'Bracing', tier: 3, category: 'mouthfeel' },
  { word: 'Coating', tier: 3, category: 'mouthfeel' },
  { word: 'Drying', tier: 3, category: 'mouthfeel' },
  { word: 'Slippery', tier: 3, category: 'mouthfeel' },
  { word: 'Round', tier: 3, category: 'mouthfeel' },
  { word: 'Greasy', tier: 3, category: 'mouthfeel' },
  { word: 'Oily', tier: 3, category: 'mouthfeel' },
  { word: 'Prickly', tier: 3, category: 'mouthfeel' },
  { word: 'Burning', tier: 3, category: 'mouthfeel' },

  // ══════════════════════════════════════════
  // AROMA & SMELL (~20 words)
  // ══════════════════════════════════════════
  { word: 'Fragrant', tier: 3, category: 'aroma' },
  { word: 'Aromatic', tier: 3, category: 'aroma' },
  { word: 'Perfumed', tier: 3, category: 'aroma' },
  { word: 'Heady', tier: 3, category: 'aroma' },
  { word: 'Subtle', tier: 3, category: 'aroma' },
  { word: 'Roasted', tier: 3, category: 'aroma' },
  { word: 'Toasty', tier: 3, category: 'aroma' },
  { word: 'Browned', tier: 3, category: 'aroma' },
  { word: 'Yeasty', tier: 3, category: 'aroma' },
  { word: 'Winy', tier: 3, category: 'aroma' },
  { word: 'Anise', tier: 3, category: 'aroma' },
  { word: 'Musky', tier: 3, category: 'aroma' },
  { word: 'Piney', tier: 3, category: 'aroma' },
  { word: 'Tropical', tier: 3, category: 'aroma' },
  { word: 'Fresh', tier: 3, category: 'aroma' },
  { word: 'Herbal', tier: 3, category: 'aroma' },
  { word: 'Rancid', tier: 3, category: 'aroma' },
  { word: 'Stinky', tier: 3, category: 'aroma' },
  { word: 'Barnyard', tier: 4, category: 'aroma' },
  { word: 'Sulfurous', tier: 4, category: 'aroma' },

  // ══════════════════════════════════════════
  // TECHNIQUE (~25 words)
  // ══════════════════════════════════════════
  { word: 'Foam', tier: 2, category: 'technique' },
  { word: 'Smoked', tier: 3, category: 'technique' },
  { word: 'Pickled', tier: 3, category: 'technique' },
  { word: 'Compressed', tier: 3, category: 'technique' },
  { word: 'Infused', tier: 3, category: 'technique' },
  { word: 'Gel', tier: 3, category: 'technique' },
  { word: 'Powder', tier: 3, category: 'technique' },
  { word: 'Soil', tier: 3, category: 'technique' },
  { word: 'Dust', tier: 3, category: 'technique' },
  { word: 'Air', tier: 3, category: 'technique' },
  { word: 'Dehydrated', tier: 3, category: 'technique' },
  { word: 'Cured', tier: 3, category: 'technique' },
  { word: 'Confit', tier: 3, category: 'technique' },
  { word: 'Brûléed', tier: 3, category: 'technique' },
  { word: 'Torched', tier: 3, category: 'technique' },
  { word: 'Tempura', tier: 3, category: 'technique' },
  { word: 'Espuma', tier: 4, category: 'technique' },
  { word: 'Fluid Gel', tier: 4, category: 'technique' },
  { word: 'Cryo', tier: 4, category: 'technique' },
  { word: 'Encapsulated', tier: 4, category: 'technique' },
  { word: 'Spherification', tier: 4, category: 'technique' },
  { word: 'Gelification', tier: 4, category: 'technique' },
  { word: 'Emulsification', tier: 4, category: 'technique' },
  { word: 'Freeze-Dried', tier: 4, category: 'technique' },
  { word: 'Sous Vide', tier: 4, category: 'technique' },

  // ══════════════════════════════════════════
  // VISUAL & PLATING (~20 words)
  // ══════════════════════════════════════════
  { word: 'Contrast', tier: 1, category: 'visual' },
  { word: 'Vibrant', tier: 3, category: 'visual' },
  { word: 'Golden', tier: 3, category: 'visual' },
  { word: 'Height', tier: 3, category: 'visual' },
  { word: 'Negative Space', tier: 3, category: 'visual' },
  { word: 'Color', tier: 3, category: 'visual' },
  { word: 'Garnish', tier: 3, category: 'visual' },
  { word: 'Swoosh', tier: 3, category: 'visual' },
  { word: 'Dots', tier: 3, category: 'visual' },
  { word: 'Shaved', tier: 3, category: 'visual' },
  { word: 'Ribboned', tier: 3, category: 'visual' },
  { word: 'Burnished', tier: 3, category: 'visual' },
  { word: 'Verdant', tier: 3, category: 'visual' },
  { word: 'Raw', tier: 3, category: 'visual' },
  { word: 'Elegant', tier: 3, category: 'visual' },
  { word: 'Quenelle', tier: 4, category: 'visual' },
  { word: 'Microgreens', tier: 4, category: 'visual' },
  { word: 'Edible Flowers', tier: 4, category: 'visual' },

  // ══════════════════════════════════════════
  // COMPOSITION PRINCIPLES (~15 words)
  // ══════════════════════════════════════════
  { word: 'Acid', tier: 1, category: 'composition' },
  { word: 'Salt', tier: 1, category: 'composition' },
  { word: 'Balance', tier: 1, category: 'composition' },
  { word: 'Heat', tier: 2, category: 'composition' },
  { word: 'Depth', tier: 2, category: 'composition' },
  { word: 'Layers', tier: 2, category: 'composition' },
  { word: 'Harmony', tier: 3, category: 'composition' },
  { word: 'Surprise', tier: 3, category: 'composition' },
  { word: 'Nostalgia', tier: 3, category: 'composition' },
  { word: 'Season', tier: 3, category: 'composition' },
  { word: 'Complexity', tier: 3, category: 'composition' },
  { word: 'Restraint', tier: 3, category: 'composition' },
  { word: 'Acidity', tier: 3, category: 'composition' },
  { word: 'Terroir', tier: 4, category: 'composition' },

  // ══════════════════════════════════════════
  // EMOTION & EXPERIENCE (~15 words)
  // ══════════════════════════════════════════
  { word: 'Comfort', tier: 3, category: 'emotion' },
  { word: 'Memory', tier: 3, category: 'emotion' },
  { word: 'Playful', tier: 3, category: 'emotion' },
  { word: 'Bold', tier: 3, category: 'emotion' },
  { word: 'Whimsical', tier: 3, category: 'emotion' },
  { word: 'Provocative', tier: 3, category: 'emotion' },
  { word: 'Soulful', tier: 3, category: 'emotion' },
  { word: 'Unexpected', tier: 3, category: 'emotion' },
  { word: 'Indulgent', tier: 3, category: 'emotion' },
  { word: 'Decadent', tier: 3, category: 'emotion' },
  { word: 'Primal', tier: 3, category: 'emotion' },
  { word: 'Refined', tier: 3, category: 'emotion' },
  { word: 'Homey', tier: 3, category: 'emotion' },
  { word: 'Luxurious', tier: 3, category: 'emotion' },

  // ══════════════════════════════════════════
  // SAUCE & LIQUID (~15 words)
  // ══════════════════════════════════════════
  { word: 'Sauce', tier: 3, category: 'sauce' },
  { word: 'Jus', tier: 3, category: 'sauce' },
  { word: 'Nappé', tier: 3, category: 'sauce' },
  { word: 'Coulis', tier: 3, category: 'sauce' },
  { word: 'Purée', tier: 3, category: 'sauce' },
  { word: 'Emulsion', tier: 3, category: 'sauce' },
  { word: 'Broth', tier: 3, category: 'sauce' },
  { word: 'Drizzle', tier: 3, category: 'sauce' },
  { word: 'Glaze', tier: 3, category: 'sauce' },
  { word: 'Reduction', tier: 3, category: 'sauce' },
  { word: 'Dressing', tier: 3, category: 'sauce' },
  { word: 'Vinaigrette', tier: 3, category: 'sauce' },
  { word: 'Consommé', tier: 4, category: 'sauce' },
  { word: 'Velouté', tier: 4, category: 'sauce' },
  { word: 'Beurre Blanc', tier: 4, category: 'sauce' },
  { word: 'Gastrique', tier: 4, category: 'sauce' },

  // ══════════════════════════════════════════
  // COOKING ACTIONS (~20 words)
  // ══════════════════════════════════════════
  { word: 'Sear', tier: 3, category: 'action' },
  { word: 'Caramelize', tier: 3, category: 'action' },
  { word: 'Deglaze', tier: 3, category: 'action' },
  { word: 'Mount', tier: 3, category: 'action' },
  { word: 'Finish', tier: 3, category: 'action' },
  { word: 'Bloom', tier: 3, category: 'action' },
  { word: 'Baste', tier: 3, category: 'action' },
  { word: 'Fold', tier: 3, category: 'action' },
  { word: 'Blanch', tier: 3, category: 'action' },
  { word: 'Shock', tier: 3, category: 'action' },
  { word: 'Render', tier: 3, category: 'action' },
  { word: 'Sweat', tier: 3, category: 'action' },
  { word: 'Sauté', tier: 3, category: 'action' },
  { word: 'Roast', tier: 3, category: 'action' },
  { word: 'Braise', tier: 3, category: 'action' },
  { word: 'Poach', tier: 3, category: 'action' },
  { word: 'Grill', tier: 3, category: 'action' },
  { word: 'Steam', tier: 3, category: 'action' },
  { word: 'Fry', tier: 3, category: 'action' },
  { word: 'Smoke', tier: 3, category: 'action' },
  { word: 'Cure', tier: 3, category: 'action' },
  { word: 'Ferment', tier: 3, category: 'action' },
  { word: 'Pickle', tier: 3, category: 'action' },
]

// ─────────────────────────────────────────────
// Board view styling — computed deterministically from word text
// ─────────────────────────────────────────────

export const BOARD_COLORS = [
  '#f0ece4', // chalk white
  '#ff6b6b', // red marker
  '#ffa94d', // orange marker
  '#ffd43b', // yellow marker
  '#69db7c', // green marker
  '#63e6be', // teal marker
  '#74c0fc', // blue marker
  '#f783ac', // pink marker
  '#b197fc', // purple marker
  '#ff8787', // coral marker
]

export const BOARD_FONTS = [
  "'Permanent Marker', cursive",
  "'Caveat', cursive",
  "'Patrick Hand', cursive",
  "'Indie Flower', cursive",
  "'Shadows Into Light Two', cursive",
  "'Rock Salt', cursive",
]

/** Deterministic hash from a string — returns a positive integer */
export function wordHash(word: string): number {
  let hash = 0
  for (let i = 0; i < word.length; i++) {
    const ch = word.charCodeAt(i)
    hash = ((hash << 5) - hash + ch) | 0
  }
  return Math.abs(hash)
}
