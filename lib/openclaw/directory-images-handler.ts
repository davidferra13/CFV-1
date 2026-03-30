/**
 * Directory Images Cartridge - Sync Handler
 * Pulls unsynced directory listing images from Pi's directory-images API,
 * downloads them to ChefFlow local storage, and updates directory_listings.photo_urls.
 *
 * NOT a server action file. Called by sync-receiver.ts via the cartridge registry.
 */

import { pgClient } from '@/lib/db'
import { upload, getPublicUrl } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import type { CartridgeSyncResult } from './cartridge-registry'

const OPENCLAW_DIRECTORY_IMAGES_API =
  process.env.OPENCLAW_DIRECTORY_IMAGES_API_URL || 'http://10.0.0.177:8085'

const STORAGE_BUCKET = 'directory-photos'

interface PiDirectoryImage {
  listing_id: string
  photo_urls: string[] // URLs on Pi to download from
  source: 'google_places' | 'og_image' | 'favicon' | 'website_scrape'
}

/**
 * Sync handler for directory-images cartridge.
 * Called by syncCartridgeInternal('directory-images') with data=null.
 * Pulls unsynced images from Pi, downloads to ChefFlow storage, updates DB.
 */
export async function handleDirectoryImagesSync(_data: unknown): Promise<CartridgeSyncResult> {
  let matched = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const errorDetails: string[] = []

  // Step 1: Pull unsynced images from Pi
  let images: PiDirectoryImage[]
  try {
    const response = await fetch(`${OPENCLAW_DIRECTORY_IMAGES_API}/api/images/unsynced`, {
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    })
    if (!response.ok) {
      return {
        success: false,
        cartridge: 'directory-images',
        matched: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        errorDetails: [`Pi API returned ${response.status}: ${response.statusText}`],
      }
    }
    const payload = await response.json()
    images = Array.isArray(payload) ? payload : payload.images || []
  } catch (err) {
    return {
      success: false,
      cartridge: 'directory-images',
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [`Pi API unreachable: ${err instanceof Error ? err.message : 'Unknown error'}`],
    }
  }

  if (images.length === 0) {
    return {
      success: true,
      cartridge: 'directory-images',
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    }
  }

  // Step 2: For each listing, download images and update DB
  const syncedPiIds: string[] = []

  for (const item of images) {
    try {
      // Check if listing exists and has no photos yet
      const existing = await pgClient`
        SELECT id, slug, photo_urls
        FROM directory_listings
        WHERE id = ${item.listing_id}
      `

      if (existing.length === 0) {
        skipped++
        continue
      }

      const listing = existing[0]

      // Don't overwrite manually added photos
      if (listing.photo_urls && listing.photo_urls.length > 0 && listing.photo_urls[0] !== '') {
        skipped++
        syncedPiIds.push(item.listing_id)
        continue
      }

      // Download each image from Pi and store in ChefFlow storage
      const storedUrls: string[] = []
      for (let i = 0; i < item.photo_urls.length && i < 3; i++) {
        try {
          const imgResponse = await fetch(item.photo_urls[i], {
            signal: AbortSignal.timeout(15000),
          })
          if (!imgResponse.ok) continue

          const buffer = Buffer.from(await imgResponse.arrayBuffer())
          const contentType = imgResponse.headers.get('content-type') || 'image/jpeg'
          const ext = contentType.includes('png')
            ? 'png'
            : contentType.includes('webp')
              ? 'webp'
              : 'jpg'
          const filePath = `${listing.slug || item.listing_id}/photo-${i + 1}.${ext}`

          const result = await upload(STORAGE_BUCKET, filePath, buffer, {
            contentType,
            upsert: true,
          })

          if (result) {
            storedUrls.push(getPublicUrl(STORAGE_BUCKET, filePath))
          }
        } catch (imgErr) {
          // Skip individual image failures, continue with next
          console.warn(
            `[directory-images] Failed to download image for ${item.listing_id}:`,
            imgErr instanceof Error ? imgErr.message : imgErr
          )
        }
      }

      if (storedUrls.length === 0) {
        errors++
        errorDetails.push(`No images could be downloaded for listing ${item.listing_id}`)
        continue
      }

      // Update directory_listings with stored photo URLs
      await pgClient`
        UPDATE directory_listings
        SET photo_urls = ${storedUrls},
            updated_at = now()
        WHERE id = ${item.listing_id}
      `

      updated++
      syncedPiIds.push(item.listing_id)
    } catch (err) {
      errors++
      errorDetails.push(
        `Failed to process listing "${item.listing_id}": ${err instanceof Error ? err.message : 'Unknown'}`
      )
    }
  }

  // Step 3: Bust cache so /discover shows new images
  try {
    revalidatePath('/discover')
  } catch {
    // Non-blocking
  }

  // Step 4: Mark synced on Pi (non-blocking)
  if (syncedPiIds.length > 0) {
    try {
      await fetch(`${OPENCLAW_DIRECTORY_IMAGES_API}/api/images/mark-synced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: syncedPiIds }),
        signal: AbortSignal.timeout(15000),
      })
    } catch (err) {
      console.warn(
        '[directory-images] Failed to mark synced on Pi (will retry next run):',
        err instanceof Error ? err.message : err
      )
    }
  }

  return {
    success: true,
    cartridge: 'directory-images',
    matched,
    updated,
    skipped,
    errors,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  }
}
