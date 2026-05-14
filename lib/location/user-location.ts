export const USER_LOCATION_STORAGE_KEY = 'chefflow.user-location'
export const USER_LOCATION_COOKIE = 'cf-loc'
export const USER_LOCATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export type SavedLocation = {
  query: string
  city: string | null
  state: string | null
  zip: string | null
  lat: number
  lng: number
  displayLabel: string
  savedAt: string
}
