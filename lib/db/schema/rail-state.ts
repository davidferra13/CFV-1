import {
  pgTable,
  bigserial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core'

export const railImpressions = pgTable(
  'rail_impressions',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: text('user_id').notNull(),
    tenantId: text('tenant_id'),
    itemDefinitionId: text('item_definition_id').notNull(),
    role: text('role').notNull(),
    impressionCount: integer('impression_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.userId, table.itemDefinitionId),
    index('idx_rail_impressions_user_role').on(table.userId, table.role),
    index('idx_rail_impressions_item').on(table.itemDefinitionId),
  ]
)

export const railDismissals = pgTable(
  'rail_dismissals',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: text('user_id').notNull(),
    tenantId: text('tenant_id'),
    itemDefinitionId: text('item_definition_id').notNull(),
    role: text('role').notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).defaultNow().notNull(),
    dismissType: text('dismiss_type').notNull().default('permanent'),
    snoozeUntil: timestamp('snooze_until', { withTimezone: true }),
  },
  (table) => [
    unique().on(table.userId, table.itemDefinitionId),
    index('idx_rail_dismissals_user').on(table.userId, table.role),
    index('idx_rail_dismissals_snooze').on(table.snoozeUntil),
  ]
)

export const railSavedItems = pgTable(
  'rail_saved_items',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: text('user_id').notNull(),
    tenantId: text('tenant_id'),
    itemDefinitionId: text('item_definition_id').notNull(),
    role: text('role').notNull(),
    savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
    pinned: boolean('pinned').notNull().default(false),
  },
  (table) => [
    unique().on(table.userId, table.itemDefinitionId),
    index('idx_rail_saved_user').on(table.userId, table.role),
  ]
)

export const railAuditEvents = pgTable(
  'rail_audit_events',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: text('user_id').notNull(),
    tenantId: text('tenant_id'),
    itemDefinitionId: text('item_definition_id').notNull(),
    role: text('role').notNull(),
    event: text('event').notNull(),
    pageContext: text('page_context'),
    metadata: jsonb('metadata').default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_rail_audit_user').on(table.userId, table.occurredAt),
    index('idx_rail_audit_item').on(table.itemDefinitionId, table.occurredAt),
  ]
)

export const railUserPreferences = pgTable(
  'rail_user_preferences',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: text('user_id').notNull(),
    tenantId: text('tenant_id'),
    role: text('role').notNull(),
    weightOverrides: jsonb('weight_overrides').default({}),
    disabledCategories: text('disabled_categories').array().default([]),
    disabledItemIds: text('disabled_item_ids').array().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.role), index('idx_rail_prefs_user').on(table.userId)]
)
