// US Holiday Utility
// Pure client-side date math — no server, no DB, no external imports.
// Returns FullCalendar-compatible event objects for all major US holidays.

export interface HolidayEvent {
  id: string
  title: string
  start: string // YYYY-MM-DD
  allDay: true
  display: 'list-item'
  editable: false
  classNames: ['cf-holiday']
  extendedProps: {
    dayType: 'holiday'
    holidayType: 'federal' | 'cultural'
  }
}

// ─── Date Math Helpers ────────────────────────────────────────────────────────

/** Pad a number to 2 digits */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a Date as YYYY-MM-DD (local time, no timezone shift) */
function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * nth occurrence of a weekday in a month.
 * weekday: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 * n: 1-indexed (1=first, 2=second, etc.)
 */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const d = new Date(year, month - 1, 1)
  const diff = (weekday - d.getDay() + 7) % 7
  d.setDate(1 + diff + (n - 1) * 7)
  return d
}

/**
 * Last occurrence of a weekday in a month.
 * weekday: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
function lastWeekday(year: number, month: number, weekday: number): Date {
  // Start from the last day of the month and walk backwards
  const d = new Date(year, month, 0) // last day of month
  const diff = (d.getDay() - weekday + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

/**
 * Easter Sunday (Gregorian algorithm — Anonymous / Meeus / Jones / Butcher)
 */
function easterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
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
  return new Date(year, month - 1, day)
}

/** Add days to a date */
function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

// ─── Holiday Builder ──────────────────────────────────────────────────────────

function holiday(dateStr: string, name: string, type: 'federal' | 'cultural'): HolidayEvent {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    id: `holiday-${dateStr}-${slug}`,
    title: name,
    start: dateStr,
    allDay: true,
    display: 'list-item',
    editable: false,
    classNames: ['cf-holiday'],
    extendedProps: {
      dayType: 'holiday',
      holidayType: type,
    },
  }
}

// ─── Holidays for a Given Year ────────────────────────────────────────────────

function getUSHolidaysForYear(year: number): HolidayEvent[] {
  const easter = easterDate(year)
  const thanksgiving = nthWeekday(year, 11, 4, 4) // 4th Thursday of November

  // Ash Wednesday = 46 days before Easter; Mardi Gras = day before Ash Wednesday = 47 days before
  const mardiGras = addDays(easter, -47)
  const goodFriday = addDays(easter, -2)
  const blackFriday = addDays(thanksgiving, 1)

  return [
    // ── January ──────────────────────────────────────────────────────────────
    holiday(`${year}-01-01`, "New Year's Day", 'federal'),
    holiday(fmt(nthWeekday(year, 1, 1, 3)), 'MLK Day', 'federal'),

    // ── February ─────────────────────────────────────────────────────────────
    holiday(`${year}-02-02`, 'Groundhog Day', 'cultural'),
    holiday(`${year}-02-14`, "Valentine's Day", 'cultural'),
    holiday(fmt(nthWeekday(year, 2, 1, 3)), "Presidents' Day", 'federal'),

    // ── February / March (Easter-relative) ───────────────────────────────────
    holiday(fmt(mardiGras), 'Mardi Gras', 'cultural'),
    holiday(`${year}-03-17`, "St. Patrick's Day", 'cultural'),

    // ── March / April (Easter-relative) ──────────────────────────────────────
    holiday(fmt(goodFriday), 'Good Friday', 'cultural'),
    holiday(fmt(easter), 'Easter', 'cultural'),

    // ── April / May ───────────────────────────────────────────────────────────
    holiday(`${year}-05-05`, 'Cinco de Mayo', 'cultural'),
    holiday(fmt(nthWeekday(year, 5, 0, 2)), "Mother's Day", 'cultural'),
    holiday(fmt(lastWeekday(year, 5, 1)), 'Memorial Day', 'federal'),

    // ── June ─────────────────────────────────────────────────────────────────
    holiday(`${year}-06-19`, 'Juneteenth', 'federal'),
    holiday(fmt(nthWeekday(year, 6, 0, 3)), "Father's Day", 'cultural'),

    // ── July ─────────────────────────────────────────────────────────────────
    holiday(`${year}-07-04`, 'Independence Day', 'federal'),

    // ── September ────────────────────────────────────────────────────────────
    holiday(fmt(nthWeekday(year, 9, 1, 1)), 'Labor Day', 'federal'),

    // ── October ──────────────────────────────────────────────────────────────
    holiday(fmt(nthWeekday(year, 10, 1, 2)), 'Columbus Day', 'federal'),
    holiday(`${year}-10-31`, 'Halloween', 'cultural'),

    // ── November ─────────────────────────────────────────────────────────────
    holiday(`${year}-11-11`, 'Veterans Day', 'federal'),
    holiday(fmt(thanksgiving), 'Thanksgiving', 'federal'),
    holiday(fmt(blackFriday), 'Black Friday', 'cultural'),

    // ── December ─────────────────────────────────────────────────────────────
    holiday(`${year}-12-24`, 'Christmas Eve', 'cultural'),
    holiday(`${year}-12-25`, 'Christmas', 'federal'),
    holiday(`${year}-12-31`, "New Year's Eve", 'cultural'),
  ]
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all US holidays that fall within the given date range (inclusive).
 * start / end: YYYY-MM-DD strings
 */
export function getUSHolidaysInRange(start: string, end: string): HolidayEvent[] {
  const startYear = parseInt(start.slice(0, 4), 10)
  const endYear = parseInt(end.slice(0, 4), 10)

  const all: HolidayEvent[] = []
  for (let year = startYear; year <= endYear; year++) {
    all.push(...getUSHolidaysForYear(year))
  }

  return all.filter((h) => h.start >= start && h.start <= end)
}
