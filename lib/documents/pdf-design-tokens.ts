// PDF Design Tokens - single source of truth for all document generators
// Spec: docs/specs/document-formatting-spec.md
// Every generator imports from here. No inline magic numbers.

// ─── Typography Scale ───────────────────────────────────────────────────────

export const FONT = {
  title: { size: 16, weight: 'bold' as const },
  sectionHeader: { size: 12, weight: 'bold' as const },
  courseHeader: { size: 11, weight: 'bold' as const },
  bodyText: { size: 10, weight: 'normal' as const },
  metadata: { size: 9, weight: 'normal' as const },
  caption: { size: 8, weight: 'italic' as const },
  footer: { size: 7, weight: 'normal' as const },
} as const

// ─── Spacing Scale ──────────────────────────────────────────────────────────

export const SPACING = {
  sectionGap: 5, // mm - between major sections
  groupGap: 3, // mm - between item groups within a section
  itemGap: 1.5, // mm - between individual items
  paragraphGap: 2, // mm - between paragraphs
  lineHeightMultiplier: 0.4, // line height = fontSize * this
} as const

// ─── Color Palette ──────────────────────────────────────────────────────────

export const COLOR = {
  textPrimary: [0, 0, 0] as const, // #000000
  textSecondary: [100, 100, 100] as const, // #646464
  textMuted: [140, 140, 140] as const, // #8C8C8C
  borderPrimary: [60, 60, 60] as const, // #3C3C3C
  borderLight: [180, 180, 180] as const, // #B4B4B4
  dangerText: [180, 0, 0] as const, // #B40000
  dangerBg: [255, 240, 240] as const, // #FFF0F0
  dangerBorder: [200, 0, 0] as const, // #C80000
  warningText: [140, 90, 0] as const, // #8C5A00
  warningBorder: [180, 120, 0] as const, // #B47800
  successText: [0, 100, 50] as const, // #006432
  shadingLight: [245, 245, 245] as const, // #F5F5F5 (~4% black)
  shadingMedium: [235, 235, 235] as const, // #EBEBEB (~8% black)
  brandOrange: [232, 143, 71] as const, // #E88F47
} as const

// ─── Margins ────────────────────────────────────────────────────────────────

export const MARGINS = {
  default: { left: 14, right: 12, top: 14, bottom: 10 },
  binder: { left: 20, right: 12, top: 14, bottom: 10 },
} as const

// ─── Page Dimensions ────────────────────────────────────────────────────────

export const PAGE = {
  letterWidth: 215.9, // mm
  letterHeight: 279.4, // mm
  contentWidth(
    marginLeft: number = MARGINS.default.left,
    marginRight: number = MARGINS.default.right
  ): number {
    return PAGE.letterWidth - marginLeft - marginRight
  },
  maxY(marginBottom: number = MARGINS.default.bottom): number {
    return PAGE.letterHeight - marginBottom
  },
} as const

// ─── Checkbox ───────────────────────────────────────────────────────────────

export const CHECKBOX = {
  boxSize: 4.5, // mm minimum
  boxSizeLarge: 6, // mm (wet-hands / gloves mode)
  boxLineWidth: 0.3, // pt
  boxColor: [40, 40, 40] as const,
  checkRowHeight: 6, // mm minimum
} as const

// ─── Document Category Color Bands ──────────────────────────────────────────
// 2mm strip at top of every page for instant identification in a stack

export type DocumentCategory =
  | 'core-ops'
  | 'shopping-logistics'
  | 'client-facing'
  | 'safety'
  | 'finance'
  | 'marketing'

export const CATEGORY_BANDS: Record<
  DocumentCategory,
  { color: readonly [number, number, number]; label: string }
> = {
  'core-ops': { color: [26, 58, 92], label: 'OPERATIONS' }, // #1A3A5C
  'shopping-logistics': { color: [45, 95, 45], label: 'LOGISTICS' }, // #2D5F2D
  'client-facing': { color: [51, 51, 51], label: 'CLIENT' }, // #333333
  safety: { color: [139, 0, 0], label: 'SAFETY' }, // #8B0000
  finance: { color: [61, 61, 92], label: 'FINANCE' }, // #3D3D5C
  marketing: { color: [26, 92, 92], label: 'MARKETING' }, // #1A5C5C
} as const

// ─── Document Type Mapping ──────────────────────────────────────────────────
// Maps each generator to its category and display label

export const DOC_TYPES = {
  'prep-sheet': { category: 'core-ops' as DocumentCategory, label: 'PREP SHEET' },
  'execution-sheet': { category: 'core-ops' as DocumentCategory, label: 'EXECUTION SHEET' },
  checklist: { category: 'core-ops' as DocumentCategory, label: 'CHECKLIST' },
  'reset-checklist': { category: 'core-ops' as DocumentCategory, label: 'RESET CHECKLIST' },
  'mise-check': { category: 'core-ops' as DocumentCategory, label: 'MISE EN PLACE' },
  'grocery-list': { category: 'shopping-logistics' as DocumentCategory, label: 'GROCERY LIST' },
  'consolidated-grocery': {
    category: 'shopping-logistics' as DocumentCategory,
    label: 'GROCERY LIST',
  },
  'packing-list': { category: 'shopping-logistics' as DocumentCategory, label: 'PACKING LIST' },
  'travel-route': { category: 'shopping-logistics' as DocumentCategory, label: 'TRAVEL ROUTE' },
  'front-of-house-menu': { category: 'client-facing' as DocumentCategory, label: 'MENU' },
  'event-summary': { category: 'client-facing' as DocumentCategory, label: 'EVENT SUMMARY' },
  beo: { category: 'client-facing' as DocumentCategory, label: 'BEO' },
  'allergen-reference': { category: 'safety' as DocumentCategory, label: 'ALLERGEN REF' },
  'allergy-card': { category: 'safety' as DocumentCategory, label: 'ALLERGY CARD' },
  invoice: { category: 'finance' as DocumentCategory, label: 'INVOICE' },
  quote: { category: 'finance' as DocumentCategory, label: 'QUOTE' },
  contract: { category: 'finance' as DocumentCategory, label: 'CONTRACT' },
  receipt: { category: 'finance' as DocumentCategory, label: 'RECEIPT' },
  'commerce-receipt': { category: 'finance' as DocumentCategory, label: 'RECEIPT' },
  'financial-summary': { category: 'finance' as DocumentCategory, label: 'FINANCIAL SUMMARY' },
  'content-shot-list': { category: 'marketing' as DocumentCategory, label: 'SHOT LIST' },
  'plating-guide': { category: 'marketing' as DocumentCategory, label: 'PLATING GUIDE' },
  'beverage-notes': { category: 'client-facing' as DocumentCategory, label: 'BEVERAGE NOTES' },
  'client-contact': { category: 'core-ops' as DocumentCategory, label: 'CLIENT CONTACT' },
  'venue-recon': { category: 'core-ops' as DocumentCategory, label: 'VENUE RECON' },
  'menu-pdf': { category: 'client-facing' as DocumentCategory, label: 'MENU' },
  'serving-labels': { category: 'core-ops' as DocumentCategory, label: 'SERVING LABELS' },
} as const

// ─── Cross-Cutting Rules ────────────────────────────────────────────────────

export const RULES = {
  colorBandHeight: 2, // mm
  docLabelSize: 8, // pt, bold caps, top-right corner
  separatorWidth: 0.4, // pt
  continuationHeaderSize: 10, // pt bold
  allergenWarningAlwaysFirst: true,
} as const

// ─── Dietary/Allergen Indicators ────────────────────────────────────────────

export const DIETARY_SYMBOLS: Record<string, string> = {
  vegetarian: 'V',
  vegan: 'VG',
  'gluten-free': 'GF',
  'dairy-free': 'DF',
  'nut-free': 'NF',
  halal: 'HAL',
  kosher: 'K',
}

// ─── Print-Safe Unicode Symbols ─────────────────────────────────────────────

export const SYMBOLS = {
  bullet: '\u2022', // •
  check: '\u2713', // ✓
  cross: '\u2717', // ✗
  warning: '(!)',
  snowflake: '***', // cold indicator (safe fallback)
  fire: '>>>', // hot/fire indicator (safe fallback)
  star: '*',
  dash: '\u2013', // –
}
