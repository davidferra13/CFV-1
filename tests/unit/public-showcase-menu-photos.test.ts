import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const READINESS_PATH = require.resolve('../../lib/public/chef-profile-readiness.ts')
const DB_SERVER_PATH = require.resolve('../../lib/db/server.ts')

type MenuRow = {
  id: string
  name: string
  description: string | null
  cuisine_type: string | null
  service_style: string | null
  target_guest_count: number | null
  times_used: number | null
  tenant_id: string
  is_showcase: boolean
  status: string
  dishes: Array<{
    id: string
    name: string | null
    course_name: string
    course_number: number | null
    description: string | null
    photo_url: string | null
    dietary_tags: string[] | null
    allergen_flags: string[] | null
    sort_order: number | null
  }>
}

type QueryTracker = {
  createServerClientArgs: Array<{ admin?: boolean } | undefined>
  table: string | null
  selectColumns: string | null
  filters: Array<{ type: 'eq' | 'neq'; column: string; value: unknown }>
  orders: Array<{ column: string; ascending: boolean }>
  limit: number | null
}

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

class PublicShowcaseMenusBuilder implements PromiseLike<{ data: MenuRow[]; error: null }> {
  constructor(
    private readonly rows: MenuRow[],
    private readonly tracker: QueryTracker
  ) {}

  select(columns: string) {
    this.tracker.selectColumns = columns
    return this
  }

  eq(column: string, value: unknown) {
    this.tracker.filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column: string, value: unknown) {
    this.tracker.filters.push({ type: 'neq', column, value })
    return this
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.tracker.orders.push({ column, ascending: options.ascending !== false })
    return this
  }

  limit(count: number) {
    this.tracker.limit = count
    return this
  }

  then<TResult1 = { data: MenuRow[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: MenuRow[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected)
  }

  private resolve() {
    let result = this.rows.filter((row) =>
      this.tracker.filters.every((filter) => {
        const rowValue = row[filter.column as keyof MenuRow]
        if (filter.type === 'eq') return rowValue === filter.value
        return rowValue !== filter.value
      })
    )

    for (const order of [...this.tracker.orders].reverse()) {
      result = [...result].sort((a, b) => {
        const left = a[order.column as keyof MenuRow]
        const right = b[order.column as keyof MenuRow]
        const delta = Number(left ?? 0) - Number(right ?? 0)
        return order.ascending ? delta : -delta
      })
    }

    return {
      data: result.slice(0, this.tracker.limit ?? result.length),
      error: null,
    }
  }
}

function createDbMock(rows: MenuRow[], tracker: QueryTracker) {
  return {
    from(table: string) {
      tracker.table = table
      assert.equal(table, 'menus')
      return new PublicShowcaseMenusBuilder(rows, tracker)
    },
  }
}

function loadReadinessWithDb(rows: MenuRow[]) {
  const tracker: QueryTracker = {
    createServerClientArgs: [],
    table: null,
    selectColumns: null,
    filters: [],
    orders: [],
    limit: null,
  }
  const originals = {
    readiness: require.cache[READINESS_PATH],
    dbServer: require.cache[DB_SERVER_PATH],
  }
  const db = createDbMock(rows, tracker)

  require.cache[DB_SERVER_PATH] = {
    id: DB_SERVER_PATH,
    filename: DB_SERVER_PATH,
    loaded: true,
    exports: {
      createServerClient: (opts?: { admin?: boolean }) => {
        tracker.createServerClientArgs.push(opts)
        return db
      },
    },
  } as NodeJS.Module

  delete require.cache[READINESS_PATH]
  const mod = require(READINESS_PATH)

  return {
    getPublicShowcaseMenus: mod.getPublicShowcaseMenus as (
      chefId: string,
      options?: { limit?: number | null }
    ) => Promise<any[]>,
    tracker,
    restore: () => {
      restoreModule(READINESS_PATH, originals.readiness)
      restoreModule(DB_SERVER_PATH, originals.dbServer)
    },
  }
}

test('getPublicShowcaseMenus selects and returns the first usable sorted dish photo only for public menus', async () => {
  const rows: MenuRow[] = [
    {
      id: 'showcase-menu',
      name: 'Spring Dinner',
      description: 'Seasonal dinner',
      cuisine_type: 'Seasonal',
      service_style: 'plated',
      target_guest_count: 12,
      times_used: 4,
      tenant_id: 'chef-1',
      is_showcase: true,
      status: 'shared',
      dishes: [
        {
          id: 'dish-3',
          name: 'Later course',
          course_name: 'Main',
          course_number: 2,
          description: null,
          photo_url: 'https://cdn.example.com/later.jpg',
          dietary_tags: [],
          allergen_flags: [],
          sort_order: 1,
        },
        {
          id: 'dish-1',
          name: 'Blank photo starter',
          course_name: 'Starter',
          course_number: 1,
          description: null,
          photo_url: '   ',
          dietary_tags: ['GF'],
          allergen_flags: [],
          sort_order: 1,
        },
        {
          id: 'dish-2',
          name: 'First usable photo',
          course_name: 'Starter',
          course_number: 1,
          description: 'Crisp vegetables',
          photo_url: ' https://cdn.example.com/first.jpg ',
          dietary_tags: null,
          allergen_flags: null,
          sort_order: 2,
        },
      ],
    },
    {
      id: 'private-menu',
      name: 'Private Menu',
      description: null,
      cuisine_type: null,
      service_style: null,
      target_guest_count: null,
      times_used: 99,
      tenant_id: 'chef-1',
      is_showcase: false,
      status: 'shared',
      dishes: [
        {
          id: 'private-dish',
          name: 'Private dish',
          course_name: 'Private',
          course_number: 1,
          description: null,
          photo_url: 'https://cdn.example.com/private.jpg',
          dietary_tags: [],
          allergen_flags: [],
          sort_order: 1,
        },
      ],
    },
    {
      id: 'archived-menu',
      name: 'Archived Menu',
      description: null,
      cuisine_type: null,
      service_style: null,
      target_guest_count: null,
      times_used: 88,
      tenant_id: 'chef-1',
      is_showcase: true,
      status: 'archived',
      dishes: [
        {
          id: 'archived-dish',
          name: 'Archived dish',
          course_name: 'Archived',
          course_number: 1,
          description: null,
          photo_url: 'https://cdn.example.com/archived.jpg',
          dietary_tags: [],
          allergen_flags: [],
          sort_order: 1,
        },
      ],
    },
  ]

  const { getPublicShowcaseMenus, tracker, restore } = loadReadinessWithDb(rows)

  try {
    const menus = await getPublicShowcaseMenus('chef-1')

    assert.deepEqual(tracker.createServerClientArgs, [{ admin: true }])
    assert.match(tracker.selectColumns ?? '', /\bphoto_url\b/)
    assert.deepEqual(tracker.filters, [
      { type: 'eq', column: 'tenant_id', value: 'chef-1' },
      { type: 'eq', column: 'is_showcase', value: true },
      { type: 'neq', column: 'status', value: 'archived' },
    ])
    assert.deepEqual(tracker.orders, [{ column: 'times_used', ascending: false }])
    assert.equal(tracker.limit, 3)

    assert.equal(menus.length, 1)
    assert.equal(menus[0].id, 'showcase-menu')
    assert.equal(menus[0].photoUrl, 'https://cdn.example.com/first.jpg')
    assert.deepEqual(
      menus[0].dishes.map((dish: { id: string }) => dish.id),
      ['dish-1', 'dish-2', 'dish-3']
    )
    assert.deepEqual(menus[0].dishes[1].dietaryTags, [])
    assert.deepEqual(menus[0].dishes[1].allergenFlags, [])
  } finally {
    restore()
  }
})
