# Codex Task: Hub Table Drizzle Schema Sync

**Status:** ready-to-build
**Scope:** 1 file edit (append 3 table definitions to schema.ts)
**Risk:** LOW (read-only schema declarations, no migrations, no behavior changes)
**Dependencies:** None

---

## Problem

Three hub tables (`hub_meal_board`, `hub_meal_feedback`, `hub_household_members`) exist in PostgreSQL via applied migrations but are NOT defined in the Drizzle ORM schema file. This means:

- `types/database.ts` (auto-generated) has no types for these tables
- Future code cannot use Drizzle query builder for these tables
- The server actions (`lib/hub/meal-board-actions.ts`, `lib/hub/meal-feedback-actions.ts`, `lib/hub/household-actions.ts`) currently work via raw SQL compat layer, but ORM access is blocked

## What to Build

Append 3 Drizzle `pgTable` definitions to the END of `lib/db/schema/schema.ts`, right before the final line of the file. These definitions must exactly match the SQL migrations that created the tables.

---

## CRITICAL RULES

- **APPEND ONLY.** Add the 3 table definitions at the very end of the file, after the last existing export (line ~25405). Do NOT insert them elsewhere.
- **Do NOT modify ANY existing code** in schema.ts. Not a single character.
- **Do NOT create any migration files.** The tables already exist in the database.
- **Do NOT modify any server action files.** This task is schema declarations only.
- **Do NOT run `drizzle-kit push` or any database commands.**
- **Do NOT add new imports.** All needed imports (`pgTable`, `uuid`, `text`, `timestamp`, `date`, `integer`, `boolean`, `index`, `foreignKey`, `unique`, `check`, `sql`) are already imported on line 1.
- Match the exact coding style of existing tables in the file (see `hubMessages` at line 14021 and `hubGroupMembers` at line 14078 as reference).

---

## Task: Append These 3 Table Definitions

Add this exact code block at the end of `lib/db/schema/schema.ts`, after the last line:

```typescript
// ---------------------------------------------------------------------------
// Hub Meal Board, Meal Feedback, Household Members
// (Tables exist via migrations 20260401000123-125; adding Drizzle definitions)
// ---------------------------------------------------------------------------

export const hubMealBoard = pgTable(
  'hub_meal_board',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    groupId: uuid('group_id').notNull(),
    authorProfileId: uuid('author_profile_id').notNull(),
    mealDate: date('meal_date').notNull(),
    mealType: text('meal_type').notNull(),
    title: text().notNull(),
    description: text(),
    dietaryTags: text('dietary_tags').array().default([]),
    allergenFlags: text('allergen_flags').array().default([]),
    menuId: uuid('menu_id'),
    dishId: uuid('dish_id'),
    status: text().default('planned').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_hub_meal_board_group_date').using(
      'btree',
      table.groupId.asc().nullsLast().op('uuid_ops'),
      table.mealDate.asc().nullsLast()
    ),
    unique('hub_meal_board_group_id_meal_date_meal_type_key').on(
      table.groupId,
      table.mealDate,
      table.mealType
    ),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [hubGroups.id],
      name: 'hub_meal_board_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.authorProfileId],
      foreignColumns: [hubGuestProfiles.id],
      name: 'hub_meal_board_author_profile_id_fkey',
    }),
    foreignKey({
      columns: [table.menuId],
      foreignColumns: [menus.id],
      name: 'hub_meal_board_menu_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.dishId],
      foreignColumns: [dishes.id],
      name: 'hub_meal_board_dish_id_fkey',
    }).onDelete('set null'),
    check(
      'hub_meal_board_meal_type_check',
      sql`meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])`
    ),
    check(
      'hub_meal_board_status_check',
      sql`status = ANY (ARRAY['planned'::text, 'confirmed'::text, 'served'::text, 'cancelled'::text])`
    ),
  ]
)

export const hubMealFeedback = pgTable(
  'hub_meal_feedback',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    mealEntryId: uuid('meal_entry_id').notNull(),
    profileId: uuid('profile_id').notNull(),
    reaction: text().notNull(),
    note: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_hub_meal_feedback_entry').using(
      'btree',
      table.mealEntryId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_hub_meal_feedback_profile').using(
      'btree',
      table.profileId.asc().nullsLast().op('uuid_ops')
    ),
    unique('hub_meal_feedback_meal_entry_id_profile_id_key').on(table.mealEntryId, table.profileId),
    foreignKey({
      columns: [table.mealEntryId],
      foreignColumns: [hubMealBoard.id],
      name: 'hub_meal_feedback_meal_entry_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.profileId],
      foreignColumns: [hubGuestProfiles.id],
      name: 'hub_meal_feedback_profile_id_fkey',
    }),
    check(
      'hub_meal_feedback_reaction_check',
      sql`reaction = ANY (ARRAY['loved'::text, 'liked'::text, 'neutral'::text, 'disliked'::text])`
    ),
  ]
)

export const hubHouseholdMembers = pgTable(
  'hub_household_members',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    profileId: uuid('profile_id').notNull(),
    displayName: text('display_name').notNull(),
    relationship: text().notNull(),
    ageGroup: text('age_group'),
    dietaryRestrictions: text('dietary_restrictions').array().default([]),
    allergies: text('allergies').array().default([]),
    dislikes: text('dislikes').array().default([]),
    favorites: text('favorites').array().default([]),
    notes: text(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_hub_household_profile').using(
      'btree',
      table.profileId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.profileId],
      foreignColumns: [hubGuestProfiles.id],
      name: 'hub_household_members_profile_id_fkey',
    }).onDelete('cascade'),
    check(
      'hub_household_members_relationship_check',
      sql`relationship = ANY (ARRAY['partner'::text, 'spouse'::text, 'child'::text, 'parent'::text, 'sibling'::text, 'assistant'::text, 'house_manager'::text, 'nanny'::text, 'other'::text])`
    ),
    check(
      'hub_household_members_age_group_check',
      sql`age_group IS NULL OR age_group = ANY (ARRAY['infant'::text, 'toddler'::text, 'child'::text, 'teen'::text, 'adult'::text])`
    ),
  ]
)
```

---

## Verification

After editing, run:

```bash
npx tsc --noEmit --skipLibCheck
```

This MUST exit with code 0. If it fails, the table definitions have a syntax error. Fix the syntax error in your appended code only. Do NOT touch any other code in the file.

---

## What NOT to Do

- Do NOT create new files
- Do NOT modify existing tables or views
- Do NOT create migrations
- Do NOT run database commands
- Do NOT modify server actions
- Do NOT modify components
- Do NOT add imports (they already exist)
- Do NOT reformat or restructure existing code
