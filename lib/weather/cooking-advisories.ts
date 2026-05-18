// Weather-to-Technique Cooking Advisory Engine
// Deterministic rules mapping weather conditions to cooking technique risks.
// No AI. Pure conditionals based on culinary science.

export type AdvisorySeverity = 'critical' | 'warning' | 'info'

export interface WeatherCondition {
  tempF: number
  humidity: number
  windMph: number
  precipitation: number
  condition: string
}

export interface CookingAdvisory {
  severity: AdvisorySeverity
  technique: string
  message: string
  alternative?: string
}

type Technique =
  | 'chocolate_tempering'
  | 'meringue'
  | 'sugar_work'
  | 'buttercream'
  | 'grilling'
  | 'deep_frying'
  | 'bread_proofing'
  | 'cold_dish'
  | 'hot_holding'
  | 'smoking'

interface AdvisoryRule {
  technique: Technique
  test: (w: WeatherCondition) => boolean
  severity: AdvisorySeverity
  message: string
  alternative?: string
}

const RULES: AdvisoryRule[] = [
  // Critical (technique will likely fail)
  {
    technique: 'chocolate_tempering',
    test: (w) => w.humidity > 80 || w.tempF > 88,
    severity: 'critical',
    message:
      'Chocolate tempering unreliable in high humidity/heat. Consider ganache, mousse, or no-temper coating.',
    alternative: 'ganache, mousse, or no-temper coating',
  },
  {
    technique: 'meringue',
    test: (w) => w.humidity > 70,
    severity: 'critical',
    message:
      'Meringue-based items absorb moisture in high humidity. Consider alternative desserts or ensure climate-controlled workspace.',
    alternative: 'panna cotta, semifreddo, or other non-meringue desserts',
  },
  {
    technique: 'sugar_work',
    test: (w) => w.humidity > 65,
    severity: 'critical',
    message:
      'Sugar crystallization unpredictable in humid conditions. Hard crack stage difficult to achieve.',
    alternative: 'caramel sauce, praline paste, or chocolate decorations',
  },

  // Warning (technique needs adjustment)
  {
    technique: 'buttercream',
    test: (w) => w.tempF > 85,
    severity: 'warning',
    message:
      'Buttercream softens above 85F. Use Swiss or Italian meringue buttercream for better heat stability, or serve immediately.',
    alternative: 'Swiss meringue buttercream or whipped cream stabilized with gelatin',
  },
  {
    technique: 'grilling',
    test: (w) => w.windMph > 20,
    severity: 'warning',
    message:
      'High wind affects grill temperature consistency. Use windbreak or adjust cook times. Monitor internal temps closely.',
  },
  {
    technique: 'deep_frying',
    test: (w) => w.windMph > 15,
    severity: 'warning',
    message:
      'Wind creates fire hazard with outdoor fryers. Use wind guard or move to sheltered area.',
  },
  {
    technique: 'bread_proofing',
    test: (w) => w.tempF < 60,
    severity: 'warning',
    message:
      'Cold ambient temperature slows yeast activity. Allow extra proof time or use warm proof box.',
  },
  {
    technique: 'bread_proofing',
    test: (w) => w.tempF > 85,
    severity: 'warning',
    message:
      'High temperature causes over-proofing. Reduce proof time, use cooler water, refrigerate if needed.',
  },
  {
    technique: 'cold_dish',
    test: (w) => w.tempF > 80,
    severity: 'warning',
    message:
      'Food safety: cold items reach danger zone faster above 80F. Replenish ice every 30 minutes. Consider smaller batch service.',
  },
  {
    technique: 'hot_holding',
    test: (w) => w.tempF < 40,
    severity: 'warning',
    message:
      'Hot food cools rapidly below 40F. Use chafing dishes, heat lamps, or serve in courses.',
  },

  // Info (good to know)
  {
    technique: 'grilling',
    test: (w) =>
      w.condition.toLowerCase().includes('rain') || w.condition.toLowerCase().includes('showers'),
    severity: 'info',
    message: 'Plan for covered cooking area. Avoid smoking/long outdoor cooks.',
  },
  {
    technique: 'smoking',
    test: (w) =>
      w.condition.toLowerCase().includes('rain') || w.condition.toLowerCase().includes('showers'),
    severity: 'info',
    message: 'Plan for covered cooking area. Avoid smoking/long outdoor cooks.',
  },
  {
    technique: 'cold_dish',
    test: (w) => w.tempF > 90,
    severity: 'info',
    message:
      'Mise en place: keep dairy, eggs, cream refrigerated until last moment. Stage cold items in cooler.',
  },
]

const SEVERITY_ORDER: Record<AdvisorySeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

/**
 * Evaluate weather conditions against techniques from the event menu.
 * Sorted by severity (critical first).
 */
export function getCookingAdvisories(
  weather: WeatherCondition,
  techniques: string[]
): CookingAdvisory[] {
  if (!techniques.length) return []

  const techSet = new Set(techniques)
  const advisories: CookingAdvisory[] = []
  const seen = new Set<string>()

  for (const rule of RULES) {
    if (!techSet.has(rule.technique)) continue
    if (!rule.test(weather)) continue

    const key = `${rule.technique}:${rule.message}`
    if (seen.has(key)) continue
    seen.add(key)

    advisories.push({
      severity: rule.severity,
      technique: rule.technique,
      message: rule.message,
      ...(rule.alternative ? { alternative: rule.alternative } : {}),
    })
  }

  advisories.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  return advisories
}

// Menu-to-Technique Extractor

interface MenuItem {
  name: string
  description?: string | null
  notes?: string | null
}

const TECHNIQUE_KEYWORDS: Record<Technique, string[]> = {
  chocolate_tempering: ['tempered chocolate', 'chocolate work', 'tempering'],
  meringue: ['meringue', 'macaron', 'macarons', 'pavlova'],
  sugar_work: ['caramel', 'toffee', 'sugar glass', 'pulled sugar', 'spun sugar', 'candy'],
  buttercream: ['buttercream', 'frosting'],
  grilling: ['grilled', 'grill', 'bbq', 'barbecue', 'charcoal'],
  deep_frying: ['fried', 'deep-fried', 'deep fried', 'tempura', 'fryer'],
  bread_proofing: ['sourdough', 'bread', 'rolls', 'brioche', 'focaccia', 'pizza dough'],
  cold_dish: ['salad', 'ceviche', 'tartare', 'crudo', 'carpaccio', 'poke'],
  hot_holding: ['braise', 'braised', 'stew', 'soup', 'chili'],
  smoking: ['smoked', 'smoking', 'smoker'],
}

/**
 * Extract cooking technique identifiers from menu item names/descriptions/notes.
 * Simple keyword matching, no AI.
 */
export function extractTechniquesFromMenu(menuItems: MenuItem[]): string[] {
  if (!menuItems.length) return []

  const combined = menuItems
    .map((item) => [item.name, item.description ?? '', item.notes ?? ''].join(' '))
    .join(' ')
    .toLowerCase()

  const matched: string[] = []

  for (const [technique, keywords] of Object.entries(TECHNIQUE_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        matched.push(technique)
        break
      }
    }
  }

  return matched
}
