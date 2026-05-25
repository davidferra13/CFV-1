const STORAGE_KEY = 'cf:dash-snooze'
export const SNOOZE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours
const URGENCY_BUMP_THRESHOLD = 10

type SnoozeEntry = {
  snoozedAt: number
  urgencyAtSnooze: number
}

type SnoozeMap = Record<string, SnoozeEntry>

function readStore(): SnoozeMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SnoozeMap
  } catch {
    return {}
  }
}

function writeStore(store: SnoozeMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage full or unavailable
  }
}

export function snoozeChip(chipId: string, currentUrgency: number): void {
  const store = readStore()
  store[chipId] = { snoozedAt: Date.now(), urgencyAtSnooze: currentUrgency }
  writeStore(store)
}

export function isSnoozed(chipId: string, currentUrgency: number): boolean {
  const store = readStore()
  const entry = store[chipId]
  if (!entry) return false

  const elapsed = Date.now() - entry.snoozedAt
  if (elapsed > SNOOZE_TTL_MS) return false

  const urgencyIncrease = currentUrgency - entry.urgencyAtSnooze
  if (urgencyIncrease >= URGENCY_BUMP_THRESHOLD) return false

  return true
}

export function clearSnooze(chipId: string): void {
  const store = readStore()
  delete store[chipId]
  writeStore(store)
}

export function getSnoozedIds(): string[] {
  return Object.keys(readStore())
}
