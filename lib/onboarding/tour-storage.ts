import type { TourConfig } from '@/lib/onboarding/tour-config'

type TourRole = TourConfig['role']

const LEGACY_KEYS = {
  welcomeSeen: 'chefflow:welcome-seen',
  tourActive: 'chefflow:tour-active',
  tourStep: 'chefflow:tour-step',
} as const

export function getTourStorageKeys(role: TourRole) {
  return {
    welcomeSeen: `chefflow:welcome-seen:${role}`,
    tourActive: `chefflow:tour-active:${role}`,
    tourStep: `chefflow:tour-step:${role}`,
  } as const
}

export function clearTourStorageForRole(role: TourRole, storage: Storage) {
  const keys = getTourStorageKeys(role)
  storage.removeItem(keys.welcomeSeen)
  storage.removeItem(keys.tourActive)
  storage.removeItem(keys.tourStep)
}

export function clearLegacyTourStorage(storage: Storage) {
  storage.removeItem(LEGACY_KEYS.welcomeSeen)
  storage.removeItem(LEGACY_KEYS.tourActive)
  storage.removeItem(LEGACY_KEYS.tourStep)
}

export function isAnyTourActiveInStorage(storage: Storage) {
  if (storage.getItem(LEGACY_KEYS.tourActive) === '1') return true

  for (let idx = 0; idx < storage.length; idx += 1) {
    const key = storage.key(idx)
    if (!key) continue
    if (!key.startsWith('chefflow:tour-active:')) continue
    if (storage.getItem(key) === '1') return true
  }

  return false
}
