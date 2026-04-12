import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)

test('compat client supports nested joins and dotted filters for nested PostgREST selects', async () => {
  const dbIndexPath = require.resolve('../../lib/db/index.ts')
  const fkMapPath = require.resolve('../../lib/db/fk-map.ts')
  const compatPath = require.resolve('../../lib/db/compat.ts')

  const originalDbIndex = require.cache[dbIndexPath]
  const originalFkMap = require.cache[fkMapPath]

  let capturedSql = ''
  let capturedParams: unknown[] = []

  require.cache[dbIndexPath] = {
    exports: {
      pgClient: {
        unsafe: async (sql: string, params: unknown[]) => {
          capturedSql = sql
          capturedParams = params
          return []
        },
      },
    },
  } as NodeJS.Module

  require.cache[fkMapPath] = {
    exports: {
      FK_MAP: {
        'components::dishes': 'dish_id',
        'components::recipes': 'recipe_id',
        'dishes::menus': 'menu_id',
      },
    },
  } as NodeJS.Module

  delete require.cache[compatPath]

  try {
    const { createCompatClient } = require(compatPath)
    const db = createCompatClient()

    const result = await db
      .from('components')
      .select(
        `
        id, name, prep_day_offset, make_ahead_window_hours,
        prep_time_of_day, prep_station, storage_notes, recipe_id,
        dish:dishes!inner(menu:menus!inner(event_id)),
        recipe:recipes(prep_time_minutes)
      `
      )
      .eq('tenant_id', 'tenant-1')
      .eq('is_make_ahead', true)
      .eq('dish.menu.event_id', 'event-1')

    assert.equal(result.error, null)
    assert.equal(result.status, 200)
    assert.equal(result.statusText, 'OK')
    assert.deepEqual(result.data, [])

    assert.match(
      capturedSql,
      /INNER JOIN "dishes" AS "dish" ON "components"\."dish_id" = "dish"\."id"/
    )
    assert.match(
      capturedSql,
      /INNER JOIN "menus" AS "dish__menu" ON "dish"\."menu_id" = "dish__menu"\."id"/
    )
    assert.match(
      capturedSql,
      /LEFT JOIN "recipes" AS "recipe" ON "components"\."recipe_id" = "recipe"\."id"/
    )
    assert.match(capturedSql, /CASE WHEN "dish"\."id" IS NULL THEN NULL ELSE/)
    assert.match(capturedSql, /'menu', CASE WHEN "dish__menu"\."event_id" IS NULL THEN NULL ELSE/)
    assert.match(
      capturedSql,
      /WHERE "components"\."tenant_id" = \$1 AND "components"\."is_make_ahead" = \$2 AND "dish__menu"\."event_id" = \$3/
    )
    assert.deepEqual(capturedParams, ['tenant-1', true, 'event-1'])
  } finally {
    if (originalDbIndex) {
      require.cache[dbIndexPath] = originalDbIndex
    } else {
      delete require.cache[dbIndexPath]
    }

    if (originalFkMap) {
      require.cache[fkMapPath] = originalFkMap
    } else {
      delete require.cache[fkMapPath]
    }

    delete require.cache[compatPath]
  }
})
