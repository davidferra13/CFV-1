import dotenv from 'dotenv'
import { createAdminClient } from '@/lib/db/admin'
import primaryShortcuts from '@/lib/navigation/primary-shortcuts'

const {
  DEFAULT_PRIMARY_SHORTCUT_HREFS,
  isLegacyPrimaryNavHrefs,
  normalizePrimaryNavHrefs,
  upgradeLegacyPrimaryNavHrefs,
} = primaryShortcuts

dotenv.config({ path: '.env.local' })

function equalHrefOrder(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

async function main() {
  const shouldApply = process.argv.includes('--apply')
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('chef_preferences')
    .select('id, chef_id, primary_nav_hrefs, saved_custom_nav_hrefs')

  if (error) {
    throw new Error(`[primary-nav-backfill] Failed to load chef preferences: ${error.message}`)
  }

  const candidates =
    data?.flatMap((row: any) => {
      const current = normalizePrimaryNavHrefs(
        Array.isArray(row.primary_nav_hrefs) ? (row.primary_nav_hrefs as string[]) : []
      )
      if (!isLegacyPrimaryNavHrefs(current)) return []

      const hasSavedCustomDefault =
        row.saved_custom_nav_hrefs != null && typeof row.saved_custom_nav_hrefs === 'object'
      if (hasSavedCustomDefault) {
        return [
          {
            id: row.id,
            chefId: row.chef_id,
            current,
            next: upgradeLegacyPrimaryNavHrefs(current),
            skipped: true,
            reason: 'saved_custom_nav_hrefs present',
          },
        ]
      }

      return [
        {
          id: row.id,
          chefId: row.chef_id,
          current,
          next: upgradeLegacyPrimaryNavHrefs(current),
          skipped: false,
          reason: null,
        },
      ]
    }) ?? []

  console.log(`[primary-nav-backfill] ${candidates.length} legacy nav rows found`)

  for (const candidate of candidates) {
    const nextPayload = equalHrefOrder(candidate.next, DEFAULT_PRIMARY_SHORTCUT_HREFS)
      ? []
      : candidate.next

    if (candidate.skipped) {
      console.log(
        `[skip] ${candidate.chefId} legacy=${candidate.current.join(', ')} reason=${candidate.reason}`
      )
      continue
    }

    console.log(
      `[candidate] ${candidate.chefId} ${candidate.current.join(', ')} -> ${nextPayload.length === 0 ? '[platform default]' : nextPayload.join(', ')}`
    )

    if (!shouldApply) continue

    const { error: updateError } = await db
      .from('chef_preferences')
      .update({ primary_nav_hrefs: nextPayload })
      .eq('id', candidate.id)

    if (updateError) {
      throw new Error(
        `[primary-nav-backfill] Failed to update ${candidate.chefId}: ${updateError.message}`
      )
    }
  }

  console.log(
    shouldApply
      ? '[primary-nav-backfill] Backfill complete'
      : '[primary-nav-backfill] Dry run complete. Re-run with --apply to persist changes.'
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
