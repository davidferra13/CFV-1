import { pgTable, uuid, integer, text, timestamp, date } from 'drizzle-orm/pg-core'

export const chefActivitySnapshots = pgTable('chef_activity_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  chefId: uuid('chef_id').notNull().unique(),
  upcomingEventCount: integer('upcoming_event_count').notNull().default(0),
  currentWeekCount: integer('current_week_count').notNull().default(0),
  currentMonthCount: integer('current_month_count').notNull().default(0),
  lastEventDate: date('last_event_date'),
  busiestDay: text('busiest_day'),
  streakWeeks: integer('streak_weeks').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
