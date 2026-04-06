// Food Costing Knowledge Layer
// Static content map for help popovers, warning explanations, and reference data.
// Source of truth: docs/food-costing-guide.md + docs/food-costing-reference-data.md
// This file is READ-ONLY reference content. It does not compute or store user data.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HelpTopic =
  | 'food_cost_pct'
  | 'blended_cost'
  | 'per_person'
  | 'cost_plus'
  | 'q_factor'
  | 'yield_factor'
  | 'prime_cost'
  | 'contribution_margin'
  | 'ap_ep'
  | 'spoilage'
  | 'non_revenue_food'
  | 'beverage_cost'
  | 'batch_allocation'
  | 'breakeven'
  | 'purchasing_strategy'
  | 'garnish_cost'
  | 'recosting_frequency'
  | 'inflation_escalation'
  | 'case_break'
  | 'tax_exemption'

export type WarningSeverity = 'info' | 'amber' | 'red'

export type WarningType =
  | 'high_food_cost'
  | 'critical_food_cost'
  | 'high_prime_cost'
  | 'low_coverage'
  | 'default_yield'
  | 'stale_price'
  | 'missing_price'
  | 'high_spoilage_risk'
  | 'no_recost_recent'
  | 'case_break_waste'
  | 'no_resale_cert'
  | 'high_garnish_cost'
  | 'beverage_cost_missing'

export interface CostingWarning {
  type: WarningType
  message: string
  severity: WarningSeverity
  ingredientId?: string
}

export type OperatorType =
  | 'fine_dining'
  | 'casual'
  | 'private_chef'
  | 'catering'
  | 'high_volume'
  | 'food_truck'
  | 'ghost_kitchen'
  | 'bakery'
  | 'meal_prep'
  | 'restaurant'
  | 'institutional'
  | 'popup'
  | 'wholesale_cpg'
  | 'custom'

export interface CostingResult {
  totalIngredientCostCents: number
  foodCostPct: number | null
  suggestedPriceCents: number | null
  contributionMarginCents: number | null
  contributionMarginPct: number | null
  laborCostCents: number | null
  overheadCostCents: number | null
  incidentalsCostCents: number | null
  subtotalCostCents: number | null
  profitMarginPct: number | null
  costPlusPriceCents: number | null
  primeCostCents: number | null
  primeCostPct: number | null
  blendedFoodCostPct: number | null
  method: 'food_cost_pct' | 'cost_plus' | 'blended'
  qFactorApplied: boolean
  qFactorPct: number
  ingredientCount: number
  ingredientsWithPrice: number
  ingredientsMissingPrice: number
  coverageRatio: number
  warnings: CostingWarning[]
  computedAt: string
}

// ---------------------------------------------------------------------------
// Help content (keyed by topic)
// ---------------------------------------------------------------------------

export interface HelpContent {
  title: string
  summary: string
  formula?: string
  targetRange?: string
  guidance: string
  guideSection: string // anchor for the full guide page
  /** Real-world context from industry research (practitioner tips, benchmarks) */
  industryContext?: string
}

export const HELP_CONTENT: Record<HelpTopic, HelpContent> = {
  food_cost_pct: {
    title: 'Food Cost Percentage',
    summary:
      'The percentage of your selling price consumed by ingredient costs. Lower is more profitable.',
    formula: 'Food Cost % = (Total Ingredient Cost / Selling Price) x 100',
    targetRange: '25-35% for most operations',
    guidance:
      'If your food cost is above target, check yield factors, portion sizes, and ingredient prices. Menu engineering (subsidizing high-cost items with low-cost ones) can bring the blend into range.',
    guideSection: 'method-1-food-cost-percentage',
    industryContext:
      'A practitioner example: a 15-guest retreat at $100/person grosses $1,500, but after assistants ($200), travel ($100), food ($300), expenses ($50), and tax reserve ($375), net profit is only $475 (31.7%). Food cost is the lever you control most directly.',
  },
  blended_cost: {
    title: 'Blended Food Cost',
    summary:
      'The weighted average food cost across all items on a menu. Individual items can exceed target if the overall blend hits it.',
    formula: 'Blended % = Sum(item cost x quantity) / Sum(item price x quantity) x 100',
    targetRange: '28-33% blended across a full menu',
    guidance:
      'Courses subsidize each other. A 45% cost appetizer is fine if your 22% cost entree brings the blend to 32%.',
    guideSection: 'menu-engineering-blended-food-cost',
  },
  per_person: {
    title: 'Per-Person Price',
    summary:
      'The total cost of food per guest, derived from either the food cost percentage method or the cost-plus buildup method.',
    guidance:
      'Per-person pricing works best for private chefs and caterers. It includes all courses for one guest. Compare your per-person cost to your per-person price to verify margins.',
    guideSection: 'method-1-food-cost-percentage',
  },
  cost_plus: {
    title: 'Cost-Plus Pricing',
    summary:
      'Build up the total price by adding food cost, labor, overhead, incidentals, and a profit margin.',
    formula: 'Price = (Food + Labor + Overhead + Incidentals) x (1 + Profit Margin %)',
    targetRange: '15-25% profit margin after all costs',
    guidance:
      'Cost-plus is best for catering, private chef events, and any job where labor and overhead vary significantly. It ensures every cost is covered before profit.',
    guideSection: 'method-2-cost-plus-buildup',
    industryContext:
      "Research shows actual cooking is roughly 40% of a private chef's work week. Shopping, driving, client communication, menu planning, and admin eat the other 60%. Cost-plus captures this invisible labor; hourly cooking rates do not. Successful operators charge a flat service fee that covers the full scope of work.",
  },
  q_factor: {
    title: 'Q-Factor (Incidental Surcharge)',
    summary:
      'A percentage added to recipe cost to cover small ingredients not individually tracked: cooking oil, salt, pepper, butter for pans, garnish herbs.',
    formula: 'Adjusted Cost = Direct Ingredient Cost x (1 + Q-Factor %)',
    targetRange: '5-8% for most kitchens (default 7%)',
    guidance:
      'Without Q-factor, your food cost is systematically undercounted. Set to 0% only if you individually track every ingredient including oil and seasoning.',
    guideSection: 'q-factor',
    industryContext:
      'The Q-factor is the cost most operators forget. Oil, salt, spices, parchment, foil, garnishes, and disposable gloves seem trivial per dish but compound across a full event. At 7%, a $300 ingredient bill actually costs $321. Over a year of events, that adds up to thousands in unaccounted cost.',
  },
  yield_factor: {
    title: 'Yield Factor (AP to EP)',
    summary:
      'The ratio of usable product (Edible Portion) to purchased product (As Purchased). A yield of 0.65 means 35% waste.',
    formula: 'EP Cost = AP Cost / Yield Factor',
    guidance:
      'Trim yield is always <= 1.0. Cooking yield can exceed 1.0 for items that absorb water (rice, pasta, dried beans). Combined yield = trim yield x cooking yield.',
    guideSection: 'yield-factors',
    industryContext:
      'Common yields operators get wrong: boneless chicken 75%, whole fish 35-45%, vegetables 70-90%, herbs 50-60%, shrimp (shell-on to peeled) 50-55%. Ignoring yield is the single most common reason chefs underprice their menus.',
  },
  prime_cost: {
    title: 'Prime Cost',
    summary:
      'Food cost plus labor cost as a percentage of revenue. The single most important profitability metric in food service.',
    formula: 'Prime Cost % = (Food Cost + Labor Cost) / Revenue x 100',
    targetRange: '55-65% of revenue',
    guidance:
      'If prime cost exceeds 65%, you are likely losing money. Either food cost or labor (or both) needs adjustment. This metric matters more than food cost alone.',
    guideSection: 'prime-cost',
  },
  contribution_margin: {
    title: 'Contribution Margin',
    summary:
      'The dollar amount left after subtracting food cost from selling price. A complementary view to food cost percentage.',
    formula: 'Contribution Margin = Selling Price - Food Cost',
    guidance:
      'A $50 steak at 40% food cost contributes $30. A $15 pasta at 25% food cost contributes $11.25. The steak has worse food cost % but better contribution margin.',
    guideSection: 'contribution-margin',
  },
  ap_ep: {
    title: 'As Purchased vs. Edible Portion',
    summary:
      'AP is what you buy (includes trim, bones, skin). EP is what you serve. Always cost recipes using EP, not AP.',
    formula: 'EP Cost per lb = AP Cost per lb / Trim Yield Factor',
    guidance:
      'Costing against AP weight systematically undercounts your true cost. A $4/lb chicken with 0.72 yield actually costs $5.56/lb of usable meat.',
    guideSection: 'as-purchased-vs-edible-portion',
  },
  spoilage: {
    title: 'Waste and Spoilage',
    summary:
      'Product lost before service (expiration, damage, rot). Distinct from yield loss during prep/cooking.',
    targetRange: '1-3% (private chef) to 5-15% (bakery)',
    guidance:
      'Spoilage cost spreads across sold units. A dish at 30% recipe food cost with 8% spoilage effectively costs 33%. Track waste daily to identify patterns.',
    guideSection: 'waste-tracking',
    industryContext:
      '75% of food shrink is internal (over-portioning, spoilage, waste, admin error), not theft. One steakhouse saved $15,600/year just by tightening portion control on a single protein cut. Waste targets: plated service under 5%, buffet under 12%.',
  },
  non_revenue_food: {
    title: 'Non-Revenue Food',
    summary:
      'Food prepared but not sold: staff meals, comps, client tastings, R&D. Budget 2-4% of food cost.',
    targetRange: '2-6% of total food cost',
    guidance:
      'Non-revenue food is a real cost that many operators overlook. Include it as a cost-plus line item or bake it into overhead. The default assumption is 3%.',
    guideSection: 'non-revenue-food',
  },
  beverage_cost: {
    title: 'Beverage Costing',
    summary:
      'Beverages have separate cost targets from food. Liquor 15-22%, wine 25-40%, beer 20-30%, non-alcoholic 10-20%.',
    guidance:
      'Never blend beverage and food costs silently. Track them separately. Ice displacement (25-33% of glass) and pour count (17 standard pours per 750mL) are the key yield factors.',
    guideSection: 'beverage-costing',
  },
  batch_allocation: {
    title: 'Batch Allocation',
    summary:
      'Shared recipes (stocks, sauces, spice blends) must be costed per usable portion and allocated across every dish that uses them.',
    formula: 'Cost Per Unit = Total Batch Cost / Total Yield Units',
    guidance:
      'Pantry staples under $10 are covered by Q-factor. Shared recipes over $10 should be explicitly allocated. Sub-recipes in ChefFlow handle this automatically.',
    guideSection: 'batch-allocation',
  },
  breakeven: {
    title: 'Breakeven Analysis',
    summary:
      'The minimum number of covers or revenue needed to cover all fixed costs before any profit.',
    formula: 'Breakeven Units = Fixed Costs / (Revenue Per Unit - Variable Cost Per Unit)',
    guidance:
      'Know your breakeven before obsessing over food cost targets. If you need 40 covers to break even, a 28% food cost on 20 covers still loses money.',
    guideSection: 'breakeven-analysis',
    industryContext:
      'Solo operators typically cap at $80,000-$100,000 annual revenue without systems and staff. The breakeven for a first permanent hire requires roughly $40,000-$60,000 in additional annual revenue. Most operators should use 1099 contractors before committing to W-2 employees.',
  },
  purchasing_strategy: {
    title: 'Purchasing Strategy',
    summary:
      'The same ingredient can vary 30-50% across purchasing channels: broadline distributor, cash-and-carry, farmers market, retail.',
    guidance:
      'Delivery fees ($25-75 per drop) can add 5-25% to small orders. Volume discounts save 30-60% but only if you use the product before quality degrades. Match your channel to your volume.',
    guideSection: 'purchasing-strategy',
    industryContext:
      'Successful operators use a tiered vendor strategy: broadline distributor for 60-70% of volume (Sysco, US Foods, Restaurant Depot), specialty vendors for premium items, direct farm relationships for seasonal produce, and cash-and-carry (Costco, local markets) for fill-ins. In-season ingredients can cost 30-60% less than out-of-season.',
  },
  garnish_cost: {
    title: 'Presentation and Garnish Cost',
    summary:
      'Garnish and plating elements add $0.15-2.00+ per plate. Track them or include in Q-factor.',
    guidance:
      'Microgreens at $20-40/lb add $0.50-1.50 per plate. Edible flowers add $0.25-1.00. For fine dining (garnish budget $1.50-3.00/plate), track individually. For casual, include in Q-factor.',
    guideSection: 'presentation-and-garnish',
  },
  recosting_frequency: {
    title: 'Re-Costing Frequency',
    summary:
      'Recipe costs drift as ingredient prices change. How often to re-cost depends on your operation type.',
    guidance:
      'Private chefs and caterers: re-cost per event. Restaurants and bakeries: monthly. Institutional: quarterly. Always re-cost immediately after a supplier price increase or vendor change.',
    guideSection: 'recosting-frequency',
  },
  inflation_escalation: {
    title: 'Inflation and Price Escalation',
    summary:
      'Food commodity inflation (3-8% annually in recent years) erodes margins on fixed-price menus and contracts.',
    guidance:
      'Include escalation clauses in contracts lasting more than 3 months. Re-cost all recipes at least quarterly. Watch for sudden commodity spikes (eggs, butter, beef) that can shift food cost 2-5 points overnight.',
    guideSection: 'inflation-and-escalation',
  },
  case_break: {
    title: 'Case-Break Problem',
    summary:
      'When the minimum purchase exceeds what a job needs, the surplus may spoil. This is unplanned food cost.',
    guidance:
      'If surplus will be used within shelf life, cost only what you use. If it will spoil, charge the full purchase to the triggering job. Coordinate across events to split cases when possible.',
    guideSection: 'minimum-order-waste',
  },
  tax_exemption: {
    title: 'Tax Exemption (Resale Certificate)',
    summary:
      'Raw ingredients purchased for resale are typically sales-tax-exempt with a resale certificate in most US states.',
    guidance:
      'Without a resale cert, 5-10% sales tax directly inflates your food cost. At $50K annual food purchases, that is $2,500-5,000 in avoidable cost. Apply for one through your state revenue department.',
    guideSection: 'tax-reference',
  },
}

// ---------------------------------------------------------------------------
// Warning explanations (keyed by warning type)
// ---------------------------------------------------------------------------

export interface WarningExplanation {
  title: string
  description: string
  cause: string
  action: string
  guideSection: string
}

export const WARNING_EXPLANATIONS: Record<WarningType, WarningExplanation> = {
  high_food_cost: {
    title: 'High Food Cost',
    description: 'This recipe or menu exceeds your target food cost percentage.',
    cause:
      'Common causes: expensive proteins, low yield factors, under-portioned sides relative to mains, or ingredient prices that have increased since last costing.',
    action:
      'Review yield factors, check current ingredient prices, consider cross-utilization of trim, or adjust portions. Menu engineering (pairing this with lower-cost items) can bring the blend into range.',
    guideSection: 'method-1-food-cost-percentage',
  },
  critical_food_cost: {
    title: 'Critical Food Cost',
    description:
      'Food cost exceeds 50%. At this level, profitability is unlikely unless volume is extremely high or the item is a loss leader.',
    cause:
      'Typically: premium ingredients (wagyu, truffles, saffron) without proportionally premium pricing, or stale ingredient prices that have spiked.',
    action:
      'Re-cost immediately with current prices. If costs are accurate, raise the price or remove the item. No amount of volume fixes a 50%+ food cost on most items.',
    guideSection: 'common-mistakes',
  },
  high_prime_cost: {
    title: 'High Prime Cost',
    description:
      'Food plus labor exceeds 65% of revenue. This is the most important profitability warning.',
    cause:
      'Either food cost or labor cost (or both) is too high relative to pricing. Common in labor-intensive preparations with premium ingredients.',
    action:
      'Prime cost is the single metric that predicts profitability. Reduce food cost (yield, portioning, sourcing) or reduce labor (simplify prep, batch production) or raise prices.',
    guideSection: 'prime-cost',
  },
  low_coverage: {
    title: 'Low Ingredient Price Coverage',
    description:
      'Many ingredients in this recipe are missing prices. The calculated food cost is incomplete and likely understated.',
    cause:
      'Ingredients have not been matched to the price database, or the price database does not have entries for these items.',
    action:
      'Add manual prices for missing ingredients, or wait for the price database to update. Do not rely on a partial cost as if it were complete.',
    guideSection: 'missing-prices',
  },
  default_yield: {
    title: 'Default Yield Factor',
    description:
      'This ingredient uses the default yield factor (1.0, meaning zero waste). For proteins, produce, and seafood, this likely undercounts true cost.',
    cause:
      'Yield factor was never set for this ingredient. The system defaults to 1.0 (no waste) to avoid blocking recipe entry.',
    action:
      'Set an accurate yield factor based on your prep method. Check the reference tables for typical yield by ingredient and cooking method.',
    guideSection: 'yield-factors',
  },
  stale_price: {
    title: 'Stale Ingredient Price',
    description:
      'The price for this ingredient has not been updated recently. The calculated cost may not reflect current market prices.',
    cause:
      'Price data comes from the last sync or manual entry. Ingredient prices can shift 5-15% in a single week for volatile items.',
    action:
      'Check current prices with your supplier or the price catalog. Re-cost recipes that use this ingredient after updating.',
    guideSection: 'recosting-frequency',
  },
  missing_price: {
    title: 'Missing Ingredient Price',
    description:
      'No price found for this ingredient. It is excluded from the cost calculation, which means the total is understated.',
    cause:
      'The ingredient has not been matched to the price database, or no price entry exists for it in any source.',
    action:
      'Add a manual price override for this ingredient in the recipe, or check the Food Catalog for a match.',
    guideSection: 'missing-prices',
  },
  high_spoilage_risk: {
    title: 'High Spoilage Risk',
    description:
      'This recipe uses perishable ingredients with short shelf life. Spoilage can add 5-15% to effective food cost.',
    cause:
      'Fresh seafood, leafy greens, berries, and fresh herbs have 1-3 day shelf lives. Over-ordering is the primary driver of spoilage cost.',
    action:
      'Order just what you need (par-level planning), use FIFO rotation, and track waste daily. Cross-utilize trim and surplus into other preparations.',
    guideSection: 'waste-tracking',
  },
  no_recost_recent: {
    title: 'Recipe Not Recently Re-Costed',
    description:
      'This recipe has not been re-costed in a while. Ingredient prices may have changed significantly.',
    cause:
      'Recipes drift from reality as ingredient prices move. A recipe costed 90 days ago could be 5-10% off at current prices.',
    action:
      'Re-cost this recipe with current ingredient prices. Set a reminder based on your operation type (per event, monthly, or quarterly).',
    guideSection: 'recosting-frequency',
  },
  case_break_waste: {
    title: 'Case-Break Waste Risk',
    description:
      'The quantity needed is less than the minimum purchase size. Surplus may spoil, adding hidden cost.',
    cause: 'Specialty items often come in cases or bulk packs larger than a single event needs.',
    action:
      'If surplus will be used within shelf life across other jobs, cost only what you use. If it will spoil, charge the full purchase to this job. Coordinate with other events to split cases.',
    guideSection: 'minimum-order-waste',
  },
  no_resale_cert: {
    title: 'No Resale Certificate',
    description:
      'Without a resale certificate, you may be paying 5-10% sales tax on ingredient purchases that could be exempt.',
    cause:
      'Ingredients purchased for resale as prepared food are tax-exempt in most US states, but only with a valid resale certificate on file.',
    action:
      'Apply for a resale certificate through your state revenue department. Present it to each supplier. At $50K annual food spend, the savings are $2,500-5,000/year.',
    guideSection: 'tax-reference',
  },
  high_garnish_cost: {
    title: 'High Garnish/Presentation Cost',
    description:
      'Garnish and presentation elements add significant cost per plate. Consider whether the visual return justifies the expense.',
    cause:
      'Premium garnishes (microgreens, edible flowers, gold leaf) add $0.50-3.00+ per plate. On a $15 dish, that is 3-20% of food cost from garnish alone.',
    action:
      'For high-cost garnish: grow your own herbs/microgreens, use in-season edible flowers, or include garnish cost in your Q-factor if under $0.25/plate.',
    guideSection: 'presentation-and-garnish',
  },
  beverage_cost_missing: {
    title: 'Beverage Cost Not Included',
    description:
      'This event or menu includes beverages but beverage cost is not calculated. Your total food cost is understated.',
    cause:
      'Beverage costing is tracked separately from food costing. If beverages are included in the price but not in the cost calculation, margins appear better than they are.',
    action:
      'Add beverage cost as a separate line item in the cost-plus calculation, or track it alongside food cost for accurate blended profitability.',
    guideSection: 'beverage-costing',
  },
}

// ---------------------------------------------------------------------------
// Target ranges by operator type
// ---------------------------------------------------------------------------

export interface OperatorTargets {
  label: string
  foodCostPctLow: number
  foodCostPctHigh: number
  primeCostPctTarget: number
  qFactorDefault: number
  recostFrequency: string
}

export const OPERATOR_TARGETS: Record<OperatorType, OperatorTargets> = {
  fine_dining: {
    label: 'Fine Dining',
    foodCostPctLow: 28,
    foodCostPctHigh: 38,
    primeCostPctTarget: 60,
    qFactorDefault: 8,
    recostFrequency: 'Weekly',
  },
  casual: {
    label: 'Casual Dining',
    foodCostPctLow: 28,
    foodCostPctHigh: 35,
    primeCostPctTarget: 62,
    qFactorDefault: 7,
    recostFrequency: 'Monthly',
  },
  private_chef: {
    label: 'Private Chef',
    foodCostPctLow: 25,
    foodCostPctHigh: 35,
    primeCostPctTarget: 55,
    qFactorDefault: 7,
    recostFrequency: 'Per event',
  },
  catering: {
    label: 'Catering',
    foodCostPctLow: 25,
    foodCostPctHigh: 38,
    primeCostPctTarget: 60,
    qFactorDefault: 7,
    recostFrequency: 'Per event',
  },
  high_volume: {
    label: 'High Volume',
    foodCostPctLow: 28,
    foodCostPctHigh: 35,
    primeCostPctTarget: 62,
    qFactorDefault: 5,
    recostFrequency: 'Monthly',
  },
  food_truck: {
    label: 'Food Truck',
    foodCostPctLow: 28,
    foodCostPctHigh: 35,
    primeCostPctTarget: 60,
    qFactorDefault: 6,
    recostFrequency: 'Weekly',
  },
  ghost_kitchen: {
    label: 'Ghost Kitchen',
    foodCostPctLow: 25,
    foodCostPctHigh: 32,
    primeCostPctTarget: 55,
    qFactorDefault: 5,
    recostFrequency: 'Weekly',
  },
  bakery: {
    label: 'Bakery',
    foodCostPctLow: 25,
    foodCostPctHigh: 38,
    primeCostPctTarget: 60,
    qFactorDefault: 5,
    recostFrequency: 'Monthly',
  },
  meal_prep: {
    label: 'Meal Prep',
    foodCostPctLow: 30,
    foodCostPctHigh: 40,
    primeCostPctTarget: 62,
    qFactorDefault: 5,
    recostFrequency: 'Weekly',
  },
  restaurant: {
    label: 'Restaurant',
    foodCostPctLow: 28,
    foodCostPctHigh: 35,
    primeCostPctTarget: 62,
    qFactorDefault: 7,
    recostFrequency: 'Monthly',
  },
  institutional: {
    label: 'Institutional',
    foodCostPctLow: 35,
    foodCostPctHigh: 45,
    primeCostPctTarget: 65,
    qFactorDefault: 5,
    recostFrequency: 'Quarterly',
  },
  popup: {
    label: 'Pop-Up',
    foodCostPctLow: 25,
    foodCostPctHigh: 35,
    primeCostPctTarget: 55,
    qFactorDefault: 7,
    recostFrequency: 'Per event',
  },
  wholesale_cpg: {
    label: 'Wholesale / CPG',
    foodCostPctLow: 30,
    foodCostPctHigh: 45,
    primeCostPctTarget: 60,
    qFactorDefault: 3,
    recostFrequency: 'Per production run',
  },
  custom: {
    label: 'Custom',
    foodCostPctLow: 25,
    foodCostPctHigh: 35,
    primeCostPctTarget: 60,
    qFactorDefault: 7,
    recostFrequency: 'Monthly',
  },
}

// ---------------------------------------------------------------------------
// Unit conversion constants (from reference data Section 1)
// ---------------------------------------------------------------------------

export const WEIGHT_CONVERSIONS = {
  OZ_TO_G: 28.35,
  LB_TO_G: 453.59,
  LB_TO_OZ: 16,
  KG_TO_LB: 2.205,
  KG_TO_G: 1000,
} as const

export const VOLUME_CONVERSIONS = {
  TSP_TO_ML: 4.93,
  TBSP_TO_TSP: 3,
  TBSP_TO_ML: 14.79,
  FL_OZ_TO_TBSP: 2,
  FL_OZ_TO_ML: 29.57,
  CUP_TO_FL_OZ: 8,
  CUP_TO_ML: 236.59,
  PINT_TO_CUPS: 2,
  PINT_TO_ML: 473.18,
  QUART_TO_PINTS: 2,
  QUART_TO_CUPS: 4,
  QUART_TO_L: 0.946,
  GALLON_TO_QUARTS: 4,
  GALLON_TO_L: 3.785,
  L_TO_ML: 1000,
} as const

// ---------------------------------------------------------------------------
// Validation ranges (from spec Part 1b)
// ---------------------------------------------------------------------------

export const VALIDATION_RANGES = {
  PRICE_PER_UNIT_CENTS_MIN: 0,
  TRIM_YIELD_MIN: 0.01,
  TRIM_YIELD_MAX: 1.0,
  COOKING_YIELD_MIN: 0.01,
  COOKING_YIELD_FLAG: 4.0, // above this, flag as likely error
  Q_FACTOR_PCT_MIN: 0,
  Q_FACTOR_PCT_MAX: 100,
  Q_FACTOR_PCT_RECOMMENDED_LOW: 3,
  Q_FACTOR_PCT_RECOMMENDED_HIGH: 15,
  Q_FACTOR_PCT_DEFAULT: 7,
  QUANTITY_MIN: 0.001,
  PORTION_COUNT_MIN: 1,
  PROFIT_MARGIN_PCT_MIN: 0,
  PROFIT_MARGIN_PCT_MAX: 100,
  PROFIT_MARGIN_PCT_FLAG: 100, // flag as likely error
  TARGET_FOOD_COST_PCT_MIN: 1,
  TARGET_FOOD_COST_PCT_MAX: 100,
  TARGET_FOOD_COST_PCT_DEFAULT: 30,
} as const

// ---------------------------------------------------------------------------
// Prime cost thresholds
// ---------------------------------------------------------------------------

export const PRIME_COST_THRESHOLDS = {
  ADVISORY: 65,
  WARNING: 75,
} as const

// ---------------------------------------------------------------------------
// Variance thresholds (actual vs. theoretical)
// ---------------------------------------------------------------------------

export const VARIANCE_THRESHOLDS = [
  { maxPoints: 1, label: 'Normal', action: 'No action needed' },
  { maxPoints: 2, label: 'Monitor', action: 'Watch for trends, investigate if persistent' },
  {
    maxPoints: 3,
    label: 'Investigate',
    action: 'Recipe card audit, portioning check, waste review',
  },
  { maxPoints: 5, label: 'Escalate', action: 'Full variance investigation across all sources' },
  {
    maxPoints: Infinity,
    label: 'Critical',
    action: 'Stop operations review. Recount inventory, check for theft/major error',
  },
] as const

// ---------------------------------------------------------------------------
// Knowledge base sections (for the full guide page)
// ---------------------------------------------------------------------------

export interface GuideSection {
  id: string
  title: string
  summary: string
  part: number
}

export const GUIDE_SECTIONS: GuideSection[] = [
  // Part 1: Prerequisites
  {
    id: 'recipe-hierarchy',
    title: 'Recipe Hierarchy',
    summary: 'How recipes, sub-recipes, and menus relate',
    part: 1,
  },
  {
    id: 'ingredient-attributes',
    title: 'Ingredient Attributes',
    summary: 'What the system tracks for each ingredient',
    part: 1,
  },
  {
    id: 'unit-conversions',
    title: 'Unit Conversions',
    summary: 'Weight, volume, density, and count-to-weight tables',
    part: 1,
  },
  {
    id: 'yield-factors',
    title: 'Yield Factors',
    summary: 'Trim yield, cooking yield, and combined yield',
    part: 1,
  },
  {
    id: 'portion-standards',
    title: 'Portion Standards',
    summary: 'How much to serve by course, style, and demographic',
    part: 1,
  },
  {
    id: 'menu-architecture',
    title: 'Menu Architecture',
    summary: 'Courses, modifiers, dietary variants, and build strategy',
    part: 1,
  },
  {
    id: 'procurement',
    title: 'Procurement',
    summary: 'Purchasing channels, pack sizes, and vendor selection',
    part: 1,
  },
  {
    id: 'scaling',
    title: 'Scaling Behavior',
    summary: 'Non-linear adjustments when scaling recipes up or down',
    part: 1,
  },
  {
    id: 'labor-and-timing',
    title: 'Labor and Timing',
    summary: 'How prep time and skill level affect cost',
    part: 1,
  },
  {
    id: 'equipment-constraints',
    title: 'Equipment Constraints',
    summary: 'Oven capacity, batch sizes, and equipment yield impact',
    part: 1,
  },
  {
    id: 'food-safety',
    title: 'Food Safety Cost Impact',
    summary: 'Temp logs, certifications, allergen protocols, and compliance costs',
    part: 1,
  },
  {
    id: 'seasonal-pricing',
    title: 'Seasonal Pricing',
    summary: 'How seasons affect ingredient availability and price',
    part: 1,
  },
  {
    id: 'dietary-restrictions',
    title: 'Dietary Restriction Multipliers',
    summary: 'Cost impact of GF, vegan, allergen-free, and other restrictions',
    part: 1,
  },
  {
    id: 'cross-utilization',
    title: 'Cross-Utilization',
    summary: 'Using trim and byproducts across recipes to reduce waste',
    part: 1,
  },
  {
    id: 'waste-tracking',
    title: 'Waste Tracking',
    summary: 'Daily waste logs, spoilage rates, and pattern analysis',
    part: 1,
  },
  {
    id: 'shrink',
    title: 'Shrink (Inventory Loss)',
    summary: 'Unexplained loss: theft, admin errors, unrecorded waste',
    part: 1,
  },
  {
    id: 'equipment-yield-impact',
    title: 'Equipment Impact on Yield',
    summary: 'How cooking equipment affects yield and true ingredient cost',
    part: 1,
  },
  {
    id: 'prep-production-planning',
    title: 'Prep Production Planning',
    summary: 'Par levels, prep sheets, batch sizing, and shelf life',
    part: 1,
  },
  {
    id: 'vendor-price-tracking',
    title: 'Vendor Price Tracking',
    summary: 'Monitoring top ingredients by spend, price alerts, switching criteria',
    part: 1,
  },
  {
    id: 'cross-utilization-scoring',
    title: 'Cross-Utilization Scoring',
    summary: 'Overlap score, byproduct recovery valuation, and menu analysis',
    part: 1,
  },
  {
    id: 'actual-vs-theoretical',
    title: 'Actual vs. Theoretical Reconciliation',
    summary: 'Measuring and explaining the gap between expected and actual food cost',
    part: 1,
  },
  // Part 2: Two Methods
  {
    id: 'method-1-food-cost-percentage',
    title: 'Method 1: Food Cost Percentage',
    summary: 'Revenue-based pricing: cost / price = target %',
    part: 2,
  },
  {
    id: 'method-2-cost-plus-buildup',
    title: 'Method 2: Cost-Plus Buildup',
    summary: 'Bottom-up pricing: food + labor + overhead + margin',
    part: 2,
  },
  {
    id: 'q-factor',
    title: 'Q-Factor',
    summary: 'Incidental ingredient surcharge (salt, oil, seasonings)',
    part: 2,
  },
  // Part 3: Advanced Concepts
  { id: 'prime-cost', title: 'Prime Cost', summary: 'Food + labor as a % of revenue', part: 3 },
  {
    id: 'contribution-margin',
    title: 'Contribution Margin',
    summary: 'Dollars left after subtracting food cost',
    part: 3,
  },
  {
    id: 'menu-engineering-blended-food-cost',
    title: 'Menu Engineering',
    summary: 'Blended cost and menu item classification',
    part: 3,
  },
  {
    id: 'theoretical-vs-actual',
    title: 'Theoretical vs. Actual',
    summary: 'Variance measurement and what drives the gap',
    part: 3,
  },
  {
    id: 'value-based-pricing',
    title: 'Value-Based Pricing',
    summary: 'Setting the ceiling above the cost-based floor',
    part: 3,
  },
  {
    id: 'inflation-and-escalation',
    title: 'Inflation and Escalation',
    summary: 'Protecting margins against commodity price shifts',
    part: 3,
  },
  // Part 4: Operator-Specific
  {
    id: 'operator-private-chef',
    title: 'Private Chef',
    summary: 'Travel, shopping time, client kitchen limitations',
    part: 4,
  },
  {
    id: 'operator-caterer',
    title: 'Caterer',
    summary: 'Equipment rental, staffing, venue, transport',
    part: 4,
  },
  {
    id: 'operator-food-truck',
    title: 'Food Truck',
    summary: 'Commissary, generator, permits, vehicle costs',
    part: 4,
  },
  {
    id: 'operator-ghost-kitchen',
    title: 'Ghost Kitchen',
    summary: 'Platform commissions, packaging per order',
    part: 4,
  },
  {
    id: 'operator-bakery',
    title: 'Bakery',
    summary: 'Decoration labor, packaging, waste rate, oven scheduling',
    part: 4,
  },
  {
    id: 'operator-restaurant',
    title: 'Restaurant',
    summary: 'Rent, utilities, beverage program, comps, POS',
    part: 4,
  },
  {
    id: 'operator-meal-prep',
    title: 'Meal Prep',
    summary: 'Containers, cold chain, labels, subscription platform fees',
    part: 4,
  },
  {
    id: 'operator-institutional',
    title: 'Institutional',
    summary: 'Contract pricing, nutritional compliance, commodity programs',
    part: 4,
  },
  {
    id: 'operator-popup',
    title: 'Pop-Up',
    summary: 'Venue fee, temporary permits, equipment transport',
    part: 4,
  },
  {
    id: 'operator-wholesale',
    title: 'Wholesale / CPG',
    summary: 'Co-packing, slotting fees, broker commissions, freight',
    part: 4,
  },
  // Part 5: Using ChefFlow
  {
    id: 'using-chefflow',
    title: 'Using ChefFlow for Costing',
    summary: 'Where to enter data, what the system calculates, and what to override',
    part: 5,
  },
  // Part 6: Common Mistakes
  {
    id: 'common-mistakes',
    title: 'Common Mistakes',
    summary: 'The most frequent costing errors and how to avoid them',
    part: 6,
  },
  // Reference
  {
    id: 'missing-prices',
    title: 'Missing Prices',
    summary: 'What to do when ingredient prices are unavailable',
    part: 5,
  },
  {
    id: 'minimum-order-waste',
    title: 'Minimum Order Waste',
    summary: 'Handling surplus from case-break purchases',
    part: 5,
  },
  {
    id: 'presentation-and-garnish',
    title: 'Presentation and Garnish',
    summary: 'Tracking garnish and plating element costs',
    part: 5,
  },
  {
    id: 'tax-reference',
    title: 'Tax Reference',
    summary: 'Sales tax exemptions and resale certificates',
    part: 5,
  },
  {
    id: 'recosting-frequency',
    title: 'Re-Costing Frequency',
    summary: 'When to re-cost recipes based on operation type',
    part: 5,
  },
  {
    id: 'beverage-costing',
    title: 'Beverage Costing',
    summary: 'Separate cost targets, yield factors, and planning for beverages',
    part: 5,
  },
  {
    id: 'non-revenue-food',
    title: 'Non-Revenue Food',
    summary: 'Staff meals, comps, tastings, and R&D food budgets',
    part: 5,
  },
  {
    id: 'breakeven-analysis',
    title: 'Breakeven Analysis',
    summary: 'Minimum volume needed to cover fixed costs',
    part: 5,
  },
  {
    id: 'purchasing-strategy',
    title: 'Purchasing Strategy',
    summary: 'Vendor channels, delivery fees, and volume discount breakdowns',
    part: 5,
  },
  {
    id: 'as-purchased-vs-edible-portion',
    title: 'AP vs. EP',
    summary: 'Why you must cost the edible portion, not the purchased weight',
    part: 5,
  },
]

// ---------------------------------------------------------------------------
// Helper: get contextual guidance for a value
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Archetype → OperatorType mapping
// ---------------------------------------------------------------------------
// The chef_preferences.archetype column stores one of 6 presets (kebab-case).
// This maps them to the 14 OperatorType values used by the knowledge layer.

const ARCHETYPE_TO_OPERATOR: Record<string, OperatorType> = {
  'private-chef': 'private_chef',
  caterer: 'catering',
  'meal-prep': 'meal_prep',
  restaurant: 'restaurant',
  'food-truck': 'food_truck',
  bakery: 'bakery',
}

/**
 * Convert a chef archetype ID (from chef_preferences.archetype) to an OperatorType.
 * Falls back to 'private_chef' if unknown or null.
 */
export function archetypeToOperatorType(archetype: string | null | undefined): OperatorType {
  if (!archetype) return 'private_chef'
  return ARCHETYPE_TO_OPERATOR[archetype] ?? 'private_chef'
}

/**
 * Get operator-specific targets for a chef archetype.
 * Convenience wrapper: archetype string in, targets out.
 */
export function getTargetsForArchetype(archetype: string | null | undefined): OperatorTargets {
  return OPERATOR_TARGETS[archetypeToOperatorType(archetype)]
}

export function getContextualGuidance(
  topic: HelpTopic,
  currentValue: number | undefined,
  targetValue: number | undefined,
  operationType?: OperatorType
): string | null {
  if (currentValue === undefined) return null

  const targets = operationType ? OPERATOR_TARGETS[operationType] : OPERATOR_TARGETS.private_chef

  switch (topic) {
    case 'food_cost_pct': {
      const target = targetValue ?? targets.foodCostPctHigh
      if (currentValue > 50) {
        return `Your food cost is ${currentValue.toFixed(1)}%, which is critically high. Most operations target ${targets.foodCostPctLow}-${targets.foodCostPctHigh}%.`
      }
      if (currentValue > target) {
        return `Your food cost is ${currentValue.toFixed(1)}%, above your ${target}% target. Review yield factors, portion sizes, and ingredient prices.`
      }
      if (currentValue < targets.foodCostPctLow) {
        return `Your food cost is ${currentValue.toFixed(1)}%, below typical range. Verify all ingredients are priced and yield factors are accurate.`
      }
      return `Your food cost is ${currentValue.toFixed(1)}%, within the ${targets.foodCostPctLow}-${targets.foodCostPctHigh}% target range.`
    }
    case 'prime_cost': {
      if (currentValue > PRIME_COST_THRESHOLDS.WARNING) {
        return `Prime cost is ${currentValue.toFixed(1)}%, well above the ${PRIME_COST_THRESHOLDS.ADVISORY}% threshold. Profitability is at risk.`
      }
      if (currentValue > PRIME_COST_THRESHOLDS.ADVISORY) {
        return `Prime cost is ${currentValue.toFixed(1)}%, above the ${PRIME_COST_THRESHOLDS.ADVISORY}% advisory threshold. Monitor closely.`
      }
      return `Prime cost is ${currentValue.toFixed(1)}%, within healthy range (target: under ${targets.primeCostPctTarget}%).`
    }
    case 'q_factor': {
      if (currentValue === 0) {
        return 'Q-factor is 0%. Incidental ingredients (oil, salt, seasonings) are not accounted for in your food cost.'
      }
      if (currentValue > VALIDATION_RANGES.Q_FACTOR_PCT_RECOMMENDED_HIGH) {
        return `Q-factor is ${currentValue}%, above the recommended ${VALIDATION_RANGES.Q_FACTOR_PCT_RECOMMENDED_LOW}-${VALIDATION_RANGES.Q_FACTOR_PCT_RECOMMENDED_HIGH}% range.`
      }
      return null
    }
    default:
      return null
  }
}
