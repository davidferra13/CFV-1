'use server'

// Server actions for IP geolocation and country data
// Wraps IP-API and REST Countries utilities for use in client components

import { getGeoFromIp, getClientIp } from '@/lib/geo/ip-api'
import { getCountryByCode } from '@/lib/geo/rest-countries'
import { headers } from 'next/headers'

export type DetectedLocation = {
  city: string
  region: string
  regionName: string
  country: string
  countryCode: string
  timezone: string
  currency: string
  zip: string
}

/**
 * Detect the current user's location from their IP address.
 * Returns null if detection fails (e.g., local dev, VPN, rate limit).
 * Non-blocking - callers should handle null gracefully.
 */
export async function detectMyLocation(): Promise<DetectedLocation | null> {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    if (!ip) return null

    const geo = await getGeoFromIp(ip)
    if (!geo) return null

    return {
      city: geo.city,
      region: geo.region,
      regionName: geo.regionName,
      country: geo.country,
      countryCode: geo.countryCode,
      timezone: geo.timezone,
      currency: geo.currency,
      zip: geo.zip,
    }
  } catch (err) {
    console.error('[non-blocking] IP geolocation failed:', err)
    return null
  }
}

export type CountryDetails = {
  name: string
  flag: string
  currencies: { code: string; name: string; symbol: string }[]
  languages: string[]
  callingCodes: string[]
  timezone: string[]
  capital: string | null
}

/**
 * Get enriched country details from a 2-letter country code.
 * Useful for showing client's local currency, timezone, etc.
 * Non-blocking - returns null on failure.
 */
export async function getCountryDetails(countryCode: string): Promise<CountryDetails | null> {
  try {
    if (!countryCode || countryCode.length !== 2) return null

    const country = await getCountryByCode(countryCode.toUpperCase())
    if (!country) return null

    return {
      name: country.name,
      flag: country.flag,
      currencies: country.currencies,
      languages: country.languages,
      callingCodes: country.callingCodes,
      timezone: country.timezone,
      capital: country.capital,
    }
  } catch (err) {
    console.error('[non-blocking] Country lookup failed:', err)
    return null
  }
}
