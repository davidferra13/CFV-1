/**
 * OpenClaw Cartridge Registry
 * Maps cartridge codenames to their sync configuration.
 * When a new cartridge is built, register it here so ChefFlow knows how to sync it.
 *
 * The sync receiver (sync-receiver.ts) looks up cartridges by codename
 * and delegates to the appropriate handler function.
 */

export interface CartridgeSyncResult {
  success: boolean
  cartridge: string
  matched: number
  updated: number
  skipped: number
  errors: number
  errorDetails?: string[]
}

export interface CartridgeDefinition {
  /** Unique identifier matching the vault profile codename */
  codename: string
  /** Human-readable name */
  name: string
  /** Port the Pi sync API runs on for this cartridge */
  port: number
  /** API path on the Pi to pull data from (e.g. '/api/prices/enriched') */
  pullEndpoint: string
  /** Whether this cartridge syncs to DB tables or TypeScript constants */
  targetType: 'database' | 'constants'
  /**
   * Function that processes the pulled data into ChefFlow.
   * Receives the raw data from the Pi API response.
   * Must handle its own DB writes, cache busting, etc.
   */
  syncHandler: (data: unknown) => Promise<CartridgeSyncResult>
}

// Registry of all known cartridges
const registry = new Map<string, CartridgeDefinition>()

/**
 * Register a cartridge with the sync system.
 */
export function registerCartridge(def: CartridgeDefinition): void {
  registry.set(def.codename, def)
}

/**
 * Look up a cartridge by codename.
 */
export function getCartridge(codename: string): CartridgeDefinition | undefined {
  return registry.get(codename)
}

/**
 * Get all registered cartridges.
 */
export function getAllCartridges(): CartridgeDefinition[] {
  return Array.from(registry.values())
}

/**
 * Check if a cartridge is registered.
 */
export function isCartridgeRegistered(codename: string): boolean {
  return registry.has(codename)
}
