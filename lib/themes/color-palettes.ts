/**
 * ChefFlow Color Palette System
 *
 * 8 palettes, each following the same 6-swatch identity structure:
 *   Deep / Hero / Soft / Anchor / Foundation / Text
 *
 * All color values stored as space-separated RGB channels ("237 168 107")
 * so Tailwind's opacity modifier syntax works: bg-brand-500/20
 *
 * Default palette: Copper and Cast Iron (the brand identity)
 */

export interface ColorPalette {
  id: string
  name: string
  description: string
  /** 11-step brand scale as RGB channel strings */
  colors: {
    50: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string
    700: string
    800: string
    900: string
    950: string
  }
  /** Hex values for the 6 identity swatches (picker preview only) */
  swatches: {
    deep: string
    hero: string
    soft: string
    anchor: string
    foundation: string
    text: string
  }
}

export const PALETTES: ColorPalette[] = [
  // ──────────────────────────────────────────────
  // 1. Copper and Cast Iron (DEFAULT)
  // ──────────────────────────────────────────────
  {
    id: 'copper',
    name: 'Copper and Cast Iron',
    description: 'A kitchen at night. Copper pans catching warm light.',
    colors: {
      50: '254 249 243',
      100: '252 240 224',
      200: '248 221 192',
      300: '243 197 150',
      400: '243 197 150',
      500: '237 168 107',
      600: '177 92 38',
      700: '177 92 38',
      800: '142 74 36',
      900: '116 64 33',
      950: '62 32 15',
    },
    swatches: {
      deep: '#b15c26',
      hero: '#eda86b',
      soft: '#f3c596',
      anchor: '#3e200f',
      foundation: '#1c1917',
      text: '#d6d3d1',
    },
  },

  // ──────────────────────────────────────────────
  // 2. Plum and Pewter
  // ──────────────────────────────────────────────
  {
    id: 'plum',
    name: 'Plum and Pewter',
    description: 'A late-night wine pairing. Violet glass, pewter flatware.',
    colors: {
      50: '250 245 255',
      100: '243 232 255',
      200: '233 213 255',
      300: '221 214 254',
      400: '196 181 253',
      500: '167 139 250',
      600: '139 92 246',
      700: '124 58 237',
      800: '109 40 217',
      900: '91 33 182',
      950: '26 10 46',
    },
    swatches: {
      deep: '#7c3aed',
      hero: '#a78bfa',
      soft: '#ddd6fe',
      anchor: '#1a0a2e',
      foundation: '#1c1a22',
      text: '#d4d0db',
    },
  },

  // ──────────────────────────────────────────────
  // 3. Indigo and Steel
  // ──────────────────────────────────────────────
  {
    id: 'indigo',
    name: 'Indigo and Steel',
    description: 'A professional kitchen at dawn. Steel, blue gas flames.',
    colors: {
      50: '239 246 255',
      100: '219 234 254',
      200: '191 219 254',
      300: '147 197 253',
      400: '96 165 250',
      500: '59 130 246',
      600: '37 99 235',
      700: '30 64 175',
      800: '30 58 138',
      900: '30 48 80',
      950: '10 20 40',
    },
    swatches: {
      deep: '#1e40af',
      hero: '#3b82f6',
      soft: '#93c5fd',
      anchor: '#0a1428',
      foundation: '#171c24',
      text: '#cbd5e1',
    },
  },

  // ──────────────────────────────────────────────
  // 4. Sage and Cedar
  // ──────────────────────────────────────────────
  {
    id: 'sage',
    name: 'Sage and Cedar',
    description: 'Farm-to-table. Herb garden on the windowsill. Earthenware.',
    colors: {
      50: '240 253 244',
      100: '220 252 231',
      200: '187 247 208',
      300: '134 239 172',
      400: '74 222 128',
      500: '34 197 94',
      600: '22 163 74',
      700: '22 101 52',
      800: '20 83 45',
      900: '15 61 33',
      950: '10 31 15',
    },
    swatches: {
      deep: '#166534',
      hero: '#22c55e',
      soft: '#bbf7d0',
      anchor: '#0a1f0f',
      foundation: '#171c19',
      text: '#d1d5cf',
    },
  },

  // ──────────────────────────────────────────────
  // 5. Paprika and Smoke
  // ──────────────────────────────────────────────
  {
    id: 'paprika',
    name: 'Paprika and Smoke',
    description: 'Wood-fired kitchen. Glowing embers, smoked meats, brick.',
    colors: {
      50: '254 242 242',
      100: '254 226 226',
      200: '254 202 202',
      300: '252 165 165',
      400: '248 113 113',
      500: '239 68 68',
      600: '220 38 38',
      700: '185 28 28',
      800: '153 27 27',
      900: '127 29 29',
      950: '31 10 10',
    },
    swatches: {
      deep: '#991b1b',
      hero: '#ef4444',
      soft: '#fca5a5',
      anchor: '#1f0a0a',
      foundation: '#1c1717',
      text: '#d6d1d1',
    },
  },

  // ──────────────────────────────────────────────
  // 6. Verdigris and Obsidian
  // ──────────────────────────────────────────────
  {
    id: 'verdigris',
    name: 'Verdigris and Obsidian',
    description: 'Coastal kitchen. Aged copper, sea salt, stone worn smooth.',
    colors: {
      50: '240 253 250',
      100: '204 251 241',
      200: '153 246 228',
      300: '94 234 212',
      400: '45 212 191',
      500: '20 184 166',
      600: '13 148 136',
      700: '15 118 110',
      800: '17 94 89',
      900: '19 78 74',
      950: '10 26 24',
    },
    swatches: {
      deep: '#0f766e',
      hero: '#14b8a6',
      soft: '#99f6e4',
      anchor: '#0a1a18',
      foundation: '#171c1b',
      text: '#d0d5d3',
    },
  },

  // ──────────────────────────────────────────────
  // 7. Rose and Iron
  // ──────────────────────────────────────────────
  {
    id: 'rose',
    name: 'Rose and Iron',
    description: 'Pastry kitchen. Rose water, edible flowers, dark chocolate.',
    colors: {
      50: '255 241 242',
      100: '255 228 230',
      200: '254 205 211',
      300: '253 164 175',
      400: '251 113 133',
      500: '244 63 94',
      600: '225 29 72',
      700: '190 18 60',
      800: '159 18 57',
      900: '136 19 55',
      950: '31 10 18',
    },
    swatches: {
      deep: '#9f1239',
      hero: '#f43f5e',
      soft: '#fda4af',
      anchor: '#1f0a12',
      foundation: '#1c1719',
      text: '#d6d1d4',
    },
  },

  // ──────────────────────────────────────────────
  // 8. Saffron and Ember
  // ──────────────────────────────────────────────
  {
    id: 'saffron',
    name: 'Saffron and Ember',
    description: 'Spice market kitchen. Golden, aromatic. Brass and honey.',
    colors: {
      50: '255 251 235',
      100: '254 243 199',
      200: '253 230 138',
      300: '252 211 77',
      400: '251 191 36',
      500: '245 158 11',
      600: '217 119 6',
      700: '180 83 9',
      800: '146 64 14',
      900: '120 53 15',
      950: '26 20 8',
    },
    swatches: {
      deep: '#b45309',
      hero: '#f59e0b',
      soft: '#fde68a',
      anchor: '#1a1408',
      foundation: '#1c1b17',
      text: '#d6d4cf',
    },
  },
]

export const DEFAULT_PALETTE_ID = 'copper'

export function getPaletteById(id: string): ColorPalette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

/**
 * Generate CSS custom property declarations for a palette.
 * Returns a string of CSS like: --brand-50: 254 249 243; --brand-100: ...
 */
export function paletteToCSSVars(palette: ColorPalette): string {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
  return steps.map((step) => `--brand-${step}: ${palette.colors[step]};`).join('\n  ')
}

/** localStorage key */
export const PALETTE_STORAGE_KEY = 'chefflow-palette'
