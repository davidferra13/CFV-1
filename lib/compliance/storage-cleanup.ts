'use server'

import { createServerClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

const STORAGE_BUCKETS = [
  'chef-profile-images',
  'chef-portal-backgrounds',
  'chef-logos',
  'chef-journal-media',
  'chef-social-media',
  'social-pipeline-assets',
  'event-photos',
  'dish-photos',
  'inquiry-note-attachments',
  'receipts',
  'client-profile-photos',
  'cannabis-control-packets',
  'chat-files',
]

/**
 * Remove all files belonging to a chef from all Supabase Storage buckets.
 * Non-blocking — logs failures but does not throw.
 * Files are organized under `{chefId}/` prefixes.
 */
export async function cleanupStorageBuckets(chefId: string): Promise<{
  bucketsProcessed: number
  filesRemoved: number
  errors: string[]
}> {
  const adminClient: any = createServerClient({ admin: true })
  let filesRemoved = 0
  let bucketsProcessed = 0
  const errors: string[] = []

  for (const bucket of STORAGE_BUCKETS) {
    try {
      const { data: files, error: listError } = await adminClient.storage
        .from(bucket)
        .list(chefId, { limit: 1000 })

      if (listError) {
        // Bucket may not exist in this environment
        continue
      }

      if (files && files.length > 0) {
        const paths = files.map((f: any) => `${chefId}/${f.name}`)
        const { error: removeError } = await adminClient.storage.from(bucket).remove(paths)

        if (removeError) {
          errors.push(`${bucket}: ${removeError.message}`)
          log.error(`[storage-cleanup] Failed to remove files from ${bucket}`, {
            error: removeError,
          })
        } else {
          filesRemoved += paths.length
        }
      }

      bucketsProcessed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${bucket}: ${msg}`)
      log.error(`[storage-cleanup] Bucket ${bucket} processing failed`, { error: err })
    }
  }

  return { bucketsProcessed, filesRemoved, errors }
}
