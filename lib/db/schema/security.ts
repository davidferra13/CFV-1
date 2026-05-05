import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core'
import { authUsers } from './auth'

export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').references(() => authUsers.id),
  eventType: text('event_type').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userMfaMethods = pgTable('user_mfa_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  secretEncrypted: text('secret_encrypted'),
  phoneNumberId: uuid('phone_number_id'),
  enabled: boolean('enabled').default(false),
  enabledAt: timestamp('enabled_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userRecoveryCodes = pgTable('user_recovery_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const mfaChallenges = pgTable('mfa_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id')
    .notNull()
    .references(() => authUsers.id),
  challengeType: text('challenge_type').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  verified: boolean('verified').default(false),
  attempts: integer('attempts').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
