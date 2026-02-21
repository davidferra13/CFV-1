/**
 * Holiday intelligence constants for ChefFlow.
 * Each holiday carries metadata used for:
 *   - Proactive outreach timing
 *   - Premium pricing flags
 *   - Menu category suggestions
 *   - Lead score boosting on nearby inquiries
 */

export type HolidayCategory =
  | 'romantic'
  | 'family'
  | 'cultural'
  | 'religious'
  | 'corporate'
  | 'social'
  | 'seasonal'

export type ChefRelevance = 'high' | 'medium' | 'low'

export interface Holiday {
  /** Unique key used in code (no spaces) */
  key: string
  /** Display name */
  name: string
  /** How to compute the date each year */
  type: 'fixed' | 'floating'
  /** For fixed holidays: month (1–12) */
  month?: number
  /** For fixed holidays: day of month */
  day?: number
  /** For floating holidays: function returning the date for a given year */
  getDate?: (year: number) => Date
  /** How relevant this holiday is for private chef / restaurant bookings */
  chefRelevance: ChefRelevance
  /** Whether to suggest premium pricing on this date */
  premiumPricing: boolean
  /** Event/food categories this holiday maps to */
  categories: HolidayCategory[]
  /** What kind of menu works for this holiday */
  menuNotes: string
  /** How many days before the holiday to start outreach */
  outreachLeadDays: number
  /** Short blurb for the outreach message suggestion */
  outreachHook: string
}

// ---------------------------------------------------------------------------
// Floating date helpers
// ---------------------------------------------------------------------------

/** nth weekday of a given month (e.g. 2nd Sunday of May) */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  // month is 1-based; weekday: 0=Sun, 1=Mon, ..., 6=Sat
  const first = new Date(year, month - 1, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  return new Date(year, month - 1, 1 + offset + (n - 1) * 7)
}

/** Last weekday of a given month (e.g. last Monday of May) */
function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month, 0) // last day of month
  const offset = (last.getDay() - weekday + 7) % 7
  return new Date(year, month - 1, last.getDate() - offset)
}

// ---------------------------------------------------------------------------
// Holiday definitions
// ---------------------------------------------------------------------------

export const HOLIDAYS: Holiday[] = [
  // ─── HIGH RELEVANCE ────────────────────────────────────────────────────────

  {
    key: 'valentines_day',
    name: "Valentine's Day",
    type: 'fixed',
    month: 2,
    day: 14,
    chefRelevance: 'high',
    premiumPricing: true,
    categories: ['romantic'],
    menuNotes:
      'Tasting menu for two — oysters, filet, chocolate lava cake. Intimate plated service.',
    outreachLeadDays: 28,
    outreachHook: "Valentine's Day is coming — want to do a private dinner for two?",
  },
  {
    key: 'mothers_day',
    name: "Mother's Day",
    type: 'floating',
    getDate: (y) => nthWeekday(y, 5, 0, 2), // 2nd Sunday of May
    chefRelevance: 'high',
    premiumPricing: true,
    categories: ['family'],
    menuNotes: 'Elevated brunch or Sunday dinner. Crowd-pleasing family-style or plated.',
    outreachLeadDays: 28,
    outreachHook:
      "Mother's Day is approaching — would your family like a private celebration dinner?",
  },
  {
    key: 'thanksgiving',
    name: 'Thanksgiving',
    type: 'floating',
    getDate: (y) => nthWeekday(y, 11, 4, 4), // 4th Thursday of November
    chefRelevance: 'high',
    premiumPricing: true,
    categories: ['family', 'seasonal'],
    menuNotes: 'Full feast service — turkey, sides, pies. Family-style. High guest counts.',
    outreachLeadDays: 45,
    outreachHook:
      'Thanksgiving is 6 weeks out — want a private chef so the host can actually enjoy the day?',
  },
  {
    key: 'christmas_eve',
    name: 'Christmas Eve',
    type: 'fixed',
    month: 12,
    day: 24,
    chefRelevance: 'high',
    premiumPricing: true,
    categories: ['family', 'religious', 'seasonal'],
    menuNotes:
      'Elegant family dinner — prime rib, standing rib roast, seafood for Italian traditions.',
    outreachLeadDays: 45,
    outreachHook:
      'Christmas Eve is a special night — want a private chef to handle the feast this year?',
  },
  {
    key: 'christmas_day',
    name: 'Christmas Day',
    type: 'fixed',
    month: 12,
    day: 25,
    chefRelevance: 'high',
    premiumPricing: true,
    categories: ['family', 'religious', 'seasonal'],
    menuNotes: 'Christmas brunch or dinner. Relaxed luxury — let the family enjoy the day.',
    outreachLeadDays: 45,
    outreachHook: 'Want to actually enjoy Christmas this year instead of cooking all day?',
  },
  {
    key: 'new_years_eve',
    name: "New Year's Eve",
    type: 'fixed',
    month: 12,
    day: 31,
    chefRelevance: 'high',
    premiumPricing: true,
    categories: ['social', 'seasonal'],
    menuNotes: 'Tasting menu or passed apps + dinner. Champagne pairings. Late service.',
    outreachLeadDays: 45,
    outreachHook:
      'NYE is filling up fast — only a few dates left. Want to host a private celebration?',
  },
  {
    key: 'passover',
    name: 'Passover (First Seder)',
    type: 'floating',
    // Approximate: 15 Nisan. Rough approximation — varies by Jewish calendar.
    // We use a lookup table for accuracy through 2035
    getDate: (y) => {
      const seders: Record<number, [number, number]> = {
        2024: [4, 22],
        2025: [4, 12],
        2026: [4, 1],
        2027: [4, 21],
        2028: [4, 10],
        2029: [3, 29],
        2030: [4, 17],
        2031: [4, 7],
        2032: [3, 27],
        2033: [4, 14],
        2034: [4, 3],
        2035: [4, 23],
      }
      const entry = seders[y]
      if (entry) return new Date(y, entry[0] - 1, entry[1])
      // Rough fallback: mid-April
      return new Date(y, 3, 15)
    },
    chefRelevance: 'high',
    premiumPricing: false,
    categories: ['religious', 'family'],
    menuNotes:
      'Seder plate must be kosher-style. Matzo, brisket, roasted chicken, tzimmes, gefilte fish.',
    outreachLeadDays: 35,
    outreachHook:
      'Passover Seder is coming — want a private chef to handle the feast while you lead the Haggadah?',
  },
  {
    key: 'yom_kippur_break_fast',
    name: 'Yom Kippur Break-the-Fast',
    type: 'floating',
    getDate: (y) => {
      const dates: Record<number, [number, number]> = {
        2024: [10, 11],
        2025: [10, 1],
        2026: [9, 20],
        2027: [10, 10],
        2028: [9, 28],
        2029: [9, 17],
        2030: [10, 6],
        2031: [9, 25],
        2032: [9, 13],
        2033: [10, 2],
        2034: [9, 22],
        2035: [10, 11],
      }
      const entry = dates[y]
      if (entry) return new Date(y, entry[0] - 1, entry[1])
      return new Date(y, 9, 5)
    },
    chefRelevance: 'high',
    premiumPricing: false,
    categories: ['religious', 'family', 'social'],
    menuNotes:
      'Buffet of bagels, lox, whitefish, kugel, rugelach. Light, no-meat-mixing (often dairy).',
    outreachLeadDays: 28,
    outreachHook:
      'Break-the-Fast is one of the most catered events of the year — want a chef to handle it?',
  },
  {
    key: 'fathers_day',
    name: "Father's Day",
    type: 'floating',
    getDate: (y) => nthWeekday(y, 6, 0, 3), // 3rd Sunday of June
    chefRelevance: 'high',
    premiumPricing: false,
    categories: ['family'],
    menuNotes: 'Backyard BBQ elevated or steakhouse-style dinner at home.',
    outreachLeadDays: 21,
    outreachHook:
      "Father's Day is coming up — a private chef BBQ or steak dinner at home is unforgettable.",
  },
  {
    key: 'super_bowl',
    name: 'Super Bowl Sunday',
    type: 'floating',
    getDate: (y) => {
      // First Sunday of February
      return nthWeekday(y, 2, 0, 1)
    },
    chefRelevance: 'high',
    premiumPricing: false,
    categories: ['social', 'seasonal'],
    menuNotes: 'Party food elevated — wings, sliders, dips, nacho bar, loaded apps. Crowd-pleaser.',
    outreachLeadDays: 21,
    outreachHook:
      'Super Bowl party coming up? Skip the pizza delivery — a private chef makes the spread unforgettable.',
  },
  {
    key: 'new_years_day',
    name: "New Year's Day",
    type: 'fixed',
    month: 1,
    day: 1,
    chefRelevance: 'high',
    premiumPricing: false,
    categories: ['family', 'social'],
    menuNotes: 'Hangover brunch or black-eyed peas tradition. Hearty, restorative.',
    outreachLeadDays: 14,
    outreachHook: "Start the New Year right — a private New Year's Day brunch sets the tone.",
  },

  // ─── MEDIUM RELEVANCE ──────────────────────────────────────────────────────

  {
    key: 'easter',
    name: 'Easter',
    type: 'floating',
    getDate: (y) => {
      // Anonymous Gregorian algorithm
      const a = y % 19
      const b = Math.floor(y / 100)
      const c = y % 100
      const d = Math.floor(b / 4)
      const e = b % 4
      const f = Math.floor((b + 8) / 25)
      const g = Math.floor((b - f + 1) / 3)
      const h = (19 * a + b - d - g + 15) % 30
      const i = Math.floor(c / 4)
      const k = c % 4
      const l = (32 + 2 * e + 2 * i - h - k) % 7
      const m = Math.floor((a + 11 * h + 22 * l) / 451)
      const month = Math.floor((h + l - 7 * m + 114) / 31)
      const day = ((h + l - 7 * m + 114) % 31) + 1
      return new Date(y, month - 1, day)
    },
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['religious', 'family'],
    menuNotes: 'Easter brunch or lamb dinner. Ham, deviled eggs, spring salads, hot cross buns.',
    outreachLeadDays: 21,
    outreachHook:
      'Easter Sunday brunch or dinner at home — want a private chef so everyone can relax?',
  },
  {
    key: 'hanukkah',
    name: 'Hanukkah (First Night)',
    type: 'floating',
    getDate: (y) => {
      const dates: Record<number, [number, number]> = {
        2024: [12, 25],
        2025: [12, 14],
        2026: [12, 4],
        2027: [12, 24],
        2028: [12, 12],
        2029: [12, 1],
        2030: [12, 20],
        2031: [12, 9],
        2032: [11, 28],
        2033: [12, 17],
        2034: [12, 6],
        2035: [12, 25],
      }
      const entry = dates[y]
      if (entry) return new Date(y, entry[0] - 1, entry[1])
      return new Date(y, 11, 10)
    },
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['religious', 'family'],
    menuNotes: 'Latkes, brisket, sufganiyot, rugelach. Family gathering, multiple nights.',
    outreachLeadDays: 28,
    outreachHook: 'Hanukkah is around the corner — a festive private dinner for the whole family?',
  },
  {
    key: 'mardi_gras',
    name: 'Mardi Gras / Fat Tuesday',
    type: 'floating',
    getDate: (y) => {
      // 47 days before Easter
      const easter = (() => {
        const a = y % 19,
          b = Math.floor(y / 100),
          c = y % 100
        const d = Math.floor(b / 4),
          e = b % 4,
          f = Math.floor((b + 8) / 25)
        const g = Math.floor((b - f + 1) / 3),
          h = (19 * a + b - d - g + 15) % 30
        const i = Math.floor(c / 4),
          k = c % 4,
          l = (32 + 2 * e + 2 * i - h - k) % 7
        const m = Math.floor((a + 11 * h + 22 * l) / 451)
        const month = Math.floor((h + l - 7 * m + 114) / 31)
        const day = ((h + l - 7 * m + 114) % 31) + 1
        return new Date(y, month - 1, day)
      })()
      const date = new Date(easter)
      date.setDate(easter.getDate() - 47)
      return date
    },
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['cultural', 'social'],
    menuNotes: 'Cajun feast — gumbo, jambalaya, crawfish étouffée, beignets, king cake.',
    outreachLeadDays: 14,
    outreachHook: 'Mardi Gras is the perfect excuse for a Cajun dinner party — interested?',
  },
  {
    key: 'fourth_of_july',
    name: 'Fourth of July',
    type: 'fixed',
    month: 7,
    day: 4,
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['seasonal', 'social'],
    menuNotes: 'Elevated backyard BBQ or cookout. American classics upgraded.',
    outreachLeadDays: 28,
    outreachHook:
      'Fourth of July cookout — want a private chef to handle the food so you actually enjoy the holiday?',
  },
  {
    key: 'labor_day',
    name: 'Labor Day',
    type: 'floating',
    getDate: (y) => nthWeekday(y, 9, 1, 1), // 1st Monday of September
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['seasonal', 'social'],
    menuNotes: 'End-of-summer cookout. Last big outdoor event of the season.',
    outreachLeadDays: 21,
    outreachHook:
      "Labor Day weekend — one last big summer gathering? Let's plan a private cookout.",
  },
  {
    key: 'memorial_day',
    name: 'Memorial Day',
    type: 'floating',
    getDate: (y) => lastWeekday(y, 5, 1), // Last Monday of May
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['seasonal', 'social'],
    menuNotes: 'Kickoff to summer cookout. Grilling, sides, fresh salads, seasonal fruits.',
    outreachLeadDays: 21,
    outreachHook:
      'Memorial Day weekend kicks off summer — private cookout or backyard dinner party?',
  },
  {
    key: 'halloween',
    name: 'Halloween',
    type: 'fixed',
    month: 10,
    day: 31,
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['social', 'seasonal'],
    menuNotes: 'Themed dinner party or spooky apps. Great for adult Halloween parties.',
    outreachLeadDays: 21,
    outreachHook:
      'Adult Halloween dinner party with a private chef — spooky menu, no plastic trays.',
  },
  {
    key: 'lunar_new_year',
    name: 'Lunar New Year',
    type: 'floating',
    getDate: (y) => {
      // Approximate — varies by lunar calendar. Best-effort lookup.
      const dates: Record<number, [number, number]> = {
        2024: [2, 10],
        2025: [1, 29],
        2026: [2, 17],
        2027: [2, 6],
        2028: [1, 26],
        2029: [2, 13],
        2030: [2, 3],
        2031: [1, 23],
        2032: [2, 11],
        2033: [1, 31],
        2034: [2, 19],
        2035: [2, 8],
      }
      const entry = dates[y]
      if (entry) return new Date(y, entry[0] - 1, entry[1])
      return new Date(y, 1, 5)
    },
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['cultural', 'family'],
    menuNotes: 'Multi-course family feast — dumplings, whole fish, noodles, red envelope theme.',
    outreachLeadDays: 21,
    outreachHook:
      'Lunar New Year family feast — a private chef handles all 12 courses while you celebrate.',
  },
  {
    key: 'graduation_season',
    name: 'Graduation Season',
    type: 'fixed',
    month: 6,
    day: 1, // Representative mid-point; outreach covers May–June window
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['family', 'social'],
    menuNotes:
      'Celebration dinner or backyard party. Crowd-pleaser menus, often high guest counts.',
    outreachLeadDays: 35,
    outreachHook:
      'Graduation parties are booking fast — is there a graduate in the family to celebrate?',
  },
  {
    key: 'diwali',
    name: 'Diwali',
    type: 'floating',
    getDate: (y) => {
      const dates: Record<number, [number, number]> = {
        2024: [11, 1],
        2025: [10, 20],
        2026: [11, 8],
        2027: [10, 29],
        2028: [10, 17],
        2029: [11, 5],
        2030: [10, 26],
        2031: [10, 15],
        2032: [11, 2],
        2033: [10, 22],
        2034: [11, 10],
        2035: [10, 30],
      }
      const entry = dates[y]
      if (entry) return new Date(y, entry[0] - 1, entry[1])
      return new Date(y, 10, 1)
    },
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['religious', 'cultural', 'family'],
    menuNotes: 'Indian festive feast — samosas, biryani, paneer dishes, kheer, mithai sweets.',
    outreachLeadDays: 21,
    outreachHook:
      'Diwali celebration dinner — a private chef handles the festive feast while you celebrate.',
  },
  {
    key: 'eid_al_fitr',
    name: 'Eid al-Fitr',
    type: 'floating',
    getDate: (y) => {
      // End of Ramadan — approximate
      const dates: Record<number, [number, number]> = {
        2024: [4, 10],
        2025: [3, 30],
        2026: [3, 20],
        2027: [3, 9],
        2028: [2, 26],
        2029: [2, 14],
        2030: [2, 4],
        2031: [1, 24],
        2032: [1, 14],
        2033: [1, 2],
        2034: [12, 23],
        2035: [12, 12],
      }
      const entry = dates[y]
      if (entry) return new Date(y, entry[0] - 1, entry[1])
      return new Date(y, 3, 10)
    },
    chefRelevance: 'medium',
    premiumPricing: false,
    categories: ['religious', 'family', 'cultural'],
    menuNotes: 'Halal feast — lamb, rice dishes, pastries, dates, sweets. Large family gathering.',
    outreachLeadDays: 21,
    outreachHook: 'Eid feast — a private halal chef for the family celebration.',
  },

  // ─── LOWER RELEVANCE (still bookable) ─────────────────────────────────────

  {
    key: 'st_patricks_day',
    name: "St. Patrick's Day",
    type: 'fixed',
    month: 3,
    day: 17,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural', 'social'],
    menuNotes: 'Irish-themed dinner — corned beef, lamb stew, soda bread, Guinness desserts.',
    outreachLeadDays: 14,
    outreachHook: "St. Patrick's Day dinner party — Irish feast at home instead of crowded bars.",
  },
  {
    key: 'cinco_de_mayo',
    name: 'Cinco de Mayo',
    type: 'fixed',
    month: 5,
    day: 5,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural', 'social'],
    menuNotes: 'Mexican feast — tacos, tamales, mole, margaritas, churros.',
    outreachLeadDays: 14,
    outreachHook: 'Cinco de Mayo — private Mexican feast for a party, skip the restaurant crowds.',
  },
  {
    key: 'kentucky_derby',
    name: 'Kentucky Derby',
    type: 'floating',
    getDate: (y) => nthWeekday(y, 5, 6, 1), // 1st Saturday of May
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['social', 'seasonal'],
    menuNotes: 'Derby party food — hot browns, bourbon apps, mint juleps, bourbon pie.',
    outreachLeadDays: 14,
    outreachHook: 'Kentucky Derby watch party with a proper bourbon menu — interested?',
  },
  {
    key: 'oktoberfest',
    name: 'Oktoberfest',
    type: 'fixed',
    month: 10,
    day: 3, // Traditional peak weekend — first Saturday of October used as proxy
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural', 'social'],
    menuNotes: 'German feast — pretzels, schnitzel, bratwurst, spaetzle, strudel, beer pairings.',
    outreachLeadDays: 14,
    outreachHook: 'Oktoberfest dinner party — authentic German feast at home.',
  },
  {
    key: 'galentines_day',
    name: "Galentine's Day",
    type: 'fixed',
    month: 2,
    day: 13,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['social', 'romantic'],
    menuNotes: 'Fun brunch or dinner for groups of women — bubbly, small plates, dessert spread.',
    outreachLeadDays: 14,
    outreachHook: "Galentine's Day brunch with the girls — private chef handles everything.",
  },
  {
    key: 'juneteenth',
    name: 'Juneteenth',
    type: 'fixed',
    month: 6,
    day: 19,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural', 'family'],
    menuNotes:
      'Celebration cookout or soul food feast — BBQ, red foods tradition, strawberry soda.',
    outreachLeadDays: 14,
    outreachHook: 'Juneteenth celebration feast — soul food or BBQ for the whole family.',
  },
  {
    key: 'rosh_hashanah',
    name: 'Rosh Hashanah',
    type: 'floating',
    getDate: (y) => {
      const dates: Record<number, [number, number]> = {
        2024: [10, 2],
        2025: [9, 22],
        2026: [9, 11],
        2027: [10, 1],
        2028: [9, 20],
        2029: [9, 9],
        2030: [9, 27],
        2031: [9, 17],
        2032: [9, 5],
        2033: [9, 24],
        2034: [9, 14],
        2035: [10, 3],
      }
      const entry = dates[y]
      if (entry) return new Date(y, entry[0] - 1, entry[1])
      return new Date(y, 8, 20)
    },
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['religious', 'family'],
    menuNotes: 'Jewish New Year dinner — brisket, apples with honey, round challah, tzimmes.',
    outreachLeadDays: 21,
    outreachHook: 'Rosh Hashanah dinner — let a private chef handle the New Year feast.',
  },
  {
    key: 'kwanzaa',
    name: 'Kwanzaa',
    type: 'fixed',
    month: 12,
    day: 26,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural', 'family'],
    menuNotes:
      'Pan-African celebration feast — soul food, African-inspired dishes, communal style.',
    outreachLeadDays: 14,
    outreachHook: 'Kwanzaa celebration feast — communal dinner with cultural dishes.',
  },
  {
    key: 'nowruz',
    name: 'Nowruz (Persian New Year)',
    type: 'fixed',
    month: 3,
    day: 20,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural', 'family'],
    menuNotes:
      'Persian New Year feast — Sabzi Polo Mahi (herb rice with fish), Ash Reshteh, sweets.',
    outreachLeadDays: 14,
    outreachHook: 'Nowruz celebration — authentic Persian New Year feast at home.',
  },
  {
    key: 'dia_de_los_muertos',
    name: 'Día de los Muertos',
    type: 'fixed',
    month: 11,
    day: 2,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural'],
    menuNotes:
      'Mexican cultural celebration — tamales, pan de muerto, mole, marigold-themed sweets.',
    outreachLeadDays: 14,
    outreachHook: 'Día de los Muertos dinner — cultural feast and celebration.',
  },
  {
    key: 'three_kings_day',
    name: 'Three Kings Day / Epiphany',
    type: 'fixed',
    month: 1,
    day: 6,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['religious', 'cultural', 'family'],
    menuNotes:
      'Rosca de Reyes (King cake), traditional feast. Big in Latino and some European traditions.',
    outreachLeadDays: 14,
    outreachHook: 'Three Kings Day celebration — traditional feast with family.',
  },
  {
    key: 'oscar_night',
    name: 'Oscar Night Dinner Party',
    type: 'floating',
    // Oscars are typically the last Sunday of February or first Sunday of March
    getDate: (y) => {
      // Approximate: last Sunday of February
      return lastWeekday(y, 2, 0)
    },
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['social'],
    menuNotes:
      'Elegant dinner party timed to the ceremony — small plates, passed apps, viewing menu.',
    outreachLeadDays: 14,
    outreachHook: 'Oscar night dinner party — elegant small plates while you watch the ceremony.',
  },
  {
    key: 'bastille_day',
    name: 'Bastille Day',
    type: 'fixed',
    month: 7,
    day: 14,
    chefRelevance: 'low',
    premiumPricing: false,
    categories: ['cultural', 'social'],
    menuNotes: 'French-themed dinner — bouillabaisse, duck confit, baguettes, crème brûlée.',
    outreachLeadDays: 14,
    outreachHook: 'Bastille Day French dinner party — bring Paris to the table.',
  },
]

/** Quick lookup by key */
export const HOLIDAY_BY_KEY = Object.fromEntries(HOLIDAYS.map((h) => [h.key, h]))
