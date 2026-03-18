// REST Countries - free country data API, no key required
// https://restcountries.com/
// No signup, no limits
// Useful for international client forms, phone codes, currency info

const REST_COUNTRIES_BASE = 'https://restcountries.com/v3.1'

export interface Country {
  name: string
  officialName: string
  code: string // ISO 3166-1 alpha-2 (e.g. "US")
  code3: string // ISO 3166-1 alpha-3 (e.g. "USA")
  flag: string // Flag emoji (e.g. "🇺🇸")
  flagSvg: string // Flag SVG URL
  currencies: { code: string; name: string; symbol: string }[]
  languages: string[]
  callingCodes: string[] // e.g. ["+1"]
  capital: string | null
  region: string
  subregion: string
  timezone: string[]
  population: number
}

/**
 * Get all countries - cached heavily, data rarely changes.
 * Useful for populating country dropdowns on client forms.
 */
export async function getAllCountries(): Promise<Country[]> {
  try {
    const res = await fetch(
      `${REST_COUNTRIES_BASE}/all?fields=name,cca2,cca3,flag,flags,currencies,languages,idd,capital,region,subregion,timezones,population`,
      { next: { revalidate: 86400 * 30 } } // cache 30 days
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.map(mapCountry).sort((a: Country, b: Country) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

/**
 * Get a single country by its 2-letter code.
 * e.g. "US", "FR", "JP"
 */
export async function getCountryByCode(code: string): Promise<Country | null> {
  try {
    const res = await fetch(
      `${REST_COUNTRIES_BASE}/alpha/${code}?fields=name,cca2,cca3,flag,flags,currencies,languages,idd,capital,region,subregion,timezones,population`,
      { next: { revalidate: 86400 * 30 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return mapCountry(data)
  } catch {
    return null
  }
}

/**
 * Search countries by name.
 * e.g. "france", "united states", "brazil"
 */
export async function searchCountries(query: string): Promise<Country[]> {
  try {
    const res = await fetch(
      `${REST_COUNTRIES_BASE}/name/${encodeURIComponent(query)}?fields=name,cca2,cca3,flag,flags,currencies,languages,idd,capital,region,subregion,timezones,population`,
      { next: { revalidate: 86400 * 30 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.map(mapCountry)
  } catch {
    return []
  }
}

/**
 * Get the calling code for a country.
 * e.g. "US" → "+1", "FR" → "+33"
 */
export async function getCallingCode(countryCode: string): Promise<string | null> {
  const country = await getCountryByCode(countryCode)
  return country?.callingCodes[0] ?? null
}

function mapCountry(raw: any): Country {
  const currencies = Object.entries(raw.currencies ?? {}).map(([code, info]: [string, any]) => ({
    code,
    name: info.name ?? '',
    symbol: info.symbol ?? '',
  }))

  const languages = Object.values(raw.languages ?? {}) as string[]

  const callingCodes: string[] = []
  if (raw.idd?.root) {
    const root = raw.idd.root
    const suffixes = raw.idd.suffixes ?? ['']
    for (const suffix of suffixes) {
      callingCodes.push(`${root}${suffix}`)
    }
  }

  return {
    name: raw.name?.common ?? '',
    officialName: raw.name?.official ?? '',
    code: raw.cca2 ?? '',
    code3: raw.cca3 ?? '',
    flag: raw.flag ?? '',
    flagSvg: raw.flags?.svg ?? '',
    currencies,
    languages,
    callingCodes: callingCodes.slice(0, 3), // some countries have many
    capital: raw.capital?.[0] ?? null,
    region: raw.region ?? '',
    subregion: raw.subregion ?? '',
    timezone: raw.timezones ?? [],
    population: raw.population ?? 0,
  }
}
