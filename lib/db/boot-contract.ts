export type DbBootContractSurface =
  | 'activeSchema'
  | 'generatedSchema'
  | 'migrationSnapshot'
  | 'sqlMigrations'

export type DbBootContractSourceSpec = {
  filePath: string
  patterns: readonly string[]
}

export type DbBootContractLiveObjectKind = 'extension' | 'index' | 'table' | 'view'

export type DbBootContractLiveObject = {
  kind: DbBootContractLiveObjectKind
  name: string
  schema?: string
}

export type DbBootContractObject = {
  id: string
  description: string
  readinessRequired: boolean
  criticalMigrationFile?: string
  liveObject: DbBootContractLiveObject
  surfaces?: Partial<Record<DbBootContractSurface, readonly DbBootContractSourceSpec[]>>
}

export type LiveDbBootContractCheck = {
  description: string
  id: string
  present: boolean
  readinessRequired: boolean
  criticalMigrationFile?: string
  liveObject: DbBootContractLiveObject
}

export type LiveDbBootContractReport = {
  checkedAt: string
  checks: LiveDbBootContractCheck[]
  contractVersion: string
  errorMessage: string | null
  missingObjects: LiveDbBootContractCheck[]
  missingReadinessObjects: LiveDbBootContractCheck[]
  status: 'missing_required_objects' | 'ok' | 'unreachable'
}

export const DB_BOOT_CONTRACT_VERSION = 'db-boot-contract.v1'

export const DB_BOOT_CONTRACT_OBJECTS: readonly DbBootContractObject[] = [
  {
    id: 'public.directory_listings',
    description: 'Canonical public directory table for browse, geo, and listing detail reads.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'public', name: 'directory_listings' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['pgTable("directory_listings"'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['pgTable("directory_listings"'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"public.directory_listings"'],
        },
      ],
    },
  },
  {
    id: 'public.chefs',
    description:
      'Chef runtime table used by public discoverability and authenticated role resolution.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'public', name: 'chefs' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['pgTable("chefs"'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['pgTable("chefs"'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"public.chefs"'],
        },
      ],
    },
  },
  {
    id: 'public.chef_preferences',
    description: 'Chef discoverability preferences required by public and directory browse joins.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'public', name: 'chef_preferences' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['pgTable("chef_preferences"'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['pgTable("chef_preferences"'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"public.chef_preferences"'],
        },
      ],
    },
  },
  {
    id: 'public.user_roles',
    description:
      'Authoritative auth-to-entity role bridge used by public, auth, and admin runtimes.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'public', name: 'user_roles' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['export const userRoles = pgTable("user_roles"'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['export const userRoles = pgTable("user_roles"'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"public.user_roles"'],
        },
      ],
    },
  },
  {
    id: 'auth.users',
    description: 'Auth user table used by Auth.js credentials and compat admin reads.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'auth', name: 'users' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/auth.ts',
          patterns: [
            "const authSchema = pgSchema('auth')",
            "export const authUsers = authSchema.table('users'",
          ],
        },
      ],
    },
  },
  {
    id: 'public.platform_admins',
    description: 'Platform admin table expected by admin runtime paths.',
    readinessRequired: false,
    liveObject: { kind: 'table', schema: 'public', name: 'platform_admins' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['export const platformAdmins = pgTable("platform_admins"'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['export const platformAdmins = pgTable("platform_admins"'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"public.platform_admins"'],
        },
      ],
    },
  },
  {
    id: 'public.directory_listing_favorites',
    description: 'Client favorite table for public directory shortlist writes and reads.',
    readinessRequired: true,
    criticalMigrationFile: '20260422000001_directory_listing_favorites.sql',
    liveObject: { kind: 'table', schema: 'public', name: 'directory_listing_favorites' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: [
            'export const directoryListingFavorites = pgTable("directory_listing_favorites"',
          ],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: [
            'export const directoryListingFavorites = pgTable("directory_listing_favorites"',
          ],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"public.directory_listing_favorites"'],
        },
      ],
      sqlMigrations: [
        {
          filePath: 'database/migrations/20260422000001_directory_listing_favorites.sql',
          patterns: ['CREATE TABLE IF NOT EXISTS public.directory_listing_favorites'],
        },
      ],
    },
  },
  {
    id: 'openclaw.price_intelligence_contract_v1',
    description: 'Contract view required by public ingredient catalog detail reads.',
    readinessRequired: true,
    criticalMigrationFile: '20260422000003_price_intelligence_contract_and_governor.sql',
    liveObject: { kind: 'view', schema: 'openclaw', name: 'price_intelligence_contract_v1' },
    surfaces: {
      sqlMigrations: [
        {
          filePath:
            'database/migrations/20260422000003_price_intelligence_contract_and_governor.sql',
          patterns: ['CREATE OR REPLACE VIEW openclaw.price_intelligence_contract_v1 AS'],
        },
      ],
    },
  },
  {
    id: 'openclaw.zip_centroids',
    description: 'ZIP centroid lookup required by public geo search resolution.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'openclaw', name: 'zip_centroids' },
  },
  {
    id: 'openclaw.canonical_ingredients',
    description: 'Canonical ingredient catalog backing public ingredient search.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'openclaw', name: 'canonical_ingredients' },
  },
  {
    id: 'public.system_ingredients',
    description: 'System ingredient table backing ingredient knowledge trigram matching.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'public', name: 'system_ingredients' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['pgTable("system_ingredients"'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['pgTable("system_ingredients"'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"public.system_ingredients"'],
        },
      ],
    },
  },
  {
    id: 'public.ingredient_knowledge',
    description: 'Public ingredient knowledge table joined from system ingredients.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'public', name: 'ingredient_knowledge' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['export const ingredientKnowledge = pgTable("ingredient_knowledge"'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['export const ingredientKnowledge = pgTable("ingredient_knowledge"'],
        },
      ],
    },
  },
  {
    id: 'public.ingredient_knowledge_slugs',
    description:
      'Ingredient knowledge slug mapping table used by public ingredient detail lookups.',
    readinessRequired: true,
    liveObject: { kind: 'table', schema: 'public', name: 'ingredient_knowledge_slugs' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: [
            'export const ingredientKnowledgeSlugs = pgTable("ingredient_knowledge_slugs"',
          ],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: [
            'export const ingredientKnowledgeSlugs = pgTable("ingredient_knowledge_slugs"',
          ],
        },
      ],
    },
  },
  {
    id: 'extensions.pg_trgm',
    description: 'Trigram extension required by public browse and ingredient search indexes.',
    readinessRequired: true,
    criticalMigrationFile: '20260422000030_public_boot_db_hardening.sql',
    liveObject: { kind: 'extension', name: 'pg_trgm', schema: 'extensions' },
    surfaces: {
      sqlMigrations: [
        {
          filePath: 'database/migrations/20260422000030_public_boot_db_hardening.sql',
          patterns: ['CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;'],
        },
      ],
    },
  },
  {
    id: 'public.idx_chef_preferences_network_discoverable_chef',
    description: 'Partial index supporting discoverable chef joins.',
    readinessRequired: true,
    criticalMigrationFile: '20260422000030_public_boot_db_hardening.sql',
    liveObject: {
      kind: 'index',
      schema: 'public',
      name: 'idx_chef_preferences_network_discoverable_chef',
    },
    surfaces: {
      sqlMigrations: [
        {
          filePath: 'database/migrations/20260422000030_public_boot_db_hardening.sql',
          patterns: ['CREATE INDEX IF NOT EXISTS idx_chef_preferences_network_discoverable_chef'],
        },
      ],
    },
  },
  {
    id: 'public.idx_directory_listings_canonical_state',
    description:
      'Expression index supporting canonicalized directory state browse and geo filters.',
    readinessRequired: true,
    criticalMigrationFile: '20260422000030_public_boot_db_hardening.sql',
    liveObject: { kind: 'index', schema: 'public', name: 'idx_directory_listings_canonical_state' },
    surfaces: {
      sqlMigrations: [
        {
          filePath: 'database/migrations/20260422000030_public_boot_db_hardening.sql',
          patterns: ['CREATE INDEX IF NOT EXISTS idx_directory_listings_canonical_state'],
        },
      ],
    },
  },
  {
    id: 'public.idx_directory_listings_city_trgm',
    description: 'City trigram index supporting public city fuzzy search.',
    readinessRequired: true,
    criticalMigrationFile: '20260422000030_public_boot_db_hardening.sql',
    liveObject: { kind: 'index', schema: 'public', name: 'idx_directory_listings_city_trgm' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['index("idx_directory_listings_city_trgm")'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['index("idx_directory_listings_city_trgm")'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"idx_directory_listings_city_trgm"'],
        },
      ],
      sqlMigrations: [
        {
          filePath: 'database/migrations/20260422000030_public_boot_db_hardening.sql',
          patterns: ['CREATE INDEX IF NOT EXISTS idx_directory_listings_city_trgm'],
        },
      ],
    },
  },
  {
    id: 'openclaw.idx_canonical_ingredients_name_trgm',
    description: 'Trigram index supporting canonical ingredient public search fallback.',
    readinessRequired: true,
    criticalMigrationFile: '20260422000030_public_boot_db_hardening.sql',
    liveObject: {
      kind: 'index',
      schema: 'openclaw',
      name: 'idx_canonical_ingredients_name_trgm',
    },
    surfaces: {
      sqlMigrations: [
        {
          filePath: 'database/migrations/20260422000030_public_boot_db_hardening.sql',
          patterns: ['CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_name_trgm'],
        },
      ],
    },
  },
  {
    id: 'public.idx_system_ingredients_name_trgm',
    description: 'Trigram index supporting ingredient knowledge fuzzy matching.',
    readinessRequired: true,
    liveObject: { kind: 'index', schema: 'public', name: 'idx_system_ingredients_name_trgm' },
    surfaces: {
      activeSchema: [
        {
          filePath: 'lib/db/schema/schema.ts',
          patterns: ['index("idx_system_ingredients_name_trgm")'],
        },
      ],
      generatedSchema: [
        {
          filePath: 'lib/db/migrations/schema.ts',
          patterns: ['index("idx_system_ingredients_name_trgm")'],
        },
      ],
      migrationSnapshot: [
        {
          filePath: 'lib/db/migrations/meta/0000_snapshot.json',
          patterns: ['"idx_system_ingredients_name_trgm"'],
        },
      ],
      sqlMigrations: [
        {
          filePath: 'database/migrations/20260331000001_ingredient_seed_data.sql',
          patterns: ['CREATE INDEX IF NOT EXISTS idx_system_ingredients_name_trgm'],
        },
      ],
    },
  },
] as const

function toObjectKey(schema: string | undefined, name: string) {
  return schema ? `${schema}.${name}` : name
}

async function resolvePgClient(client?: any) {
  if (client) return client
  const dbNamespace = await import('./index')
  const defaultNamespace = (dbNamespace as { default?: Record<string, unknown> }).default ?? {}
  const dbModule = {
    ...defaultNamespace,
    ...dbNamespace,
  }
  return dbModule.pgClient
}

export async function inspectLiveDbBootContract(client?: any): Promise<LiveDbBootContractReport> {
  const checkedAt = new Date().toISOString()

  try {
    const sqlClient = await resolvePgClient(client)
    const [extensions, relations, indexes] = await Promise.all([
      sqlClient`
        SELECT extname
        FROM pg_extension
      `,
      sqlClient`
        SELECT
          n.nspname AS schema_name,
          c.relname AS object_name
        FROM pg_class c
        JOIN pg_namespace n
          ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'v', 'm', 'p')
      `,
      sqlClient`
        SELECT
          schemaname AS schema_name,
          indexname AS object_name
        FROM pg_indexes
      `,
    ])

    const extensionNames = new Set(
      (extensions as Array<{ extname: string | null }>).map((row) => String(row.extname ?? ''))
    )
    const relationKeys = new Set(
      (relations as Array<{ schema_name: string; object_name: string }>).map((row) =>
        toObjectKey(row.schema_name, row.object_name)
      )
    )
    const indexKeys = new Set(
      (indexes as Array<{ schema_name: string; object_name: string }>).map((row) =>
        toObjectKey(row.schema_name, row.object_name)
      )
    )

    const checks = DB_BOOT_CONTRACT_OBJECTS.map<LiveDbBootContractCheck>((object) => {
      let present = false
      if (object.liveObject.kind === 'extension') {
        present = extensionNames.has(object.liveObject.name)
      } else if (object.liveObject.kind === 'index') {
        present = indexKeys.has(toObjectKey(object.liveObject.schema, object.liveObject.name))
      } else {
        present = relationKeys.has(toObjectKey(object.liveObject.schema, object.liveObject.name))
      }

      return {
        id: object.id,
        description: object.description,
        present,
        readinessRequired: object.readinessRequired,
        criticalMigrationFile: object.criticalMigrationFile,
        liveObject: object.liveObject,
      }
    })

    const missingObjects = checks.filter((check) => !check.present)
    const missingReadinessObjects = missingObjects.filter((check) => check.readinessRequired)

    return {
      checkedAt,
      checks,
      contractVersion: DB_BOOT_CONTRACT_VERSION,
      errorMessage: null,
      missingObjects,
      missingReadinessObjects,
      status: missingReadinessObjects.length === 0 ? 'ok' : 'missing_required_objects',
    }
  } catch (error) {
    return {
      checkedAt,
      checks: [],
      contractVersion: DB_BOOT_CONTRACT_VERSION,
      errorMessage: error instanceof Error ? error.message : String(error),
      missingObjects: [],
      missingReadinessObjects: [],
      status: 'unreachable',
    }
  }
}
