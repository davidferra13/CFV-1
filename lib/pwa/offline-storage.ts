/**
 * Offline storage for recipes and shopping lists using IndexedDB.
 * Provides structured offline data access so chefs can view recipes
 * and shopping lists without connectivity (market, kitchen, etc.).
 *
 * Uses a thin wrapper around IndexedDB. No external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedRecipe {
  id: string
  name: string
  description: string | null
  servings: number | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  ingredients: Array<{
    name: string
    quantity: string | null
    unit: string | null
  }>
  instructions: string | null
  cachedAt: string
}

export interface CachedShoppingList {
  id: string
  eventId: string | null
  name: string
  items: Array<{
    name: string
    quantity: string | null
    unit: string | null
    checked: boolean
    category: string | null
  }>
  cachedAt: string
}

export interface SyncStatus {
  lastSyncAt: string | null
  recipesCount: number
  shoppingListsCount: number
  isStale: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'chefflow-offline'
const DB_VERSION = 1
const STORE_RECIPES = 'recipes'
const STORE_SHOPPING = 'shopping-lists'
const STORE_META = 'meta'
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours

// ---------------------------------------------------------------------------
// DB initialization
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_RECIPES)) {
        db.createObjectStore(STORE_RECIPES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_SHOPPING)) {
        db.createObjectStore(STORE_SHOPPING, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const item of items) {
      store.put(item)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

async function getOne<T>(storeName: string, key: string): Promise<T | null> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve((request.result as T) ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function clearStore(storeName: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite')
    const store = tx.objectStore(STORE_META)
    store.put({ key, value })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getMeta<T>(key: string): Promise<T | null> {
  const result = await getOne<{ key: string; value: T }>(STORE_META, key)
  return result?.value ?? null
}

// ---------------------------------------------------------------------------
// Recipe cache
// ---------------------------------------------------------------------------

/**
 * Store recipes for offline access. Replaces all previously cached recipes.
 */
export async function cacheRecipes(recipes: CachedRecipe[]): Promise<void> {
  const stamped = recipes.map((r) => ({
    ...r,
    cachedAt: new Date().toISOString(),
  }))
  await clearStore(STORE_RECIPES)
  await putAll(STORE_RECIPES, stamped)
  await setMeta('recipes-synced-at', new Date().toISOString())
  // Update localStorage timestamp for the offline page
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cf-last-sync', new Date().toISOString())
  }
}

/**
 * Retrieve all cached recipes.
 */
export async function getCachedRecipes(): Promise<CachedRecipe[]> {
  return getAll<CachedRecipe>(STORE_RECIPES)
}

/**
 * Retrieve a single cached recipe by ID.
 */
export async function getCachedRecipe(id: string): Promise<CachedRecipe | null> {
  return getOne<CachedRecipe>(STORE_RECIPES, id)
}

// ---------------------------------------------------------------------------
// Shopping list cache
// ---------------------------------------------------------------------------

/**
 * Store a shopping list for offline access.
 */
export async function cacheShoppingList(list: CachedShoppingList): Promise<void> {
  const stamped = { ...list, cachedAt: new Date().toISOString() }
  await putAll(STORE_SHOPPING, [stamped])
  await setMeta('shopping-synced-at', new Date().toISOString())
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cf-last-sync', new Date().toISOString())
  }
}

/**
 * Store multiple shopping lists.
 */
export async function cacheShoppingLists(lists: CachedShoppingList[]): Promise<void> {
  const stamped = lists.map((l) => ({
    ...l,
    cachedAt: new Date().toISOString(),
  }))
  await clearStore(STORE_SHOPPING)
  await putAll(STORE_SHOPPING, stamped)
  await setMeta('shopping-synced-at', new Date().toISOString())
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cf-last-sync', new Date().toISOString())
  }
}

/**
 * Retrieve all cached shopping lists.
 */
export async function getCachedShoppingLists(): Promise<CachedShoppingList[]> {
  return getAll<CachedShoppingList>(STORE_SHOPPING)
}

/**
 * Retrieve a single cached shopping list by ID.
 */
export async function getCachedShoppingList(id: string): Promise<CachedShoppingList | null> {
  return getOne<CachedShoppingList>(STORE_SHOPPING, id)
}

// ---------------------------------------------------------------------------
// Sync status
// ---------------------------------------------------------------------------

/**
 * Get current sync status for offline data.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const recipesSyncedAt = await getMeta<string>('recipes-synced-at')
  const shoppingSyncedAt = await getMeta<string>('shopping-synced-at')
  const recipes = await getCachedRecipes()
  const shopping = await getCachedShoppingLists()

  const lastSyncAt = recipesSyncedAt || shoppingSyncedAt || null
  const isStale = lastSyncAt
    ? Date.now() - new Date(lastSyncAt).getTime() > STALE_THRESHOLD_MS
    : true

  return {
    lastSyncAt,
    recipesCount: recipes.length,
    shoppingListsCount: shopping.length,
    isStale,
  }
}

/**
 * Clear all offline data.
 */
export async function clearOfflineData(): Promise<void> {
  await clearStore(STORE_RECIPES)
  await clearStore(STORE_SHOPPING)
  await clearStore(STORE_META)
}
