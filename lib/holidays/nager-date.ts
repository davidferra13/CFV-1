// Nager.Date — free public holiday API, no key required
// https://date.nager.at/API
// Unlimited requests, 100+ countries

export interface PublicHoliday {
  date: string // YYYY-MM-DD
  localName: string // e.g. "Thanksgiving Day"
  name: string // English name
  countryCode: string // e.g. "US"
  fixed: boolean // Same date every year?
  global: boolean // Nationwide?
  types: string[] // e.g. ["Public"]
}

export interface HolidayCheck {
  isHoliday: boolean
  holiday: PublicHoliday | null
  /** Days until next holiday (0 = today is a holiday) */
  daysUntilNext: number | null
  nextHoliday: PublicHoliday | null
}

/**
 * Get all public holidays for a country + year.
 * Default: US holidays.
 */
export async function getPublicHolidays(
  year: number,
  countryCode = 'US'
): Promise<PublicHoliday[]> {
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { next: { revalidate: 86400 } } // cache 24h — holidays don't change
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/**
 * Check if a specific date is a holiday (or near one).
 * Returns the holiday info + next upcoming holiday.
 */
export async function checkHoliday(date: string | Date, countryCode = 'US'): Promise<HolidayCheck> {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateStr = d.toISOString().slice(0, 10)
  const year = d.getFullYear()

  const holidays = await getPublicHolidays(year, countryCode)

  const match = holidays.find((h) => h.date === dateStr)

  // Find next upcoming holiday
  const upcoming = holidays.filter((h) => h.date > dateStr)
  const nextHoliday = upcoming.length > 0 ? upcoming[0] : null
  const daysUntilNext = nextHoliday
    ? Math.ceil((new Date(nextHoliday.date).getTime() - d.getTime()) / 86_400_000)
    : null

  return {
    isHoliday: !!match,
    holiday: match ?? null,
    daysUntilNext,
    nextHoliday,
  }
}

/**
 * Check if a date falls on a "premium" holiday — dates where private chefs
 * typically charge surge pricing (Thanksgiving, Christmas Eve, NYE, July 4th, etc.)
 */
export async function isPremiumHoliday(
  date: string | Date,
  countryCode = 'US'
): Promise<{ isPremium: boolean; holidayName: string | null }> {
  const { isHoliday, holiday } = await checkHoliday(date, countryCode)

  if (!isHoliday || !holiday) {
    // Also check if it's the day before a major holiday (e.g., Christmas Eve)
    const d = typeof date === 'string' ? new Date(date) : date
    const nextDay = new Date(d.getTime() + 86_400_000)
    const nextCheck = await checkHoliday(nextDay, countryCode)
    if (nextCheck.isHoliday && nextCheck.holiday) {
      const premiumEves = ['Christmas Day', "New Year's Day"]
      if (premiumEves.includes(nextCheck.holiday.name)) {
        return {
          isPremium: true,
          holidayName: `${nextCheck.holiday.name} Eve`,
        }
      }
    }
    return { isPremium: false, holidayName: null }
  }

  // All public holidays are premium for private chefs
  return { isPremium: true, holidayName: holiday.name }
}
