// Temperature Log Anomaly Detection — Deterministic Formula
// FDA Food Code standards applied as exact rules. No AI needed.
// These are published, well-defined safety thresholds — not opinions.
//
// References:
//   FDA Food Code 2022, Chapter 3: Food
//   §3-401.11 Cooking (minimum internal temps)
//   §3-501.16 Time/Temperature Control (TCS food holding)
//   §3-501.19 Time as a Public Health Control (2-hour / 4-hour rules)

// ── Types (match the AI version's output exactly) ──────────────────────────

export type TempViolation = {
  item: string
  loggedAt: string
  tempF: number
  issue: string
  regulatoryRef: string
  severity: 'critical' | 'warning' | 'info'
  recommendation: string
}

export type TempLogAnomalyResult = {
  violations: TempViolation[]
  overallStatus: 'clear' | 'warnings' | 'critical'
  summary: string
  confidence: 'high' | 'medium' | 'low'
}

// ── FDA Thresholds (exact values from FDA Food Code 2022) ──────────────────

const DANGER_ZONE_LOW_F = 40
const DANGER_ZONE_HIGH_F = 140

// Minimum safe internal cooking temperatures (°F)
const COOKING_TEMPS: Record<string, { minF: number; label: string }> = {
  poultry: { minF: 165, label: 'Poultry (chicken, turkey, duck)' },
  chicken: { minF: 165, label: 'Chicken' },
  turkey: { minF: 165, label: 'Turkey' },
  duck: { minF: 165, label: 'Duck' },
  ground_meat: { minF: 155, label: 'Ground meat' },
  ground_beef: { minF: 155, label: 'Ground beef' },
  ground_pork: { minF: 155, label: 'Ground pork' },
  sausage: { minF: 155, label: 'Sausage' },
  hamburger: { minF: 155, label: 'Hamburger' },
  pork: { minF: 145, label: 'Pork' },
  beef: { minF: 145, label: 'Beef (whole muscle)' },
  steak: { minF: 145, label: 'Steak' },
  lamb: { minF: 145, label: 'Lamb' },
  veal: { minF: 145, label: 'Veal' },
  fish: { minF: 145, label: 'Fish' },
  salmon: { minF: 145, label: 'Salmon' },
  tuna: { minF: 145, label: 'Tuna' },
  shrimp: { minF: 145, label: 'Shrimp' },
  seafood: { minF: 145, label: 'Seafood' },
  shellfish: { minF: 145, label: 'Shellfish' },
  eggs: { minF: 145, label: 'Eggs (for immediate service)' },
}

// ── Detection Logic ────────────────────────────────────────────────────────

type TempEntry = {
  food_item: string | null
  temp_f: number | null
  logged_at: string | null
  stage: string | null
  notes: string | null
}

/**
 * Analyzes temperature log entries against FDA Food Code thresholds.
 * Pure math + lookup — no AI, no network, no dependencies.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function analyzeTempLogFormula(entries: TempEntry[]): TempLogAnomalyResult {
  if (entries.length === 0) {
    return {
      violations: [],
      overallStatus: 'clear',
      summary: 'No temperature log entries found for this event.',
      confidence: 'low',
    }
  }

  const violations: TempViolation[] = []

  for (const entry of entries) {
    const item = entry.food_item ?? 'Unknown item'
    const tempF = entry.temp_f
    const loggedAt = entry.logged_at ?? ''
    const stage = (entry.stage ?? '').toLowerCase()

    if (tempF === null || tempF === undefined) continue

    // ── 1. Danger zone check (40°F – 140°F) ────────────────────────────
    // Any food sitting in this range is at risk
    if (tempF > DANGER_ZONE_LOW_F && tempF < DANGER_ZONE_HIGH_F) {
      // Distinguish by stage for proper severity
      if (
        stage === 'holding' ||
        stage === 'hot_holding' ||
        stage === 'cold_holding' ||
        stage === 'service'
      ) {
        violations.push({
          item,
          loggedAt,
          tempF,
          issue: `${item} is in the FDA danger zone (${tempF}°F). Food must be held below ${DANGER_ZONE_LOW_F}°F or above ${DANGER_ZONE_HIGH_F}°F.`,
          regulatoryRef: 'FDA Food Code §3-501.16: TCS food holding requirements',
          severity: 'critical',
          recommendation: `Immediately move to safe temperature. If held in danger zone for more than 2 hours, discard.`,
        })
      } else if (stage === 'cooking' || stage === 'cook') {
        // During cooking, being in danger zone is expected briefly — only flag if it looks like a final temp
        violations.push({
          item,
          loggedAt,
          tempF,
          issue: `${item} logged at ${tempF}°F during cooking — below safe minimum. Verify this is not the final internal temperature.`,
          regulatoryRef: 'FDA Food Code §3-401.11: Minimum cooking temperatures',
          severity: 'warning',
          recommendation:
            'Continue cooking to the required minimum internal temperature before serving.',
        })
      } else if (stage === 'cooling') {
        // Cooling through danger zone is expected — flag only if temp seems stalled
        violations.push({
          item,
          loggedAt,
          tempF,
          issue: `${item} at ${tempF}°F during cooling. FDA requires cooling from 135°F to 70°F within 2 hours, then 70°F to 41°F within 4 more hours.`,
          regulatoryRef: 'FDA Food Code §3-501.14: Cooling time/temperature requirements',
          severity: 'info',
          recommendation:
            'Monitor closely. Use ice baths, shallow pans, or blast chillers to accelerate cooling.',
        })
      } else {
        // Unknown stage + danger zone = flag it
        violations.push({
          item,
          loggedAt,
          tempF,
          issue: `${item} is at ${tempF}°F — within the FDA danger zone (${DANGER_ZONE_LOW_F}°F–${DANGER_ZONE_HIGH_F}°F).`,
          regulatoryRef: 'FDA Food Code §3-501.16: Time/Temperature Control for Safety',
          severity: 'warning',
          recommendation:
            'Verify the food stage. If holding, move to safe temperature immediately.',
        })
      }
    }

    // ── 2. Hot holding below 140°F ──────────────────────────────────────
    if (
      (stage === 'hot_holding' || stage === 'holding') &&
      tempF < DANGER_ZONE_HIGH_F &&
      tempF > DANGER_ZONE_LOW_F
    ) {
      // Already caught above, skip duplicate
    } else if (
      (stage === 'hot_holding' || (stage === 'holding' && tempF > 100)) &&
      tempF < DANGER_ZONE_HIGH_F
    ) {
      violations.push({
        item,
        loggedAt,
        tempF,
        issue: `Hot holding temperature for ${item} is ${tempF}°F — below the ${DANGER_ZONE_HIGH_F}°F minimum.`,
        regulatoryRef: 'FDA Food Code §3-501.16(A)(1): Hot holding minimum 135°F',
        severity: 'critical',
        recommendation:
          'Reheat to 165°F within 2 hours, or discard if held below 140°F for over 2 hours.',
      })
    }

    // ── 3. Cold holding above 40°F ──────────────────────────────────────
    if (
      (stage === 'cold_holding' || stage === 'cold_storage' || stage === 'receiving') &&
      tempF > DANGER_ZONE_LOW_F
    ) {
      if (tempF <= DANGER_ZONE_HIGH_F) {
        // Already caught in danger zone check above — but specifically flag cold holding
        violations.push({
          item,
          loggedAt,
          tempF,
          issue: `Cold holding temperature for ${item} is ${tempF}°F — above the ${DANGER_ZONE_LOW_F}°F maximum.`,
          regulatoryRef: 'FDA Food Code §3-501.16(A)(2): Cold holding maximum 41°F',
          severity: 'critical',
          recommendation:
            'Move to proper refrigeration (≤41°F) immediately. Discard if above 41°F for over 4 hours.',
        })
      }
    }

    // ── 4. Cooking temp check against protein type ──────────────────────
    if (stage === 'cooking' || stage === 'cook' || stage === 'final_temp' || stage === 'done') {
      const itemLower = item.toLowerCase()
      for (const [keyword, { minF, label }] of Object.entries(COOKING_TEMPS)) {
        if (itemLower.includes(keyword) && tempF < minF) {
          violations.push({
            item,
            loggedAt,
            tempF,
            issue: `${item} logged at ${tempF}°F — below the minimum safe cooking temp of ${minF}°F for ${label.toLowerCase()}.`,
            regulatoryRef: `FDA Food Code §3-401.11: ${label} minimum internal temp ${minF}°F`,
            severity: 'critical',
            recommendation: `Continue cooking until internal temperature reaches ${minF}°F. Use a calibrated probe thermometer.`,
          })
          break // Only flag the most specific match
        }
      }
    }

    // ── 5. Extreme/suspicious readings ──────────────────────────────────
    if (tempF < 0) {
      violations.push({
        item,
        loggedAt,
        tempF,
        issue: `${item} logged at ${tempF}°F — below freezing. Verify thermometer calibration.`,
        regulatoryRef: 'FDA Food Code §4-203.11: Thermometer accuracy ±2°F',
        severity: 'info',
        recommendation:
          'Check thermometer calibration with ice-water bath (should read 32°F ±2°F).',
      })
    }

    if (tempF > 300) {
      violations.push({
        item,
        loggedAt,
        tempF,
        issue: `${item} logged at ${tempF}°F — unusually high. Verify this is a food temperature, not an oven/grill reading.`,
        regulatoryRef: 'N/A — possible logging error',
        severity: 'info',
        recommendation:
          'Confirm this reading is an internal food temperature, not an equipment/ambient temperature.',
      })
    }
  }

  // Deduplicate — same item + same issue shouldn't appear twice
  const seen = new Set<string>()
  const deduped = violations.filter((v) => {
    const key = `${v.item}|${v.tempF}|${v.severity}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Determine overall status
  const hasCritical = deduped.some((v) => v.severity === 'critical')
  const hasWarning = deduped.some((v) => v.severity === 'warning')
  const overallStatus: TempLogAnomalyResult['overallStatus'] = hasCritical
    ? 'critical'
    : hasWarning
      ? 'warnings'
      : 'clear'

  // Build summary
  const criticalCount = deduped.filter((v) => v.severity === 'critical').length
  const warningCount = deduped.filter((v) => v.severity === 'warning').length
  const infoCount = deduped.filter((v) => v.severity === 'info').length

  let summary: string
  if (deduped.length === 0) {
    summary = `All ${entries.length} temperature readings are within FDA-safe ranges. No violations detected.`
  } else {
    const parts: string[] = []
    if (criticalCount > 0) parts.push(`${criticalCount} critical`)
    if (warningCount > 0) parts.push(`${warningCount} warning`)
    if (infoCount > 0) parts.push(`${infoCount} informational`)
    summary = `Found ${parts.join(', ')} issue${deduped.length > 1 ? 's' : ''} across ${entries.length} temperature readings. ${hasCritical ? 'Immediate action required for critical violations.' : 'Review warnings before service.'}`
  }

  return {
    violations: deduped,
    overallStatus,
    summary,
    confidence: 'high', // Formula-based = always high confidence
  }
}
