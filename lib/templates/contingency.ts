// Contingency Plan Templates — Rule-Based Risk Assessment
// Standard "if X happens, do Y" plans based on event characteristics.
// Every experienced caterer has these memorized — we're just writing them down.

// ── Types ──────────────────────────────────────────────────────────────────

export type ContingencyPlan = {
  risk: string
  likelihood: 'high' | 'medium' | 'low'
  impact: 'critical' | 'moderate' | 'minor'
  mitigation: string
  triggerCondition: string
}

export type ContingencyResult = {
  plans: ContingencyPlan[]
  topRisk: string
  summary: string
  generatedAt: string
}

// ── Input types ────────────────────────────────────────────────────────────

export type ContingencyVars = {
  occasion: string
  guestCount: number
  isOutdoor: boolean
  hasAllergies: boolean
  allergies: string[]
  isOffsite: boolean
  isHighValue: boolean // quoted > $2,000
  serviceStyle?: string
  notes?: string
}

// ── Rules ──────────────────────────────────────────────────────────────────

/**
 * Generates contingency plans based on event characteristics.
 * Pure rules — every experienced caterer knows these.
 */
export function generateContingencyFormula(v: ContingencyVars): ContingencyResult {
  const plans: ContingencyPlan[] = []

  // ── Weather (outdoor events) ────────────────────────────────────────
  if (v.isOutdoor) {
    plans.push({
      risk: 'Rain or severe weather',
      likelihood: 'medium',
      impact: 'critical',
      mitigation:
        'Identify indoor backup space before event day. Have tarps/canopies staged. Move service indoors if forecast shows >60% rain chance 24h before.',
      triggerCondition: 'Check weather forecast 48h and 24h before event.',
    })
    plans.push({
      risk: 'Extreme heat (food safety)',
      likelihood: 'medium',
      impact: 'critical',
      mitigation:
        'Keep all cold items on ice or in coolers until service. Set up shade over food stations. Monitor holding temps every 30 minutes. Discard anything in danger zone >1 hour.',
      triggerCondition: 'Forecast above 85°F / 30°C.',
    })
  }

  // ── Allergen emergencies ────────────────────────────────────────────
  if (v.hasAllergies) {
    const severeAllergens = v.allergies.filter((a) => {
      const lower = a.toLowerCase()
      return (
        lower.includes('peanut') ||
        lower.includes('nut') ||
        lower.includes('shellfish') ||
        lower.includes('anaphylaxis') ||
        lower.includes('epipen')
      )
    })

    plans.push({
      risk: 'Allergen cross-contamination',
      likelihood: severeAllergens.length > 0 ? 'medium' : 'low',
      impact: 'critical',
      mitigation: `Use dedicated cutting boards and utensils for allergen-free prep. Clean all surfaces between tasks. ${severeAllergens.length > 0 ? 'CONFIRM: Does the venue have an EpiPen? Know the nearest hospital.' : 'Brief all staff on allergen list.'}`,
      triggerCondition: 'Any time allergen-containing ingredients are in the kitchen.',
    })
  }

  // ── Large events (30+ guests) ───────────────────────────────────────
  if (v.guestCount >= 30) {
    plans.push({
      risk: 'Staffing shortage (illness/no-show)',
      likelihood: 'low',
      impact: 'critical',
      mitigation:
        'Have one backup contact (sous chef or reliable helper) on standby. Confirm all staff 48h and 24h before. Have a simplified menu option ready that one person can execute.',
      triggerCondition: 'Staff member cancels within 48h of event.',
    })
    plans.push({
      risk: 'Equipment failure',
      likelihood: 'low',
      impact: 'moderate',
      mitigation:
        'Test all equipment day before. Bring backup burner/hot plate. Know the nearest restaurant supply store for emergency purchases.',
      triggerCondition: 'Any critical equipment (oven, burner, refrigeration) fails during prep.',
    })
  }

  // ── Offsite events ──────────────────────────────────────────────────
  if (v.isOffsite) {
    plans.push({
      risk: 'Venue kitchen inadequate',
      likelihood: 'medium',
      impact: 'moderate',
      mitigation:
        'Visit venue kitchen in advance or get photos. Bring own essentials: cutting boards, knives, thermometer, sheet pans, extension cord. Have a plan B menu that can work with minimal equipment.',
      triggerCondition: 'First-time venue or unable to visit in advance.',
    })
    plans.push({
      risk: 'Transportation delay or damage',
      likelihood: 'low',
      impact: 'moderate',
      mitigation:
        'Pack fragile items separately. Use insulated bags for cold/hot items. Leave 30 min early. Have backup route planned.',
      triggerCondition: 'Day of event — depart on schedule.',
    })
  }

  // ── Always applicable ───────────────────────────────────────────────
  plans.push({
    risk: 'Key ingredient unavailable at store',
    likelihood: 'medium',
    impact: 'minor',
    mitigation:
      'Shop 1–2 days early. Have substitution list for each key ingredient. Know which dishes can be modified without affecting the menu story.',
    triggerCondition: 'During grocery shopping.',
  })

  plans.push({
    risk: 'Guest count changes last-minute',
    likelihood: 'medium',
    impact: 'minor',
    mitigation: `Always prep for ${Math.ceil(v.guestCount * 1.1)} (10% buffer). Have backup protein in freezer. Appetizer courses are easiest to stretch.`,
    triggerCondition: 'Client informs of change within 48h of event.',
  })

  // ── High-value events ───────────────────────────────────────────────
  if (v.isHighValue) {
    plans.push({
      risk: 'Client dissatisfaction with a course',
      likelihood: 'low',
      impact: 'moderate',
      mitigation:
        "Prepare one backup dish (simple, crowd-pleasing) that can replace any course. Read the room during service — if a course doesn't land, pivot gracefully.",
      triggerCondition: 'During service — observe guest reactions.',
    })
  }

  plans.push({
    risk: 'Power outage',
    likelihood: 'low',
    impact: 'critical',
    mitigation:
      'Identify which dishes can be finished on a portable gas burner. Keep a flashlight/headlamp in kit. If extended outage, pivot to cold courses and charcuterie.',
    triggerCondition: 'Power failure during prep or service.',
  })

  // Sort by impact (critical first) then likelihood (high first)
  const impactOrder = { critical: 0, moderate: 1, minor: 2 }
  const likelihoodOrder = { high: 0, medium: 1, low: 2 }
  plans.sort(
    (a, b) =>
      impactOrder[a.impact] - impactOrder[b.impact] ||
      likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood]
  )

  const topRisk = plans.length > 0 ? plans[0].risk : 'No significant risks identified.'

  const criticalCount = plans.filter((p) => p.impact === 'critical').length
  const summary = `${plans.length} contingency plan${plans.length !== 1 ? 's' : ''} generated for ${v.occasion} (${v.guestCount} guests). ${criticalCount > 0 ? criticalCount + ' critical-impact risk' + (criticalCount > 1 ? 's' : '') + ' identified.' : 'No critical-impact risks.'}`

  return {
    plans,
    topRisk,
    summary,
    generatedAt: new Date().toISOString(),
  }
}
