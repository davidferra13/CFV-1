import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Runtime log regression guards', () => {
  it('uses the corrected finance and client dashboard columns', () => {
    const concentrationActions = read('lib/finance/concentration-actions.ts')
    const coolingActions = read('lib/clients/cooling-actions.ts')

    assert.ok(
      concentrationActions.includes(".eq('type', 'payment')"),
      'concentration risk must query ledger_entries.type'
    )
    assert.ok(
      coolingActions.includes(".select('id, full_name, loyalty_tier')"),
      'cooling dashboard must query clients.loyalty_tier'
    )
  })

  it('uses name in receipt-library client joins', () => {
    const receiptLibrary = read('lib/receipts/library-actions.ts')

    assert.ok(receiptLibrary.includes('clients(name)'), 'receipt library must join clients.name')
    assert.ok(
      receiptLibrary.includes(".select('id, name')"),
      'receipt library client selector must read clients.name'
    )
  })

  it('ships follow-up migrations for collab recursion and prep-block drift', () => {
    const collabFix = read(
      'supabase/migrations/20260330000033_fix_collab_handoff_rls_recursion.sql'
    )
    const prepBlocksCatchup = read(
      'supabase/migrations/20260322000058_event_prep_blocks_catchup.sql'
    )
    const platingGuides = read('supabase/migrations/20260330000082_plating_guides.sql')
    const cascadingFoodCosts = read('supabase/migrations/20260330000095_cascading_food_costs.sql')
    const ingredientSeedData = read('supabase/migrations/20260331000001_ingredient_seed_data.sql')
    const floorPlans = read('supabase/migrations/20260331000007_floor_plans_and_multi_day.sql')
    const mealPrepDeliveries = read('supabase/migrations/20260331000008_meal_prep_deliveries.sql')
    const march31AuthFixes = [
      'supabase/migrations/20260331000008_meal_prep_deliveries.sql',
      'supabase/migrations/20260331000009_meal_prep_containers_preferences_nutrition.sql',
      'supabase/migrations/20260331000010_meal_prep_batch_log.sql',
      'supabase/migrations/20260331000011_kds_tickets.sql',
      'supabase/migrations/20260331000012_product_modifier_system.sql',
      'supabase/migrations/20260331000013_daily_specials.sql',
      'supabase/migrations/20260331000018_bakery_batches_and_fermentation.sql',
      'supabase/migrations/20260331000028_communication_log.sql',
      'supabase/migrations/20260331000029_freelance_staff_and_site_assessments.sql',
    ].map(read)

    assert.ok(
      collabFix.includes('SECURITY DEFINER'),
      'collab RLS fix must use SECURITY DEFINER helpers'
    )
    assert.ok(
      collabFix.includes('current_chef_owns_handoff') &&
        collabFix.includes('current_chef_is_handoff_recipient'),
      'collab RLS fix must define both helper functions'
    )
    assert.ok(
      prepBlocksCatchup.includes('CREATE TABLE IF NOT EXISTS event_prep_blocks'),
      'prep-block catchup migration must recreate event_prep_blocks when missing'
    )
    assert.ok(
      platingGuides.includes('CREATE OR REPLACE FUNCTION update_updated_at()'),
      'plating guides must define the shared update_updated_at trigger helper before later consumers'
    )
    assert.ok(
      cascadingFoodCosts.indexOf('AS has_all_prices') <
        cascadingFoodCosts.indexOf('AS sub_recipe_count'),
      'cascading food costs must append sub_recipe_count after existing recipe_cost_summary columns'
    )
    assert.ok(
      ingredientSeedData.includes('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;'),
      'ingredient seed data must provision pg_trgm before creating trigram indexes'
    )
    assert.ok(
      ingredientSeedData.includes('extensions.gin_trgm_ops'),
      'ingredient seed data must schema-qualify gin_trgm_ops so the index is not search-path dependent'
    )
    assert.ok(
      floorPlans.includes('auth_user_id = auth.uid()'),
      'floor plan RLS must resolve chefs by auth_user_id, not the nonexistent chefs.user_id column'
    )
    assert.ok(
      !/WHERE user_id = auth\.uid\(\)/.test(floorPlans),
      'floor plan RLS must not reference the nonexistent chefs.user_id column'
    )
    assert.ok(
      mealPrepDeliveries.includes('CREATE TABLE IF NOT EXISTS meal_prep_programs'),
      'meal prep deliveries must catch up meal_prep_programs when history says it exists but the table is missing'
    )
    assert.ok(
      /ALTER TABLE product_projections[\s\S]+ADD COLUMN IF NOT EXISTS station_id/.test(
        read('supabase/migrations/20260331000011_kds_tickets.sql')
      ),
      'KDS migration must add station routing to product_projections, not the nonexistent products table'
    )
    for (const migration of march31AuthFixes) {
      assert.ok(
        !/WHERE user_id = auth\.uid\(\)/.test(migration),
        'March 31 migrations must not reference the nonexistent chefs.user_id column'
      )
    }
  })
})
