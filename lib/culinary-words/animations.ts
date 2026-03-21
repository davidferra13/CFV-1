/**
 * Culinary Word Animations - every word animates to FEEL like itself.
 *
 * ~20 animation families, each word hand-mapped.
 * CSS keyframes live in globals.css under the "Culinary Board Animations" section
 */

export type CulinaryAnimation =
  | 'shatter' // rapid shake + jitter - crunchy, crispy things
  | 'melt' // droop downward + soften
  | 'bounce' // spring up/down
  | 'float' // drift upward gently
  | 'wobble' // jelly-like wiggle
  | 'glide' // smooth, slow sway
  | 'flame' // flicker + scale
  | 'freeze' // jitter then lock
  | 'explode' // big pop outward
  | 'drip' // slide downward slowly
  | 'sizzle' // rapid micro-vibrate
  | 'puff' // scale up + fade
  | 'throb' // slow rhythmic pulse
  | 'swirl' // rotate + sway
  | 'squish' // compress then expand
  | 'crumble' // shake + shrink away
  | 'stretch' // elongate horizontally
  | 'slice' // quick sharp lateral cut
  | 'sparkle' // flash of brightness
  | 'bloom' // slow grow + glow

/**
 * Every word → its animation. Hand-curated so each word FEELS right.
 * Words not in this map get a default 'explode' (satisfying generic pop).
 */
const WORD_ANIMATION_MAP: Record<string, CulinaryAnimation> = {
  // ── SHATTER: things that crack and break ──
  Crunchy: 'shatter',
  Crispy: 'shatter',
  Crackly: 'shatter',
  Brittle: 'shatter',
  Snap: 'shatter',
  Shards: 'shatter',
  'Shatteringly Crisp': 'shatter',
  Crunch: 'shatter',
  Snappy: 'shatter',
  Tuile: 'shatter',
  Craggy: 'shatter',
  Splintery: 'shatter',

  // ── MELT: things that soften and drip ──
  Melting: 'melt',
  Molten: 'melt',
  Gooey: 'melt',
  Sticky: 'melt',
  Mushy: 'melt',
  Pasty: 'melt',
  Unctuous: 'melt',
  'Mouth-Coating': 'melt',
  Coating: 'melt',
  Glaze: 'melt',

  // ── BOUNCE: springy, chewy things ──
  Bouncy: 'bounce',
  Springy: 'bounce',
  Chewy: 'bounce',
  Toothy: 'bounce',
  'Al Dente': 'bounce',
  Firm: 'bounce',
  Playful: 'bounce',
  Surprise: 'bounce',
  Unexpected: 'bounce',

  // ── FLOAT: airy, light things that rise ──
  Airy: 'float',
  Light: 'float',
  Fluffy: 'float',
  Foamy: 'float',
  Air: 'float',
  Foam: 'float',
  Dust: 'float',
  Powder: 'float',
  Whimsical: 'float',
  Espuma: 'float',
  Delicate: 'float',

  // ── WOBBLE: jiggly, gelatinous things ──
  Gelatinous: 'wobble',
  Slimy: 'wobble',
  Slippery: 'wobble',
  Pulpy: 'wobble',
  Gel: 'wobble',
  'Fluid Gel': 'wobble',
  Gelification: 'wobble',
  Wobbly: 'wobble',
  Spherification: 'wobble',
  Round: 'wobble',

  // ── GLIDE: silky, smooth, luxurious textures ──
  Silky: 'glide',
  Smooth: 'glide',
  Velvety: 'glide',
  Silken: 'glide',
  Creamy: 'glide',
  Buttery: 'glide',
  Supple: 'glide',
  Yielding: 'glide',
  Elegant: 'glide',
  Refined: 'glide',
  Nappé: 'glide',
  Mellow: 'glide',
  Velouté: 'glide',
  Emulsion: 'glide',
  Emulsification: 'glide',
  'Beurre Blanc': 'glide',

  // ── FLAME: hot, fiery, burning ──
  Hot: 'flame',
  Fiery: 'flame',
  Burning: 'flame',
  Sear: 'flame',
  Torched: 'flame',
  Brûléed: 'flame',
  Charred: 'flame',
  Fry: 'flame',
  Grill: 'flame',
  Warming: 'flame',
  Warm: 'flame',
  Heat: 'flame',

  // ── FREEZE: cold, icy, locked in place ──
  Frozen: 'freeze',
  Icy: 'freeze',
  Cold: 'freeze',
  Chilled: 'freeze',
  'Flash-Chilled': 'freeze',
  Cryo: 'freeze',
  Cool: 'freeze',
  'Freeze-Dried': 'freeze',
  Bracing: 'freeze',

  // ── EXPLODE: big, bold, powerful pop ──
  Bold: 'explode',
  Primal: 'explode',
  'Umami Bomb': 'explode',
  Robust: 'explode',
  Umami: 'explode',
  Texture: 'explode',
  Pungent: 'explode',
  Provocative: 'explode',
  Shock: 'explode',
  Contrast: 'explode',
  Complexity: 'explode',

  // ── DRIP: sauces, liquids that run down ──
  Sauce: 'drip',
  Jus: 'drip',
  Drizzle: 'drip',
  Coulis: 'drip',
  Broth: 'drip',
  Reduction: 'drip',
  Purée: 'drip',
  Dressing: 'drip',
  Vinaigrette: 'drip',
  Consommé: 'drip',
  Gastrique: 'drip',
  Brothy: 'drip',
  Juicy: 'drip',
  Succulent: 'drip',
  Greasy: 'drip',
  Oily: 'drip',

  // ── SIZZLE: electric, tingling, zapping ──
  Zingy: 'sizzle',
  Electric: 'sizzle',
  Tingly: 'sizzle',
  Prickly: 'sizzle',
  Numbing: 'sizzle',
  Spicy: 'sizzle',
  Peppery: 'sizzle',
  Sharp: 'sizzle',
  Acidic: 'sizzle',
  Acidity: 'sizzle',
  Acid: 'sizzle',
  Tangy: 'sizzle',
  Sour: 'sizzle',
  Tart: 'sizzle',
  Vinegary: 'sizzle',
  Briny: 'sizzle',

  // ── PUFF: smoky, steaming, vapor ──
  Steaming: 'puff',
  Smoky: 'puff',
  Smoked: 'puff',
  Smoke: 'puff',
  Aromatic: 'puff',
  Fragrant: 'puff',
  Perfumed: 'puff',
  Heady: 'puff',
  Musky: 'puff',
  Subtle: 'puff',
  Infused: 'puff',

  // ── THROB: rich, indulgent, heavy satisfaction ──
  Rich: 'throb',
  Fat: 'throb',
  Meaty: 'throb',
  Luscious: 'throb',
  Indulgent: 'throb',
  Luxurious: 'throb',
  Decadent: 'throb',
  Dense: 'throb',
  Fatty: 'throb',
  Savory: 'throb',
  Comfort: 'throb',
  Soulful: 'throb',
  'Mouth Feel': 'throb',

  // ── SWIRL: aromatic, spinning, twirling ──
  Sweat: 'swirl',
  Sauté: 'swirl',
  Deglaze: 'swirl',
  Mount: 'swirl',
  Fold: 'swirl',
  Winy: 'swirl',
  Anise: 'swirl',
  Piney: 'swirl',
  Balsamic: 'swirl',
  Resinous: 'swirl',

  // ── SQUISH: soft, pillowy, compressible ──
  Soft: 'squish',
  Pillowy: 'squish',
  Plush: 'squish',
  Tender: 'squish',
  Homey: 'squish',
  Confit: 'squish',
  Poach: 'squish',
  Braise: 'squish',
  'Sous Vide': 'squish',

  // ── CRUMBLE: things that fall apart ──
  Crumbly: 'crumble',
  Chalky: 'crumble',
  Flaky: 'crumble',
  Gritty: 'crumble',
  Sandy: 'crumble',
  Grainy: 'crumble',
  Soil: 'crumble',
  Dehydrated: 'crumble',
  Drying: 'crumble',

  // ── STRETCH: things that pull and elongate ──
  Stringy: 'stretch',
  Fibrous: 'stretch',
  Rubbery: 'stretch',
  Waxy: 'stretch',
  Lean: 'stretch',
  Clean: 'stretch',
  Encapsulated: 'stretch',

  // ── SLICE: sharp, quick, precise actions ──
  Blanch: 'slice',
  Render: 'slice',
  Finish: 'slice',
  Roast: 'slice',
  Steam: 'slice',
  Cure: 'slice',
  Cured: 'slice',
  Compressed: 'slice',
  Tempura: 'slice',
  Shaved: 'slice',
  Ribboned: 'slice',
  Restraint: 'slice',
  Salt: 'slice',
  Salty: 'slice',

  // ── SPARKLE: golden, vibrant, shiny ──
  Golden: 'sparkle',
  Vibrant: 'sparkle',
  Burnished: 'sparkle',
  Bright: 'sparkle',
  Color: 'sparkle',
  Caramelized: 'sparkle',
  Caramelize: 'sparkle',
  Toasted: 'sparkle',
  Toasty: 'sparkle',
  Roasted: 'sparkle',
  Browned: 'sparkle',
  Honeyed: 'sparkle',
  Malty: 'sparkle',

  // ── BLOOM: floral, growing, opening up ──
  Floral: 'bloom',
  Herbaceous: 'bloom',
  Fresh: 'bloom',
  Herbal: 'bloom',
  Bloom: 'bloom',
  'Edible Flowers': 'bloom',
  Microgreens: 'bloom',
  Verdant: 'bloom',
  Grassy: 'bloom',
  Vegetal: 'bloom',
  Tropical: 'bloom',
  Fruity: 'bloom',
  Citrusy: 'bloom',
  Season: 'bloom',
  Refreshing: 'bloom',
  Woody: 'bloom',
  Earthy: 'bloom',
  Mineral: 'bloom',
  Terroir: 'bloom',
  Pickled: 'bloom',
  Pickle: 'bloom',
  Fermented: 'bloom',
  Ferment: 'bloom',

  // ── Remaining words that need a home ──
  Soggy: 'melt',
  Sweet: 'glide',
  Bitter: 'freeze',
  Nutty: 'bounce',
  Funky: 'wobble',
  Gamey: 'throb',
  Metallic: 'sizzle',
  Cloying: 'melt',
  Acrid: 'flame',
  Burnt: 'flame',
  Yeasty: 'puff',
  Rancid: 'crumble',
  Stinky: 'puff',
  Barnyard: 'puff',
  Sulfurous: 'flame',
  Raw: 'slice',
  Height: 'float',
  'Negative Space': 'puff',
  Garnish: 'bloom',
  Swoosh: 'glide',
  Dots: 'sizzle',
  Quenelle: 'glide',
  Balance: 'glide',
  Depth: 'throb',
  Layers: 'squish',
  Harmony: 'glide',
  Nostalgia: 'throb',
  Memory: 'puff',
  'Room Temp': 'squish',
  Tepid: 'melt',
  Astringent: 'freeze',
  Lingering: 'puff',
  Cooling: 'freeze',
  Baste: 'drip',
  Foggy: 'puff',
}

/**
 * Get the animation type for a word.
 * Falls back to 'explode' for unmapped words (satisfying generic pop).
 */
export function getWordAnimation(word: string): CulinaryAnimation {
  return WORD_ANIMATION_MAP[word] ?? 'explode'
}

/**
 * CSS class name for an animation - add this class on click, remove on animationend.
 */
export function getAnimationClass(_anim: CulinaryAnimation): string {
  return ''
}
