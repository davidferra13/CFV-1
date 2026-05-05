/**
 * PIE Intelligence Layer 6: Predictive Supply Chain
 *
 * Shortage forecasting, substitution recommendations, and supply risk scoring.
 * Warns chefs BEFORE ingredient availability becomes a problem.
 *
 * Capabilities:
 *   1. Supply Risk Scoring - Per-ingredient availability risk (0-100)
 *   2. Shortage Forecasting - Predict which ingredients will become scarce
 *   3. Substitution Engine - Smart alternatives when ingredients are unavailable
 *   4. Seasonal Availability Windows - When things are/aren't available
 *   5. Event Risk Assessment - Overall supply risk for an upcoming event
 *
 * NOT a 'use server' file. Called by server actions and cron.
 */

import { pgClient } from '@/lib/db'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupplyRisk {
  ingredientId: string
  ingredientName: string
  category: string
  /** 0-100 risk score (0 = highly available, 100 = likely shortage) */
  riskScore: number
  /** Risk factors contributing to this score */
  factors: SupplyRiskFactor[]
  /** Overall risk level */
  level: 'low' | 'medium' | 'high' | 'critical'
  /** Substitutes available */
  substitutes: SubstituteOption[]
  /** Predicted availability window */
  availabilityWindow: { from: string; to: string } | null
  updatedAt: string
}

export interface SupplyRiskFactor {
  factor: string
  weight: number
  score: number
  description: string
}

export interface SubstituteOption {
  ingredientId: string
  ingredientName: string
  /** How similar is it culinarily? 0-1 */
  similarity: number
  /** Price relative to original (1.0 = same, 0.8 = 20% cheaper) */
  priceRatio: number
  /** Current availability risk for the substitute */
  substituteRiskScore: number
  /** Chef notes on how to swap */
  swapNotes: string
}

export interface ShortageForcast {
  ingredientId: string
  ingredientName: string
  category: string
  /** Days until predicted shortage */
  daysUntilShortage: number | null
  /** Confidence in the prediction */
  confidence: number
  /** Evidence for the prediction */
  evidence: string[]
  /** Recommended action */
  recommendation: string
}

export interface EventRiskAssessment {
  eventId: string
  eventName: string
  eventDate: string
  /** Overall supply risk for this event (0-100) */
  overallRisk: number
  /** Risk level */
  level: 'low' | 'medium' | 'high' | 'critical'
  /** Ingredients with elevated risk */
  atRiskIngredients: Array<{
    name: string
    riskScore: number
    topFactor: string
    substitute: string | null
  }>
  /** Days until event */
  daysUntilEvent: number
  /** Recommendation */
  recommendation: string
}

export interface SupplyRunResult {
  ingredientsScored: number
  shortagesForecasted: number
  substitutionsGenerated: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Culinary Substitution Knowledge
// ---------------------------------------------------------------------------

const SUBSTITUTION_MAP: Record<
  string,
  Array<{ id: string; name: string; similarity: number; notes: string }>
> = {
  // Proteins
  salmon: [
    {
      id: '',
      name: 'trout',
      similarity: 0.85,
      notes: 'Similar texture and fat content. Cook identically.',
    },
    {
      id: '',
      name: 'arctic char',
      similarity: 0.9,
      notes: 'Closest substitute. Same technique, slightly milder.',
    },
    { id: '', name: 'steelhead', similarity: 0.88, notes: 'Virtually identical in application.' },
  ],
  shrimp: [
    { id: '', name: 'langoustine', similarity: 0.8, notes: 'More delicate. Reduce cook time 20%.' },
    {
      id: '',
      name: 'scallops',
      similarity: 0.6,
      notes: 'Different texture but similar sweetness.',
    },
    { id: '', name: 'prawns', similarity: 0.95, notes: 'Direct swap. Same technique.' },
  ],
  beef_tenderloin: [
    {
      id: '',
      name: 'pork tenderloin',
      similarity: 0.5,
      notes: 'Different flavor profile. Lower price point.',
    },
    {
      id: '',
      name: 'beef strip loin',
      similarity: 0.75,
      notes: 'More marbling, similar presentation.',
    },
    {
      id: '',
      name: 'bison tenderloin',
      similarity: 0.85,
      notes: 'Leaner but excellent substitute.',
    },
  ],
  // Produce
  asparagus: [
    {
      id: '',
      name: 'broccolini',
      similarity: 0.7,
      notes: 'Similar visual presentation and cooking method.',
    },
    {
      id: '',
      name: 'green beans',
      similarity: 0.55,
      notes: 'Different flavor but same role on plate.',
    },
    { id: '', name: 'snap peas', similarity: 0.5, notes: 'Sweeter. Works in spring menus.' },
  ],
  // Dairy
  heavy_cream: [
    {
      id: '',
      name: 'creme fraiche',
      similarity: 0.75,
      notes: 'Tangier. Better for sauces. Wont split.',
    },
    {
      id: '',
      name: 'coconut cream',
      similarity: 0.4,
      notes: 'Non-dairy option. Different flavor.',
    },
    { id: '', name: 'mascarpone', similarity: 0.6, notes: 'Richer. Better for desserts.' },
  ],
}

// Seasonality windows (month ranges when typically unavailable or limited)
const SEASONAL_LIMITS: Record<string, { unavailableMonths: number[]; peakMonths: number[] }> = {
  asparagus: { unavailableMonths: [7, 8, 9, 10, 11], peakMonths: [3, 4, 5] },
  ramps: { unavailableMonths: [5, 6, 7, 8, 9, 10, 11, 12, 1], peakMonths: [3, 4] },
  stone_fruit: { unavailableMonths: [10, 11, 12, 1, 2, 3], peakMonths: [6, 7, 8] },
  tomatoes: { unavailableMonths: [], peakMonths: [7, 8, 9] },
  berries: { unavailableMonths: [], peakMonths: [5, 6, 7, 8] },
  corn: { unavailableMonths: [10, 11, 12, 1, 2, 3], peakMonths: [7, 8, 9] },
  fiddleheads: { unavailableMonths: [5, 6, 7, 8, 9, 10, 11, 12, 1, 2], peakMonths: [4, 5] },
  soft_shell_crab: { unavailableMonths: [10, 11, 12, 1, 2, 3], peakMonths: [5, 6, 7] },
  dungeness_crab: { unavailableMonths: [7, 8, 9, 10], peakMonths: [12, 1, 2, 3] },
  halibut: { unavailableMonths: [], peakMonths: [3, 4, 5, 6, 7, 8] },
  lamb: { unavailableMonths: [], peakMonths: [3, 4, 5] },
  oysters: { unavailableMonths: [5, 6, 7, 8], peakMonths: [9, 10, 11, 12, 1, 2, 3] },
}

// ---------------------------------------------------------------------------
// Supply Risk Scoring
// ---------------------------------------------------------------------------

/**
 * Score supply risk for a single ingredient.
 * Considers: source count, freshness, price volatility, seasonal availability,
 * stock-out signals, and trend direction.
 */
async function scoreIngredientRisk(
  ingredientId: string,
  ingredientName: string,
  category: string
): Promise<SupplyRisk> {
  const pgSql = pgClient
  const factors: SupplyRiskFactor[] = []
  let totalScore = 0
  let totalWeight = 0

  // Factor 1: Source diversity (fewer sources = higher risk)
  const [sourceData] = await pgSql`
    SELECT
      COUNT(DISTINCT sp.store_id) AS store_count,
      COUNT(*) FILTER (WHERE sp.in_stock = false) AS out_of_stock_count,
      COUNT(*) AS total_listings
    FROM openclaw.store_products sp
    JOIN openclaw.normalization_map nm ON nm.raw_name = (
      SELECT p.name FROM openclaw.products p WHERE p.id = sp.product_id
    )
    WHERE nm.canonical_ingredient_id = ${ingredientId}
  `

  const storeCount = Number(sourceData?.store_count || 0)
  const oosCount = Number(sourceData?.out_of_stock_count || 0)
  const totalListings = Number(sourceData?.total_listings || 0)

  const diversityScore = storeCount >= 10 ? 0 : storeCount >= 5 ? 20 : storeCount >= 2 ? 50 : 80
  factors.push({
    factor: 'source_diversity',
    weight: 0.2,
    score: diversityScore,
    description: `${storeCount} active sources`,
  })
  totalScore += diversityScore * 0.2
  totalWeight += 0.2

  // Factor 2: Stock-out rate
  const oosRate = totalListings > 0 ? (oosCount / totalListings) * 100 : 0
  const oosScore = oosRate > 50 ? 90 : oosRate > 30 ? 70 : oosRate > 10 ? 40 : 10
  factors.push({
    factor: 'stock_out_rate',
    weight: 0.25,
    score: oosScore,
    description: `${Math.round(oosRate)}% out-of-stock`,
  })
  totalScore += oosScore * 0.25
  totalWeight += 0.25

  // Factor 3: Price volatility (volatile = supply stress)
  const [trendData] = await pgSql`
    SELECT volatility, direction, change_pct
    FROM openclaw.ingredient_trends
    WHERE ingredient_id = ${ingredientId}
    LIMIT 1
  `

  const volatility = Number(trendData?.volatility || 0)
  const volatilityScore = volatility > 0.3 ? 80 : volatility > 0.2 ? 50 : volatility > 0.1 ? 25 : 5
  factors.push({
    factor: 'price_volatility',
    weight: 0.2,
    score: volatilityScore,
    description: `Volatility: ${(volatility * 100).toFixed(0)}%`,
  })
  totalScore += volatilityScore * 0.2
  totalWeight += 0.2

  // Factor 4: Seasonal availability
  const currentMonth = new Date().getMonth() + 1
  const lowerName = ingredientName.toLowerCase().replace(/\s+/g, '_')
  const seasonal = SEASONAL_LIMITS[lowerName]
  let seasonalScore = 0
  let availWindow: { from: string; to: string } | null = null

  if (seasonal) {
    if (seasonal.unavailableMonths.includes(currentMonth)) {
      seasonalScore = 90
    } else if (seasonal.peakMonths.includes(currentMonth)) {
      seasonalScore = 0
    } else {
      seasonalScore = 30 // shoulder season
    }

    if (seasonal.peakMonths.length > 0) {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]
      availWindow = {
        from: months[seasonal.peakMonths[0] - 1],
        to: months[seasonal.peakMonths[seasonal.peakMonths.length - 1] - 1],
      }
    }
  }
  factors.push({
    factor: 'seasonality',
    weight: 0.2,
    score: seasonalScore,
    description: seasonal ? 'Has seasonal limits' : 'Year-round',
  })
  totalScore += seasonalScore * 0.2
  totalWeight += 0.2

  // Factor 5: Price trend (rising fast = supply tightening)
  const changePct = Number(trendData?.change_pct || 0)
  const trendScore = changePct > 30 ? 80 : changePct > 15 ? 50 : changePct > 5 ? 20 : 0
  factors.push({
    factor: 'price_trend',
    weight: 0.15,
    score: trendScore,
    description: `${changePct > 0 ? '+' : ''}${changePct.toFixed(0)}% in 30d`,
  })
  totalScore += trendScore * 0.15
  totalWeight += 0.15

  const riskScore = Math.round(totalScore / (totalWeight || 1))
  const level =
    riskScore > 70 ? 'critical' : riskScore > 50 ? 'high' : riskScore > 30 ? 'medium' : 'low'

  // Get substitutes
  const substitutes = (SUBSTITUTION_MAP[lowerName] || []).map((s) => ({
    ingredientId: s.id,
    ingredientName: s.name,
    similarity: s.similarity,
    priceRatio: 1.0, // would need price lookup
    substituteRiskScore: 20, // default low risk
    swapNotes: s.notes,
  }))

  return {
    ingredientId,
    ingredientName,
    category,
    riskScore,
    factors,
    level,
    substitutes,
    availabilityWindow: availWindow,
    updatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Batch Supply Scoring (Cron)
// ---------------------------------------------------------------------------

export async function runSupplyRiskAnalysis(): Promise<SupplyRunResult> {
  const start = Date.now()
  const pgSql = pgClient
  let scored = 0
  let shortages = 0
  let substitutions = 0

  // Score all census ingredients with store data
  const ingredients = await pgSql`
    SELECT
      ci.ingredient_id,
      ci.name,
      ci.category
    FROM openclaw.canonical_ingredients ci
    JOIN openclaw.ingredient_census ic ON ic.ingredient_id = ci.ingredient_id
    WHERE ic.census_tier IN ('core', 'extended')
    LIMIT 5000
  `

  for (const ing of ingredients) {
    const risk = await scoreIngredientRisk(
      ing.ingredient_id as string,
      ing.name as string,
      ing.category as string
    )

    // Store risk score
    await pgSql`
      INSERT INTO openclaw.supply_risk_scores (
        ingredient_id, ingredient_name, category,
        risk_score, risk_level, top_factor,
        has_substitutes, updated_at
      ) VALUES (
        ${ing.ingredient_id}, ${ing.name}, ${ing.category},
        ${risk.riskScore}, ${risk.level},
        ${risk.factors.sort((a, b) => b.score * b.weight - a.score * a.weight)[0]?.factor || 'unknown'},
        ${risk.substitutes.length > 0}, now()
      )
      ON CONFLICT (ingredient_id) DO UPDATE SET
        risk_score = EXCLUDED.risk_score,
        risk_level = EXCLUDED.risk_level,
        top_factor = EXCLUDED.top_factor,
        has_substitutes = EXCLUDED.has_substitutes,
        updated_at = now()
    `

    scored++
    if (risk.level === 'critical' || risk.level === 'high') shortages++
    if (risk.substitutes.length > 0) substitutions++
  }

  return {
    ingredientsScored: scored,
    shortagesForecasted: shortages,
    substitutionsGenerated: substitutions,
    durationMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Event Risk Assessment
// ---------------------------------------------------------------------------

/**
 * Assess supply risk for all ingredients in an upcoming event.
 */
export async function assessEventRisk(
  eventId: string,
  tenantId: string
): Promise<EventRiskAssessment | null> {
  const [event] = (await db.execute(sql`
    SELECT id, name, event_date, guest_count
    FROM events
    WHERE id = ${eventId} AND tenant_id = ${tenantId}
  `)) as unknown as Array<{ id: string; name: string; event_date: Date; guest_count: number }>

  if (!event) return null

  // Get all ingredients for this event
  const ingredients = (await db.execute(sql`
    SELECT DISTINCT
      ri.canonical_ingredient_id,
      ri.name
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    JOIN event_menus em ON em.recipe_id = r.id
    WHERE em.event_id = ${eventId}
      AND ri.canonical_ingredient_id IS NOT NULL
  `)) as unknown as Array<{ canonical_ingredient_id: string; name: string }>

  const pgSql = pgClient
  const atRisk: EventRiskAssessment['atRiskIngredients'] = []
  let totalRisk = 0

  for (const ing of ingredients) {
    const [risk] = await pgSql`
      SELECT risk_score, risk_level, top_factor, has_substitutes
      FROM openclaw.supply_risk_scores
      WHERE ingredient_id = ${ing.canonical_ingredient_id}
    `

    if (risk && Number(risk.risk_score) > 30) {
      atRisk.push({
        name: ing.name,
        riskScore: Number(risk.risk_score),
        topFactor: risk.top_factor as string,
        substitute: risk.has_substitutes ? 'Available' : null,
      })
      totalRisk += Number(risk.risk_score)
    }
  }

  const avgRisk = ingredients.length > 0 ? Math.round(totalRisk / ingredients.length) : 0

  const overallRisk = Math.min(100, avgRisk + (atRisk.length > 3 ? 20 : 0))
  const level =
    overallRisk > 60 ? 'critical' : overallRisk > 40 ? 'high' : overallRisk > 20 ? 'medium' : 'low'

  const eventDate = new Date(event.event_date)
  const daysUntil = Math.round((eventDate.getTime() - Date.now()) / 86400000)

  let recommendation: string
  if (level === 'critical') {
    recommendation =
      'High supply risk. Order key ingredients now. Have substitutes planned for all at-risk items.'
  } else if (level === 'high') {
    recommendation = 'Elevated risk on some ingredients. Pre-order proteins and specialty items.'
  } else if (level === 'medium') {
    recommendation = 'Minor risk. Monitor at-risk items; no immediate action needed.'
  } else {
    recommendation = 'Low supply risk. Standard procurement timeline is fine.'
  }

  return {
    eventId: event.id,
    eventName: event.name,
    eventDate: eventDate.toISOString(),
    overallRisk,
    level,
    atRiskIngredients: atRisk.sort((a, b) => b.riskScore - a.riskScore),
    daysUntilEvent: daysUntil,
    recommendation,
  }
}

// ---------------------------------------------------------------------------
// Query API
// ---------------------------------------------------------------------------

/** Get supply risks for specific ingredients */
export async function getSupplyRisks(ingredientIds: string[]): Promise<SupplyRisk[]> {
  if (ingredientIds.length === 0) return []
  const pgSql = pgClient

  const rows = await pgSql`
    SELECT
      srs.ingredient_id, srs.ingredient_name, srs.category,
      srs.risk_score, srs.risk_level, srs.top_factor, srs.has_substitutes
    FROM openclaw.supply_risk_scores srs
    WHERE srs.ingredient_id = ANY(${ingredientIds})
    ORDER BY srs.risk_score DESC
  `

  return rows.map((r) => ({
    ingredientId: r.ingredient_id as string,
    ingredientName: r.ingredient_name as string,
    category: r.category as string,
    riskScore: Number(r.risk_score),
    factors: [
      { factor: r.top_factor as string, weight: 1, score: Number(r.risk_score), description: '' },
    ],
    level: r.risk_level as SupplyRisk['level'],
    substitutes: [],
    availabilityWindow: null,
    updatedAt: new Date().toISOString(),
  }))
}

/** Get highest-risk ingredients across the system */
export async function getTopSupplyRisks(limit = 20): Promise<
  Array<{
    ingredientName: string
    category: string
    riskScore: number
    level: string
    topFactor: string
    hasSubstitutes: boolean
  }>
> {
  const pgSql = pgClient
  const rows = await pgSql`
    SELECT ingredient_name, category, risk_score, risk_level, top_factor, has_substitutes
    FROM openclaw.supply_risk_scores
    WHERE risk_score > 30
    ORDER BY risk_score DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    ingredientName: r.ingredient_name as string,
    category: r.category as string,
    riskScore: Number(r.risk_score),
    level: r.risk_level as string,
    topFactor: r.top_factor as string,
    hasSubstitutes: r.has_substitutes as boolean,
  }))
}
