import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('recipe editor exposes and persists ingredient yield percentages', () => {
  const source = read('app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx')

  assert.match(source, /suggestYieldByName/)
  assert.match(source, /Yield %/)
  assert.match(source, /formatYieldHint/)
  assert.match(source, /updateExisting\(ei\.id, 'yield_pct'/)
  assert.match(source, /yield_pct: ei\.yield_pct/)
  assert.match(source, /yield_pct: ing\.yield_pct \?\? undefined/)
})

test('yield suggestions include waste context for helper hints', () => {
  const source = read('lib/openclaw/reference-library-actions.ts')

  assert.match(source, /SELECT w\.prep_method, w\.as_purchased_to_edible_pct, w\.waste_type/)
  assert.match(source, /wasteType: r\.waste_type \?\? null/)
  assert.match(
    source,
    /OR lower\(\$\{ingredientName\}\) LIKE '%' \|\| lower\(w\.ingredient_name\) \|\| '%'/
  )
})

test('grocery list and cost projections use yield adjusted buy quantities', () => {
  const source = read('lib/grocery/generate-grocery-list.ts')

  assert.match(source, /const buyQty = \(scaledQty \* 100\) \/ yieldPct/)
  assert.match(source, /entry\.quantities\.push\(\{\s*qty: buyQty,/s)
  assert.match(source, /totalQuantity: bufferedQty/)
  assert.match(source, /totalCents \+= pricePer \* item\.totalQuantity/)
})

test('ingredient lifecycle view preserves not recorded nulls', () => {
  const source = read('database/migrations/20260424000004_lifecycle_view_preserve_nulls.sql')

  assert.match(source, /p\.purchased_qty,/)
  assert.match(source, /u\.used_qty,/)
  assert.match(source, /WHEN p\.purchased_qty IS NOT NULL AND u\.used_qty IS NOT NULL/)
  assert.match(source, /WHEN p\.purchased_qty IS NOT NULL/)
  assert.match(source, /WHEN u\.used_qty IS NOT NULL/)
  assert.doesNotMatch(source, /COALESCE\(p\.purchased_qty,\s*0\)/)
  assert.doesNotMatch(source, /COALESCE\(u\.used_qty,\s*0\)/)
})
