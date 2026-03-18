/**
 * Holiday overlay animation configs for ChefFlow.
 * Maps holiday keys to visual animation settings.
 *
 * OVERLAY_CONFIGS keys match HOLIDAYS[n].key from lib/holidays/constants.ts.
 * EXTRA_HOLIDAYS covers dates not in constants.ts (MLK Day, Groundhog Day, etc.)
 *
 * No 'use server' - this is pure client-side config.
 */

export type AnimationType = 'falling' | 'rising' | 'burst' | 'walk' | 'pulse' | 'sticker'

export interface HolidayOverlayConfig {
  label: string
  emoji: string
  type: AnimationType
  /** Hex color strings for particles */
  colors: string[]
  /** Number of particles (1 for walk/sticker/pulse) */
  count: number
  /** How long the animation plays in ms */
  durationMs: number
}

/** Keys match HOLIDAYS[n].key from lib/holidays/constants.ts */
export const OVERLAY_CONFIGS: Record<string, HolidayOverlayConfig> = {
  new_years_day: {
    label: "New Year's Day",
    emoji: '🥂',
    type: 'burst',
    colors: ['#ffd700', '#ff4444', '#4444ff', '#44ff44', '#ff69b4'],
    count: 80,
    durationMs: 3000,
  },
  lunar_new_year: {
    label: 'Lunar New Year',
    emoji: '🧧',
    type: 'falling',
    colors: ['#cc0000', '#d4af37'],
    count: 20,
    durationMs: 3500,
  },
  super_bowl: {
    label: 'Super Bowl Sunday',
    emoji: '🏈',
    type: 'walk',
    colors: ['#6b4423'],
    count: 1,
    durationMs: 2500,
  },
  galentines_day: {
    label: "Galentine's Day",
    emoji: '💜',
    type: 'rising',
    colors: ['#dda0dd', '#ee82ee', '#da70d6'],
    count: 20,
    durationMs: 3000,
  },
  valentines_day: {
    label: "Valentine's Day",
    emoji: '❤️',
    type: 'rising',
    colors: ['#ff0066', '#ff69b4', '#ff1493', '#ffb6c1'],
    count: 25,
    durationMs: 3000,
  },
  mardi_gras: {
    label: 'Mardi Gras',
    emoji: '🎭',
    type: 'falling',
    colors: ['#7b2d8b', '#009900', '#ffd700'],
    count: 30,
    durationMs: 3000,
  },
  st_patricks_day: {
    label: "St. Patrick's Day",
    emoji: '🍀',
    type: 'falling',
    colors: ['#009900', '#00cc00', '#006600', '#228b22'],
    count: 30,
    durationMs: 3500,
  },
  easter: {
    label: 'Easter',
    emoji: '🐣',
    type: 'walk',
    colors: ['#ffb347', '#87ceeb', '#ff69b4', '#98fb98'],
    count: 5,
    durationMs: 4000,
  },
  cinco_de_mayo: {
    label: 'Cinco de Mayo',
    emoji: '🪅',
    type: 'burst',
    colors: ['#cc0000', '#cccccc', '#006600'],
    count: 60,
    durationMs: 2500,
  },
  mothers_day: {
    label: "Mother's Day",
    emoji: '🌸',
    type: 'rising',
    colors: ['#ff69b4', '#dda0dd', '#ee82ee', '#ffb6c1'],
    count: 25,
    durationMs: 3500,
  },
  memorial_day: {
    label: 'Memorial Day',
    emoji: '⭐',
    type: 'falling',
    colors: ['#cc0000', '#cccccc', '#002868'],
    count: 20,
    durationMs: 3000,
  },
  fathers_day: {
    label: "Father's Day",
    emoji: '👔',
    type: 'walk',
    colors: ['#1a237e'],
    count: 1,
    durationMs: 2500,
  },
  juneteenth: {
    label: 'Juneteenth',
    emoji: '✊',
    type: 'burst',
    colors: ['#cc0000', '#333333', '#009900'],
    count: 60,
    durationMs: 3000,
  },
  fourth_of_july: {
    label: 'Independence Day',
    emoji: '🎆',
    type: 'burst',
    colors: ['#cc0000', '#cccccc', '#002868', '#ffd700'],
    count: 100,
    durationMs: 3500,
  },
  labor_day: {
    label: 'Labor Day',
    emoji: '⚒️',
    type: 'sticker',
    colors: ['#4a4a4a'],
    count: 1,
    durationMs: 3000,
  },
  halloween: {
    label: 'Halloween',
    emoji: '🦇',
    type: 'falling',
    colors: ['#ff6600', '#111111', '#6a0dad'],
    count: 15,
    durationMs: 4000,
  },
  thanksgiving: {
    label: 'Thanksgiving',
    emoji: '🦃',
    type: 'walk',
    colors: ['#8b4513', '#d2691e'],
    count: 1,
    durationMs: 3500,
  },
  hanukkah: {
    label: 'Hanukkah',
    emoji: '✨',
    type: 'falling',
    colors: ['#002868', '#d4af37', '#87ceeb'],
    count: 20,
    durationMs: 4000,
  },
  christmas_eve: {
    label: 'Christmas Eve',
    emoji: '🕯️',
    type: 'pulse',
    colors: ['#ffd700', '#ff8c00'],
    count: 1,
    durationMs: 3500,
  },
  christmas_day: {
    label: 'Christmas',
    emoji: '❄️',
    type: 'falling',
    colors: ['#ffffff', '#e0f7fa', '#b3e5fc', '#cceeff'],
    count: 60,
    durationMs: 4000,
  },
  new_years_eve: {
    label: "New Year's Eve",
    emoji: '🎉',
    type: 'burst',
    colors: ['#ffd700', '#ff4444', '#4444ff', '#ff69b4', '#44ff44'],
    count: 100,
    durationMs: 4000,
  },
}

// ---------------------------------------------------------------------------
// Extra holidays - not in lib/holidays/constants.ts
// Date computation is self-contained here.
// ---------------------------------------------------------------------------

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  // month: 1-based. weekday: 0=Sun, 1=Mon … 6=Sat
  const first = new Date(year, month - 1, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  return new Date(year, month - 1, 1 + offset + (n - 1) * 7)
}

function easterSunday(year: number): Date {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100
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
  return new Date(year, month - 1, day)
}

export interface ExtraHoliday extends HolidayOverlayConfig {
  key: string
  getDate: (year: number) => Date
}

export const EXTRA_HOLIDAYS: ExtraHoliday[] = [
  {
    key: 'mlk_day',
    label: 'MLK Day',
    emoji: '🕊️',
    type: 'sticker',
    colors: ['#d4af37'],
    count: 1,
    durationMs: 4000,
    getDate: (y) => nthWeekday(y, 1, 1, 3), // 3rd Monday of January
  },
  {
    key: 'groundhog_day',
    label: 'Groundhog Day',
    emoji: '🐾',
    type: 'walk',
    colors: ['#8b6914'],
    count: 1,
    durationMs: 3000,
    getDate: (y) => new Date(y, 1, 2), // Feb 2
  },
  {
    key: 'presidents_day',
    label: "Presidents' Day",
    emoji: '⭐',
    type: 'burst',
    colors: ['#cc0000', '#cccccc', '#002868'],
    count: 40,
    durationMs: 2500,
    getDate: (y) => nthWeekday(y, 2, 1, 3), // 3rd Monday of February
  },
  {
    key: 'april_fools',
    label: "April Fools' Day",
    emoji: '🤡',
    type: 'sticker',
    colors: ['#ff4444'],
    count: 1,
    durationMs: 4500,
    getDate: (y) => new Date(y, 3, 1), // April 1
  },
  {
    key: 'good_friday',
    label: 'Good Friday',
    emoji: '✝️',
    type: 'pulse',
    colors: ['#444444'],
    count: 1,
    durationMs: 3000,
    getDate: (y) => {
      const e = easterSunday(y)
      const d = new Date(e)
      d.setDate(e.getDate() - 2)
      return d
    },
  },
  {
    key: 'earth_day',
    label: 'Earth Day',
    emoji: '🌿',
    type: 'falling',
    colors: ['#228b22', '#32cd32', '#006400', '#3cb371'],
    count: 25,
    durationMs: 4000,
    getDate: (y) => new Date(y, 3, 22), // April 22
  },
  {
    key: 'columbus_day',
    label: 'Columbus Day',
    emoji: '🧭',
    type: 'sticker',
    colors: ['#8b4513'],
    count: 1,
    durationMs: 2500,
    getDate: (y) => nthWeekday(y, 10, 1, 2), // 2nd Monday of October
  },
  {
    key: 'election_day',
    label: 'Election Day',
    emoji: '🗳️',
    type: 'sticker',
    colors: ['#cc0000', '#002868'],
    count: 1,
    durationMs: 3500,
    getDate: (y) => {
      // First Tuesday after first Monday in November
      const firstMon = nthWeekday(y, 11, 1, 1)
      const tue = new Date(firstMon)
      tue.setDate(firstMon.getDate() + 1)
      return tue
    },
  },
  {
    key: 'veterans_day',
    label: 'Veterans Day',
    emoji: '🎗️',
    type: 'falling',
    colors: ['#cc0000', '#8b0000', '#ffcccc'],
    count: 20,
    durationMs: 4000,
    getDate: (y) => new Date(y, 10, 11), // November 11
  },
  {
    key: 'thanksgiving_eve',
    label: 'Thanksgiving Eve',
    emoji: '🍺',
    type: 'sticker',
    colors: ['#d4a017'],
    count: 1,
    durationMs: 3000,
    getDate: (y) => {
      // Wednesday before 4th Thursday of November
      const thu = nthWeekday(y, 11, 4, 4)
      const wed = new Date(thu)
      wed.setDate(thu.getDate() - 1)
      return wed
    },
  },
]
