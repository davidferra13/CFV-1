import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const LEGACY_DUPLICATE_MIGRATIONS = new Map<string, Set<string>>([
  [
    '20260220000001',
    new Set([
      '20260220000001_chat_file_sharing.sql',
      '20260220000001_placeholder_already_applied.sql',
    ]),
  ],
  [
    '20260220000004',
    new Set(['20260220000004_chat_insights.sql', '20260220000004_client_conversation_create.sql']),
  ],
  [
    '20260303000020',
    new Set(['20260303000020_travel_route_planning.sql', '20260303000020_vendor_management.sql']),
  ],
  [
    '20260330000088',
    new Set(['20260330000088_inquiry_quote_status_sync.sql', '20260330000088_rebook_tokens.sql']),
  ],
  [
    '20260330000095',
    new Set([
      '20260330000095_cascading_food_costs.sql',
      '20260330000095_client_booking_system.sql',
    ]),
  ],
  [
    '20260331000005',
    new Set([
      '20260331000005_equipment_checklist_and_station_assignments.sql',
      '20260331000005_freelance_staff_and_site_assessments.sql',
    ]),
  ],
  [
    '20260331000011',
    new Set(['20260331000011_kds_tickets.sql', '20260331000011_waitlist_entries.sql']),
  ],
  [
    '20260331000013',
    new Set([
      '20260331000013_daily_specials.sql',
      '20260331000013_restaurant_compliance_and_breaks.sql',
    ]),
  ],
  [
    '20260331000016',
    new Set([
      '20260331000016_food_truck_locations_and_schedule.sql',
      '20260331000016_food_truck_permits_and_maintenance.sql',
    ]),
  ],
  [
    '20260331000018',
    new Set([
      '20260331000018_bakery_batches_and_fermentation.sql',
      '20260331000018_bakery_orders.sql',
    ]),
  ],
  [
    '20260331000019',
    new Set([
      '20260331000019_bakery_ovens_and_schedule.sql',
      '20260331000019_bakery_wholesale_tasting_seasonal.sql',
      '20260331000019_display_case_and_par_stock.sql',
    ]),
  ],
  [
    '20260331000020',
    new Set([
      '20260331000020_entity_photos.sql',
      '20260331000020_food_cost_and_customer_feedback.sql',
      '20260331000020_vendor_hub_and_reorder.sql',
    ]),
  ],
  [
    '20260331000022',
    new Set(['20260331000022_sms_notifications.sql', '20260331000022_staff_shift_scheduling.sql']),
  ],
  [
    '20260331000039',
    new Set([
      '20260331000039_featured_booking_menu.sql',
      '20260331000039_product_public_media_links.sql',
    ]),
  ],
  [
    '20260331000040',
    new Set([
      '20260331000040_featured_booking_menu_showcase_copy.sql',
      '20260331000040_feedback_requests_client_id.sql',
    ]),
  ],
  [
    '20260331000047',
    new Set([
      '20260331000047_marketplace_operating_layer.sql',
      '20260331000047_readiness_storage_and_policy_compat.sql',
    ]),
  ],
])

describe('Supabase migration versions', () => {
  it('has unique numeric version prefixes', () => {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
    const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))

    const seen = new Map<string, string>()
    const duplicates: Array<{ version: string; first: string; second: string }> = []

    for (const file of files) {
      const match = /^(\d+)_/.exec(file)
      if (!match) continue

      const version = match[1]
      const existing = seen.get(version)
      if (existing) {
        const legacyFiles = LEGACY_DUPLICATE_MIGRATIONS.get(version)
        const isGrandfathered = legacyFiles?.has(existing) === true && legacyFiles.has(file)

        if (!isGrandfathered) {
          duplicates.push({ version, first: existing, second: file })
        }
      } else {
        seen.set(version, file)
      }
    }

    assert.equal(
      duplicates.length,
      0,
      `Duplicate migration version prefixes found: ${duplicates
        .map((d) => `${d.version} (${d.first}, ${d.second})`)
        .join('; ')}`
    )
  })
})
