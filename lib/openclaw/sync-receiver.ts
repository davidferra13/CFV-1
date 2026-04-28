/**
 * OpenClaw Sync Receiver
 * Generalized sync dispatcher that routes incoming sync requests
 * to the correct cartridge handler via the registry.
 *
 * Called by:
 *   - /api/cron/openclaw-sync (unified endpoint)
 *   - /api/cron/price-sync (backwards compat, delegates here)
 */

'use server'

import {
  registerCartridge,
  getCartridge,
  getAllCartridges,
  isCartridgeRegistered,
} from './cartridge-registry'
import type { CartridgeSyncResult, CartridgeDefinition } from './cartridge-registry'
import { syncPricesToChefFlowInternal } from './sync'
import type { SyncResult } from './sync'
import { requireAdmin } from '@/lib/auth/admin'

// --- Register all known cartridges ---

// Price-Intel: the original and only active data-producing cartridge
registerCartridge({
  codename: 'price-intel',
  name: 'Price Intelligence',
  port: 8081,
  pullEndpoint: '/api/prices/enriched',
  targetType: 'database',
  syncHandler: async (): Promise<CartridgeSyncResult> => {
    // Delegate to existing sync logic (sync.ts)
    const result: SyncResult = await syncPricesToChefFlowInternal()
    return {
      success: result.success,
      cartridge: 'price-intel',
      matched: result.matched,
      updated: result.updated,
      skipped: result.skipped,
      errors: 0,
      notFound: result.notFound,
      quarantined: result.quarantined ?? 0,
    }
  },
})

// Lead Engine: scrapes catering businesses from Yelp, Google Maps, etc.
registerCartridge({
  codename: 'lead-engine',
  name: 'Lead Engine',
  port: 8083,
  pullEndpoint: '/api/leads/unsynced',
  targetType: 'database',
  syncHandler: async (): Promise<CartridgeSyncResult> => {
    const { handleLeadEngineSync } = await import('./lead-engine-handler')
    return handleLeadEngineSync(null)
  },
})

// Directory Images: sources photos for food directory listings
registerCartridge({
  codename: 'directory-images',
  name: 'Directory Images',
  port: 8085,
  pullEndpoint: '/api/images/unsynced',
  targetType: 'database',
  syncHandler: async (): Promise<CartridgeSyncResult> => {
    const { handleDirectoryImagesSync } = await import('./directory-images-handler')
    return handleDirectoryImagesSync(null)
  },
})

// Wholesale Prices: email agent harvests wholesale distributor price lists
registerCartridge({
  codename: 'wholesale-prices',
  name: 'Wholesale Prices',
  port: 8081,
  pullEndpoint: '/api/wholesale/unsynced',
  targetType: 'database',
  syncHandler: async (): Promise<CartridgeSyncResult> => {
    const { handleWholesaleSync } = await import('./wholesale-handler')
    return handleWholesaleSync(null)
  },
})

// Archive Digester: processes 10 years of unorganized business artifacts
registerCartridge({
  codename: 'archive-digester',
  name: 'Archive Digester',
  port: 8086,
  pullEndpoint: '/api/archive/unsynced',
  targetType: 'database',
  syncHandler: async (): Promise<CartridgeSyncResult> => {
    const { handleArchiveDigesterSync } = await import('./archive-digester-handler')
    return handleArchiveDigesterSync(null)
  },
})

// Synthesis Intelligence: pulls anomalies, seasonal scores, velocity, benchmarks, etc.
registerCartridge({
  codename: 'synthesis-intel',
  name: 'Synthesis Intelligence',
  port: 8090,
  pullEndpoint: '/api/synthesis/export',
  targetType: 'database',
  syncHandler: async (): Promise<CartridgeSyncResult> => {
    const { handleSynthesisSync } = await import('./synthesis-handler')
    return handleSynthesisSync(null)
  },
})

// Future cartridges register here as they are built:
// registerCartridge({ codename: 'market-intel', ... })
// registerCartridge({ codename: 'trend-watch', ... })

// --- Public API ---

/**
 * Sync a specific cartridge. Called by the unified cron endpoint.
 * No auth check here (the cron route handles auth via bearer token).
 */
export async function syncCartridgeInternal(codename: string): Promise<CartridgeSyncResult> {
  const cartridge = getCartridge(codename)

  if (!cartridge) {
    return {
      success: false,
      cartridge: codename,
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [
        `Unknown cartridge: ${codename}. Registered: ${getAllCartridges()
          .map((c) => c.codename)
          .join(', ')}`,
      ],
    }
  }

  try {
    return await cartridge.syncHandler(null)
  } catch (err) {
    return {
      success: false,
      cartridge: codename,
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [err instanceof Error ? err.message : 'Unknown error'],
    }
  }
}

/**
 * Sync a specific cartridge (admin-authenticated version).
 * Called from the admin UI.
 */
export async function syncCartridge(codename: string): Promise<CartridgeSyncResult> {
  await requireAdmin()
  return syncCartridgeInternal(codename)
}

/**
 * Get the list of registered cartridges (admin-authenticated).
 */
export async function getCartridgeRegistry(): Promise<CartridgeDefinition[]> {
  await requireAdmin()
  return getAllCartridges()
}

/**
 * Check if a cartridge codename is valid.
 */
export async function isValidCartridge(codename: string): Promise<boolean> {
  return isCartridgeRegistered(codename)
}
