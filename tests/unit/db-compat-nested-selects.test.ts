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

test('compat client supports spaced relation selects and explicit FK constraint hints with inner joins', async () => {
  const dbIndexPath = require.resolve('../../lib/db/index.ts')
  const fkMapPath = require.resolve('../../lib/db/fk-map.ts')
  const compatPath = require.resolve('../../lib/db/compat.ts')

  const originalDbIndex = require.cache[dbIndexPath]
  const originalFkMap = require.cache[fkMapPath]

  const captured: Array<{ sql: string; params: unknown[] }> = []

  require.cache[dbIndexPath] = {
    exports: {
      pgClient: {
        unsafe: async (sql: string, params: unknown[]) => {
          captured.push({ sql, params })
          if (sql.includes('FROM "menus" LEFT JOIN "dishes"')) {
            return [
              {
                id: 'menu-1',
                __join_dishes: {
                  id: 'dish-1',
                  course_name: 'Passed bite',
                },
              },
              {
                id: 'menu-1',
                __join_dishes: {
                  id: 'dish-2',
                  course_name: 'Dessert',
                },
              },
            ]
          }
          return []
        },
      },
    },
  } as NodeJS.Module

  require.cache[fkMapPath] = {
    exports: {
      FK_MAP: {
        'dishes::menus': 'menu_id',
        'station_components::station_menu_items': 'station_menu_item_id',
        'station_menu_items::stations': 'station_id',
      },
    },
  } as NodeJS.Module

  delete require.cache[compatPath]

  try {
    const { createCompatClient } = require(compatPath)
    const db = createCompatClient()

    const explicitFkResult = await db
      .from('event_collaborators')
      .select(
        `
        id,
        chef:chefs!event_collaborators_chef_id_fkey(display_name),
        event:events!event_collaborators_event_id_fkey!inner(occasion)
      `
      )
      .eq('event.id', 'event-1')

    const spacedRelationResult = await db
      .from('menus')
      .select(
        `
        id,
        dishes (id, course_name)
      `
      )
      .eq('tenant_id', 'tenant-1')

    const multilineRelationResult = await db
      .from('stations')
      .select(
        `
        *,
        station_menu_items (
          id,
          name,
          station_components (
            id
          )
        )
      `
      )
      .eq('chef_id', 'chef-1')

    assert.equal(explicitFkResult.error, null)
    assert.equal(explicitFkResult.status, 200)
    assert.equal(explicitFkResult.statusText, 'OK')
    assert.deepEqual(explicitFkResult.data, [])

    assert.equal(spacedRelationResult.error, null)
    assert.equal(spacedRelationResult.status, 200)
    assert.equal(spacedRelationResult.statusText, 'OK')
    assert.deepEqual(spacedRelationResult.data, [
      {
        id: 'menu-1',
        dishes: [
          {
            id: 'dish-1',
            course_name: 'Passed bite',
          },
          {
            id: 'dish-2',
            course_name: 'Dessert',
          },
        ],
      },
    ])
    assert.equal(multilineRelationResult.error, null)
    assert.equal(multilineRelationResult.status, 200)
    assert.equal(multilineRelationResult.statusText, 'OK')

    const explicitFkQuery = captured[0]
    const spacedRelationQuery = captured[1]
    const multilineRelationQuery = captured[2]
    assert.ok(explicitFkQuery)
    assert.ok(spacedRelationQuery)
    assert.ok(multilineRelationQuery)

    assert.match(
      explicitFkQuery.sql,
      /LEFT JOIN "chefs" AS "chef" ON "event_collaborators"\."chef_id" = "chef"\."id"/
    )
    assert.match(
      explicitFkQuery.sql,
      /INNER JOIN "events" AS "event" ON "event_collaborators"\."event_id" = "event"\."id"/
    )
    assert.match(explicitFkQuery.sql, /WHERE "event"\."id" = \$1/)
    assert.deepEqual(explicitFkQuery.params, ['event-1'])

    assert.match(
      spacedRelationQuery.sql,
      /LEFT JOIN "dishes" ON "dishes"\."menu_id" = "menus"\."id"/
    )
    assert.match(
      spacedRelationQuery.sql,
      /CASE WHEN "dishes"\."id" IS NULL THEN NULL ELSE jsonb_build_object\('id', "dishes"\."id", 'course_name', "dishes"\."course_name"\) END AS "__join_dishes"/
    )
    assert.match(spacedRelationQuery.sql, /WHERE "menus"\."tenant_id" = \$1/)
    assert.deepEqual(spacedRelationQuery.params, ['tenant-1'])

    assert.match(
      multilineRelationQuery.sql,
      /LEFT JOIN "station_menu_items" ON "station_menu_items"\."station_id" = "stations"\."id"/
    )
    assert.match(
      multilineRelationQuery.sql,
      /LEFT JOIN "station_components" AS "station_menu_items__station_components" ON "station_menu_items__station_components"\."station_menu_item_id" = "station_menu_items"\."id"/
    )
    assert.match(multilineRelationQuery.sql, /WHERE "stations"\."chef_id" = \$1/)
    assert.deepEqual(multilineRelationQuery.params, ['chef-1'])
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
