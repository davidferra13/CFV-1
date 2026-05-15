# Universal Rail: Admin Role - Complete Item Catalog

> **Last updated:** 2026-05-14
> **Role:** ADMIN (founder/system operator, full system visibility)
> **Purpose:** God-mode mission control. Replaces manual checking of 34+ admin modules. Everything surfaces on the rail, ranked by severity. The admin rail is a governance and diagnostics surface, not a consumer discovery rail.

---

## Table of Contents

1. [Schema Definition](#schema-definition)
2. [Item Catalog](#item-catalog)
   - [System Health](#category-system-health)
   - [Data Quality](#category-data-quality)
   - [User Health](#category-user-health)
   - [Business Metrics](#category-business-metrics)
   - [Inquiry Pipeline](#category-inquiry-pipeline)
   - [Content & Quality](#category-content--quality)
   - [Compliance & Safety](#category-compliance--safety)
   - [Infrastructure](#category-infrastructure)
   - [Growth & Marketing](#category-growth--marketing)
3. [Summary Statistics](#summary-statistics)
4. [Coverage Matrix](#coverage-matrix)

---

## Schema Definition

Every admin rail item is defined by exactly 22 fields.

| #   | Field              | Type                | Description                                                                                                                                                            |
| --- | ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `id`               | string (kebab-case) | Unique identifier, namespaced as `admin.{category}.{item-name}`                                                                                                        |
| 2   | `category`         | enum                | Top-level grouping: system-health, data-quality, user-health, business-metrics, inquiry-pipeline, content-quality, compliance-safety, infrastructure, growth-marketing |
| 3   | `label`            | string              | Short display text shown on the rail item (under 60 chars)                                                                                                             |
| 4   | `description`      | string              | One-line explanation of what this item represents                                                                                                                      |
| 5   | `severity`         | enum                | Default severity: critical / high / medium / low / info                                                                                                                |
| 6   | `data_source`      | string              | Where data comes from (table name, API, cron output, computed)                                                                                                         |
| 7   | `query_hint`       | string              | Pseudocode or SQL hint for how to compute the value                                                                                                                    |
| 8   | `threshold`        | string              | Condition that causes this item to appear on the rail                                                                                                                  |
| 9   | `refresh_rate`     | enum                | How often to recheck: realtime / 1m / 5m / 15m / 1h / 6h / daily                                                                                                       |
| 10  | `icon`             | string              | Emoji or icon key for visual identity                                                                                                                                  |
| 11  | `presentation`     | enum                | Visual format: pill / card / badge / banner / metric / alert-row                                                                                                       |
| 12  | `action_label`     | string              | CTA button text (e.g. "View Errors", "Investigate")                                                                                                                    |
| 13  | `href`             | string              | Link destination when clicked (admin page path)                                                                                                                        |
| 14  | `eyebrow`          | string              | Small contextual text above the label                                                                                                                                  |
| 15  | `sublabel`         | string              | Secondary descriptive text below the label                                                                                                                             |
| 16  | `slot_kind`        | enum                | Rail slot type: operational / alert / metric / trend / audit / diagnostic                                                                                              |
| 17  | `priority_formula` | string              | How to compute display priority/score (higher = more urgent)                                                                                                           |
| 18  | `staleness_window` | string              | How old data can be before marking stale (e.g. "15m", "1h", "24h")                                                                                                     |
| 19  | `dismiss_behavior` | enum                | none / snooze-1h / snooze-24h / until-resolved / permanent                                                                                                             |
| 20  | `grouping_key`     | string              | Collapse key for similar items (e.g. all error-rate items group together)                                                                                              |
| 21  | `dependencies`     | string              | What must be healthy for this item to compute (e.g. "postgres", "pi-bridge")                                                                                           |
| 22  | `admin_module`     | string              | Which existing admin page this replaces/augments (path under /admin/)                                                                                                  |

---

## Item Catalog

---

### Category: System Health

---

#### Build Status

| Field            | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| id               | `admin.system-health.build-status`                                |
| category         | system-health                                                     |
| label            | Build: {status}                                                   |
| description      | Last Next.js build result, duration, and timestamp                |
| severity         | high                                                              |
| data_source      | `docs/build-times.log`, filesystem (`.next/BUILD_ID`)             |
| query_hint       | `tail -1 docs/build-times.log; parse status, duration, timestamp` |
| threshold        | Build failed OR duration > 120s OR no build in 24h                |
| refresh_rate     | 15m                                                               |
| icon             | 🔨                                                                |
| presentation     | alert-row                                                         |
| action_label     | View Build Log                                                    |
| href             | /admin/system                                                     |
| eyebrow          | CI / Build                                                        |
| sublabel         | "{duration}s, {timeAgo}"                                          |
| slot_kind        | operational                                                       |
| priority_formula | `failed ? 95 : (duration > 120 ? 60 : 0)`                         |
| staleness_window | 1h                                                                |
| dismiss_behavior | until-resolved                                                    |
| grouping_key     | build-deploy                                                      |
| dependencies     | filesystem                                                        |
| admin_module     | /admin/system                                                     |

---

#### Deploy Status

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| id               | `admin.system-health.deploy-status`                       |
| category         | system-health                                             |
| label            | Deploy: {commitShort}                                     |
| description      | Currently deployed commit hash and time since last deploy |
| severity         | medium                                                    |
| data_source      | `.next/BUILD_ID`, `git log --oneline -1`                  |
| query_hint       | `read .next/BUILD_ID; git log --format='%h %ci' -1`       |
| threshold        | Time since deploy > 7d (info) or build ID mismatch (high) |
| refresh_rate     | 1h                                                        |
| icon             | 🚀                                                        |
| presentation     | metric                                                    |
| action_label     | View Deploy                                               |
| href             | /admin/system                                             |
| eyebrow          | CI / Deploy                                               |
| sublabel         | "Deployed {timeAgo}"                                      |
| slot_kind        | operational                                               |
| priority_formula | `mismatch ? 70 : (daysSinceDeploy > 7 ? 20 : 0)`          |
| staleness_window | 6h                                                        |
| dismiss_behavior | snooze-24h                                                |
| grouping_key     | build-deploy                                              |
| dependencies     | filesystem, git                                           |
| admin_module     | /admin/system                                             |

---

#### Error Rate: 5xx

| Field            | Value                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.error-rate-5xx`                                                                  |
| category         | system-health                                                                                         |
| label            | 5xx Errors: {count}                                                                                   |
| description      | Server error count in the last hour with trend direction                                              |
| severity         | critical                                                                                              |
| data_source      | `side_effect_failures` table, `sentry_api`, `hermes_error_scan`                                       |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE status >= 500 AND created_at > NOW() - INTERVAL '1 hour'` |
| threshold        | count > 0 (always show); critical if count > 10 or rate increasing                                    |
| refresh_rate     | 1m                                                                                                    |
| icon             | 🔴                                                                                                    |
| presentation     | banner                                                                                                |
| action_label     | View Errors                                                                                           |
| href             | /admin/silent-failures                                                                                |
| eyebrow          | Error Rate                                                                                            |
| sublabel         | "{trend} vs previous hour"                                                                            |
| slot_kind        | alert                                                                                                 |
| priority_formula | `min(100, count * 10 + (trending_up ? 20 : 0))`                                                       |
| staleness_window | 5m                                                                                                    |
| dismiss_behavior | none                                                                                                  |
| grouping_key     | error-rate                                                                                            |
| dependencies     | postgres                                                                                              |
| admin_module     | /admin/silent-failures                                                                                |

---

#### Error Rate: 4xx Spike

| Field            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| id               | `admin.system-health.error-rate-4xx-spike`                                  |
| category         | system-health                                                               |
| label            | 4xx Spike: {count}                                                          |
| description      | Client error spike detection, comparing current hour to 24h rolling average |
| severity         | high                                                                        |
| data_source      | `side_effect_failures` table, `sentry_api`, `hermes_error_scan`             |
| query_hint       | `current_hour_4xx / avg_24h_hourly_4xx > 2.0`                               |
| threshold        | Current hour count > 2x the 24h hourly average                              |
| refresh_rate     | 5m                                                                          |
| icon             | 🟡                                                                          |
| presentation     | alert-row                                                                   |
| action_label     | Investigate                                                                 |
| href             | /admin/silent-failures                                                      |
| eyebrow          | Error Rate                                                                  |
| sublabel         | "{multiplier}x normal rate"                                                 |
| slot_kind        | alert                                                                       |
| priority_formula | `min(90, (multiplier - 1) * 30)`                                            |
| staleness_window | 15m                                                                         |
| dismiss_behavior | snooze-1h                                                                   |
| grouping_key     | error-rate                                                                  |
| dependencies     | postgres                                                                    |
| admin_module     | /admin/silent-failures                                                      |

---

#### Silent Failures: Total Count

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| id               | `admin.system-health.silent-failures-total`                      |
| category         | system-health                                                    |
| label            | Silent Failures: {count}                                         |
| description      | Total unresolved silent failures across all severity levels      |
| severity         | high                                                             |
| data_source      | `silent_failures` table                                          |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE resolved_at IS NULL` |
| threshold        | count > 0                                                        |
| refresh_rate     | 5m                                                               |
| icon             | 🔕                                                               |
| presentation     | badge                                                            |
| action_label     | View All                                                         |
| href             | /admin/silent-failures                                           |
| eyebrow          | Silent Failures                                                  |
| sublabel         | "{criticalCount} critical, {highCount} high"                     |
| slot_kind        | alert                                                            |
| priority_formula | `criticalCount * 25 + highCount * 10 + mediumCount * 3`          |
| staleness_window | 15m                                                              |
| dismiss_behavior | none                                                             |
| grouping_key     | silent-failures                                                  |
| dependencies     | postgres                                                         |
| admin_module     | /admin/silent-failures                                           |

---

#### Silent Failures: Critical Count

| Field            | Value                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| id               | `admin.system-health.silent-failures-critical`                                             |
| category         | system-health                                                                              |
| label            | Critical Failures: {count}                                                                 |
| description      | Unresolved silent failures at critical severity                                            |
| severity         | critical                                                                                   |
| data_source      | `silent_failures` table                                                                    |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE resolved_at IS NULL AND severity = 'critical'` |
| threshold        | count > 0                                                                                  |
| refresh_rate     | 1m                                                                                         |
| icon             | 🚨                                                                                         |
| presentation     | banner                                                                                     |
| action_label     | Fix Now                                                                                    |
| href             | /admin/silent-failures                                                                     |
| eyebrow          | CRITICAL                                                                                   |
| sublabel         | "Oldest: {oldestAge}"                                                                      |
| slot_kind        | alert                                                                                      |
| priority_formula | `100`                                                                                      |
| staleness_window | 5m                                                                                         |
| dismiss_behavior | none                                                                                       |
| grouping_key     | silent-failures                                                                            |
| dependencies     | postgres                                                                                   |
| admin_module     | /admin/silent-failures                                                                     |

---

#### Silent Failures: Oldest Unresolved

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| id               | `admin.system-health.silent-failures-oldest`                            |
| category         | system-health                                                           |
| label            | Oldest Failure: {age}                                                   |
| description      | Age of the oldest unresolved silent failure                             |
| severity         | medium                                                                  |
| data_source      | `silent_failures` table                                                 |
| query_hint       | `SELECT MIN(created_at) FROM silent_failures WHERE resolved_at IS NULL` |
| threshold        | age > 24h                                                               |
| refresh_rate     | 15m                                                                     |
| icon             | ⏳                                                                      |
| presentation     | metric                                                                  |
| action_label     | View Oldest                                                             |
| href             | /admin/silent-failures                                                  |
| eyebrow          | Silent Failures                                                         |
| sublabel         | "Created {timestamp}"                                                   |
| slot_kind        | audit                                                                   |
| priority_formula | `min(80, hoursOld * 2)`                                                 |
| staleness_window | 1h                                                                      |
| dismiss_behavior | snooze-24h                                                              |
| grouping_key     | silent-failures                                                         |
| dependencies     | postgres                                                                |
| admin_module     | /admin/silent-failures                                                  |

---

#### Response Time: P50

| Field            | Value                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.response-time-p50`                                                                                   |
| category         | system-health                                                                                                             |
| label            | P50: {value}ms                                                                                                            |
| description      | Median response time over the last hour                                                                                   |
| severity         | low                                                                                                                       |
| data_source      | `vercel_analytics`, `hermes_health_pulse`                                                                                 |
| query_hint       | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) FROM request_logs WHERE created_at > NOW() - INTERVAL '1 hour'` |
| threshold        | p50 > 200ms                                                                                                               |
| refresh_rate     | 5m                                                                                                                        |
| icon             | ⚡                                                                                                                        |
| presentation     | metric                                                                                                                    |
| action_label     | View Perf                                                                                                                 |
| href             | /admin/system                                                                                                             |
| eyebrow          | Response Time                                                                                                             |
| sublabel         | "vs {previousP50}ms previous hour"                                                                                        |
| slot_kind        | metric                                                                                                                    |
| priority_formula | `p50 > 500 ? 60 : (p50 > 200 ? 30 : 0)`                                                                                   |
| staleness_window | 15m                                                                                                                       |
| dismiss_behavior | snooze-1h                                                                                                                 |
| grouping_key     | response-time                                                                                                             |
| dependencies     | postgres                                                                                                                  |
| admin_module     | /admin/system                                                                                                             |

---

#### Response Time: P95

| Field            | Value                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.response-time-p95`                                                                                    |
| category         | system-health                                                                                                              |
| label            | P95: {value}ms                                                                                                             |
| description      | 95th percentile response time over the last hour                                                                           |
| severity         | medium                                                                                                                     |
| data_source      | `vercel_analytics`, `hermes_health_pulse`                                                                                  |
| query_hint       | `PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FROM request_logs WHERE created_at > NOW() - INTERVAL '1 hour'` |
| threshold        | p95 > 1000ms                                                                                                               |
| refresh_rate     | 5m                                                                                                                         |
| icon             | ⚡                                                                                                                         |
| presentation     | metric                                                                                                                     |
| action_label     | View Perf                                                                                                                  |
| href             | /admin/system                                                                                                              |
| eyebrow          | Response Time                                                                                                              |
| sublabel         | "Tail latency trend: {trend}"                                                                                              |
| slot_kind        | metric                                                                                                                     |
| priority_formula | `p95 > 3000 ? 75 : (p95 > 1000 ? 45 : 0)`                                                                                  |
| staleness_window | 15m                                                                                                                        |
| dismiss_behavior | snooze-1h                                                                                                                  |
| grouping_key     | response-time                                                                                                              |
| dependencies     | postgres                                                                                                                   |
| admin_module     | /admin/system                                                                                                              |

---

#### Response Time: P99

| Field            | Value                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.response-time-p99`                                                                                    |
| category         | system-health                                                                                                              |
| label            | P99: {value}ms                                                                                                             |
| description      | 99th percentile response time over the last hour                                                                           |
| severity         | high                                                                                                                       |
| data_source      | `vercel_analytics`, `hermes_health_pulse`                                                                                  |
| query_hint       | `PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) FROM request_logs WHERE created_at > NOW() - INTERVAL '1 hour'` |
| threshold        | p99 > 3000ms                                                                                                               |
| refresh_rate     | 5m                                                                                                                         |
| icon             | ⚡                                                                                                                         |
| presentation     | alert-row                                                                                                                  |
| action_label     | View Slow Requests                                                                                                         |
| href             | /admin/system                                                                                                              |
| eyebrow          | Response Time                                                                                                              |
| sublabel         | "Worst: {maxMs}ms"                                                                                                         |
| slot_kind        | alert                                                                                                                      |
| priority_formula | `p99 > 5000 ? 85 : (p99 > 3000 ? 55 : 0)`                                                                                  |
| staleness_window | 15m                                                                                                                        |
| dismiss_behavior | snooze-1h                                                                                                                  |
| grouping_key     | response-time                                                                                                              |
| dependencies     | postgres                                                                                                                   |
| admin_module     | /admin/system                                                                                                              |

---

#### Slow Queries

| Field            | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| id               | `admin.system-health.slow-queries`                                   |
| category         | system-health                                                        |
| label            | Slow Queries: {count}                                                |
| description      | Database queries exceeding 500ms in the last hour                    |
| severity         | medium                                                               |
| data_source      | `pg_stat_statements`, `hermes_db_health`                             |
| query_hint       | `SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > 500` |
| threshold        | count > 5                                                            |
| refresh_rate     | 15m                                                                  |
| icon             | 🐢                                                                   |
| presentation     | badge                                                                |
| action_label     | View Queries                                                         |
| href             | /admin/system                                                        |
| eyebrow          | Database                                                             |
| sublabel         | "Slowest: {slowestMs}ms on {table}"                                  |
| slot_kind        | diagnostic                                                           |
| priority_formula | `min(70, count * 5)`                                                 |
| staleness_window | 30m                                                                  |
| dismiss_behavior | snooze-1h                                                            |
| grouping_key     | database                                                             |
| dependencies     | postgres                                                             |
| admin_module     | /admin/system                                                        |

---

#### Database: Connection Pool

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| id               | `admin.system-health.db-connection-pool`                       |
| category         | system-health                                                  |
| label            | DB Pool: {used}/{max}                                          |
| description      | Active database connections vs pool maximum                    |
| severity         | high                                                           |
| data_source      | `pg_stat_activity`, `hermes_db_health.jsonl`                   |
| query_hint       | `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'` |
| threshold        | utilization > 70%                                              |
| refresh_rate     | 1m                                                             |
| icon             | 🔗                                                             |
| presentation     | metric                                                         |
| action_label     | View Connections                                               |
| href             | /admin/system                                                  |
| eyebrow          | Database                                                       |
| sublabel         | "{pct}% utilized"                                              |
| slot_kind        | operational                                                    |
| priority_formula | `pct > 90 ? 95 : (pct > 70 ? 60 : 0)`                          |
| staleness_window | 5m                                                             |
| dismiss_behavior | none                                                           |
| grouping_key     | database                                                       |
| dependencies     | postgres                                                       |
| admin_module     | /admin/system                                                  |

---

#### Database: Total Size

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| id               | `admin.system-health.db-size`                  |
| category         | system-health                                  |
| label            | DB Size: {sizeMB} MB                           |
| description      | Total database size with weekly growth rate    |
| severity         | low                                            |
| data_source      | postgres system catalog                        |
| query_hint       | `SELECT pg_database_size(current_database())`  |
| threshold        | size > 5GB or growth rate > 10% per week       |
| refresh_rate     | 6h                                             |
| icon             | 💾                                             |
| presentation     | metric                                         |
| action_label     | View Storage                                   |
| href             | /admin/system                                  |
| eyebrow          | Database                                       |
| sublabel         | "+{growthMB} MB this week ({growthPct}%)"      |
| slot_kind        | trend                                          |
| priority_formula | `growthPct > 20 ? 50 : (size > 5000 ? 40 : 0)` |
| staleness_window | 24h                                            |
| dismiss_behavior | snooze-24h                                     |
| grouping_key     | database                                       |
| dependencies     | postgres                                       |
| admin_module     | /admin/system                                  |

---

#### Database: Pending Migrations

| Field            | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| id               | `admin.system-health.db-pending-migrations`                          |
| category         | system-health                                                        |
| label            | Pending Migrations: {count}                                          |
| description      | Migration files not yet applied to the database                      |
| severity         | medium                                                               |
| data_source      | `database/migrations/*.sql`, drizzle migration log                   |
| query_hint       | `compare filesystem migration files vs drizzle.__drizzle_migrations` |
| threshold        | count > 0                                                            |
| refresh_rate     | 1h                                                                   |
| icon             | 📋                                                                   |
| presentation     | badge                                                                |
| action_label     | Review Migrations                                                    |
| href             | /admin/system                                                        |
| eyebrow          | Database                                                             |
| sublabel         | "{count} unapplied since {oldestDate}"                               |
| slot_kind        | operational                                                          |
| priority_formula | `count * 30`                                                         |
| staleness_window | 6h                                                                   |
| dismiss_behavior | snooze-24h                                                           |
| grouping_key     | database                                                             |
| dependencies     | postgres, filesystem                                                 |
| admin_module     | /admin/system                                                        |

---

#### Database: Zombie Events

| Field            | Value                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.db-zombie-events`                                                                                             |
| category         | system-health                                                                                                                      |
| label            | Zombie Events: {count}                                                                                                             |
| description      | Events stuck in non-terminal state for over 30 days                                                                                |
| severity         | medium                                                                                                                             |
| data_source      | `events` table                                                                                                                     |
| query_hint       | `SELECT COUNT(*) FROM events WHERE status NOT IN ('completed','cancelled','archived') AND updated_at < NOW() - INTERVAL '30 days'` |
| threshold        | count > 0                                                                                                                          |
| refresh_rate     | 6h                                                                                                                                 |
| icon             | 🧟                                                                                                                                 |
| presentation     | badge                                                                                                                              |
| action_label     | View Zombies                                                                                                                       |
| href             | /admin/system                                                                                                                      |
| eyebrow          | Database                                                                                                                           |
| sublabel         | "Oldest: {oldestAge} days"                                                                                                         |
| slot_kind        | audit                                                                                                                              |
| priority_formula | `min(60, count * 5 + maxAgeDays)`                                                                                                  |
| staleness_window | 12h                                                                                                                                |
| dismiss_behavior | snooze-24h                                                                                                                         |
| grouping_key     | database                                                                                                                           |
| dependencies     | postgres                                                                                                                           |
| admin_module     | /admin/system                                                                                                                      |

---

#### Database: Orphaned Clients

| Field            | Value                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.db-orphaned-clients`                                                           |
| category         | system-health                                                                                       |
| label            | Orphaned Clients: {count}                                                                           |
| description      | Client records with no associated tenant                                                            |
| severity         | medium                                                                                              |
| data_source      | `clients` table                                                                                     |
| query_hint       | `SELECT COUNT(*) FROM clients WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tenants)` |
| threshold        | count > 0                                                                                           |
| refresh_rate     | 6h                                                                                                  |
| icon             | 👻                                                                                                  |
| presentation     | badge                                                                                               |
| action_label     | View Orphans                                                                                        |
| href             | /admin/clients                                                                                      |
| eyebrow          | Database                                                                                            |
| sublabel         | "{count} without tenant association"                                                                |
| slot_kind        | audit                                                                                               |
| priority_formula | `min(50, count * 10)`                                                                               |
| staleness_window | 24h                                                                                                 |
| dismiss_behavior | snooze-24h                                                                                          |
| grouping_key     | database                                                                                            |
| dependencies     | postgres                                                                                            |
| admin_module     | /admin/clients                                                                                      |

---

#### Database: Row Count Anomaly

| Field            | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| id               | `admin.system-health.db-row-count-anomaly`                                    |
| category         | system-health                                                                 |
| label            | Row Anomaly: {table}                                                          |
| description      | Table row count deviates significantly from 7-day rolling average             |
| severity         | high                                                                          |
| data_source      | postgres system catalog, historical snapshots                                 |
| query_hint       | `SELECT relname, n_live_tup FROM pg_stat_user_tables; compare to 7d snapshot` |
| threshold        | Row count dropped > 10% or grew > 50% in 24h                                  |
| refresh_rate     | 6h                                                                            |
| icon             | 📊                                                                            |
| presentation     | alert-row                                                                     |
| action_label     | Investigate                                                                   |
| href             | /admin/system                                                                 |
| eyebrow          | Database                                                                      |
| sublabel         | "{table}: {delta} rows ({pct}% change)"                                       |
| slot_kind        | alert                                                                         |
| priority_formula | `dropped ? 85 : (growthPct > 100 ? 60 : 30)`                                  |
| staleness_window | 12h                                                                           |
| dismiss_behavior | snooze-24h                                                                    |
| grouping_key     | database                                                                      |
| dependencies     | postgres                                                                      |
| admin_module     | /admin/system                                                                 |

---

#### Cron Jobs: Running

| Field            | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| id               | `admin.system-health.cron-running`                                            |
| category         | system-health                                                                 |
| label            | Cron Running: {count}                                                         |
| description      | Currently executing cron jobs                                                 |
| severity         | info                                                                          |
| data_source      | `hermes_cron_reports`, `public_health_snapshot (lib/health/public-health.ts)` |
| query_hint       | `ps aux                                                                       | grep cron; check hermes job registry` |
| threshold        | Always show (info); warn if count > 10 simultaneously                         |
| refresh_rate     | 5m                                                                            |
| icon             | ⏰                                                                            |
| presentation     | metric                                                                        |
| action_label     | View Jobs                                                                     |
| href             | /admin/system                                                                 |
| eyebrow          | Cron                                                                          |
| sublabel         | "{count} active right now"                                                    |
| slot_kind        | operational                                                                   |
| priority_formula | `count > 10 ? 40 : 0`                                                         |
| staleness_window | 15m                                                                           |
| dismiss_behavior | snooze-1h                                                                     |
| grouping_key     | cron                                                                          |
| dependencies     | filesystem                                                                    |
| admin_module     | /admin/system                                                                 |

---

#### Cron Jobs: Failed (24h)

| Field            | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| id               | `admin.system-health.cron-failed`                                             |
| category         | system-health                                                                 |
| label            | Cron Failures: {count}                                                        |
| description      | Cron jobs that exited with errors in the last 24 hours                        |
| severity         | high                                                                          |
| data_source      | `hermes_cron_reports`, `public_health_snapshot (lib/health/public-health.ts)` |
| query_hint       | `grep -c 'ERROR\|FAIL' /var/log/cron_*.log (last 24h)`                        |
| threshold        | count > 0                                                                     |
| refresh_rate     | 15m                                                                           |
| icon             | ❌                                                                            |
| presentation     | alert-row                                                                     |
| action_label     | View Failures                                                                 |
| href             | /admin/system                                                                 |
| eyebrow          | Cron                                                                          |
| sublabel         | "{count} failures, last at {lastFailTime}"                                    |
| slot_kind        | alert                                                                         |
| priority_formula | `min(80, count * 15)`                                                         |
| staleness_window | 1h                                                                            |
| dismiss_behavior | snooze-1h                                                                     |
| grouping_key     | cron                                                                          |
| dependencies     | filesystem                                                                    |
| admin_module     | /admin/system                                                                 |

---

#### Cron Jobs: Stale

| Field            | Value                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| id               | `admin.system-health.cron-stale`                                                  |
| category         | system-health                                                                     |
| label            | Stale Cron: {count}                                                               |
| description      | Expected cron jobs that have not run within their scheduled window                |
| severity         | high                                                                              |
| data_source      | `hermes_cron_reports`, `public_health_snapshot (lib/health/public-health.ts)`     |
| query_hint       | `for each registered job: if NOW() - last_run > expected_interval * 2 then stale` |
| threshold        | count > 0                                                                         |
| refresh_rate     | 15m                                                                               |
| icon             | ⏸️                                                                                |
| presentation     | badge                                                                             |
| action_label     | View Stale Jobs                                                                   |
| href             | /admin/system                                                                     |
| eyebrow          | Cron                                                                              |
| sublabel         | "{jobNames} overdue"                                                              |
| slot_kind        | alert                                                                             |
| priority_formula | `min(85, count * 20)`                                                             |
| staleness_window | 30m                                                                               |
| dismiss_behavior | snooze-1h                                                                         |
| grouping_key     | cron                                                                              |
| dependencies     | filesystem                                                                        |
| admin_module     | /admin/system                                                                     |

---

#### Service: Postgres

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| id               | `admin.system-health.service-postgres`                             |
| category         | system-health                                                      |
| label            | Postgres: {status}                                                 |
| description      | PostgreSQL database connectivity and health                        |
| severity         | critical                                                           |
| data_source      | postgres health check (`SELECT 1`)                                 |
| query_hint       | `try { await sql'SELECT 1'; return 'up' } catch { return 'down' }` |
| threshold        | status = down                                                      |
| refresh_rate     | 1m                                                                 |
| icon             | 🐘                                                                 |
| presentation     | banner                                                             |
| action_label     | View System                                                        |
| href             | /admin/system                                                      |
| eyebrow          | Services                                                           |
| sublabel         | "Latency: {pingMs}ms"                                              |
| slot_kind        | operational                                                        |
| priority_formula | `down ? 100 : (pingMs > 100 ? 40 : 0)`                             |
| staleness_window | 5m                                                                 |
| dismiss_behavior | none                                                               |
| grouping_key     | services                                                           |
| dependencies     | none                                                               |
| admin_module     | /admin/system                                                      |

---

#### Service: Next.js

| Field            | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| id               | `admin.system-health.service-next`                                              |
| category         | system-health                                                                   |
| label            | Next.js: {status}                                                               |
| description      | Next.js application server responsiveness                                       |
| severity         | critical                                                                        |
| data_source      | HTTP health check (localhost:3100)                                              |
| query_hint       | `fetch('http://localhost:3100/api/health').then(r => r.ok ? 'up' : 'degraded')` |
| threshold        | status != up                                                                    |
| refresh_rate     | 1m                                                                              |
| icon             | ▲                                                                               |
| presentation     | banner                                                                          |
| action_label     | View System                                                                     |
| href             | /admin/system                                                                   |
| eyebrow          | Services                                                                        |
| sublabel         | "PID: {pid}, uptime: {uptime}"                                                  |
| slot_kind        | operational                                                                     |
| priority_formula | `down ? 100 : (degraded ? 80 : 0)`                                              |
| staleness_window | 5m                                                                              |
| dismiss_behavior | none                                                                            |
| grouping_key     | services                                                                        |
| dependencies     | none                                                                            |
| admin_module     | /admin/system                                                                   |

---

#### Service: Ollama

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| id               | `admin.system-health.service-ollama`                                       |
| category         | system-health                                                              |
| label            | Ollama: {status}                                                           |
| description      | Local AI model server availability                                         |
| severity         | high                                                                       |
| data_source      | Ollama API health check                                                    |
| query_hint       | `fetch('http://localhost:11434/api/tags').then(r => r.ok ? 'up' : 'down')` |
| threshold        | status = down OR no model loaded                                           |
| refresh_rate     | 5m                                                                         |
| icon             | 🧠                                                                         |
| presentation     | alert-row                                                                  |
| action_label     | View AI Status                                                             |
| href             | /admin/system                                                              |
| eyebrow          | Services                                                                   |
| sublabel         | "Model: {modelName}, VRAM: {vramUsed}"                                     |
| slot_kind        | operational                                                                |
| priority_formula | `down ? 75 : (noModel ? 50 : 0)`                                           |
| staleness_window | 15m                                                                        |
| dismiss_behavior | snooze-1h                                                                  |
| grouping_key     | services                                                                   |
| dependencies     | none                                                                       |
| admin_module     | /admin/system                                                              |

---

#### Service: Pi Bridge

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| id               | `admin.system-health.service-pi-bridge`                                 |
| category         | system-health                                                           |
| label            | Pi Bridge: {status}                                                     |
| description      | Raspberry Pi price bridge API (port 7700) connectivity                  |
| severity         | high                                                                    |
| data_source      | HTTP health check (localhost:7700)                                      |
| query_hint       | `fetch('http://localhost:7700/health').then(r => r.ok ? 'up' : 'down')` |
| threshold        | status = down OR latency > 500ms                                        |
| refresh_rate     | 5m                                                                      |
| icon             | 🌉                                                                      |
| presentation     | alert-row                                                               |
| action_label     | View Bridge                                                             |
| href             | /admin/system                                                           |
| eyebrow          | Services                                                                |
| sublabel         | "Latency: {latencyMs}ms, prices: {priceCount}"                          |
| slot_kind        | operational                                                             |
| priority_formula | `down ? 75 : (latencyMs > 500 ? 45 : 0)`                                |
| staleness_window | 15m                                                                     |
| dismiss_behavior | snooze-1h                                                               |
| grouping_key     | services                                                                |
| dependencies     | none                                                                    |
| admin_module     | /admin/system                                                           |

---

#### Service: Hermes

| Field            | Value                                                  |
| ---------------- | ------------------------------------------------------ | ------------------------------- |
| id               | `admin.system-health.service-hermes`                   |
| category         | system-health                                          |
| label            | Hermes: {status}                                       |
| description      | Hermes night shift agent, ~10 cron jobs                |
| severity         | medium                                                 |
| data_source      | docs/hermes/ reports, cron status                      |
| query_hint       | `ls -lt docs/hermes/\*.md                              | head -1; check 6 cron job PIDs` |
| threshold        | No morning report in 36h OR any cron job missing       |
| refresh_rate     | 1h                                                     |
| icon             | 📨                                                     |
| presentation     | badge                                                  |
| action_label     | View Hermes                                            |
| href             | /admin/system                                          |
| eyebrow          | Services                                               |
| sublabel         | "Last report: {reportAge}, jobs: {healthy}/{total}"    |
| slot_kind        | operational                                            |
| priority_formula | `noReportHours > 36 ? 60 : (missingJobs > 0 ? 50 : 0)` |
| staleness_window | 6h                                                     |
| dismiss_behavior | snooze-24h                                             |
| grouping_key     | services                                               |
| dependencies     | filesystem                                             |
| admin_module     | /admin/system                                          |

---

#### Service: Data Engine

| Field            | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| id               | `admin.system-health.service-openclaw`                                                  |
| category         | system-health                                                                           |
| label            | Data Engine: {status}                                                                   |
| description      | External data engine sync service reachability                                          |
| severity         | medium                                                                                  |
| data_source      | OpenClaw operator API (localhost:4000), Pi dashboard (Pi:8090)                          |
| query_hint       | `fetch('http://localhost:4000/api/health'); fetch('http://10.0.0.177:8090/api/health')` |
| threshold        | Either endpoint unreachable                                                             |
| refresh_rate     | 5m                                                                                      |
| icon             | ⚙️                                                                                      |
| presentation     | alert-row                                                                               |
| action_label     | View Data Engine                                                                        |
| href             | /admin/openclaw                                                                         |
| eyebrow          | Services                                                                                |
| sublabel         | "Operator: {operatorStatus}, Dashboard: {dashStatus}"                                   |
| slot_kind        | operational                                                                             |
| priority_formula | `bothDown ? 70 : (oneDown ? 45 : 0)`                                                    |
| staleness_window | 15m                                                                                     |
| dismiss_behavior | snooze-1h                                                                               |
| grouping_key     | services                                                                                |
| dependencies     | none                                                                                    |
| admin_module     | /admin/openclaw                                                                         |

---

#### Memory Usage

| Field            | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| id               | `admin.system-health.memory-usage`                      |
| category         | system-health                                           |
| label            | Memory: {pct}%                                          |
| description      | System memory utilization percentage                    |
| severity         | high                                                    |
| data_source      | OS metrics (`process.memoryUsage()`, system free)       |
| query_hint       | `os.totalmem() - os.freemem() / os.totalmem() * 100`    |
| threshold        | pct > 80%                                               |
| refresh_rate     | 5m                                                      |
| icon             | 🧮                                                      |
| presentation     | metric                                                  |
| action_label     | View Resources                                          |
| href             | /admin/system                                           |
| eyebrow          | Resources                                               |
| sublabel         | "{usedGB}/{totalGB} GB"                                 |
| slot_kind        | operational                                             |
| priority_formula | `pct > 95 ? 90 : (pct > 85 ? 70 : (pct > 80 ? 40 : 0))` |
| staleness_window | 15m                                                     |
| dismiss_behavior | none                                                    |
| grouping_key     | resources                                               |
| dependencies     | none                                                    |
| admin_module     | /admin/system                                           |

---

#### CPU Usage

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| id               | `admin.system-health.cpu-usage`                |
| category         | system-health                                  |
| label            | CPU: {pct}%                                    |
| description      | System CPU utilization percentage (1m average) |
| severity         | medium                                         |
| data_source      | OS metrics (`os.loadavg()`)                    |
| query_hint       | `os.loadavg()[0] / os.cpus().length * 100`     |
| threshold        | pct > 80% sustained for 5m                     |
| refresh_rate     | 5m                                             |
| icon             | 🖥️                                             |
| presentation     | metric                                         |
| action_label     | View Resources                                 |
| href             | /admin/system                                  |
| eyebrow          | Resources                                      |
| sublabel         | "Load avg: {load1m}/{load5m}/{load15m}"        |
| slot_kind        | operational                                    |
| priority_formula | `pct > 95 ? 85 : (pct > 80 ? 50 : 0)`          |
| staleness_window | 15m                                            |
| dismiss_behavior | snooze-1h                                      |
| grouping_key     | resources                                      |
| dependencies     | none                                           |
| admin_module     | /admin/system                                  |

---

#### Disk Usage

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ | ----------------- |
| id               | `admin.system-health.disk-usage`                                   |
| category         | system-health                                                      |
| label            | Disk: {pct}%                                                       |
| description      | Primary disk utilization percentage                                |
| severity         | high                                                               |
| data_source      | OS metrics (filesystem stats)                                      |
| query_hint       | `df -h /                                                           | parse used/total` |
| threshold        | pct > 85%                                                          |
| refresh_rate     | 1h                                                                 |
| icon             | 💿                                                                 |
| presentation     | metric                                                             |
| action_label     | View Storage                                                       |
| href             | /admin/system                                                      |
| eyebrow          | Resources                                                          |
| sublabel         | "{usedGB}/{totalGB} GB, {daysToFull} days to full at current rate" |
| slot_kind        | operational                                                        |
| priority_formula | `pct > 95 ? 95 : (pct > 90 ? 75 : (pct > 85 ? 45 : 0))`            |
| staleness_window | 6h                                                                 |
| dismiss_behavior | none                                                               |
| grouping_key     | resources                                                          |
| dependencies     | none                                                               |
| admin_module     | /admin/system                                                      |

---

#### Oldest Unread Message

| Field            | Value                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.oldest-unread-message`                                                    |
| category         | system-health                                                                                  |
| label            | Unread: {age} old                                                                              |
| description      | Age of the oldest unread system message or notification                                        |
| severity         | medium                                                                                         |
| data_source      | `notifications` table, `messages` table                                                        |
| query_hint       | `SELECT MIN(created_at) FROM notifications WHERE read_at IS NULL AND recipient_role = 'admin'` |
| threshold        | age > 4h                                                                                       |
| refresh_rate     | 15m                                                                                            |
| icon             | ✉️                                                                                             |
| presentation     | badge                                                                                          |
| action_label     | View Messages                                                                                  |
| href             | /admin/notifications                                                                           |
| eyebrow          | Communications                                                                                 |
| sublabel         | "{unreadCount} unread, oldest {age}"                                                           |
| slot_kind        | operational                                                                                    |
| priority_formula | `min(60, hoursOld * 5)`                                                                        |
| staleness_window | 30m                                                                                            |
| dismiss_behavior | snooze-1h                                                                                      |
| grouping_key     | communications                                                                                 |
| dependencies     | postgres                                                                                       |
| admin_module     | /admin/notifications                                                                           |

---

#### Owner Identity Warnings

| Field            | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.owner-identity-warnings`                                                 |
| category         | system-health                                                                                 |
| label            | Identity Warnings: {count}                                                                    |
| description      | Issues with owner/admin account configuration or permissions                                  |
| severity         | high                                                                                          |
| data_source      | `users` table, auth config                                                                    |
| query_hint       | `SELECT * FROM users WHERE role = 'admin' AND (email_verified IS NULL OR profile_incomplete)` |
| threshold        | count > 0                                                                                     |
| refresh_rate     | 6h                                                                                            |
| icon             | 🪪                                                                                            |
| presentation     | alert-row                                                                                     |
| action_label     | Fix Identity                                                                                  |
| href             | /admin/users                                                                                  |
| eyebrow          | Security                                                                                      |
| sublabel         | "{warnings}"                                                                                  |
| slot_kind        | audit                                                                                         |
| priority_formula | `count * 40`                                                                                  |
| staleness_window | 24h                                                                                           |
| dismiss_behavior | until-resolved                                                                                |
| grouping_key     | security                                                                                      |
| dependencies     | postgres                                                                                      |
| admin_module     | /admin/users                                                                                  |

---

#### QoL: Draft Restore Failures

| Field            | Value                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.qol-draft-restore`                                                                          |
| category         | system-health                                                                                                    |
| label            | Draft Restore Fails: {count}                                                                                     |
| description      | Users whose draft auto-save failed to restore in the last 24h                                                    |
| severity         | medium                                                                                                           |
| data_source      | client-side error logs, `silent_failures` table                                                                  |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE type = 'draft_restore' AND created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | count > 0                                                                                                        |
| refresh_rate     | 1h                                                                                                               |
| icon             | 📝                                                                                                               |
| presentation     | badge                                                                                                            |
| action_label     | View Failures                                                                                                    |
| href             | /admin/silent-failures                                                                                           |
| eyebrow          | Quality of Life                                                                                                  |
| sublabel         | "{count} lost drafts"                                                                                            |
| slot_kind        | diagnostic                                                                                                       |
| priority_formula | `min(55, count * 15)`                                                                                            |
| staleness_window | 6h                                                                                                               |
| dismiss_behavior | snooze-24h                                                                                                       |
| grouping_key     | qol                                                                                                              |
| dependencies     | postgres                                                                                                         |
| admin_module     | /admin/silent-failures                                                                                           |

---

#### QoL: Save Failures

| Field            | Value                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.qol-save-failures`                                                                         |
| category         | system-health                                                                                                   |
| label            | Save Failures: {count}                                                                                          |
| description      | Server action save operations that returned errors in the last 24h                                              |
| severity         | high                                                                                                            |
| data_source      | `silent_failures` table                                                                                         |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE type = 'save_failure' AND created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | count > 0                                                                                                       |
| refresh_rate     | 15m                                                                                                             |
| icon             | 💥                                                                                                              |
| presentation     | alert-row                                                                                                       |
| action_label     | View Failures                                                                                                   |
| href             | /admin/silent-failures                                                                                          |
| eyebrow          | Quality of Life                                                                                                 |
| sublabel         | "{count} failed saves, {affectedUsers} users affected"                                                          |
| slot_kind        | alert                                                                                                           |
| priority_formula | `min(80, count * 10)`                                                                                           |
| staleness_window | 1h                                                                                                              |
| dismiss_behavior | snooze-1h                                                                                                       |
| grouping_key     | qol                                                                                                             |
| dependencies     | postgres                                                                                                        |
| admin_module     | /admin/silent-failures                                                                                          |

---

#### QoL: Conflicts

| Field            | Value                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.qol-conflicts`                                                                         |
| category         | system-health                                                                                               |
| label            | Edit Conflicts: {count}                                                                                     |
| description      | Concurrent edit conflicts detected in the last 24h                                                          |
| severity         | medium                                                                                                      |
| data_source      | `silent_failures` table                                                                                     |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE type = 'conflict' AND created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | count > 3                                                                                                   |
| refresh_rate     | 1h                                                                                                          |
| icon             | ⚔️                                                                                                          |
| presentation     | badge                                                                                                       |
| action_label     | View Conflicts                                                                                              |
| href             | /admin/silent-failures                                                                                      |
| eyebrow          | Quality of Life                                                                                             |
| sublabel         | "{count} conflicts across {tables} tables"                                                                  |
| slot_kind        | diagnostic                                                                                                  |
| priority_formula | `min(50, count * 8)`                                                                                        |
| staleness_window | 6h                                                                                                          |
| dismiss_behavior | snooze-24h                                                                                                  |
| grouping_key     | qol                                                                                                         |
| dependencies     | postgres                                                                                                    |
| admin_module     | /admin/silent-failures                                                                                      |

---

#### QoL: Offline Replay Failures

| Field            | Value                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.qol-offline-replay`                                                                          |
| category         | system-health                                                                                                     |
| label            | Offline Replay Fails: {count}                                                                                     |
| description      | Queued offline actions that failed to replay when connectivity returned                                           |
| severity         | medium                                                                                                            |
| data_source      | `silent_failures` table                                                                                           |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE type = 'offline_replay' AND created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | count > 0                                                                                                         |
| refresh_rate     | 1h                                                                                                                |
| icon             | 📴                                                                                                                |
| presentation     | badge                                                                                                             |
| action_label     | View Failures                                                                                                     |
| href             | /admin/silent-failures                                                                                            |
| eyebrow          | Quality of Life                                                                                                   |
| sublabel         | "{count} actions lost"                                                                                            |
| slot_kind        | diagnostic                                                                                                        |
| priority_formula | `min(55, count * 15)`                                                                                             |
| staleness_window | 6h                                                                                                                |
| dismiss_behavior | snooze-24h                                                                                                        |
| grouping_key     | qol                                                                                                               |
| dependencies     | postgres                                                                                                          |
| admin_module     | /admin/silent-failures                                                                                            |

---

#### QoL: Duplicate Create Prevention Hits

| Field            | Value                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.qol-dupe-prevention`                                                                              |
| category         | system-health                                                                                                          |
| label            | Dupe Prevention: {count}                                                                                               |
| description      | Times the duplicate creation guard prevented double-submissions (last 24h)                                             |
| severity         | low                                                                                                                    |
| data_source      | application logs, `silent_failures` table                                                                              |
| query_hint       | `SELECT COUNT(*) FROM silent_failures WHERE type = 'duplicate_prevented' AND created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | count > 10 (may indicate UX issue)                                                                                     |
| refresh_rate     | 6h                                                                                                                     |
| icon             | 🛡️                                                                                                                     |
| presentation     | metric                                                                                                                 |
| action_label     | View Details                                                                                                           |
| href             | /admin/silent-failures                                                                                                 |
| eyebrow          | Quality of Life                                                                                                        |
| sublabel         | "{count} duplicates blocked"                                                                                           |
| slot_kind        | diagnostic                                                                                                             |
| priority_formula | `count > 50 ? 40 : (count > 10 ? 20 : 0)`                                                                              |
| staleness_window | 24h                                                                                                                    |
| dismiss_behavior | snooze-24h                                                                                                             |
| grouping_key     | qol                                                                                                                    |
| dependencies     | postgres                                                                                                               |
| admin_module     | /admin/silent-failures                                                                                                 |

---

#### Stripe Payment Mode

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| id               | `admin.system-health.stripe-mode`                           |
| category         | system-health                                               |
| label            | Stripe: {mode} Mode                                         |
| description      | Whether Stripe is in test or live mode, with key validation |
| severity         | critical                                                    |
| data_source      | `getPaymentHealthStats() in lib/admin/platform-stats.ts`    |
| query_hint       | `check STRIPE_SECRET_KEY prefix (sk_test_ vs sk_live_)`     |
| threshold        | Always show; critical if test mode in production            |
| refresh_rate     | 1h                                                          |
| icon             | 💳                                                          |
| presentation     | banner                                                      |
| action_label     | View Payment Config                                         |
| href             | /admin/system/payments                                      |
| eyebrow          | Payments                                                    |
| sublabel         | "Key validated: {status}"                                   |
| slot_kind        | operational                                                 |
| priority_formula | `testModeInProd ? 100 : 0`                                  |
| staleness_window | 6h                                                          |
| dismiss_behavior | none                                                        |
| grouping_key     | payments                                                    |
| dependencies     | stripe_api                                                  |
| admin_module     | /admin/system/payments                                      |

---

#### Circuit Breaker States

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| id               | `admin.system-health.circuit-breakers`                           |
| category         | system-health                                                    |
| label            | Circuit Breakers: {openCount} Open                               |
| description      | Services with tripped circuit breakers (requests being rejected) |
| severity         | critical                                                         |
| data_source      | `buildPublicHealthSnapshot() in lib/health/public-health.ts`     |
| query_hint       | `check circuit breaker state per service from health snapshot`   |
| threshold        | Any circuit breaker in open state                                |
| refresh_rate     | 1m                                                               |
| icon             | ⚡                                                               |
| presentation     | banner                                                           |
| action_label     | View Health                                                      |
| href             | /admin/system                                                    |
| eyebrow          | Circuit Breakers                                                 |
| sublabel         | "Open: {serviceList}"                                            |
| slot_kind        | alert                                                            |
| priority_formula | `openCount * 40`                                                 |
| staleness_window | 5m                                                               |
| dismiss_behavior | none                                                             |
| grouping_key     | service-health                                                   |
| dependencies     | health_endpoint                                                  |
| admin_module     | /admin/system                                                    |

---

#### AI Runtime Status

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| id               | `admin.system-health.ai-runtime`                              |
| category         | system-health                                                 |
| label            | AI Runtime: {status}                                          |
| description      | Ollama model availability and AI policy configuration status  |
| severity         | high                                                          |
| data_source      | `buildPublicHealthSnapshot() AI runtime policy check`         |
| query_hint       | `check ollama connectivity + model loaded + ai_policy config` |
| threshold        | AI unavailable or policy misconfigured                        |
| refresh_rate     | 5m                                                            |
| icon             | 🤖                                                            |
| presentation     | alert-row                                                     |
| action_label     | Check AI Config                                               |
| href             | /admin/system                                                 |
| eyebrow          | AI / Ollama                                                   |
| sublabel         | "Model: {modelName}, Latency: {avgMs}ms"                      |
| slot_kind        | operational                                                   |
| priority_formula | `unavailable ? 80 : (slow ? 40 : 0)`                          |
| staleness_window | 15m                                                           |
| dismiss_behavior | snooze-1h                                                     |
| grouping_key     | ai-runtime                                                    |
| dependencies     | ollama                                                        |
| admin_module     | /admin/system                                                 |

---

#### DB Boot Contract

| Field            | Value                                                |
| ---------------- | ---------------------------------------------------- |
| id               | `admin.system-health.db-boot-contract`               |
| category         | system-health                                        |
| label            | DB Contract: {status}                                |
| description      | Required tables and columns existence verification   |
| severity         | critical                                             |
| data_source      | `buildPublicHealthSnapshot() DB boot contract check` |
| query_hint       | `verify required tables/columns exist in pg_catalog` |
| threshold        | Any required table or column missing                 |
| refresh_rate     | 1h                                                   |
| icon             | 📐                                                   |
| presentation     | banner                                               |
| action_label     | View Schema Issues                                   |
| href             | /admin/system                                        |
| eyebrow          | Database                                             |
| sublabel         | "{missingCount} missing elements"                    |
| slot_kind        | alert                                                |
| priority_formula | `missing ? 100 : 0`                                  |
| staleness_window | 6h                                                   |
| dismiss_behavior | none                                                 |
| grouping_key     | database                                             |
| dependencies     | postgres                                             |
| admin_module     | /admin/system                                        |

---

#### Stripe Webhook Health

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| id               | `admin.system-health.stripe-webhooks`                         |
| category         | system-health                                                 |
| label            | Webhooks: {failCount} Failed                                  |
| description      | Recent Stripe webhook delivery failures                       |
| severity         | high                                                          |
| data_source      | `getPaymentHealthStats() webhook endpoint status`             |
| query_hint       | `webhook endpoints: count enabled, disabled, recent failures` |
| threshold        | failCount > 0 or any endpoint disabled                        |
| refresh_rate     | 15m                                                           |
| icon             | 🪝                                                            |
| presentation     | alert-row                                                     |
| action_label     | View Webhooks                                                 |
| href             | /admin/system/payments                                        |
| eyebrow          | Payments                                                      |
| sublabel         | "{enabledCount} enabled, {disabledCount} disabled"            |
| slot_kind        | alert                                                         |
| priority_formula | `failCount * 15 + disabledCount * 25`                         |
| staleness_window | 1h                                                            |
| dismiss_behavior | snooze-1h                                                     |
| grouping_key     | payments                                                      |
| dependencies     | stripe_api                                                    |
| admin_module     | /admin/system/payments                                        |

---

#### Platform Announcement Status

| Field            | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| id               | `admin.system-health.platform-announcement`                                                   |
| category         | system-health                                                                                 |
| label            | Banner: {status}                                                                              |
| description      | Whether a platform announcement banner is currently active and how long it has been displayed |
| severity         | info                                                                                          |
| data_source      | `getAnnouncement() in admin communications page`                                              |
| query_hint       | `check announcement table for active banner, calculate display duration`                      |
| threshold        | Active banner older than 7 days (may be stale)                                                |
| refresh_rate     | 6h                                                                                            |
| icon             | 📢                                                                                            |
| presentation     | pill                                                                                          |
| action_label     | Edit Banner                                                                                   |
| href             | /admin/communications                                                                         |
| eyebrow          | Comms                                                                                         |
| sublabel         | "Active {daysUp}d: {truncatedMessage}"                                                        |
| slot_kind        | operational                                                                                   |
| priority_formula | `daysUp > 14 ? 30 : (active ? 10 : 0)`                                                        |
| staleness_window | 24h                                                                                           |
| dismiss_behavior | permanent                                                                                     |
| grouping_key     | communications                                                                                |
| dependencies     | postgres                                                                                      |
| admin_module     | /admin/communications                                                                         |

---

#### Service Toggle State

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| id               | `admin.system-health.service-toggles`                         |
| category         | system-health                                                 |
| label            | Services: {disabledCount} Off                                 |
| description      | Platform services that are manually disabled via admin toggle |
| severity         | high                                                          |
| data_source      | `ServicesPanel in app/(admin)/admin/services/`                |
| query_hint       | `check service configuration for disabled services`           |
| threshold        | any service disabled                                          |
| refresh_rate     | 15m                                                           |
| icon             | 🔌                                                            |
| presentation     | alert-row                                                     |
| action_label     | Manage Services                                               |
| href             | /admin/services                                               |
| eyebrow          | Services                                                      |
| sublabel         | "Off: {disabledList}"                                         |
| slot_kind        | operational                                                   |
| priority_formula | `disabledCount * 25`                                          |
| staleness_window | 1h                                                            |
| dismiss_behavior | snooze-1h                                                     |
| grouping_key     | service-health                                                |
| dependencies     | postgres                                                      |
| admin_module     | /admin/services                                               |

---

### Category: Data Quality

---

#### PIE Sync: Last Timestamp

| Field            | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| id               | `admin.data-quality.pie-sync-timestamp`                              |
| category         | data-quality                                                         |
| label            | PIE Sync: {timeAgo}                                                  |
| description      | Time since last successful price data synchronization from Pi bridge |
| severity         | high                                                                 |
| data_source      | `price_sync_log` table, pi-bridge API                                |
| query_hint       | `SELECT MAX(synced_at) FROM price_sync_log`                          |
| threshold        | age > 6h                                                             |
| refresh_rate     | 15m                                                                  |
| icon             | 🔄                                                                   |
| presentation     | alert-row                                                            |
| action_label     | View Sync                                                            |
| href             | /admin/pricing-health                                                |
| eyebrow          | PIE Sync                                                             |
| sublabel         | "Last sync: {timestamp}, pulled {recordCount} records"               |
| slot_kind        | operational                                                          |
| priority_formula | `hoursOld > 24 ? 85 : (hoursOld > 6 ? 55 : 0)`                       |
| staleness_window | 1h                                                                   |
| dismiss_behavior | snooze-1h                                                            |
| grouping_key     | pie-sync                                                             |
| dependencies     | pi-bridge, postgres                                                  |
| admin_module     | /admin/pricing-health                                                |

---

#### PIE Sync: Coverage

| Field            | Value                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.pie-sync-coverage`                                                                               |
| category         | data-quality                                                                                                         |
| label            | PIE Coverage: {pct}%                                                                                                 |
| description      | Percentage of ingredient categories with active price data                                                           |
| severity         | medium                                                                                                               |
| data_source      | `prices` table, category registry                                                                                    |
| query_hint       | `SELECT COUNT(DISTINCT category) FROM prices WHERE updated_at > NOW() - INTERVAL '30 days' / total_categories * 100` |
| threshold        | pct < 80%                                                                                                            |
| refresh_rate     | 6h                                                                                                                   |
| icon             | 📈                                                                                                                   |
| presentation     | metric                                                                                                               |
| action_label     | View Coverage                                                                                                        |
| href             | /admin/pricing-coverage                                                                                              |
| eyebrow          | PIE Sync                                                                                                             |
| sublabel         | "{coveredCategories}/{totalCategories} categories covered"                                                           |
| slot_kind        | metric                                                                                                               |
| priority_formula | `pct < 50 ? 70 : (pct < 80 ? 40 : 0)`                                                                                |
| staleness_window | 24h                                                                                                                  |
| dismiss_behavior | snooze-24h                                                                                                           |
| grouping_key     | pie-sync                                                                                                             |
| dependencies     | postgres, pi-bridge                                                                                                  |
| admin_module     | /admin/pricing-coverage                                                                                              |

---

#### PIE Sync: Source Health

| Field            | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| id               | `admin.data-quality.pie-source-health`                               |
| category         | data-quality                                                         |
| label            | PIE Sources: {healthy}/{total}                                       |
| description      | Per-source status of price data feeds (scrapers, APIs, synthesizers) |
| severity         | high                                                                 |
| data_source      | OpenClaw source registry, pi-bridge health endpoint                  |
| query_hint       | `fetch('http://localhost:7700/sources').then(r => r.json())`         |
| threshold        | Any source down or stale > 48h                                       |
| refresh_rate     | 1h                                                                   |
| icon             | 🔌                                                                   |
| presentation     | card                                                                 |
| action_label     | View Sources                                                         |
| href             | /admin/pricing-health                                                |
| eyebrow          | PIE Sync                                                             |
| sublabel         | "Down: {downSources}; Stale: {staleSources}"                         |
| slot_kind        | operational                                                          |
| priority_formula | `downCount * 20 + staleCount * 10`                                   |
| staleness_window | 6h                                                                   |
| dismiss_behavior | snooze-1h                                                            |
| grouping_key     | pie-sync                                                             |
| dependencies     | pi-bridge                                                            |
| admin_module     | /admin/pricing-health                                                |

---

#### PIE Prediction Accuracy

| Field            | Value                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.pie-prediction-accuracy`                                                                           |
| category         | data-quality                                                                                                           |
| label            | PIE Accuracy: {pct}%                                                                                                   |
| description      | Overall percentage of price predictions within acceptable tolerance                                                    |
| severity         | medium                                                                                                                 |
| data_source      | `price_predictions` table, validation results                                                                          |
| query_hint       | `SELECT COUNT(CASE WHEN ABS(predicted - actual) / actual < 0.15 THEN 1 END) * 100.0 / COUNT(*) FROM price_validations` |
| threshold        | pct < 85%                                                                                                              |
| refresh_rate     | 6h                                                                                                                     |
| icon             | 🎯                                                                                                                     |
| presentation     | metric                                                                                                                 |
| action_label     | View Accuracy                                                                                                          |
| href             | /admin/pricing-health                                                                                                  |
| eyebrow          | PIE Quality                                                                                                            |
| sublabel         | "Tolerance: 15%, sample: {sampleSize}"                                                                                 |
| slot_kind        | metric                                                                                                                 |
| priority_formula | `pct < 70 ? 70 : (pct < 85 ? 40 : 0)`                                                                                  |
| staleness_window | 24h                                                                                                                    |
| dismiss_behavior | snooze-24h                                                                                                             |
| grouping_key     | pie-quality                                                                                                            |
| dependencies     | postgres                                                                                                               |
| admin_module     | /admin/pricing-health                                                                                                  |

---

#### PIE Prediction: MAE

| Field            | Value                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| id               | `admin.data-quality.pie-mae`                                                                                             |
| category         | data-quality                                                                                                             |
| label            | PIE MAE: ${value}                                                                                                        |
| description      | Mean absolute error of price predictions in dollars                                                                      |
| severity         | medium                                                                                                                   |
| data_source      | `price_predictions` table                                                                                                |
| query_hint       | `SELECT AVG(ABS(predicted_price - actual_price)) FROM price_validations WHERE validated_at > NOW() - INTERVAL '30 days'` |
| threshold        | MAE > $0.50                                                                                                              |
| refresh_rate     | daily                                                                                                                    |
| icon             | 📐                                                                                                                       |
| presentation     | metric                                                                                                                   |
| action_label     | View MAE Detail                                                                                                          |
| href             | /admin/pricing-health                                                                                                    |
| eyebrow          | PIE Quality                                                                                                              |
| sublabel         | "30d rolling, {sampleSize} comparisons"                                                                                  |
| slot_kind        | metric                                                                                                                   |
| priority_formula | `mae > 1.0 ? 60 : (mae > 0.5 ? 30 : 0)`                                                                                  |
| staleness_window | 48h                                                                                                                      |
| dismiss_behavior | snooze-24h                                                                                                               |
| grouping_key     | pie-quality                                                                                                              |
| dependencies     | postgres                                                                                                                 |
| admin_module     | /admin/pricing-health                                                                                                    |

---

#### PIE Receipt Ground Truth

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| id               | `admin.data-quality.pie-receipt-truth`                                       |
| category         | data-quality                                                                 |
| label            | Receipt Accuracy: {pct}%                                                     |
| description      | How well PIE prices match actual receipt line items                          |
| severity         | medium                                                                       |
| data_source      | `receipts` table, `price_predictions` table                                  |
| query_hint       | `compare receipt_line_items.price to resolve_price(ingredient, store, date)` |
| threshold        | pct < 80%                                                                    |
| refresh_rate     | daily                                                                        |
| icon             | 🧾                                                                           |
| presentation     | metric                                                                       |
| action_label     | View Comparisons                                                             |
| href             | /admin/pricing-health                                                        |
| eyebrow          | PIE Quality                                                                  |
| sublabel         | "{matchCount}/{totalCount} within tolerance"                                 |
| slot_kind        | metric                                                                       |
| priority_formula | `pct < 60 ? 65 : (pct < 80 ? 35 : 0)`                                        |
| staleness_window | 48h                                                                          |
| dismiss_behavior | snooze-24h                                                                   |
| grouping_key     | pie-quality                                                                  |
| dependencies     | postgres                                                                     |
| admin_module     | /admin/pricing-health                                                        |

---

#### PIE Region Reliability

| Field            | Value                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| id               | `admin.data-quality.pie-region-reliability`                               |
| category         | data-quality                                                              |
| label            | Regions: {pass}P/{watch}W/{fail}F                                         |
| description      | Region-level reliability status (pass, watch, fail) across coverage areas |
| severity         | high                                                                      |
| data_source      | `region_reliability` computed table                                       |
| query_hint       | `SELECT status, COUNT(*) FROM region_reliability GROUP BY status`         |
| threshold        | Any region in fail status                                                 |
| refresh_rate     | 6h                                                                        |
| icon             | 🗺️                                                                        |
| presentation     | card                                                                      |
| action_label     | View Regions                                                              |
| href             | /admin/pricing-coverage                                                   |
| eyebrow          | PIE Quality                                                               |
| sublabel         | "{failRegions} failing, {watchRegions} on watch"                          |
| slot_kind        | metric                                                                    |
| priority_formula | `failCount * 25 + watchCount * 5`                                         |
| staleness_window | 24h                                                                       |
| dismiss_behavior | snooze-24h                                                                |
| grouping_key     | pie-quality                                                               |
| dependencies     | postgres, pi-bridge                                                       |
| admin_module     | /admin/pricing-coverage                                                   |

---

#### PIE Chef Overrides

| Field            | Value                                                      |
| ---------------- | ---------------------------------------------------------- |
| id               | `admin.data-quality.pie-chef-overrides`                    |
| category         | data-quality                                               |
| label            | Chef Overrides: {count}                                    |
| description      | Number of active chef-submitted price overrides            |
| severity         | low                                                        |
| data_source      | `price_overrides` table                                    |
| query_hint       | `SELECT COUNT(*) FROM price_overrides WHERE active = true` |
| threshold        | count > 50 (may indicate systemic pricing issue)           |
| refresh_rate     | 6h                                                         |
| icon             | ✋                                                         |
| presentation     | metric                                                     |
| action_label     | View Overrides                                             |
| href             | /admin/pricing-health                                      |
| eyebrow          | PIE Feedback                                               |
| sublabel         | "{newThisWeek} new this week"                              |
| slot_kind        | metric                                                     |
| priority_formula | `count > 100 ? 45 : (count > 50 ? 25 : 0)`                 |
| staleness_window | 24h                                                        |
| dismiss_behavior | snooze-24h                                                 |
| grouping_key     | pie-feedback                                               |
| dependencies     | postgres                                                   |
| admin_module     | /admin/pricing-health                                      |

---

#### PIE Feedback Distribution

| Field            | Value                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.pie-feedback`                                                                                         |
| category         | data-quality                                                                                                              |
| label            | PIE Feedback: {total}                                                                                                     |
| description      | Chef feedback on price predictions: confirmed vs too-high vs too-low vs wrong-item                                        |
| severity         | low                                                                                                                       |
| data_source      | `price_feedback` table                                                                                                    |
| query_hint       | `SELECT feedback_type, COUNT(*) FROM price_feedback WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY feedback_type` |
| threshold        | too-high + too-low + wrong-item > 30% of total                                                                            |
| refresh_rate     | daily                                                                                                                     |
| icon             | 📊                                                                                                                        |
| presentation     | card                                                                                                                      |
| action_label     | View Feedback                                                                                                             |
| href             | /admin/pricing-health                                                                                                     |
| eyebrow          | PIE Feedback                                                                                                              |
| sublabel         | "{confirmed} ok, {tooHigh} high, {tooLow} low, {wrongItem} wrong"                                                         |
| slot_kind        | trend                                                                                                                     |
| priority_formula | `negativeRate > 50 ? 55 : (negativeRate > 30 ? 30 : 0)`                                                                   |
| staleness_window | 48h                                                                                                                       |
| dismiss_behavior | snooze-24h                                                                                                                |
| grouping_key     | pie-feedback                                                                                                              |
| dependencies     | postgres                                                                                                                  |
| admin_module     | /admin/pricing-health                                                                                                     |

---

#### Data Engine Sync: Last Pull

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| id               | `admin.data-quality.openclaw-sync-timestamp`                            |
| category         | data-quality                                                            |
| label            | Data Sync: {timeAgo}                                                    |
| description      | Time since last successful pull from the external data engine           |
| severity         | high                                                                    |
| data_source      | OpenClaw sync log, `data_sync_log` table                                |
| query_hint       | `SELECT MAX(completed_at) FROM data_sync_log WHERE source = 'openclaw'` |
| threshold        | age > 24h                                                               |
| refresh_rate     | 1h                                                                      |
| icon             | 🔄                                                                      |
| presentation     | alert-row                                                               |
| action_label     | View Sync Log                                                           |
| href             | /admin/openclaw                                                         |
| eyebrow          | External Sync                                                           |
| sublabel         | "Last pull: {timestamp}"                                                |
| slot_kind        | operational                                                             |
| priority_formula | `hoursOld > 48 ? 80 : (hoursOld > 24 ? 50 : 0)`                         |
| staleness_window | 6h                                                                      |
| dismiss_behavior | snooze-1h                                                               |
| grouping_key     | data-engine-sync                                                        |
| dependencies     | pi-bridge                                                               |
| admin_module     | /admin/openclaw                                                         |

---

#### Data Engine Sync: Record Counts

| Field            | Value                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.openclaw-sync-counts`                                                                            |
| category         | data-quality                                                                                                         |
| label            | Data Records: {total}                                                                                                |
| description      | Record counts across synced tables: prices, ingredients, products, stores                                            |
| severity         | low                                                                                                                  |
| data_source      | OpenClaw prices.db via pi-bridge                                                                                     |
| query_hint       | `SELECT 'prices' as t, COUNT(*) FROM prices UNION ALL SELECT 'ingredients', COUNT(*) FROM ingredients UNION ALL ...` |
| threshold        | Any count drops > 5% from previous sync                                                                              |
| refresh_rate     | 6h                                                                                                                   |
| icon             | 📦                                                                                                                   |
| presentation     | metric                                                                                                               |
| action_label     | View Counts                                                                                                          |
| href             | /admin/openclaw                                                                                                      |
| eyebrow          | External Sync                                                                                                        |
| sublabel         | "Prices: {prices}, Ingredients: {ingredients}, Products: {products}, Stores: {stores}"                               |
| slot_kind        | metric                                                                                                               |
| priority_formula | `anyDrop ? 60 : 0`                                                                                                   |
| staleness_window | 24h                                                                                                                  |
| dismiss_behavior | snooze-24h                                                                                                           |
| grouping_key     | data-engine-sync                                                                                                     |
| dependencies     | pi-bridge                                                                                                            |
| admin_module     | /admin/openclaw                                                                                                      |

---

#### Data Engine Sync: Freshness

| Field            | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| id               | `admin.data-quality.openclaw-sync-freshness`                             |
| category         | data-quality                                                             |
| label            | Data Freshness: {status}                                                 |
| description      | Per-table freshness check, how recently each synced table was updated    |
| severity         | medium                                                                   |
| data_source      | OpenClaw prices.db metadata                                              |
| query_hint       | `SELECT table_name, MAX(updated_at) FROM each_table GROUP BY table_name` |
| threshold        | Any table not updated in 7d                                              |
| refresh_rate     | 6h                                                                       |
| icon             | 🌿                                                                       |
| presentation     | card                                                                     |
| action_label     | View Freshness                                                           |
| href             | /admin/openclaw                                                          |
| eyebrow          | External Sync                                                            |
| sublabel         | "Stale: {staleTables}, Fresh: {freshTables}"                             |
| slot_kind        | audit                                                                    |
| priority_formula | `staleCount * 15`                                                        |
| staleness_window | 24h                                                                      |
| dismiss_behavior | snooze-24h                                                               |
| grouping_key     | data-engine-sync                                                         |
| dependencies     | pi-bridge                                                                |
| admin_module     | /admin/openclaw                                                          |

---

#### Hermes: Last Report

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- | ------- | ---------------- |
| id               | `admin.data-quality.hermes-last-report`             |
| category         | data-quality                                        |
| label            | Hermes Report: {timeAgo}                            |
| description      | Time since last Hermes morning report was generated |
| severity         | medium                                              |
| data_source      | `docs/hermes/` directory, file timestamps           |
| query_hint       | `ls -lt docs/hermes/\*.md                           | head -1 | parse timestamp` |
| threshold        | age > 36h                                           |
| refresh_rate     | 6h                                                  |
| icon             | 📰                                                  |
| presentation     | badge                                               |
| action_label     | View Reports                                        |
| href             | /admin/system                                       |
| eyebrow          | Hermes                                              |
| sublabel         | "Last: {reportDate}"                                |
| slot_kind        | operational                                         |
| priority_formula | `hoursOld > 48 ? 55 : (hoursOld > 36 ? 35 : 0)`     |
| staleness_window | 24h                                                 |
| dismiss_behavior | snooze-24h                                          |
| grouping_key     | hermes                                              |
| dependencies     | filesystem                                          |
| admin_module     | /admin/system                                       |

---

#### Hermes: Cron Health

| Field            | Value                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| id               | `admin.data-quality.hermes-cron-health`                                                             |
| category         | data-quality                                                                                        |
| label            | Hermes Cron: {healthy}/{total}                                                                      |
| description      | Health status of Hermes ~10 cron jobs (pass/fail breakdown). Note: 94 is Pi cron total, not Hermes. |
| severity         | high                                                                                                |
| data_source      | `hermes_report_files (docs/hermes/*.jsonl)`                                                         |
| query_hint       | `crontab -l                                                                                         | wc -l; check each job's last exit code` |
| threshold        | Any job failed in last run                                                                          |
| refresh_rate     | 1h                                                                                                  |
| icon             | ⏱️                                                                                                  |
| presentation     | alert-row                                                                                           |
| action_label     | View Cron Health                                                                                    |
| href             | /admin/system                                                                                       |
| eyebrow          | Hermes                                                                                              |
| sublabel         | "{failedCount} failed, {staleCount} stale"                                                          |
| slot_kind        | operational                                                                                         |
| priority_formula | `failedCount * 10 + staleCount * 5`                                                                 |
| staleness_window | 6h                                                                                                  |
| dismiss_behavior | snooze-1h                                                                                           |
| grouping_key     | hermes                                                                                              |
| dependencies     | filesystem                                                                                          |
| admin_module     | /admin/system                                                                                       |

---

#### CIL: Signal Backlog

| Field            | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.cil-signal-backlog`                                                           |
| category         | data-quality                                                                                      |
| label            | CIL Backlog: {count}                                                                              |
| description      | Unprocessed signals waiting in the Continuous Intelligence Layer queue                            |
| severity         | medium                                                                                            |
| data_source      | `cil_tenant_sqlite (per-tenant SQLite databases in lib/cil/). Cross-tenant aggregation required.` |
| query_hint       | `SELECT COUNT(*) FROM cil_signals WHERE processed_at IS NULL`                                     |
| threshold        | count > 100                                                                                       |
| refresh_rate     | 15m                                                                                               |
| icon             | 📥                                                                                                |
| presentation     | badge                                                                                             |
| action_label     | View Backlog                                                                                      |
| href             | /admin/system                                                                                     |
| eyebrow          | CIL                                                                                               |
| sublabel         | "{count} signals pending across {tenantCount} tenants"                                            |
| slot_kind        | operational                                                                                       |
| priority_formula | `count > 500 ? 60 : (count > 100 ? 35 : 0)`                                                       |
| staleness_window | 1h                                                                                                |
| dismiss_behavior | snooze-1h                                                                                         |
| grouping_key     | cil                                                                                               |
| dependencies     | filesystem                                                                                        |
| admin_module     | /admin/system                                                                                     |

---

#### CIL: Scanner Last Run

| Field            | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| id               | `admin.data-quality.cil-scanner-last-run`               |
| category         | data-quality                                            |
| label            | CIL Scanner: {timeAgo}                                  |
| description      | Time since the hourly CIL signal scanner last completed |
| severity         | medium                                                  |
| data_source      | CIL scanner log                                         |
| query_hint       | `SELECT MAX(completed_at) FROM cil_scanner_runs`        |
| threshold        | age > 2h (scanner runs hourly)                          |
| refresh_rate     | 15m                                                     |
| icon             | 🔍                                                      |
| presentation     | badge                                                   |
| action_label     | View Scanner                                            |
| href             | /admin/system                                           |
| eyebrow          | CIL                                                     |
| sublabel         | "Last scan: {timestamp}, processed {count} signals"     |
| slot_kind        | operational                                             |
| priority_formula | `hoursOld > 4 ? 55 : (hoursOld > 2 ? 30 : 0)`           |
| staleness_window | 2h                                                      |
| dismiss_behavior | snooze-1h                                               |
| grouping_key     | cil                                                     |
| dependencies     | filesystem                                              |
| admin_module     | /admin/system                                           |

---

#### CIL: Per-Tenant SQLite Health

| Field            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| id               | `admin.data-quality.cil-sqlite-health`                                      |
| category         | data-quality                                                                |
| label            | CIL DBs: {healthy}/{total}                                                  |
| description      | Health of per-tenant CIL SQLite databases (corruption, size, lock status)   |
| severity         | high                                                                        |
| data_source      | CIL SQLite files in `data/cil/`                                             |
| query_hint       | `for each tenant db: PRAGMA integrity_check; PRAGMA page_count * page_size` |
| threshold        | Any DB corrupt or locked > 5m                                               |
| refresh_rate     | 6h                                                                          |
| icon             | 🗄️                                                                          |
| presentation     | alert-row                                                                   |
| action_label     | View DB Health                                                              |
| href             | /admin/system                                                               |
| eyebrow          | CIL                                                                         |
| sublabel         | "{corruptCount} corrupt, {lockedCount} locked"                              |
| slot_kind        | diagnostic                                                                  |
| priority_formula | `corruptCount * 40 + lockedCount * 15`                                      |
| staleness_window | 12h                                                                         |
| dismiss_behavior | snooze-24h                                                                  |
| grouping_key     | cil                                                                         |
| dependencies     | filesystem                                                                  |
| admin_module     | /admin/system                                                               |

---

#### Data Completeness: High NULL Rate

| Field            | Value                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.null-rate-anomaly`                                                                |
| category         | data-quality                                                                                          |
| label            | NULL Anomaly: {table}.{column}                                                                        |
| description      | Table columns where NULL rate exceeds acceptable threshold                                            |
| severity         | medium                                                                                                |
| data_source      | postgres system catalog, computed scan                                                                |
| query_hint       | `SELECT column_name, COUNT(*) FILTER (WHERE col IS NULL) * 100.0 / COUNT(*) as null_pct FROM {table}` |
| threshold        | NULL rate > 30% on required-feeling columns                                                           |
| refresh_rate     | daily                                                                                                 |
| icon             | 🕳️                                                                                                    |
| presentation     | badge                                                                                                 |
| action_label     | View Data Gaps                                                                                        |
| href             | /admin/system                                                                                         |
| eyebrow          | Data Completeness                                                                                     |
| sublabel         | "{table}.{column}: {pct}% NULL ({count} rows)"                                                        |
| slot_kind        | audit                                                                                                 |
| priority_formula | `min(60, nullPct * 0.8)`                                                                              |
| staleness_window | 48h                                                                                                   |
| dismiss_behavior | snooze-24h                                                                                            |
| grouping_key     | data-completeness                                                                                     |
| dependencies     | postgres                                                                                              |
| admin_module     | /admin/system                                                                                         |

---

#### Stale Data: Unupdated Records

| Field            | Value                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.stale-records`                                                                            |
| category         | data-quality                                                                                                  |
| label            | Stale Records: {count}                                                                                        |
| description      | Records in key tables not updated within their expected freshness window                                      |
| severity         | low                                                                                                           |
| data_source      | postgres, configurable per-table window                                                                       |
| query_hint       | `SELECT table_name, COUNT(*) FROM {table} WHERE updated_at < NOW() - INTERVAL '{window}' GROUP BY table_name` |
| threshold        | count > configurable per-table threshold                                                                      |
| refresh_rate     | daily                                                                                                         |
| icon             | 🕸️                                                                                                            |
| presentation     | metric                                                                                                        |
| action_label     | View Stale Data                                                                                               |
| href             | /admin/system                                                                                                 |
| eyebrow          | Data Completeness                                                                                             |
| sublabel         | "Across {tableCount} tables"                                                                                  |
| slot_kind        | audit                                                                                                         |
| priority_formula | `min(40, staleTableCount * 8)`                                                                                |
| staleness_window | 48h                                                                                                           |
| dismiss_behavior | snooze-24h                                                                                                    |
| grouping_key     | data-completeness                                                                                             |
| dependencies     | postgres                                                                                                      |
| admin_module     | /admin/system                                                                                                 |

---

#### PIE Governor Status

| Field            | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| id               | `admin.data-quality.pie-governor`                                              |
| category         | data-quality                                                                   |
| label            | PIE Governor: {status}                                                         |
| description      | Price Intelligence Governor health metrics and trend data coverage             |
| severity         | medium                                                                         |
| data_source      | `getPricingCoverage() governor object in lib/admin/openclaw-health-actions.ts` |
| query_hint       | `governor.ingredientsWithTrend, governor.avgDataPoints, governor.freshLast24h` |
| threshold        | freshLast24h < 100 or avgDataPoints < 3                                        |
| refresh_rate     | 6h                                                                             |
| icon             | 📊                                                                             |
| presentation     | card                                                                           |
| action_label     | View Governor                                                                  |
| href             | /admin/pricing-health                                                          |
| eyebrow          | Price Intelligence                                                             |
| sublabel         | "{ingredientsWithTrend} trending, avg {avgDataPoints} data points"             |
| slot_kind        | metric                                                                         |
| priority_formula | `freshLast24h < 50 ? 60 : (avgDataPoints < 3 ? 40 : 10)`                       |
| staleness_window | 12h                                                                            |
| dismiss_behavior | snooze-24h                                                                     |
| grouping_key     | pie-health                                                                     |
| dependencies     | postgres, pi-bridge                                                            |
| admin_module     | /admin/pricing-health                                                          |

---

#### CIL Scanner Anomalies

| Field            | Value                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| id               | `admin.data-quality.cil-scanner-anomalies`                                                               |
| category         | data-quality                                                                                             |
| label            | CIL Anomalies: {count}                                                                                   |
| description      | Cross-tenant aggregate of CIL scanner findings (dormant clients, weakening relations, isolated entities) |
| severity         | medium                                                                                                   |
| data_source      | `scanGraph() in lib/cil/scanner.ts, per-tenant SQLite`                                                   |
| query_hint       | `aggregate CILInsight[] across tenant SQLite DBs WHERE type IN ('anomaly','drift','gap')`                |
| threshold        | count > 5 or any high-urgency anomaly                                                                    |
| refresh_rate     | 6h                                                                                                       |
| icon             | 🔍                                                                                                       |
| presentation     | badge                                                                                                    |
| action_label     | View Insights                                                                                            |
| href             | /admin/system                                                                                            |
| eyebrow          | Intelligence                                                                                             |
| sublabel         | "{anomalyCount} anomalies, {driftCount} drift, {gapCount} gaps"                                          |
| slot_kind        | diagnostic                                                                                               |
| priority_formula | `highUrgencyCount * 15 + count * 2`                                                                      |
| staleness_window | 12h                                                                                                      |
| dismiss_behavior | snooze-24h                                                                                               |
| grouping_key     | cil-health                                                                                               |
| dependencies     | cil_sqlite                                                                                               |
| admin_module     | /admin/system                                                                                            |

---

#### CIL High-Urgency Signals

| Field            | Value                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| id               | `admin.data-quality.cil-high-urgency`                                                                                          |
| category         | data-quality                                                                                                                   |
| label            | Urgent Signals: {count}                                                                                                        |
| description      | Cross-tenant proactive signals at urgency 4-5 from CIL analyzers (finance, clients, calendar, inventory, reputation, pipeline) |
| severity         | high                                                                                                                           |
| data_source      | `runAllAnalyzers() in lib/cil/analyzers/index.ts, per-tenant SQLite`                                                           |
| query_hint       | `aggregate ProactiveSignal[] across tenants WHERE urgency >= 4`                                                                |
| threshold        | count > 0                                                                                                                      |
| refresh_rate     | 1h                                                                                                                             |
| icon             | ⚠️                                                                                                                             |
| presentation     | alert-row                                                                                                                      |
| action_label     | View Signals                                                                                                                   |
| href             | /admin/system                                                                                                                  |
| eyebrow          | Intelligence                                                                                                                   |
| sublabel         | "Domains: {domainList}"                                                                                                        |
| slot_kind        | alert                                                                                                                          |
| priority_formula | `urgency5Count * 20 + urgency4Count * 10`                                                                                      |
| staleness_window | 6h                                                                                                                             |
| dismiss_behavior | snooze-24h                                                                                                                     |
| grouping_key     | cil-health                                                                                                                     |
| dependencies     | cil_sqlite                                                                                                                     |
| admin_module     | /admin/system                                                                                                                  |

---

### Category: User Health

---

#### New Signups: Today

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| id               | `admin.user-health.signups-today`                                  |
| category         | user-health                                                        |
| label            | Signups Today: {count}                                             |
| description      | Number of new user registrations today                             |
| severity         | info                                                               |
| data_source      | `users` table                                                      |
| query_hint       | `SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE` |
| threshold        | Always show                                                        |
| refresh_rate     | 15m                                                                |
| icon             | 🆕                                                                 |
| presentation     | metric                                                             |
| action_label     | View Users                                                         |
| href             | /admin/users                                                       |
| eyebrow          | Signups                                                            |
| sublabel         | "vs {yesterdayCount} yesterday"                                    |
| slot_kind        | metric                                                             |
| priority_formula | `10` (always low, info only)                                       |
| staleness_window | 30m                                                                |
| dismiss_behavior | permanent                                                          |
| grouping_key     | signups                                                            |
| dependencies     | postgres                                                           |
| admin_module     | /admin/users                                                       |

---

#### New Signups: This Week

| Field            | Value                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| id               | `admin.user-health.signups-week`                                                  |
| category         | user-health                                                                       |
| label            | Signups This Week: {count}                                                        |
| description      | New user registrations in the current calendar week                               |
| severity         | info                                                                              |
| data_source      | `users` table                                                                     |
| query_hint       | `SELECT COUNT(*) FROM users WHERE created_at >= date_trunc('week', CURRENT_DATE)` |
| threshold        | Always show                                                                       |
| refresh_rate     | 1h                                                                                |
| icon             | 📅                                                                                |
| presentation     | metric                                                                            |
| action_label     | View Users                                                                        |
| href             | /admin/users                                                                      |
| eyebrow          | Signups                                                                           |
| sublabel         | "vs {lastWeekCount} last week"                                                    |
| slot_kind        | metric                                                                            |
| priority_formula | `5`                                                                               |
| staleness_window | 6h                                                                                |
| dismiss_behavior | permanent                                                                         |
| grouping_key     | signups                                                                           |
| dependencies     | postgres                                                                          |
| admin_module     | /admin/users                                                                      |

---

#### New Signups: Week-over-Week Trend

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| id               | `admin.user-health.signups-wow-trend`                         |
| category         | user-health                                                   |
| label            | Signup Trend: {direction} {pct}%                              |
| description      | Week-over-week signup trend direction and percentage change   |
| severity         | low                                                           |
| data_source      | `users` table                                                 |
| query_hint       | `(this_week_count - last_week_count) / last_week_count * 100` |
| threshold        | Show if abs(pct) > 20%                                        |
| refresh_rate     | 6h                                                            |
| icon             | 📈                                                            |
| presentation     | pill                                                          |
| action_label     | View Trend                                                    |
| href             | /admin/analytics                                              |
| eyebrow          | Signups                                                       |
| sublabel         | "{thisWeek} vs {lastWeek}"                                    |
| slot_kind        | trend                                                         |
| priority_formula | `pct < -30 ? 45 : (pct > 50 ? 20 : 10)`                       |
| staleness_window | 24h                                                           |
| dismiss_behavior | snooze-24h                                                    |
| grouping_key     | signups                                                       |
| dependencies     | postgres                                                      |
| admin_module     | /admin/analytics                                              |

---

#### Chef Onboarding: Completion Rate

| Field            | Value                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| id               | `admin.user-health.chef-onboarding-completion`                                                         |
| category         | user-health                                                                                            |
| label            | Chef Onboarding: {pct}%                                                                                |
| description      | Percentage of chef accounts that completed the full onboarding flow                                    |
| severity         | medium                                                                                                 |
| data_source      | `users` table, onboarding state fields                                                                 |
| query_hint       | `SELECT COUNT(*) FILTER (WHERE onboarding_complete) * 100.0 / COUNT(*) FROM users WHERE role = 'chef'` |
| threshold        | pct < 60%                                                                                              |
| refresh_rate     | 6h                                                                                                     |
| icon             | 👨‍🍳                                                                                                     |
| presentation     | metric                                                                                                 |
| action_label     | View Onboarding                                                                                        |
| href             | /admin/beta/onboarding                                                                                 |
| eyebrow          | Onboarding                                                                                             |
| sublabel         | "{completeCount}/{totalCount} chefs"                                                                   |
| slot_kind        | metric                                                                                                 |
| priority_formula | `pct < 40 ? 55 : (pct < 60 ? 35 : 0)`                                                                  |
| staleness_window | 24h                                                                                                    |
| dismiss_behavior | snooze-24h                                                                                             |
| grouping_key     | onboarding                                                                                             |
| dependencies     | postgres                                                                                               |
| admin_module     | /admin/beta/onboarding                                                                                 |

---

#### Chef Onboarding: Dropoff Stage

| Field            | Value                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.chef-onboarding-dropoff`                                                                                                                   |
| category         | user-health                                                                                                                                                   |
| label            | Chef Dropoff: {stage}                                                                                                                                         |
| description      | The onboarding stage where chefs most frequently abandon the flow                                                                                             |
| severity         | medium                                                                                                                                                        |
| data_source      | `users` table, onboarding progress tracking                                                                                                                   |
| query_hint       | `SELECT last_completed_step, COUNT(*) FROM users WHERE role = 'chef' AND NOT onboarding_complete GROUP BY last_completed_step ORDER BY COUNT(*) DESC LIMIT 1` |
| threshold        | Any stage has > 30% dropoff rate                                                                                                                              |
| refresh_rate     | daily                                                                                                                                                         |
| icon             | 🚪                                                                                                                                                            |
| presentation     | card                                                                                                                                                          |
| action_label     | Analyze Dropoff                                                                                                                                               |
| href             | /admin/beta/onboarding                                                                                                                                        |
| eyebrow          | Onboarding                                                                                                                                                    |
| sublabel         | "{dropoffCount} chefs dropped at {stage}"                                                                                                                     |
| slot_kind        | trend                                                                                                                                                         |
| priority_formula | `dropoffRate > 50 ? 50 : (dropoffRate > 30 ? 30 : 0)`                                                                                                         |
| staleness_window | 48h                                                                                                                                                           |
| dismiss_behavior | snooze-24h                                                                                                                                                    |
| grouping_key     | onboarding                                                                                                                                                    |
| dependencies     | postgres                                                                                                                                                      |
| admin_module     | /admin/beta/onboarding                                                                                                                                        |

---

#### Client Onboarding: Completion Rate

| Field            | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| id               | `admin.user-health.client-onboarding-completion`                                |
| category         | user-health                                                                     |
| label            | Client Onboarding: {pct}%                                                       |
| description      | Percentage of client accounts that completed setup                              |
| severity         | medium                                                                          |
| data_source      | `clients` table, onboarding state                                               |
| query_hint       | `SELECT COUNT(*) FILTER (WHERE setup_complete) * 100.0 / COUNT(*) FROM clients` |
| threshold        | pct < 50%                                                                       |
| refresh_rate     | 6h                                                                              |
| icon             | 👤                                                                              |
| presentation     | metric                                                                          |
| action_label     | View Client Setup                                                               |
| href             | /admin/clients                                                                  |
| eyebrow          | Onboarding                                                                      |
| sublabel         | "{completeCount}/{totalCount} clients"                                          |
| slot_kind        | metric                                                                          |
| priority_formula | `pct < 30 ? 50 : (pct < 50 ? 30 : 0)`                                           |
| staleness_window | 24h                                                                             |
| dismiss_behavior | snooze-24h                                                                      |
| grouping_key     | onboarding                                                                      |
| dependencies     | postgres                                                                        |
| admin_module     | /admin/clients                                                                  |

---

#### Client Onboarding: Dropoff Stage

| Field            | Value                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.client-onboarding-dropoff`                                                                        |
| category         | user-health                                                                                                          |
| label            | Client Dropoff: {stage}                                                                                              |
| description      | Where clients most frequently abandon the onboarding flow                                                            |
| severity         | medium                                                                                                               |
| data_source      | `clients` table, onboarding tracking                                                                                 |
| query_hint       | `SELECT last_step, COUNT(*) FROM clients WHERE NOT setup_complete GROUP BY last_step ORDER BY COUNT(*) DESC LIMIT 1` |
| threshold        | Any stage > 30% dropoff                                                                                              |
| refresh_rate     | daily                                                                                                                |
| icon             | 🚪                                                                                                                   |
| presentation     | card                                                                                                                 |
| action_label     | Analyze Dropoff                                                                                                      |
| href             | /admin/clients                                                                                                       |
| eyebrow          | Onboarding                                                                                                           |
| sublabel         | "{count} clients stopped at {stage}"                                                                                 |
| slot_kind        | trend                                                                                                                |
| priority_formula | `dropoffRate > 50 ? 45 : (dropoffRate > 30 ? 25 : 0)`                                                                |
| staleness_window | 48h                                                                                                                  |
| dismiss_behavior | snooze-24h                                                                                                           |
| grouping_key     | onboarding                                                                                                           |
| dependencies     | postgres                                                                                                             |
| admin_module     | /admin/clients                                                                                                       |

---

#### Dormant Users: 30d+

| Field            | Value                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.dormant-30d`                                                                               |
| category         | user-health                                                                                                   |
| label            | Dormant 30d: {count}                                                                                          |
| description      | Users with no activity in the last 30 days                                                                    |
| severity         | low                                                                                                           |
| data_source      | `users` table, `sessions` or `activity_log`                                                                   |
| query_hint       | `SELECT COUNT(*) FROM users WHERE last_active_at < NOW() - INTERVAL '30 days' AND last_active_at IS NOT NULL` |
| threshold        | count > 0 (always show as info)                                                                               |
| refresh_rate     | daily                                                                                                         |
| icon             | 💤                                                                                                            |
| presentation     | metric                                                                                                        |
| action_label     | View Dormant                                                                                                  |
| href             | /admin/pulse                                                                                                  |
| eyebrow          | Retention                                                                                                     |
| sublabel         | "{pct}% of active users"                                                                                      |
| slot_kind        | trend                                                                                                         |
| priority_formula | `pct > 50 ? 40 : (pct > 25 ? 20 : 5)`                                                                         |
| staleness_window | 48h                                                                                                           |
| dismiss_behavior | snooze-24h                                                                                                    |
| grouping_key     | dormant                                                                                                       |
| dependencies     | postgres                                                                                                      |
| admin_module     | /admin/pulse                                                                                                  |

---

#### Dormant Users: 60d+

| Field            | Value                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.dormant-60d`                                                                               |
| category         | user-health                                                                                                   |
| label            | Dormant 60d: {count}                                                                                          |
| description      | Users with no activity in the last 60 days                                                                    |
| severity         | medium                                                                                                        |
| data_source      | `users` table, activity tracking                                                                              |
| query_hint       | `SELECT COUNT(*) FROM users WHERE last_active_at < NOW() - INTERVAL '60 days' AND last_active_at IS NOT NULL` |
| threshold        | count > 0                                                                                                     |
| refresh_rate     | daily                                                                                                         |
| icon             | 😴                                                                                                            |
| presentation     | metric                                                                                                        |
| action_label     | View Dormant                                                                                                  |
| href             | /admin/pulse                                                                                                  |
| eyebrow          | Retention                                                                                                     |
| sublabel         | "{pct}% of total users"                                                                                       |
| slot_kind        | trend                                                                                                         |
| priority_formula | `pct > 40 ? 50 : (pct > 20 ? 30 : 10)`                                                                        |
| staleness_window | 48h                                                                                                           |
| dismiss_behavior | snooze-24h                                                                                                    |
| grouping_key     | dormant                                                                                                       |
| dependencies     | postgres                                                                                                      |
| admin_module     | /admin/pulse                                                                                                  |

---

#### Dormant Users: 90d+

| Field            | Value                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.dormant-90d`                                                                               |
| category         | user-health                                                                                                   |
| label            | Dormant 90d: {count}                                                                                          |
| description      | Users with no activity in 90+ days; likely churned                                                            |
| severity         | medium                                                                                                        |
| data_source      | `users` table, activity tracking                                                                              |
| query_hint       | `SELECT COUNT(*) FROM users WHERE last_active_at < NOW() - INTERVAL '90 days' AND last_active_at IS NOT NULL` |
| threshold        | count > 0                                                                                                     |
| refresh_rate     | daily                                                                                                         |
| icon             | 🪦                                                                                                            |
| presentation     | metric                                                                                                        |
| action_label     | View Churned                                                                                                  |
| href             | /admin/pulse                                                                                                  |
| eyebrow          | Retention                                                                                                     |
| sublabel         | "{count} users, {pct}% of total"                                                                              |
| slot_kind        | trend                                                                                                         |
| priority_formula | `pct > 30 ? 55 : (pct > 15 ? 35 : 10)`                                                                        |
| staleness_window | 48h                                                                                                           |
| dismiss_behavior | snooze-24h                                                                                                    |
| grouping_key     | dormant                                                                                                       |
| dependencies     | postgres                                                                                                      |
| admin_module     | /admin/pulse                                                                                                  |

---

#### Churn Signals

| Field            | Value                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.churn-signals`                                                                                                                          |
| category         | user-health                                                                                                                                                |
| label            | Churn Signals: {count}                                                                                                                                     |
| description      | Users who started a workflow but stopped mid-process (abandoned event creation, incomplete quote, etc.)                                                    |
| severity         | medium                                                                                                                                                     |
| data_source      | `events` table, `quotes` table, activity tracking                                                                                                          |
| query_hint       | `SELECT COUNT(DISTINCT user_id) FROM events WHERE status = 'draft' AND updated_at < NOW() - INTERVAL '7 days' AND updated_at > NOW() - INTERVAL '30 days'` |
| threshold        | count > 5                                                                                                                                                  |
| refresh_rate     | daily                                                                                                                                                      |
| icon             | 🚨                                                                                                                                                         |
| presentation     | card                                                                                                                                                       |
| action_label     | View At-Risk                                                                                                                                               |
| href             | /admin/pulse                                                                                                                                               |
| eyebrow          | Retention                                                                                                                                                  |
| sublabel         | "Most common: {topAbandonedWorkflow}"                                                                                                                      |
| slot_kind        | trend                                                                                                                                                      |
| priority_formula | `min(60, count * 5)`                                                                                                                                       |
| staleness_window | 48h                                                                                                                                                        |
| dismiss_behavior | snooze-24h                                                                                                                                                 |
| grouping_key     | churn                                                                                                                                                      |
| dependencies     | postgres                                                                                                                                                   |
| admin_module     | /admin/pulse                                                                                                                                               |

---

#### User Feedback: Unread

| Field            | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| id               | `admin.user-health.feedback-unread`                    |
| category         | user-health                                            |
| label            | Unread Feedback: {count}                               |
| description      | User-submitted feedback or complaints not yet reviewed |
| severity         | high                                                   |
| data_source      | `feedback` table                                       |
| query_hint       | `SELECT COUNT(*) FROM feedback WHERE read_at IS NULL`  |
| threshold        | count > 0                                              |
| refresh_rate     | 15m                                                    |
| icon             | 💬                                                     |
| presentation     | badge                                                  |
| action_label     | Read Feedback                                          |
| href             | /admin/feedback                                        |
| eyebrow          | Feedback                                               |
| sublabel         | "Oldest: {oldestAge}"                                  |
| slot_kind        | operational                                            |
| priority_formula | `min(70, count * 10 + oldestHours * 2)`                |
| staleness_window | 1h                                                     |
| dismiss_behavior | none                                                   |
| grouping_key     | feedback                                               |
| dependencies     | postgres                                               |
| admin_module     | /admin/feedback                                        |

---

#### Support Requests: Open

| Field            | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| id               | `admin.user-health.support-open`                                               |
| category         | user-health                                                                    |
| label            | Open Support: {count}                                                          |
| description      | Support requests awaiting resolution                                           |
| severity         | high                                                                           |
| data_source      | `support_requests` or `feedback` table filtered by type                        |
| query_hint       | `SELECT COUNT(*) FROM feedback WHERE type = 'support' AND resolved_at IS NULL` |
| threshold        | count > 0                                                                      |
| refresh_rate     | 15m                                                                            |
| icon             | 🎫                                                                             |
| presentation     | badge                                                                          |
| action_label     | View Support                                                                   |
| href             | /admin/feedback                                                                |
| eyebrow          | Support                                                                        |
| sublabel         | "{count} open, oldest: {oldestAge}"                                            |
| slot_kind        | operational                                                                    |
| priority_formula | `min(75, count * 12 + oldestHours * 3)`                                        |
| staleness_window | 1h                                                                             |
| dismiss_behavior | none                                                                           |
| grouping_key     | feedback                                                                       |
| dependencies     | postgres                                                                       |
| admin_module     | /admin/feedback                                                                |

---

#### Active Sessions

| Field            | Value                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.active-sessions`                                                                   |
| category         | user-health                                                                                           |
| label            | Active: {count} users                                                                                 |
| description      | Currently active user sessions                                                                        |
| severity         | info                                                                                                  |
| data_source      | `sessions` table, presence tracking                                                                   |
| query_hint       | `SELECT COUNT(*) FROM sessions WHERE expires > NOW() AND last_active > NOW() - INTERVAL '15 minutes'` |
| threshold        | Always show                                                                                           |
| refresh_rate     | 5m                                                                                                    |
| icon             | 🟢                                                                                                    |
| presentation     | metric                                                                                                |
| action_label     | View Presence                                                                                         |
| href             | /admin/presence                                                                                       |
| eyebrow          | Live                                                                                                  |
| sublabel         | "{chefCount} chefs, {clientCount} clients"                                                            |
| slot_kind        | metric                                                                                                |
| priority_formula | `5` (always info)                                                                                     |
| staleness_window | 15m                                                                                                   |
| dismiss_behavior | permanent                                                                                             |
| grouping_key     | sessions                                                                                              |
| dependencies     | postgres                                                                                              |
| admin_module     | /admin/presence                                                                                       |

---

#### User Errors: Repeated Failures

| Field            | Value                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.repeated-failures`                                                                                                              |
| category         | user-health                                                                                                                                        |
| label            | User Struggles: {count}                                                                                                                            |
| description      | Users experiencing repeated action failures (3+ failures on the same action in 1h)                                                                 |
| severity         | high                                                                                                                                               |
| data_source      | `silent_failures` table, grouped by user                                                                                                           |
| query_hint       | `SELECT user_id, action, COUNT(*) FROM silent_failures WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY user_id, action HAVING COUNT(*) >= 3` |
| threshold        | count > 0                                                                                                                                          |
| refresh_rate     | 15m                                                                                                                                                |
| icon             | 🔁                                                                                                                                                 |
| presentation     | alert-row                                                                                                                                          |
| action_label     | View Struggles                                                                                                                                     |
| href             | /admin/silent-failures                                                                                                                             |
| eyebrow          | User Experience                                                                                                                                    |
| sublabel         | "{userCount} users stuck, most common: {topAction}"                                                                                                |
| slot_kind        | alert                                                                                                                                              |
| priority_formula | `min(75, userCount * 15)`                                                                                                                          |
| staleness_window | 30m                                                                                                                                                |
| dismiss_behavior | snooze-1h                                                                                                                                          |
| grouping_key     | user-errors                                                                                                                                        |
| dependencies     | postgres                                                                                                                                           |
| admin_module     | /admin/silent-failures                                                                                                                             |

---

#### Feedback Sentiment Distribution

| Field            | Value                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.feedback-sentiment`                                                                           |
| category         | user-health                                                                                                      |
| label            | Feedback: {negativeCount} Negative                                                                               |
| description      | User feedback sentiment breakdown (positive, negative, neutral) from last 30 days                                |
| severity         | medium                                                                                                           |
| data_source      | `user_feedback table`                                                                                            |
| query_hint       | `SELECT sentiment, COUNT(*) FROM user_feedback WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY sentiment` |
| threshold        | negativeCount > 3 in 7 days or negative rate > 30%                                                               |
| refresh_rate     | 6h                                                                                                               |
| icon             | 😤                                                                                                               |
| presentation     | card                                                                                                             |
| action_label     | View Feedback                                                                                                    |
| href             | /admin/feedback                                                                                                  |
| eyebrow          | User Sentiment                                                                                                   |
| sublabel         | "{positiveCount} positive, {neutralCount} neutral, {negativeCount} negative"                                     |
| slot_kind        | trend                                                                                                            |
| priority_formula | `negativePct > 50 ? 60 : (negativeCount > 5 ? 40 : 10)`                                                          |
| staleness_window | 24h                                                                                                              |
| dismiss_behavior | snooze-24h                                                                                                       |
| grouping_key     | user-feedback                                                                                                    |
| dependencies     | postgres                                                                                                         |
| admin_module     | /admin/feedback                                                                                                  |

---

#### Security/Malicious Reports

| Field            | Value                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| id               | `admin.user-health.security-reports`                                                                            |
| category         | user-health                                                                                                     |
| label            | Security Reports: {count}                                                                                       |
| description      | User-submitted reports flagged as security, abuse, or malicious content                                         |
| severity         | critical                                                                                                        |
| data_source      | `user_feedback table WHERE category = 'security'`                                                               |
| query_hint       | `SELECT COUNT(*) FROM user_feedback WHERE category IN ('security','abuse','malicious') AND resolved_at IS NULL` |
| threshold        | count > 0                                                                                                       |
| refresh_rate     | 5m                                                                                                              |
| icon             | 🛡️                                                                                                              |
| presentation     | banner                                                                                                          |
| action_label     | Review Now                                                                                                      |
| href             | /admin/feedback                                                                                                 |
| eyebrow          | SECURITY                                                                                                        |
| sublabel         | "Oldest: {oldestAge}"                                                                                           |
| slot_kind        | alert                                                                                                           |
| priority_formula | `100`                                                                                                           |
| staleness_window | 15m                                                                                                             |
| dismiss_behavior | none                                                                                                            |
| grouping_key     | security                                                                                                        |
| dependencies     | postgres                                                                                                        |
| admin_module     | /admin/feedback                                                                                                 |

---

#### Cannabis Tier Queue

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| id               | `admin.user-health.cannabis-queue`                                    |
| category         | user-health                                                           |
| label            | Cannabis Pending: {count}                                             |
| description      | Pending cannabis tier invite approvals and active cannabis user count |
| severity         | low                                                                   |
| data_source      | `getPendingInvites(), getAllCannabisUsers() in admin cannabis page`   |
| query_hint       | `SELECT COUNT(*) FROM cannabis_invites WHERE status = 'pending'`      |
| threshold        | pendingCount > 0                                                      |
| refresh_rate     | 6h                                                                    |
| icon             | 🌿                                                                    |
| presentation     | badge                                                                 |
| action_label     | Review Invites                                                        |
| href             | /admin/cannabis                                                       |
| eyebrow          | Cannabis                                                              |
| sublabel         | "{activeCount} active users, {pendingCount} pending"                  |
| slot_kind        | operational                                                           |
| priority_formula | `pendingCount * 10`                                                   |
| staleness_window | 24h                                                                   |
| dismiss_behavior | snooze-24h                                                            |
| grouping_key     | cannabis                                                              |
| dependencies     | postgres                                                              |
| admin_module     | /admin/cannabis                                                       |

---

### Category: Business Metrics

---

#### Revenue: Today

| Field            | Value                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.revenue-today`                                                              |
| category         | business-metrics                                                                                    |
| label            | Today: ${amount}                                                                                    |
| description      | Total revenue captured today                                                                        |
| severity         | info                                                                                                |
| data_source      | `ledger_entries` table, Stripe                                                                      |
| query_hint       | `SELECT SUM(amount) FROM ledger_entries WHERE type = 'payment' AND created_at::date = CURRENT_DATE` |
| threshold        | Always show                                                                                         |
| refresh_rate     | 15m                                                                                                 |
| icon             | 💰                                                                                                  |
| presentation     | metric                                                                                              |
| action_label     | View Financials                                                                                     |
| href             | /admin/financials                                                                                   |
| eyebrow          | Revenue                                                                                             |
| sublabel         | "vs ${yesterdayAmount} yesterday"                                                                   |
| slot_kind        | metric                                                                                              |
| priority_formula | `10`                                                                                                |
| staleness_window | 1h                                                                                                  |
| dismiss_behavior | permanent                                                                                           |
| grouping_key     | revenue                                                                                             |
| dependencies     | postgres                                                                                            |
| admin_module     | /admin/financials                                                                                   |

---

#### Revenue: This Week

| Field            | Value                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| id               | `admin.business-metrics.revenue-week`                                                                              |
| category         | business-metrics                                                                                                   |
| label            | This Week: ${amount}                                                                                               |
| description      | Total revenue captured in the current calendar week                                                                |
| severity         | info                                                                                                               |
| data_source      | `ledger_entries` table                                                                                             |
| query_hint       | `SELECT SUM(amount) FROM ledger_entries WHERE type = 'payment' AND created_at >= date_trunc('week', CURRENT_DATE)` |
| threshold        | Always show                                                                                                        |
| refresh_rate     | 1h                                                                                                                 |
| icon             | 💰                                                                                                                 |
| presentation     | metric                                                                                                             |
| action_label     | View Financials                                                                                                    |
| href             | /admin/financials                                                                                                  |
| eyebrow          | Revenue                                                                                                            |
| sublabel         | "vs ${lastWeekAmount} last week"                                                                                   |
| slot_kind        | metric                                                                                                             |
| priority_formula | `8`                                                                                                                |
| staleness_window | 6h                                                                                                                 |
| dismiss_behavior | permanent                                                                                                          |
| grouping_key     | revenue                                                                                                            |
| dependencies     | postgres                                                                                                           |
| admin_module     | /admin/financials                                                                                                  |

---

#### Revenue: This Month

| Field            | Value                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.revenue-month`                                                                              |
| category         | business-metrics                                                                                                    |
| label            | This Month: ${amount}                                                                                               |
| description      | Total revenue captured in the current calendar month                                                                |
| severity         | info                                                                                                                |
| data_source      | `ledger_entries` table                                                                                              |
| query_hint       | `SELECT SUM(amount) FROM ledger_entries WHERE type = 'payment' AND created_at >= date_trunc('month', CURRENT_DATE)` |
| threshold        | Always show                                                                                                         |
| refresh_rate     | 6h                                                                                                                  |
| icon             | 💰                                                                                                                  |
| presentation     | metric                                                                                                              |
| action_label     | View Financials                                                                                                     |
| href             | /admin/financials                                                                                                   |
| eyebrow          | Revenue                                                                                                             |
| sublabel         | "{daysRemaining} days remaining"                                                                                    |
| slot_kind        | metric                                                                                                              |
| priority_formula | `8`                                                                                                                 |
| staleness_window | 24h                                                                                                                 |
| dismiss_behavior | permanent                                                                                                           |
| grouping_key     | revenue                                                                                                             |
| dependencies     | postgres                                                                                                            |
| admin_module     | /admin/financials                                                                                                   |

---

#### Revenue: Month-over-Month Trend

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| id               | `admin.business-metrics.revenue-mom-trend`                     |
| category         | business-metrics                                               |
| label            | Revenue Trend: {direction} {pct}%                              |
| description      | Month-over-month revenue change, prorated to same day of month |
| severity         | low                                                            |
| data_source      | `ledger_entries` table                                         |
| query_hint       | `this_month_to_date / last_month_same_days * 100 - 100`        |
| threshold        | Show if abs(pct) > 15%                                         |
| refresh_rate     | daily                                                          |
| icon             | 📈                                                             |
| presentation     | pill                                                           |
| action_label     | View Trend                                                     |
| href             | /admin/financials                                              |
| eyebrow          | Revenue                                                        |
| sublabel         | "${thisMonth} vs ${lastMonthProrated}"                         |
| slot_kind        | trend                                                          |
| priority_formula | `pct < -25 ? 55 : (pct > 50 ? 15 : 10)`                        |
| staleness_window | 48h                                                            |
| dismiss_behavior | snooze-24h                                                     |
| grouping_key     | revenue                                                        |
| dependencies     | postgres                                                       |
| admin_module     | /admin/financials                                              |

---

#### GMV: This Month

| Field            | Value                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.gmv-month`                                                                                                     |
| category         | business-metrics                                                                                                                       |
| label            | GMV: ${amount}                                                                                                                         |
| description      | Gross merchandise value (total booking value) processed through the platform this month                                                |
| severity         | info                                                                                                                                   |
| data_source      | `events` table, `quotes` table                                                                                                         |
| query_hint       | `SELECT SUM(total_amount) FROM events WHERE status IN ('confirmed','completed') AND completed_at >= date_trunc('month', CURRENT_DATE)` |
| threshold        | Always show                                                                                                                            |
| refresh_rate     | 6h                                                                                                                                     |
| icon             | 🏦                                                                                                                                     |
| presentation     | metric                                                                                                                                 |
| action_label     | View GMV                                                                                                                               |
| href             | /admin/financials                                                                                                                      |
| eyebrow          | Volume                                                                                                                                 |
| sublabel         | "Across {eventCount} events"                                                                                                           |
| slot_kind        | metric                                                                                                                                 |
| priority_formula | `5`                                                                                                                                    |
| staleness_window | 24h                                                                                                                                    |
| dismiss_behavior | permanent                                                                                                                              |
| grouping_key     | volume                                                                                                                                 |
| dependencies     | postgres                                                                                                                               |
| admin_module     | /admin/financials                                                                                                                      |

---

#### Average Booking Value

| Field            | Value                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.avg-booking-value`                                                                                   |
| category         | business-metrics                                                                                                             |
| label            | Avg Booking: ${amount}                                                                                                       |
| description      | Average event booking value over the rolling 30-day window                                                                   |
| severity         | info                                                                                                                         |
| data_source      | `events` table                                                                                                               |
| query_hint       | `SELECT AVG(total_amount) FROM events WHERE status IN ('confirmed','completed') AND created_at > NOW() - INTERVAL '30 days'` |
| threshold        | Always show                                                                                                                  |
| refresh_rate     | daily                                                                                                                        |
| icon             | 📊                                                                                                                           |
| presentation     | metric                                                                                                                       |
| action_label     | View Bookings                                                                                                                |
| href             | /admin/financials                                                                                                            |
| eyebrow          | Volume                                                                                                                       |
| sublabel         | "30d rolling, {eventCount} events"                                                                                           |
| slot_kind        | metric                                                                                                                       |
| priority_formula | `5`                                                                                                                          |
| staleness_window | 48h                                                                                                                          |
| dismiss_behavior | permanent                                                                                                                    |
| grouping_key     | volume                                                                                                                       |
| dependencies     | postgres                                                                                                                     |
| admin_module     | /admin/financials                                                                                                            |

---

#### Quote Acceptance Rate

| Field            | Value                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.quote-acceptance-rate`                                                                                    |
| category         | business-metrics                                                                                                                  |
| label            | Quote Accept: {pct}%                                                                                                              |
| description      | Percentage of quotes accepted by clients in the rolling 30-day window                                                             |
| severity         | medium                                                                                                                            |
| data_source      | `quotes` table, `quote_state_transitions` table                                                                                   |
| query_hint       | `SELECT COUNT(*) FILTER (WHERE status = 'accepted') * 100.0 / COUNT(*) FROM quotes WHERE created_at > NOW() - INTERVAL '30 days'` |
| threshold        | pct < 50%                                                                                                                         |
| refresh_rate     | daily                                                                                                                             |
| icon             | ✅                                                                                                                                |
| presentation     | metric                                                                                                                            |
| action_label     | View Quotes                                                                                                                       |
| href             | /admin/financials                                                                                                                 |
| eyebrow          | Conversion                                                                                                                        |
| sublabel         | "{acceptedCount}/{totalCount} quotes"                                                                                             |
| slot_kind        | metric                                                                                                                            |
| priority_formula | `pct < 30 ? 55 : (pct < 50 ? 30 : 5)`                                                                                             |
| staleness_window | 48h                                                                                                                               |
| dismiss_behavior | snooze-24h                                                                                                                        |
| grouping_key     | conversion                                                                                                                        |
| dependencies     | postgres                                                                                                                          |
| admin_module     | /admin/financials                                                                                                                 |

---

#### Top Performing Chefs

| Field            | Value                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.top-chefs`                                                                                                                                            |
| category         | business-metrics                                                                                                                                                              |
| label            | Top Chef: {chefName}                                                                                                                                                          |
| description      | Highest revenue chef in the last 30 days                                                                                                                                      |
| severity         | info                                                                                                                                                                          |
| data_source      | `events` table, `users` table                                                                                                                                                 |
| query_hint       | `SELECT u.name, SUM(e.total_amount) FROM events e JOIN users u ON e.chef_id = u.id WHERE e.completed_at > NOW() - INTERVAL '30 days' GROUP BY u.id ORDER BY SUM DESC LIMIT 5` |
| threshold        | Always show (info)                                                                                                                                                            |
| refresh_rate     | daily                                                                                                                                                                         |
| icon             | 🏆                                                                                                                                                                            |
| presentation     | card                                                                                                                                                                          |
| action_label     | View Leaderboard                                                                                                                                                              |
| href             | /admin/users                                                                                                                                                                  |
| eyebrow          | Performance                                                                                                                                                                   |
| sublabel         | "${revenue} revenue, {eventCount} events"                                                                                                                                     |
| slot_kind        | metric                                                                                                                                                                        |
| priority_formula | `5`                                                                                                                                                                           |
| staleness_window | 48h                                                                                                                                                                           |
| dismiss_behavior | permanent                                                                                                                                                                     |
| grouping_key     | chef-performance                                                                                                                                                              |
| dependencies     | postgres                                                                                                                                                                      |
| admin_module     | /admin/users                                                                                                                                                                  |

---

#### Underperforming Chefs

| Field            | Value                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.underperforming-chefs`                                                                                                     |
| category         | business-metrics                                                                                                                                   |
| label            | Low Activity: {count} chefs                                                                                                                        |
| description      | Chefs with accounts but no events/activity in the last 30 days                                                                                     |
| severity         | low                                                                                                                                                |
| data_source      | `users` table, `events` table                                                                                                                      |
| query_hint       | `SELECT COUNT(*) FROM users WHERE role = 'chef' AND id NOT IN (SELECT DISTINCT chef_id FROM events WHERE created_at > NOW() - INTERVAL '30 days')` |
| threshold        | count > 0                                                                                                                                          |
| refresh_rate     | daily                                                                                                                                              |
| icon             | 📉                                                                                                                                                 |
| presentation     | metric                                                                                                                                             |
| action_label     | View Inactive                                                                                                                                      |
| href             | /admin/users                                                                                                                                       |
| eyebrow          | Performance                                                                                                                                        |
| sublabel         | "{count} chefs, {pct}% of total"                                                                                                                   |
| slot_kind        | trend                                                                                                                                              |
| priority_formula | `pct > 50 ? 40 : (pct > 25 ? 20 : 5)`                                                                                                              |
| staleness_window | 48h                                                                                                                                                |
| dismiss_behavior | snooze-24h                                                                                                                                         |
| grouping_key     | chef-performance                                                                                                                                   |
| dependencies     | postgres                                                                                                                                           |
| admin_module     | /admin/users                                                                                                                                       |

---

#### Payment Failures (7d)

| Field            | Value                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.payment-failures`                                                                      |
| category         | business-metrics                                                                                               |
| label            | Payment Fails: {count}                                                                                         |
| description      | Failed payment attempts in the last 7 days                                                                     |
| severity         | high                                                                                                           |
| data_source      | `ledger_entries` table, Stripe webhook logs                                                                    |
| query_hint       | `SELECT COUNT(*) FROM ledger_entries WHERE type = 'payment_failed' AND created_at > NOW() - INTERVAL '7 days'` |
| threshold        | count > 0                                                                                                      |
| refresh_rate     | 1h                                                                                                             |
| icon             | 💳                                                                                                             |
| presentation     | alert-row                                                                                                      |
| action_label     | View Failures                                                                                                  |
| href             | /admin/system/payments                                                                                         |
| eyebrow          | Payments                                                                                                       |
| sublabel         | "${totalAmount} affected, {count} failures"                                                                    |
| slot_kind        | alert                                                                                                          |
| priority_formula | `min(80, count * 15)`                                                                                          |
| staleness_window | 6h                                                                                                             |
| dismiss_behavior | snooze-24h                                                                                                     |
| grouping_key     | payments                                                                                                       |
| dependencies     | postgres                                                                                                       |
| admin_module     | /admin/system/payments                                                                                         |

---

#### Reconciliation: Unmatched Transactions

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| id               | `admin.business-metrics.unmatched-transactions`                         |
| category         | business-metrics                                                        |
| label            | Unmatched: {count}                                                      |
| description      | Stripe transactions that do not match a ledger entry                    |
| severity         | high                                                                    |
| data_source      | `ledger_entries` table, Stripe API                                      |
| query_hint       | `stripe_payments NOT IN (SELECT stripe_payment_id FROM ledger_entries)` |
| threshold        | count > 0                                                               |
| refresh_rate     | 6h                                                                      |
| icon             | ❓                                                                      |
| presentation     | alert-row                                                               |
| action_label     | Reconcile                                                               |
| href             | /admin/reconciliation                                                   |
| eyebrow          | Reconciliation                                                          |
| sublabel         | "${totalUnmatched} unaccounted"                                         |
| slot_kind        | audit                                                                   |
| priority_formula | `min(75, count * 20)`                                                   |
| staleness_window | 24h                                                                     |
| dismiss_behavior | snooze-24h                                                              |
| grouping_key     | reconciliation                                                          |
| dependencies     | postgres                                                                |
| admin_module     | /admin/reconciliation                                                   |

---

#### Stripe Webhook: Failure Rate

| Field            | Value                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.stripe-webhook-failures`                                                                                         |
| category         | business-metrics                                                                                                                         |
| label            | Webhook Fails: {pct}%                                                                                                                    |
| description      | Percentage of Stripe webhook deliveries that failed (non-200 response)                                                                   |
| severity         | critical                                                                                                                                 |
| data_source      | Stripe webhook logs, application logs                                                                                                    |
| query_hint       | `SELECT COUNT(*) FILTER (WHERE status != 200) * 100.0 / COUNT(*) FROM stripe_webhook_log WHERE created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | pct > 1% or any failure in last hour                                                                                                     |
| refresh_rate     | 5m                                                                                                                                       |
| icon             | 🪝                                                                                                                                       |
| presentation     | banner                                                                                                                                   |
| action_label     | View Webhooks                                                                                                                            |
| href             | /admin/system/payments                                                                                                                   |
| eyebrow          | Stripe                                                                                                                                   |
| sublabel         | "{failCount}/{totalCount} failed in 24h"                                                                                                 |
| slot_kind        | alert                                                                                                                                    |
| priority_formula | `pct > 10 ? 95 : (pct > 1 ? 70 : (anyLastHour ? 50 : 0))`                                                                                |
| staleness_window | 15m                                                                                                                                      |
| dismiss_behavior | none                                                                                                                                     |
| grouping_key     | payments                                                                                                                                 |
| dependencies     | postgres                                                                                                                                 |
| admin_module     | /admin/system/payments                                                                                                                   |

---

#### Revenue Breakdown

| Field            | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.revenue-breakdown`                                                        |
| category         | business-metrics                                                                                  |
| label            | Revenue Split: B:{billing} / C:{commerce} / S:{sales}                                             |
| description      | Revenue broken down by stream: billing (subscriptions), commerce (event payments), sales (direct) |
| severity         | info                                                                                              |
| data_source      | `getProfitAndLossReport() in lib/finance/profit-loss-report-actions.ts`                           |
| query_hint       | `billingRevenue + commerceRevenue + salesRevenue from P&L report`                                 |
| threshold        | Always show for admin                                                                             |
| refresh_rate     | daily                                                                                             |
| icon             | 📊                                                                                                |
| presentation     | card                                                                                              |
| action_label     | View P&L                                                                                          |
| href             | /admin/financials                                                                                 |
| eyebrow          | Revenue Streams                                                                                   |
| sublabel         | "Total: ${total} this month"                                                                      |
| slot_kind        | metric                                                                                            |
| priority_formula | `10`                                                                                              |
| staleness_window | 24h                                                                                               |
| dismiss_behavior | permanent                                                                                         |
| grouping_key     | revenue                                                                                           |
| dependencies     | postgres                                                                                          |
| admin_module     | /admin/financials                                                                                 |

---

#### Cost of Goods Sold

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| id               | `admin.business-metrics.cogs`                      |
| category         | business-metrics                                   |
| label            | COGS: ${amount}                                    |
| description      | Cost of goods sold from purchase orders this month |
| severity         | info                                               |
| data_source      | `getProfitAndLossReport() COGS section`            |
| query_hint       | `SUM purchase_order costs for current month`       |
| threshold        | Always show                                        |
| refresh_rate     | daily                                              |
| icon             | 📦                                                 |
| presentation     | metric                                             |
| action_label     | View P&L                                           |
| href             | /admin/financials                                  |
| eyebrow          | Expenses                                           |
| sublabel         | "{pctOfRevenue}% of revenue"                       |
| slot_kind        | metric                                             |
| priority_formula | `pctOfRevenue > 60 ? 40 : 5`                       |
| staleness_window | 24h                                                |
| dismiss_behavior | permanent                                          |
| grouping_key     | expenses                                           |
| dependencies     | postgres                                           |
| admin_module     | /admin/financials                                  |

---

#### Operating Expenses

| Field            | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| id               | `admin.business-metrics.operating-expenses`                                   |
| category         | business-metrics                                                              |
| label            | OpEx: ${amount}                                                               |
| description      | Operating expenses breakdown: labor, subcontractors, processing fees, general |
| severity         | info                                                                          |
| data_source      | `getProfitAndLossReport() operating expenses section`                         |
| query_hint       | `labor + subcontract + processingFees + general from P&L`                     |
| threshold        | Always show                                                                   |
| refresh_rate     | daily                                                                         |
| icon             | 💰                                                                            |
| presentation     | metric                                                                        |
| action_label     | View P&L                                                                      |
| href             | /admin/financials                                                             |
| eyebrow          | Expenses                                                                      |
| sublabel         | "Labor: ${labor}, Fees: ${fees}"                                              |
| slot_kind        | metric                                                                        |
| priority_formula | `5`                                                                           |
| staleness_window | 24h                                                                           |
| dismiss_behavior | permanent                                                                     |
| grouping_key     | expenses                                                                      |
| dependencies     | postgres                                                                      |
| admin_module     | /admin/financials                                                             |

---

#### Net Profit/Loss

| Field            | Value                                             |
| ---------------- | ------------------------------------------------- |
| id               | `admin.business-metrics.net-profit`               |
| category         | business-metrics                                  |
| label            | Net: ${amount}                                    |
| description      | Net profit or loss after all revenue and expenses |
| severity         | high                                              |
| data_source      | `getProfitAndLossReport() bottom line`            |
| query_hint       | `totalRevenue - COGS - operatingExpenses`         |
| threshold        | Always show; high severity if negative            |
| refresh_rate     | daily                                             |
| icon             | 📈                                                |
| presentation     | card                                              |
| action_label     | View P&L                                          |
| href             | /admin/financials                                 |
| eyebrow          | Bottom Line                                       |
| sublabel         | "Margin: {marginPct}%"                            |
| slot_kind        | metric                                            |
| priority_formula | `amount < 0 ? 70 : 10`                            |
| staleness_window | 24h                                               |
| dismiss_behavior | permanent                                         |
| grouping_key     | revenue                                           |
| dependencies     | postgres                                          |
| admin_module     | /admin/financials                                 |

---

#### Chef Admin Status Overview

| Field            | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.chef-admin-status`                                                        |
| category         | business-metrics                                                                                  |
| label            | Chefs: {suspended}S / {comped}C / {vip}V                                                          |
| description      | Count of suspended, comped, and VIP chefs with outstanding admin credits                          |
| severity         | low                                                                                               |
| data_source      | `chef_admin_actions in lib/admin/chef-admin-actions.ts, chefs table`                              |
| query_hint       | `SELECT status, COUNT(*) FROM chefs WHERE status IN ('suspended','comped','vip') GROUP BY status` |
| threshold        | suspendedCount > 0 (high) or always show                                                          |
| refresh_rate     | 6h                                                                                                |
| icon             | 👨‍🍳                                                                                                |
| presentation     | badge                                                                                             |
| action_label     | Manage Chefs                                                                                      |
| href             | /admin/users                                                                                      |
| eyebrow          | Chef Status                                                                                       |
| sublabel         | "${creditTotal} in outstanding credits"                                                           |
| slot_kind        | audit                                                                                             |
| priority_formula | `suspendedCount * 20 + creditTotal > 500 ? 30 : 5`                                                |
| staleness_window | 12h                                                                                               |
| dismiss_behavior | snooze-24h                                                                                        |
| grouping_key     | chef-management                                                                                   |
| dependencies     | postgres                                                                                          |
| admin_module     | /admin/users                                                                                      |

---

#### Chef Connect Account Status

| Field            | Value                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| id               | `admin.business-metrics.stripe-connect-status`                                   |
| category         | business-metrics                                                                 |
| label            | Connect: {incompleteCount} Incomplete                                            |
| description      | Per-chef Stripe Connect account onboarding status                                |
| severity         | medium                                                                           |
| data_source      | `getPaymentHealthStats() per-chef Connect status`                                |
| query_hint       | `check stripe_account_id status for each chef: complete, incomplete, restricted` |
| threshold        | incompleteCount > 0                                                              |
| refresh_rate     | daily                                                                            |
| icon             | 🏦                                                                               |
| presentation     | badge                                                                            |
| action_label     | View Connect                                                                     |
| href             | /admin/system/payments                                                           |
| eyebrow          | Payments                                                                         |
| sublabel         | "{completeCount} complete, {restrictedCount} restricted"                         |
| slot_kind        | audit                                                                            |
| priority_formula | `restrictedCount * 20 + incompleteCount * 5`                                     |
| staleness_window | 24h                                                                              |
| dismiss_behavior | snooze-24h                                                                       |
| grouping_key     | payments                                                                         |
| dependencies     | stripe_api                                                                       |
| admin_module     | /admin/system/payments                                                           |

---

### Category: Inquiry Pipeline

---

#### Total Open Inquiries

| Field            | Value                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.open-total`                                              |
| category         | inquiry-pipeline                                                                 |
| label            | Open Inquiries: {count}                                                          |
| description      | Total inquiries in an open/active state                                          |
| severity         | info                                                                             |
| data_source      | `inquiries` table                                                                |
| query_hint       | `SELECT COUNT(*) FROM inquiries WHERE status IN ('new','in_progress','pending')` |
| threshold        | Always show                                                                      |
| refresh_rate     | 15m                                                                              |
| icon             | 📬                                                                               |
| presentation     | metric                                                                           |
| action_label     | View Pipeline                                                                    |
| href             | /admin/inquiries                                                                 |
| eyebrow          | Pipeline                                                                         |
| sublabel         | "{newCount} new, {pendingCount} pending"                                         |
| slot_kind        | metric                                                                           |
| priority_formula | `10 + newCount * 3`                                                              |
| staleness_window | 1h                                                                               |
| dismiss_behavior | permanent                                                                        |
| grouping_key     | inquiry-pipeline                                                                 |
| dependencies     | postgres                                                                         |
| admin_module     | /admin/inquiries                                                                 |

---

#### Inquiries Aging: 24h+ No Response

| Field            | Value                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.aging-24h`                                                                                               |
| category         | inquiry-pipeline                                                                                                                 |
| label            | Aging 24h+: {count}                                                                                                              |
| description      | Inquiries without a chef response for over 24 hours                                                                              |
| severity         | medium                                                                                                                           |
| data_source      | `inquiries` table, `conversations` table                                                                                         |
| query_hint       | `SELECT COUNT(*) FROM inquiries WHERE status = 'new' AND created_at < NOW() - INTERVAL '24 hours' AND first_response_at IS NULL` |
| threshold        | count > 0                                                                                                                        |
| refresh_rate     | 15m                                                                                                                              |
| icon             | ⏰                                                                                                                               |
| presentation     | badge                                                                                                                            |
| action_label     | View Aging                                                                                                                       |
| href             | /admin/inquiries                                                                                                                 |
| eyebrow          | Response Time                                                                                                                    |
| sublabel         | "{count} waiting over 24h"                                                                                                       |
| slot_kind        | alert                                                                                                                            |
| priority_formula | `min(60, count * 12)`                                                                                                            |
| staleness_window | 1h                                                                                                                               |
| dismiss_behavior | none                                                                                                                             |
| grouping_key     | inquiry-aging                                                                                                                    |
| dependencies     | postgres                                                                                                                         |
| admin_module     | /admin/inquiries                                                                                                                 |

---

#### Inquiries Aging: 48h+ No Response

| Field            | Value                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.aging-48h`                                                                                               |
| category         | inquiry-pipeline                                                                                                                 |
| label            | Aging 48h+: {count}                                                                                                              |
| description      | Inquiries without a chef response for over 48 hours                                                                              |
| severity         | high                                                                                                                             |
| data_source      | `inquiries` table                                                                                                                |
| query_hint       | `SELECT COUNT(*) FROM inquiries WHERE status = 'new' AND created_at < NOW() - INTERVAL '48 hours' AND first_response_at IS NULL` |
| threshold        | count > 0                                                                                                                        |
| refresh_rate     | 15m                                                                                                                              |
| icon             | ⚠️                                                                                                                               |
| presentation     | alert-row                                                                                                                        |
| action_label     | Escalate                                                                                                                         |
| href             | /admin/inquiries                                                                                                                 |
| eyebrow          | Response Time                                                                                                                    |
| sublabel         | "{count} inquiries at risk"                                                                                                      |
| slot_kind        | alert                                                                                                                            |
| priority_formula | `min(80, count * 18)`                                                                                                            |
| staleness_window | 1h                                                                                                                               |
| dismiss_behavior | none                                                                                                                             |
| grouping_key     | inquiry-aging                                                                                                                    |
| dependencies     | postgres                                                                                                                         |
| admin_module     | /admin/inquiries                                                                                                                 |

---

#### Inquiries Aging: 72h+ No Response

| Field            | Value                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.aging-72h`                                                                                               |
| category         | inquiry-pipeline                                                                                                                 |
| label            | CRITICAL Aging: {count}                                                                                                          |
| description      | Inquiries without any response for over 72 hours; likely lost leads                                                              |
| severity         | critical                                                                                                                         |
| data_source      | `inquiries` table                                                                                                                |
| query_hint       | `SELECT COUNT(*) FROM inquiries WHERE status = 'new' AND created_at < NOW() - INTERVAL '72 hours' AND first_response_at IS NULL` |
| threshold        | count > 0                                                                                                                        |
| refresh_rate     | 5m                                                                                                                               |
| icon             | 🔴                                                                                                                               |
| presentation     | banner                                                                                                                           |
| action_label     | Intervene Now                                                                                                                    |
| href             | /admin/inquiries                                                                                                                 |
| eyebrow          | CRITICAL                                                                                                                         |
| sublabel         | "{count} likely lost, oldest: {oldestAge}"                                                                                       |
| slot_kind        | alert                                                                                                                            |
| priority_formula | `min(100, 80 + count * 5)`                                                                                                       |
| staleness_window | 15m                                                                                                                              |
| dismiss_behavior | none                                                                                                                             |
| grouping_key     | inquiry-aging                                                                                                                    |
| dependencies     | postgres                                                                                                                         |
| admin_module     | /admin/inquiries                                                                                                                 |

---

#### Unmatched Inquiries

| Field            | Value                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.unmatched`                                                                                            |
| category         | inquiry-pipeline                                                                                                              |
| label            | Unmatched: {count}                                                                                                            |
| description      | Inquiries where no chef is available in the requested area or cuisine                                                         |
| severity         | high                                                                                                                          |
| data_source      | `inquiries` table, chef availability/coverage                                                                                 |
| query_hint       | `SELECT COUNT(*) FROM inquiries WHERE status = 'new' AND matched_chef_id IS NULL AND created_at > NOW() - INTERVAL '30 days'` |
| threshold        | count > 0                                                                                                                     |
| refresh_rate     | 1h                                                                                                                            |
| icon             | 🗺️                                                                                                                            |
| presentation     | alert-row                                                                                                                     |
| action_label     | View Unmatched                                                                                                                |
| href             | /admin/inquiries                                                                                                              |
| eyebrow          | Coverage Gap                                                                                                                  |
| sublabel         | "Top unserved: {topArea}"                                                                                                     |
| slot_kind        | alert                                                                                                                         |
| priority_formula | `min(70, count * 10)`                                                                                                         |
| staleness_window | 6h                                                                                                                            |
| dismiss_behavior | snooze-24h                                                                                                                    |
| grouping_key     | inquiry-coverage                                                                                                              |
| dependencies     | postgres                                                                                                                      |
| admin_module     | /admin/inquiries                                                                                                              |

---

#### Inquiry-to-Booking Conversion

| Field            | Value                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.conversion-rate`                                                                                                                                        |
| category         | inquiry-pipeline                                                                                                                                                                |
| label            | Conversion: {pct}%                                                                                                                                                              |
| description      | Percentage of inquiries that converted to confirmed bookings (30d rolling)                                                                                                      |
| severity         | medium                                                                                                                                                                          |
| data_source      | `inquiries` table, `events` table                                                                                                                                               |
| query_hint       | `SELECT COUNT(DISTINCT e.inquiry_id) * 100.0 / COUNT(DISTINCT i.id) FROM inquiries i LEFT JOIN events e ON e.inquiry_id = i.id WHERE i.created_at > NOW() - INTERVAL '30 days'` |
| threshold        | pct < 20%                                                                                                                                                                       |
| refresh_rate     | daily                                                                                                                                                                           |
| icon             | 🔄                                                                                                                                                                              |
| presentation     | metric                                                                                                                                                                          |
| action_label     | View Funnel                                                                                                                                                                     |
| href             | /admin/analytics                                                                                                                                                                |
| eyebrow          | Funnel                                                                                                                                                                          |
| sublabel         | "{convertedCount}/{totalCount} inquiries"                                                                                                                                       |
| slot_kind        | metric                                                                                                                                                                          |
| priority_formula | `pct < 10 ? 55 : (pct < 20 ? 30 : 5)`                                                                                                                                           |
| staleness_window | 48h                                                                                                                                                                             |
| dismiss_behavior | snooze-24h                                                                                                                                                                      |
| grouping_key     | inquiry-funnel                                                                                                                                                                  |
| dependencies     | postgres                                                                                                                                                                        |
| admin_module     | /admin/analytics                                                                                                                                                                |

---

#### Lost Inquiries

| Field            | Value                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.lost`                                                                                                                               |
| category         | inquiry-pipeline                                                                                                                                            |
| label            | Lost: {count}                                                                                                                                               |
| description      | Inquiries marked as lost/closed-without-booking, with top reasons                                                                                           |
| severity         | medium                                                                                                                                                      |
| data_source      | `inquiries` table                                                                                                                                           |
| query_hint       | `SELECT loss_reason, COUNT(*) FROM inquiries WHERE status = 'lost' AND created_at > NOW() - INTERVAL '30 days' GROUP BY loss_reason ORDER BY COUNT(*) DESC` |
| threshold        | count > 5 in 30d                                                                                                                                            |
| refresh_rate     | daily                                                                                                                                                       |
| icon             | 💔                                                                                                                                                          |
| presentation     | card                                                                                                                                                        |
| action_label     | Analyze Losses                                                                                                                                              |
| href             | /admin/inquiries                                                                                                                                            |
| eyebrow          | Funnel                                                                                                                                                      |
| sublabel         | "Top reason: {topReason} ({topCount})"                                                                                                                      |
| slot_kind        | trend                                                                                                                                                       |
| priority_formula | `min(50, count * 3)`                                                                                                                                        |
| staleness_window | 48h                                                                                                                                                         |
| dismiss_behavior | snooze-24h                                                                                                                                                  |
| grouping_key     | inquiry-funnel                                                                                                                                              |
| dependencies     | postgres                                                                                                                                                    |
| admin_module     | /admin/inquiries                                                                                                                                            |

---

#### Inquiry Volume: Today vs Average

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.volume-vs-avg`                    |
| category         | inquiry-pipeline                                          |
| label            | Volume: {todayCount} ({direction})                        |
| description      | Today's inquiry count compared to the 7-day daily average |
| severity         | low                                                       |
| data_source      | `inquiries` table                                         |
| query_hint       | `today_count vs AVG(daily_count) OVER last 7 days`        |
| threshold        | Show if deviation > 30%                                   |
| refresh_rate     | 1h                                                        |
| icon             | 📊                                                        |
| presentation     | metric                                                    |
| action_label     | View Volume                                               |
| href             | /admin/inquiries                                          |
| eyebrow          | Volume                                                    |
| sublabel         | "7d avg: {avg}, today: {count}"                           |
| slot_kind        | trend                                                     |
| priority_formula | `deviation > 50 ? 25 : 10`                                |
| staleness_window | 6h                                                        |
| dismiss_behavior | snooze-24h                                                |
| grouping_key     | inquiry-volume                                            |
| dependencies     | postgres                                                  |
| admin_module     | /admin/inquiries                                          |

---

#### Average Response Time

| Field            | Value                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.inquiry-pipeline.avg-response-time`                                                                                                                             |
| category         | inquiry-pipeline                                                                                                                                                       |
| label            | Avg Response: {hours}h                                                                                                                                                 |
| description      | Average time from inquiry submission to first chef reply (30d rolling)                                                                                                 |
| severity         | medium                                                                                                                                                                 |
| data_source      | `inquiries` table, `conversations` table                                                                                                                               |
| query_hint       | `SELECT AVG(EXTRACT(EPOCH FROM first_response_at - created_at) / 3600) FROM inquiries WHERE first_response_at IS NOT NULL AND created_at > NOW() - INTERVAL '30 days'` |
| threshold        | hours > 12                                                                                                                                                             |
| refresh_rate     | 6h                                                                                                                                                                     |
| icon             | ⏱️                                                                                                                                                                     |
| presentation     | metric                                                                                                                                                                 |
| action_label     | View Response Times                                                                                                                                                    |
| href             | /admin/inquiries                                                                                                                                                       |
| eyebrow          | Response Time                                                                                                                                                          |
| sublabel         | "Target: < 4h, actual: {hours}h"                                                                                                                                       |
| slot_kind        | metric                                                                                                                                                                 |
| priority_formula | `hours > 24 ? 60 : (hours > 12 ? 40 : (hours > 4 ? 15 : 5))`                                                                                                           |
| staleness_window | 24h                                                                                                                                                                    |
| dismiss_behavior | snooze-24h                                                                                                                                                             |
| grouping_key     | inquiry-response                                                                                                                                                       |
| dependencies     | postgres                                                                                                                                                               |
| admin_module     | /admin/inquiries                                                                                                                                                       |

---

### Category: Content & Quality

---

#### Chef Profiles: Missing Photo

| Field            | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| id               | `admin.content-quality.profiles-missing-photo`                                               |
| category         | content-quality                                                                              |
| label            | No Photo: {count} chefs                                                                      |
| description      | Chef profiles without a profile photo                                                        |
| severity         | medium                                                                                       |
| data_source      | `users` table                                                                                |
| query_hint       | `SELECT COUNT(*) FROM users WHERE role = 'chef' AND (avatar_url IS NULL OR avatar_url = '')` |
| threshold        | count > 0                                                                                    |
| refresh_rate     | daily                                                                                        |
| icon             | 📷                                                                                           |
| presentation     | badge                                                                                        |
| action_label     | View Profiles                                                                                |
| href             | /admin/directory-listings                                                                    |
| eyebrow          | Profile Quality                                                                              |
| sublabel         | "{pct}% of chefs"                                                                            |
| slot_kind        | audit                                                                                        |
| priority_formula | `min(45, count * 5)`                                                                         |
| staleness_window | 48h                                                                                          |
| dismiss_behavior | snooze-24h                                                                                   |
| grouping_key     | profile-quality                                                                              |
| dependencies     | postgres                                                                                     |
| admin_module     | /admin/directory-listings                                                                    |

---

#### Chef Profiles: Empty Bio

| Field            | Value                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.content-quality.profiles-empty-bio`                                                                                               |
| category         | content-quality                                                                                                                          |
| label            | No Bio: {count} chefs                                                                                                                    |
| description      | Chef profiles with missing or empty biography text                                                                                       |
| severity         | low                                                                                                                                      |
| data_source      | `users` table, `chef_profiles` table                                                                                                     |
| query_hint       | `SELECT COUNT(*) FROM users u LEFT JOIN chef_profiles cp ON u.id = cp.user_id WHERE u.role = 'chef' AND (cp.bio IS NULL OR cp.bio = '')` |
| threshold        | count > 0                                                                                                                                |
| refresh_rate     | daily                                                                                                                                    |
| icon             | 📝                                                                                                                                       |
| presentation     | badge                                                                                                                                    |
| action_label     | View Profiles                                                                                                                            |
| href             | /admin/directory-listings                                                                                                                |
| eyebrow          | Profile Quality                                                                                                                          |
| sublabel         | "{pct}% of chefs"                                                                                                                        |
| slot_kind        | audit                                                                                                                                    |
| priority_formula | `min(35, count * 3)`                                                                                                                     |
| staleness_window | 48h                                                                                                                                      |
| dismiss_behavior | snooze-24h                                                                                                                               |
| grouping_key     | profile-quality                                                                                                                          |
| dependencies     | postgres                                                                                                                                 |
| admin_module     | /admin/directory-listings                                                                                                                |

---

#### Chef Profiles: Incomplete

| Field            | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| id               | `admin.content-quality.profiles-incomplete`                                              |
| category         | content-quality                                                                          |
| label            | Incomplete Profiles: {count}                                                             |
| description      | Chef profiles below the quality threshold (missing photo, bio, cuisine, or service area) |
| severity         | medium                                                                                   |
| data_source      | `users` table, `chef_profiles` table                                                     |
| query_hint       | `SELECT COUNT(*) FROM chef_profiles WHERE quality_score < 60`                            |
| threshold        | count > 0                                                                                |
| refresh_rate     | daily                                                                                    |
| icon             | ⚠️                                                                                       |
| presentation     | card                                                                                     |
| action_label     | View Incomplete                                                                          |
| href             | /admin/directory-listings                                                                |
| eyebrow          | Profile Quality                                                                          |
| sublabel         | "Avg score: {avgScore}/100"                                                              |
| slot_kind        | audit                                                                                    |
| priority_formula | `min(55, count * 5)`                                                                     |
| staleness_window | 48h                                                                                      |
| dismiss_behavior | snooze-24h                                                                               |
| grouping_key     | profile-quality                                                                          |
| dependencies     | postgres                                                                                 |
| admin_module     | /admin/directory-listings                                                                |

---

#### Menus: Missing Prices

| Field            | Value                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| id               | `admin.content-quality.menus-no-prices`                                                                                              |
| category         | content-quality                                                                                                                      |
| label            | No Prices: {count} menus                                                                                                             |
| description      | Published menus with dishes that have no price set                                                                                   |
| severity         | medium                                                                                                                               |
| data_source      | `menus` table, `menu_items` table                                                                                                    |
| query_hint       | `SELECT COUNT(DISTINCT m.id) FROM menus m JOIN menu_items mi ON m.id = mi.menu_id WHERE m.status = 'published' AND mi.price IS NULL` |
| threshold        | count > 0                                                                                                                            |
| refresh_rate     | daily                                                                                                                                |
| icon             | 💲                                                                                                                                   |
| presentation     | badge                                                                                                                                |
| action_label     | View Menus                                                                                                                           |
| href             | /admin/directory                                                                                                                     |
| eyebrow          | Menu Quality                                                                                                                         |
| sublabel         | "{itemCount} items without prices"                                                                                                   |
| slot_kind        | audit                                                                                                                                |
| priority_formula | `min(50, count * 8)`                                                                                                                 |
| staleness_window | 48h                                                                                                                                  |
| dismiss_behavior | snooze-24h                                                                                                                           |
| grouping_key     | menu-quality                                                                                                                         |
| dependencies     | postgres                                                                                                                             |
| admin_module     | /admin/directory                                                                                                                     |

---

#### Menus: Missing Descriptions

| Field            | Value                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.content-quality.menus-no-descriptions`                                                                                                                       |
| category         | content-quality                                                                                                                                                     |
| label            | No Descriptions: {count} menus                                                                                                                                      |
| description      | Published menus with dishes missing descriptions                                                                                                                    |
| severity         | low                                                                                                                                                                 |
| data_source      | `menus` table, `menu_items` table                                                                                                                                   |
| query_hint       | `SELECT COUNT(DISTINCT m.id) FROM menus m JOIN menu_items mi ON m.id = mi.menu_id WHERE m.status = 'published' AND (mi.description IS NULL OR mi.description = '')` |
| threshold        | count > 0                                                                                                                                                           |
| refresh_rate     | daily                                                                                                                                                               |
| icon             | 📄                                                                                                                                                                  |
| presentation     | badge                                                                                                                                                               |
| action_label     | View Menus                                                                                                                                                          |
| href             | /admin/directory                                                                                                                                                    |
| eyebrow          | Menu Quality                                                                                                                                                        |
| sublabel         | "{itemCount} items lacking descriptions"                                                                                                                            |
| slot_kind        | audit                                                                                                                                                               |
| priority_formula | `min(30, count * 3)`                                                                                                                                                |
| staleness_window | 48h                                                                                                                                                                 |
| dismiss_behavior | snooze-24h                                                                                                                                                          |
| grouping_key     | menu-quality                                                                                                                                                        |
| dependencies     | postgres                                                                                                                                                            |
| admin_module     | /admin/directory                                                                                                                                                    |

---

#### Recipe Documentation Rate

| Field            | Value                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.content-quality.recipe-documentation-rate`                                                                                                               |
| category         | content-quality                                                                                                                                                 |
| label            | Recipe Docs: {pct}%                                                                                                                                             |
| description      | Percentage of dishes with a linked, documented recipe                                                                                                           |
| severity         | low                                                                                                                                                             |
| data_source      | `recipes` table, `menu_items` table                                                                                                                             |
| query_hint       | `SELECT COUNT(DISTINCT mi.id) FILTER (WHERE r.id IS NOT NULL) * 100.0 / COUNT(DISTINCT mi.id) FROM menu_items mi LEFT JOIN recipes r ON r.menu_item_id = mi.id` |
| threshold        | pct < 50%                                                                                                                                                       |
| refresh_rate     | daily                                                                                                                                                           |
| icon             | 📖                                                                                                                                                              |
| presentation     | metric                                                                                                                                                          |
| action_label     | View Recipes                                                                                                                                                    |
| href             | /admin/directory                                                                                                                                                |
| eyebrow          | Content                                                                                                                                                         |
| sublabel         | "{documentedCount}/{totalCount} dishes documented"                                                                                                              |
| slot_kind        | metric                                                                                                                                                          |
| priority_formula | `pct < 25 ? 35 : (pct < 50 ? 15 : 0)`                                                                                                                           |
| staleness_window | 48h                                                                                                                                                             |
| dismiss_behavior | snooze-24h                                                                                                                                                      |
| grouping_key     | content-completeness                                                                                                                                            |
| dependencies     | postgres                                                                                                                                                        |
| admin_module     | /admin/directory                                                                                                                                                |

---

#### Review Moderation Queue

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| id               | `admin.content-quality.review-moderation`                          |
| category         | content-quality                                                    |
| label            | Pending Reviews: {count}                                           |
| description      | User reviews awaiting moderation approval                          |
| severity         | medium                                                             |
| data_source      | `reviews` table                                                    |
| query_hint       | `SELECT COUNT(*) FROM reviews WHERE moderation_status = 'pending'` |
| threshold        | count > 0                                                          |
| refresh_rate     | 1h                                                                 |
| icon             | 🔍                                                                 |
| presentation     | badge                                                              |
| action_label     | Moderate                                                           |
| href             | /admin/directory                                                   |
| eyebrow          | Moderation                                                         |
| sublabel         | "Oldest: {oldestAge}"                                              |
| slot_kind        | operational                                                        |
| priority_formula | `min(55, count * 8 + oldestHours)`                                 |
| staleness_window | 6h                                                                 |
| dismiss_behavior | none                                                               |
| grouping_key     | moderation                                                         |
| dependencies     | postgres                                                           |
| admin_module     | /admin/directory                                                   |

---

#### Directory Listings: Stale

| Field            | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| id               | `admin.content-quality.listings-stale`                                                  |
| category         | content-quality                                                                         |
| label            | Stale Listings: {count}                                                                 |
| description      | Directory listings not updated in over 90 days                                          |
| severity         | low                                                                                     |
| data_source      | `chef_profiles` or `directory_listings` table                                           |
| query_hint       | `SELECT COUNT(*) FROM directory_listings WHERE updated_at < NOW() - INTERVAL '90 days'` |
| threshold        | count > 0                                                                               |
| refresh_rate     | daily                                                                                   |
| icon             | 🕸️                                                                                      |
| presentation     | metric                                                                                  |
| action_label     | View Stale                                                                              |
| href             | /admin/directory-listings                                                               |
| eyebrow          | Directory                                                                               |
| sublabel         | "{count} listings, oldest: {oldestDays}d"                                               |
| slot_kind        | audit                                                                                   |
| priority_formula | `min(30, count * 2)`                                                                    |
| staleness_window | 48h                                                                                     |
| dismiss_behavior | snooze-24h                                                                              |
| grouping_key     | directory-quality                                                                       |
| dependencies     | postgres                                                                                |
| admin_module     | /admin/directory-listings                                                               |

---

#### Directory Listings: Quality Distribution

| Field            | Value                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.content-quality.listings-quality-dist`                                                                                                                                                        |
| category         | content-quality                                                                                                                                                                                      |
| label            | Quality: {avgScore}/100                                                                                                                                                                              |
| description      | Distribution of directory listing quality scores                                                                                                                                                     |
| severity         | low                                                                                                                                                                                                  |
| data_source      | `directory_listings` table                                                                                                                                                                           |
| query_hint       | `SELECT AVG(quality_score), COUNT(*) FILTER (WHERE quality_score < 40), COUNT(*) FILTER (WHERE quality_score BETWEEN 40 AND 70), COUNT(*) FILTER (WHERE quality_score > 70) FROM directory_listings` |
| threshold        | avgScore < 60                                                                                                                                                                                        |
| refresh_rate     | daily                                                                                                                                                                                                |
| icon             | ⭐                                                                                                                                                                                                   |
| presentation     | card                                                                                                                                                                                                 |
| action_label     | View Distribution                                                                                                                                                                                    |
| href             | /admin/directory-listings                                                                                                                                                                            |
| eyebrow          | Directory                                                                                                                                                                                            |
| sublabel         | "Low: {lowCount}, Mid: {midCount}, High: {highCount}"                                                                                                                                                |
| slot_kind        | metric                                                                                                                                                                                               |
| priority_formula | `avgScore < 40 ? 40 : (avgScore < 60 ? 20 : 5)`                                                                                                                                                      |
| staleness_window | 48h                                                                                                                                                                                                  |
| dismiss_behavior | snooze-24h                                                                                                                                                                                           |
| grouping_key     | directory-quality                                                                                                                                                                                    |
| dependencies     | postgres                                                                                                                                                                                             |
| admin_module     | /admin/directory-listings                                                                                                                                                                            |

---

#### Dinner Circle Compliance

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| id               | `admin.content-quality.dinner-circle-compliance`                 |
| category         | content-quality                                                  |
| label            | Missing Circles: {count} Events                                  |
| description      | Guest-visible events missing required dinner circle associations |
| severity         | high                                                             |
| data_source      | `getGuestVisibleEventsMissingDinnerCircles() in admin hub page`  |
| query_hint       | `events visible to guests that lack dinner_circle_id`            |
| threshold        | count > 0                                                        |
| refresh_rate     | 6h                                                               |
| icon             | ⭕                                                               |
| presentation     | alert-row                                                        |
| action_label     | Fix Circles                                                      |
| href             | /admin/hub                                                       |
| eyebrow          | Data Integrity                                                   |
| sublabel         | "{count} events exposed without circle"                          |
| slot_kind        | audit                                                            |
| priority_formula | `count * 15`                                                     |
| staleness_window | 12h                                                              |
| dismiss_behavior | snooze-24h                                                       |
| grouping_key     | data-integrity                                                   |
| dependencies     | postgres                                                         |
| admin_module     | /admin/hub                                                       |

---

#### Review Moderation Queue

| Field            | Value                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| id               | `admin.content-quality.moderation-queue`                                                                                             |
| category         | content-quality                                                                                                                      |
| label            | Moderation Queue: {count}                                                                                                            |
| description      | Reviews and user content pending moderation approval                                                                                 |
| severity         | medium                                                                                                                               |
| data_source      | `reviews table, social_posts table WHERE moderation_status = 'pending'`                                                              |
| query_hint       | `SELECT COUNT(*) FROM reviews WHERE approved_at IS NULL UNION SELECT COUNT(*) FROM social_posts WHERE moderation_status = 'pending'` |
| threshold        | count > 0                                                                                                                            |
| refresh_rate     | 1h                                                                                                                                   |
| icon             | 👁️                                                                                                                                   |
| presentation     | badge                                                                                                                                |
| action_label     | Moderate                                                                                                                             |
| href             | /admin/social                                                                                                                        |
| eyebrow          | Content                                                                                                                              |
| sublabel         | "{reviewCount} reviews, {postCount} posts"                                                                                           |
| slot_kind        | operational                                                                                                                          |
| priority_formula | `min(50, count * 8)`                                                                                                                 |
| staleness_window | 6h                                                                                                                                   |
| dismiss_behavior | snooze-1h                                                                                                                            |
| grouping_key     | content-moderation                                                                                                                   |
| dependencies     | postgres                                                                                                                             |
| admin_module     | /admin/social                                                                                                                        |

---

### Category: Compliance & Safety

---

#### PIE Compliance: Active Violations

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| id               | `admin.compliance-safety.pie-violations-active`                            |
| category         | compliance-safety                                                          |
| label            | PIE Violations: {count}                                                    |
| description      | Active pricing compliance violations (unresolved)                          |
| severity         | high                                                                       |
| data_source      | `pie_compliance_violations` table                                          |
| query_hint       | `SELECT COUNT(*) FROM pie_compliance_violations WHERE resolved_at IS NULL` |
| threshold        | count > 0                                                                  |
| refresh_rate     | 1h                                                                         |
| icon             | ⚖️                                                                         |
| presentation     | alert-row                                                                  |
| action_label     | View Violations                                                            |
| href             | /admin/pie-compliance                                                      |
| eyebrow          | Compliance                                                                 |
| sublabel         | "{criticalCount} critical, {count} total"                                  |
| slot_kind        | alert                                                                      |
| priority_formula | `min(85, criticalCount * 30 + count * 10)`                                 |
| staleness_window | 6h                                                                         |
| dismiss_behavior | none                                                                       |
| grouping_key     | pie-compliance                                                             |
| dependencies     | postgres                                                                   |
| admin_module     | /admin/pie-compliance                                                      |

---

#### PIE Compliance: New Violations (24h)

| Field            | Value                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| id               | `admin.compliance-safety.pie-violations-new`                                                    |
| category         | compliance-safety                                                                               |
| label            | New Violations: {count}                                                                         |
| description      | Pricing compliance violations created in the last 24 hours                                      |
| severity         | high                                                                                            |
| data_source      | `pie_compliance_violations` table                                                               |
| query_hint       | `SELECT COUNT(*) FROM pie_compliance_violations WHERE created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | count > 0                                                                                       |
| refresh_rate     | 1h                                                                                              |
| icon             | 🆕                                                                                              |
| presentation     | badge                                                                                           |
| action_label     | Review New                                                                                      |
| href             | /admin/pie-compliance                                                                           |
| eyebrow          | Compliance                                                                                      |
| sublabel         | "{count} in last 24h"                                                                           |
| slot_kind        | alert                                                                                           |
| priority_formula | `min(70, count * 15)`                                                                           |
| staleness_window | 6h                                                                                              |
| dismiss_behavior | snooze-24h                                                                                      |
| grouping_key     | pie-compliance                                                                                  |
| dependencies     | postgres                                                                                        |
| admin_module     | /admin/pie-compliance                                                                           |

---

#### Feature Flag Conflicts

| Field            | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| id               | `admin.compliance-safety.flag-conflicts`                            |
| category         | compliance-safety                                                   |
| label            | Flag Conflicts: {count}                                             |
| description      | Feature flags with conflicting or contradictory states              |
| severity         | medium                                                              |
| data_source      | `feature_flags` table                                               |
| query_hint       | `SELECT COUNT(*) FROM feature_flags WHERE conflict_detected = true` |
| threshold        | count > 0                                                           |
| refresh_rate     | 6h                                                                  |
| icon             | 🚩                                                                  |
| presentation     | badge                                                               |
| action_label     | Resolve Conflicts                                                   |
| href             | /admin/flags                                                        |
| eyebrow          | Feature Flags                                                       |
| sublabel         | "{flagNames}"                                                       |
| slot_kind        | audit                                                               |
| priority_formula | `min(55, count * 20)`                                               |
| staleness_window | 24h                                                                 |
| dismiss_behavior | snooze-24h                                                          |
| grouping_key     | feature-flags                                                       |
| dependencies     | postgres                                                            |
| admin_module     | /admin/flags                                                        |

---

#### Feature Flags: Stale

| Field            | Value                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| id               | `admin.compliance-safety.flags-stale`                                                                 |
| category         | compliance-safety                                                                                     |
| label            | Stale Flags: {count}                                                                                  |
| description      | Feature flags created over 90 days ago that are still active (should be cleaned up or made permanent) |
| severity         | low                                                                                                   |
| data_source      | `feature_flags` table                                                                                 |
| query_hint       | `SELECT COUNT(*) FROM feature_flags WHERE active = true AND created_at < NOW() - INTERVAL '90 days'`  |
| threshold        | count > 0                                                                                             |
| refresh_rate     | daily                                                                                                 |
| icon             | 🏚️                                                                                                    |
| presentation     | metric                                                                                                |
| action_label     | Review Flags                                                                                          |
| href             | /admin/flags                                                                                          |
| eyebrow          | Feature Flags                                                                                         |
| sublabel         | "{count} flags older than 90d"                                                                        |
| slot_kind        | audit                                                                                                 |
| priority_formula | `min(25, count * 5)`                                                                                  |
| staleness_window | 48h                                                                                                   |
| dismiss_behavior | snooze-24h                                                                                            |
| grouping_key     | feature-flags                                                                                         |
| dependencies     | postgres                                                                                              |
| admin_module     | /admin/flags                                                                                          |

---

#### Privacy/Data Request Queue

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| id               | `admin.compliance-safety.privacy-requests`                    |
| category         | compliance-safety                                             |
| label            | Data Requests: {count}                                        |
| description      | Pending privacy or data deletion/export requests              |
| severity         | critical                                                      |
| data_source      | `data_requests` table or `feedback` filtered by type          |
| query_hint       | `SELECT COUNT(*) FROM data_requests WHERE status = 'pending'` |
| threshold        | count > 0                                                     |
| refresh_rate     | 1h                                                            |
| icon             | 🔒                                                            |
| presentation     | banner                                                        |
| action_label     | Process Requests                                              |
| href             | /admin/audit                                                  |
| eyebrow          | Privacy                                                       |
| sublabel         | "Oldest: {oldestAge}, deadline in {daysToDeadline}d"          |
| slot_kind        | alert                                                         |
| priority_formula | `100 - daysToDeadline * 10`                                   |
| staleness_window | 6h                                                            |
| dismiss_behavior | none                                                          |
| grouping_key     | privacy                                                       |
| dependencies     | postgres                                                      |
| admin_module     | /admin/audit                                                  |

---

#### Terms Acceptance Rate

| Field            | Value                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.compliance-safety.terms-acceptance`                                                                                                                |
| category         | compliance-safety                                                                                                                                         |
| label            | Terms Accepted: {pct}%                                                                                                                                    |
| description      | Percentage of active users who have accepted the latest terms of service                                                                                  |
| severity         | medium                                                                                                                                                    |
| data_source      | `users` table                                                                                                                                             |
| query_hint       | `SELECT COUNT(*) FILTER (WHERE terms_accepted_version = CURRENT_VERSION) * 100.0 / COUNT(*) FROM users WHERE last_active_at > NOW() - INTERVAL '30 days'` |
| threshold        | pct < 90%                                                                                                                                                 |
| refresh_rate     | daily                                                                                                                                                     |
| icon             | 📜                                                                                                                                                        |
| presentation     | metric                                                                                                                                                    |
| action_label     | View Acceptance                                                                                                                                           |
| href             | /admin/audit                                                                                                                                              |
| eyebrow          | Compliance                                                                                                                                                |
| sublabel         | "{acceptedCount}/{activeCount} active users"                                                                                                              |
| slot_kind        | audit                                                                                                                                                     |
| priority_formula | `pct < 70 ? 50 : (pct < 90 ? 25 : 0)`                                                                                                                     |
| staleness_window | 48h                                                                                                                                                       |
| dismiss_behavior | snooze-24h                                                                                                                                                |
| grouping_key     | compliance                                                                                                                                                |
| dependencies     | postgres                                                                                                                                                  |
| admin_module     | /admin/audit                                                                                                                                              |

---

#### Cannabis Compliance: Flagged Items

| Field            | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| id               | `admin.compliance-safety.cannabis-flagged`                      |
| category         | compliance-safety                                               |
| label            | Cannabis Flags: {count}                                         |
| description      | Items flagged for cannabis-related compliance review            |
| severity         | high                                                            |
| data_source      | `cannabis_flags` table or content moderation queue              |
| query_hint       | `SELECT COUNT(*) FROM cannabis_flags WHERE resolved_at IS NULL` |
| threshold        | count > 0                                                       |
| refresh_rate     | 6h                                                              |
| icon             | 🌿                                                              |
| presentation     | alert-row                                                       |
| action_label     | Review Flags                                                    |
| href             | /admin/cannabis                                                 |
| eyebrow          | Cannabis                                                        |
| sublabel         | "{count} pending review"                                        |
| slot_kind        | alert                                                           |
| priority_formula | `min(75, count * 20)`                                           |
| staleness_window | 24h                                                             |
| dismiss_behavior | none                                                            |
| grouping_key     | cannabis                                                        |
| dependencies     | postgres                                                        |
| admin_module     | /admin/cannabis                                                 |

---

#### Audit Log: Unusual Patterns

| Field            | Value                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.compliance-safety.audit-anomalies`                                                                                                     |
| category         | compliance-safety                                                                                                                             |
| label            | Audit Anomalies: {count}                                                                                                                      |
| description      | Unusual patterns in audit logs: bulk deletes, permission changes, rapid access changes                                                        |
| severity         | critical                                                                                                                                      |
| data_source      | `audit_log` table                                                                                                                             |
| query_hint       | `SELECT action_type, COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY action_type HAVING COUNT(*) > threshold` |
| threshold        | Any anomalous pattern detected                                                                                                                |
| refresh_rate     | 15m                                                                                                                                           |
| icon             | 🕵️                                                                                                                                            |
| presentation     | banner                                                                                                                                        |
| action_label     | Investigate                                                                                                                                   |
| href             | /admin/audit                                                                                                                                  |
| eyebrow          | Security                                                                                                                                      |
| sublabel         | "{patterns}"                                                                                                                                  |
| slot_kind        | alert                                                                                                                                         |
| priority_formula | `90 + severity_multiplier`                                                                                                                    |
| staleness_window | 1h                                                                                                                                            |
| dismiss_behavior | none                                                                                                                                          |
| grouping_key     | security                                                                                                                                      |
| dependencies     | postgres                                                                                                                                      |
| admin_module     | /admin/audit                                                                                                                                  |

---

#### Session Anomalies

| Field            | Value                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.compliance-safety.session-anomalies`                                                                            |
| category         | compliance-safety                                                                                                      |
| label            | Session Anomalies: {count}                                                                                             |
| description      | Suspicious session patterns: impossible travel between IPs, concurrent sessions from different locations               |
| severity         | critical                                                                                                               |
| data_source      | `sessions` table, IP geolocation                                                                                       |
| query_hint       | `SELECT user_id FROM sessions WHERE concurrent_from_different_geo = true AND created_at > NOW() - INTERVAL '24 hours'` |
| threshold        | count > 0                                                                                                              |
| refresh_rate     | 15m                                                                                                                    |
| icon             | 🚨                                                                                                                     |
| presentation     | banner                                                                                                                 |
| action_label     | Investigate                                                                                                            |
| href             | /admin/audit                                                                                                           |
| eyebrow          | Security                                                                                                               |
| sublabel         | "{userCount} users with suspicious sessions"                                                                           |
| slot_kind        | alert                                                                                                                  |
| priority_formula | `95`                                                                                                                   |
| staleness_window | 1h                                                                                                                     |
| dismiss_behavior | none                                                                                                                   |
| grouping_key     | security                                                                                                               |
| dependencies     | postgres                                                                                                               |
| admin_module     | /admin/audit                                                                                                           |

---

### Category: Infrastructure

---

#### Pi: CPU Usage

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ | ---------- |
| id               | `admin.infrastructure.pi-cpu`                                |
| category         | infrastructure                                               |
| label            | Pi CPU: {pct}%                                               |
| description      | Raspberry Pi CPU utilization percentage                      |
| severity         | medium                                                       |
| data_source      | Pi SSH (`ssh davidferra@10.0.0.177 'mpstat'`), pi-bridge API |
| query_hint       | `ssh davidferra@10.0.0.177 'top -bn1                         | grep Cpu'` |
| threshold        | pct > 85% (raised ceiling per project rules)                 |
| refresh_rate     | 5m                                                           |
| icon             | 🥧                                                           |
| presentation     | metric                                                       |
| action_label     | View Pi                                                      |
| href             | /admin/system                                                |
| eyebrow          | Pi                                                           |
| sublabel         | "Target ceiling: 85%"                                        |
| slot_kind        | metric                                                       |
| priority_formula | `pct > 95 ? 80 : (pct > 85 ? 50 : 0)`                        |
| staleness_window | 15m                                                          |
| dismiss_behavior | snooze-1h                                                    |
| grouping_key     | pi-resources                                                 |
| dependencies     | pi-bridge                                                    |
| admin_module     | /admin/system                                                |

---

#### Pi: Memory Usage

| Field            | Value                                        |
| ---------------- | -------------------------------------------- |
| id               | `admin.infrastructure.pi-memory`             |
| category         | infrastructure                               |
| label            | Pi Memory: {pct}%                            |
| description      | Raspberry Pi memory utilization percentage   |
| severity         | medium                                       |
| data_source      | Pi SSH, pi-bridge API                        |
| query_hint       | `ssh davidferra@10.0.0.177 'free -m'`        |
| threshold        | pct > 85% (raised ceiling per project rules) |
| refresh_rate     | 5m                                           |
| icon             | 🥧                                           |
| presentation     | metric                                       |
| action_label     | View Pi                                      |
| href             | /admin/system                                |
| eyebrow          | Pi                                           |
| sublabel         | "{usedMB}/{totalMB} MB"                      |
| slot_kind        | metric                                       |
| priority_formula | `pct > 95 ? 80 : (pct > 85 ? 50 : 0)`        |
| staleness_window | 15m                                          |
| dismiss_behavior | snooze-1h                                    |
| grouping_key     | pi-resources                                 |
| dependencies     | pi-bridge                                    |
| admin_module     | /admin/system                                |

---

#### Pi: Disk Usage

| Field            | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| id               | `admin.infrastructure.pi-disk`                          |
| category         | infrastructure                                          |
| label            | Pi Disk: {pct}%                                         |
| description      | Raspberry Pi disk utilization (442MB+ DB)               |
| severity         | high                                                    |
| data_source      | Pi SSH, pi-bridge API                                   |
| query_hint       | `ssh davidferra@10.0.0.177 'df -h /'`                   |
| threshold        | pct > 80%                                               |
| refresh_rate     | 1h                                                      |
| icon             | 💾                                                      |
| presentation     | metric                                                  |
| action_label     | View Pi Storage                                         |
| href             | /admin/system                                           |
| eyebrow          | Pi                                                      |
| sublabel         | "DB: {dbSizeMB}MB, free: {freeMB}MB"                    |
| slot_kind        | metric                                                  |
| priority_formula | `pct > 95 ? 90 : (pct > 85 ? 65 : (pct > 80 ? 40 : 0))` |
| staleness_window | 6h                                                      |
| dismiss_behavior | snooze-1h                                               |
| grouping_key     | pi-resources                                            |
| dependencies     | pi-bridge                                               |
| admin_module     | /admin/system                                           |

---

#### Pi: Temperature

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| id               | `admin.infrastructure.pi-temperature`               |
| category         | infrastructure                                      |
| label            | Pi Temp: {temp}C                                    |
| description      | Raspberry Pi CPU temperature                        |
| severity         | medium                                              |
| data_source      | Pi SSH                                              |
| query_hint       | `ssh davidferra@10.0.0.177 'vcgencmd measure_temp'` |
| threshold        | temp > 70C                                          |
| refresh_rate     | 5m                                                  |
| icon             | 🌡️                                                  |
| presentation     | metric                                              |
| action_label     | View Pi                                             |
| href             | /admin/system                                       |
| eyebrow          | Pi                                                  |
| sublabel         | "Throttling at 80C"                                 |
| slot_kind        | metric                                              |
| priority_formula | `temp > 80 ? 85 : (temp > 70 ? 50 : 0)`             |
| staleness_window | 15m                                                 |
| dismiss_behavior | snooze-1h                                           |
| grouping_key     | pi-resources                                        |
| dependencies     | pi-bridge                                           |
| admin_module     | /admin/system                                       |

---

#### Pi: Uptime

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| id               | `admin.infrastructure.pi-uptime`                            |
| category         | infrastructure                                              |
| label            | Pi Uptime: {days}d                                          |
| description      | Raspberry Pi system uptime                                  |
| severity         | info                                                        |
| data_source      | Pi SSH                                                      |
| query_hint       | `ssh davidferra@10.0.0.177 'uptime -s'`                     |
| threshold        | Always show (info); warn if uptime < 1h (unexpected reboot) |
| refresh_rate     | 1h                                                          |
| icon             | ⏲️                                                          |
| presentation     | metric                                                      |
| action_label     | View Pi                                                     |
| href             | /admin/system                                               |
| eyebrow          | Pi                                                          |
| sublabel         | "Since {bootTimestamp}"                                     |
| slot_kind        | metric                                                      |
| priority_formula | `uptimeHours < 1 ? 60 : 0`                                  |
| staleness_window | 6h                                                          |
| dismiss_behavior | permanent                                                   |
| grouping_key     | pi-resources                                                |
| dependencies     | pi-bridge                                                   |
| admin_module     | /admin/system                                               |

---

#### Pi: SSH Connectivity

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| id               | `admin.infrastructure.pi-ssh`                             |
| category         | infrastructure                                            |
| label            | Pi SSH: {status}                                          |
| description      | SSH connectivity to Raspberry Pi (davidferra@10.0.0.177)  |
| severity         | critical                                                  |
| data_source      | SSH probe                                                 |
| query_hint       | `ssh -o ConnectTimeout=5 davidferra@10.0.0.177 'echo ok'` |
| threshold        | status = unreachable                                      |
| refresh_rate     | 5m                                                        |
| icon             | 🔑                                                        |
| presentation     | banner                                                    |
| action_label     | Diagnose                                                  |
| href             | /admin/system                                             |
| eyebrow          | Pi                                                        |
| sublabel         | "Latency: {latencyMs}ms"                                  |
| slot_kind        | operational                                               |
| priority_formula | `unreachable ? 90 : 0`                                    |
| staleness_window | 15m                                                       |
| dismiss_behavior | none                                                      |
| grouping_key     | pi-connectivity                                           |
| dependencies     | none                                                      |
| admin_module     | /admin/system                                             |

---

#### Pi Bridge: Status + Latency

| Field            | Value                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| id               | `admin.infrastructure.pi-bridge-detail`                                                            |
| category         | infrastructure                                                                                     |
| label            | Pi Bridge: {latency}ms                                                                             |
| description      | Pi price bridge (port 7700) detailed status including price count and latency                      |
| severity         | high                                                                                               |
| data_source      | HTTP health check (localhost:7700)                                                                 |
| query_hint       | `const start = Date.now(); await fetch('http://localhost:7700/health'); return Date.now() - start` |
| threshold        | latency > 200ms or unreachable                                                                     |
| refresh_rate     | 5m                                                                                                 |
| icon             | 🌉                                                                                                 |
| presentation     | metric                                                                                             |
| action_label     | View Bridge                                                                                        |
| href             | /admin/openclaw/health                                                                             |
| eyebrow          | Infrastructure                                                                                     |
| sublabel         | "Serving {priceCount} prices, {latency}ms"                                                         |
| slot_kind        | operational                                                                                        |
| priority_formula | `unreachable ? 80 : (latency > 500 ? 50 : (latency > 200 ? 25 : 0))`                               |
| staleness_window | 15m                                                                                                |
| dismiss_behavior | snooze-1h                                                                                          |
| grouping_key     | pi-connectivity                                                                                    |
| dependencies     | none                                                                                               |
| admin_module     | /admin/openclaw/health                                                                             |

---

#### Data Engine Operator: Reachable

| Field            | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| id               | `admin.infrastructure.openclaw-operator`                 |
| category         | infrastructure                                           |
| label            | Operator: {status}                                       |
| description      | Data engine control center (localhost:4000) reachability |
| severity         | medium                                                   |
| data_source      | HTTP health check                                        |
| query_hint       | `fetch('http://localhost:4000/api/health')`              |
| threshold        | unreachable                                              |
| refresh_rate     | 5m                                                       |
| icon             | 🎛️                                                       |
| presentation     | badge                                                    |
| action_label     | View Operator                                            |
| href             | /admin/openclaw                                          |
| eyebrow          | Infrastructure                                           |
| sublabel         | "{status}"                                               |
| slot_kind        | operational                                              |
| priority_formula | `unreachable ? 55 : 0`                                   |
| staleness_window | 15m                                                      |
| dismiss_behavior | snooze-1h                                                |
| grouping_key     | data-engine-infra                                        |
| dependencies     | none                                                     |
| admin_module     | /admin/openclaw                                          |

---

#### Data Engine Dashboard: Reachable

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| id               | `admin.infrastructure.openclaw-dashboard`                 |
| category         | infrastructure                                            |
| label            | Dashboard: {status}                                       |
| description      | Data engine surveillance dashboard (Pi:8090) reachability |
| severity         | medium                                                    |
| data_source      | HTTP health check                                         |
| query_hint       | `fetch('http://10.0.0.177:8090/api/health')`              |
| threshold        | unreachable                                               |
| refresh_rate     | 5m                                                        |
| icon             | 📺                                                        |
| presentation     | badge                                                     |
| action_label     | View Dashboard                                            |
| href             | /admin/openclaw                                           |
| eyebrow          | Infrastructure                                            |
| sublabel         | "{status}"                                                |
| slot_kind        | operational                                               |
| priority_formula | `unreachable ? 50 : 0`                                    |
| staleness_window | 15m                                                       |
| dismiss_behavior | snooze-1h                                                 |
| grouping_key     | data-engine-infra                                         |
| dependencies     | pi-bridge                                                 |
| admin_module     | /admin/openclaw                                           |

---

#### Hermes: Cron Job Status

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| id               | `admin.infrastructure.hermes-cron-status`                             |
| category         | infrastructure                                                        |
| label            | Hermes Jobs: {running}/{total}                                        |
| description      | Status of all 6 Hermes cron jobs running in WSL2                      |
| severity         | high                                                                  |
| data_source      | WSL2 cron process list                                                |
| query_hint       | `check each of 6 registered hermes cron job PIDs and last exit codes` |
| threshold        | Any job not running or failed                                         |
| refresh_rate     | 15m                                                                   |
| icon             | 📨                                                                    |
| presentation     | alert-row                                                             |
| action_label     | View Hermes                                                           |
| href             | /admin/system                                                         |
| eyebrow          | Hermes                                                                |
| sublabel         | "Down: {downJobs}"                                                    |
| slot_kind        | operational                                                           |
| priority_formula | `downCount * 20`                                                      |
| staleness_window | 1h                                                                    |
| dismiss_behavior | snooze-1h                                                             |
| grouping_key     | hermes-infra                                                          |
| dependencies     | filesystem                                                            |
| admin_module     | /admin/system                                                         |

---

#### Hermes: Last Morning Report Age

| Field            | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| id               | `admin.infrastructure.hermes-report-age`                |
| category         | infrastructure                                          |
| label            | Morning Report: {age}                                   |
| description      | Time since the last Hermes morning report was generated |
| severity         | medium                                                  |
| data_source      | `docs/hermes/` filesystem                               |
| query_hint       | `stat -c %Y docs/hermes/latest-morning-report.md`       |
| threshold        | age > 30h (reports should be daily)                     |
| refresh_rate     | 6h                                                      |
| icon             | 🌅                                                      |
| presentation     | badge                                                   |
| action_label     | View Report                                             |
| href             | /admin/system                                           |
| eyebrow          | Hermes                                                  |
| sublabel         | "Generated: {timestamp}"                                |
| slot_kind        | operational                                             |
| priority_formula | `hoursOld > 48 ? 55 : (hoursOld > 30 ? 30 : 0)`         |
| staleness_window | 12h                                                     |
| dismiss_behavior | snooze-24h                                              |
| grouping_key     | hermes-infra                                            |
| dependencies     | filesystem                                              |
| admin_module     | /admin/system                                           |

---

#### Cloudflare Tunnel: Status

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| id               | `admin.infrastructure.cloudflare-tunnel`         |
| category         | infrastructure                                   |
| label            | CF Tunnel: {status}                              |
| description      | Cloudflare tunnel connectivity status            |
| severity         | critical                                         |
| data_source      | cloudflared process, Cloudflare API              |
| query_hint       | `cloudflared tunnel info; check process running` |
| threshold        | status != healthy                                |
| refresh_rate     | 5m                                               |
| icon             | ☁️                                               |
| presentation     | banner                                           |
| action_label     | View Tunnel                                      |
| href             | /admin/system                                    |
| eyebrow          | Infrastructure                                   |
| sublabel         | "Uptime: {tunnelUptime}"                         |
| slot_kind        | operational                                      |
| priority_formula | `unhealthy ? 95 : 0`                             |
| staleness_window | 15m                                              |
| dismiss_behavior | none                                             |
| grouping_key     | connectivity                                     |
| dependencies     | none                                             |
| admin_module     | /admin/system                                    |

---

#### SSL/Cert: Days Until Expiry

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| id               | `admin.infrastructure.ssl-expiry`                                     |
| category         | infrastructure                                                        |
| label            | SSL: {daysLeft}d remaining                                            |
| description      | Days until SSL certificate expiration                                 |
| severity         | high                                                                  |
| data_source      | `cloudflare_api`, `hermes_health_pulse`                               |
| query_hint       | `echo                                                                 | openssl s_client -connect domain:443 2>/dev/null | openssl x509 -noout -enddate` |
| threshold        | daysLeft < 30                                                         |
| refresh_rate     | daily                                                                 |
| icon             | 🔐                                                                    |
| presentation     | alert-row                                                             |
| action_label     | Renew Cert                                                            |
| href             | /admin/system                                                         |
| eyebrow          | Security                                                              |
| sublabel         | "Expires: {expiryDate}"                                               |
| slot_kind        | operational                                                           |
| priority_formula | `daysLeft < 7 ? 95 : (daysLeft < 14 ? 80 : (daysLeft < 30 ? 50 : 0))` |
| staleness_window | 24h                                                                   |
| dismiss_behavior | none                                                                  |
| grouping_key     | security-infra                                                        |
| dependencies     | none                                                                  |
| admin_module     | /admin/system                                                         |

---

#### Ollama: Model Status

| Field            | Value                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| id               | `admin.infrastructure.ollama-model`                                                   |
| category         | infrastructure                                                                        |
| label            | Ollama: {modelName}                                                                   |
| description      | Currently loaded Ollama model and responsiveness                                      |
| severity         | medium                                                                                |
| data_source      | Ollama API                                                                            |
| query_hint       | `fetch('http://localhost:11434/api/tags').then(r => r.json()).then(d => d.models[0])` |
| threshold        | No model loaded or unresponsive                                                       |
| refresh_rate     | 5m                                                                                    |
| icon             | 🧠                                                                                    |
| presentation     | metric                                                                                |
| action_label     | View AI                                                                               |
| href             | /admin/system                                                                         |
| eyebrow          | AI                                                                                    |
| sublabel         | "Model: {name}, size: {size}"                                                         |
| slot_kind        | operational                                                                           |
| priority_formula | `noModel ? 55 : (unresponsive ? 70 : 0)`                                              |
| staleness_window | 15m                                                                                   |
| dismiss_behavior | snooze-1h                                                                             |
| grouping_key     | ai-infra                                                                              |
| dependencies     | none                                                                                  |
| admin_module     | /admin/system                                                                         |

---

#### Ollama: Inference Latency

| Field            | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| id               | `admin.infrastructure.ollama-latency`                                           |
| category         | infrastructure                                                                  |
| label            | AI Latency: {avgMs}ms                                                           |
| description      | Average Ollama inference latency over the last 10 requests                      |
| severity         | low                                                                             |
| data_source      | Application metrics, Ollama request logs                                        |
| query_hint       | `SELECT AVG(duration_ms) FROM ai_request_log ORDER BY created_at DESC LIMIT 10` |
| threshold        | avgMs > 5000                                                                    |
| refresh_rate     | 15m                                                                             |
| icon             | ⚡                                                                              |
| presentation     | metric                                                                          |
| action_label     | View AI Perf                                                                    |
| href             | /admin/system                                                                   |
| eyebrow          | AI                                                                              |
| sublabel         | "Last 10 avg: {avgMs}ms, max: {maxMs}ms"                                        |
| slot_kind        | metric                                                                          |
| priority_formula | `avgMs > 10000 ? 50 : (avgMs > 5000 ? 25 : 0)`                                  |
| staleness_window | 1h                                                                              |
| dismiss_behavior | snooze-1h                                                                       |
| grouping_key     | ai-infra                                                                        |
| dependencies     | none                                                                            |
| admin_module     | /admin/system                                                                   |

---

#### Database Dead Tuples

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| id               | `admin.infrastructure.db-dead-tuples`                       |
| category         | infrastructure                                              |
| label            | Dead Tuples: {count}                                        |
| description      | PostgreSQL dead tuple accumulation indicating vacuum needed |
| severity         | medium                                                      |
| data_source      | `hermes db-health.jsonl, pg_stat_user_tables`               |
| query_hint       | `SELECT SUM(n_dead_tup) FROM pg_stat_user_tables`           |
| threshold        | total > 100000 or any table > 50000                         |
| refresh_rate     | 6h                                                          |
| icon             | 💀                                                          |
| presentation     | badge                                                       |
| action_label     | View DB Health                                              |
| href             | /admin/system                                               |
| eyebrow          | Database                                                    |
| sublabel         | "Worst: {tableName} ({tableDeadCount})"                     |
| slot_kind        | diagnostic                                                  |
| priority_formula | `total > 500000 ? 60 : (total > 100000 ? 30 : 0)`           |
| staleness_window | 12h                                                         |
| dismiss_behavior | snooze-24h                                                  |
| grouping_key     | database-maintenance                                        |
| dependencies     | postgres, hermes                                            |
| admin_module     | /admin/system                                               |

---

#### Backup Age

| Field            | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| id               | `admin.infrastructure.backup-age`                                        |
| category         | infrastructure                                                           |
| label            | Last Backup: {age} ago                                                   |
| description      | Time since last successful database backup                               |
| severity         | critical                                                                 |
| data_source      | `hermes backup-watchdog.jsonl`                                           |
| query_hint       | `parse latest entry from backup-watchdog.jsonl for timestamp and status` |
| threshold        | age > 24h (high) or age > 48h (critical) or status = failed              |
| refresh_rate     | 6h                                                                       |
| icon             | 💾                                                                       |
| presentation     | alert-row                                                                |
| action_label     | Check Backups                                                            |
| href             | /admin/system                                                            |
| eyebrow          | Backups                                                                  |
| sublabel         | "Status: {status}, Size: {sizeMB} MB"                                    |
| slot_kind        | operational                                                              |
| priority_formula | `failed ? 95 : (hoursOld > 48 ? 90 : (hoursOld > 24 ? 60 : 0))`          |
| staleness_window | 12h                                                                      |
| dismiss_behavior | none                                                                     |
| grouping_key     | backups                                                                  |
| dependencies     | hermes                                                                   |
| admin_module     | /admin/system                                                            |

---

#### Deploy Drift

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| id               | `admin.infrastructure.deploy-drift`                              |
| category         | infrastructure                                                   |
| label            | Deploy Drift: {uncommittedCount} files                           |
| description      | Uncommitted changes on production server (git dirty state)       |
| severity         | high                                                             |
| data_source      | `hermes git-changelog.md`                                        |
| query_hint       | `parse git status from hermes report for uncommitted file count` |
| threshold        | uncommittedCount > 0                                             |
| refresh_rate     | 6h                                                               |
| icon             | 🔀                                                               |
| presentation     | alert-row                                                        |
| action_label     | View Changes                                                     |
| href             | /admin/system                                                    |
| eyebrow          | Deploy                                                           |
| sublabel         | "{uncommittedCount} modified, {untrackedCount} untracked"        |
| slot_kind        | audit                                                            |
| priority_formula | `uncommittedCount * 10`                                          |
| staleness_window | 12h                                                              |
| dismiss_behavior | snooze-24h                                                       |
| grouping_key     | deploy                                                           |
| dependencies     | hermes                                                           |
| admin_module     | /admin/system                                                    |

---

#### Disk Usage by Partition

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| id               | `admin.infrastructure.disk-usage`                             |
| category         | infrastructure                                                |
| label            | Disk: {usedPct}% Used                                         |
| description      | Disk usage by partition from Hermes monitoring                |
| severity         | high                                                          |
| data_source      | `hermes disk-resources.jsonl`                                 |
| query_hint       | `parse disk-resources.jsonl for partition usage percentages`  |
| threshold        | any partition > 80%                                           |
| refresh_rate     | 6h                                                            |
| icon             | 💿                                                            |
| presentation     | metric                                                        |
| action_label     | View Disk                                                     |
| href             | /admin/system                                                 |
| eyebrow          | Infrastructure                                                |
| sublabel         | "Root: {rootPct}%, Data: {dataPct}%"                          |
| slot_kind        | operational                                                   |
| priority_formula | `maxPartitionPct > 95 ? 90 : (maxPartitionPct > 80 ? 50 : 0)` |
| staleness_window | 12h                                                           |
| dismiss_behavior | snooze-24h                                                    |
| grouping_key     | disk                                                          |
| dependencies     | hermes                                                        |
| admin_module     | /admin/system                                                 |

---

#### DB Connection Pool (Hermes)

| Field            | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| id               | `admin.infrastructure.db-connections-hermes`                    |
| category         | infrastructure                                                  |
| label            | DB Connections: {active}/{max}                                  |
| description      | Database connection pool from Hermes health reports             |
| severity         | high                                                            |
| data_source      | `hermes db-health.jsonl`                                        |
| query_hint       | `parse db-health.jsonl for active_connections, max_connections` |
| threshold        | utilization > 70%                                               |
| refresh_rate     | 6h                                                              |
| icon             | 🔗                                                              |
| presentation     | metric                                                          |
| action_label     | View DB Health                                                  |
| href             | /admin/system                                                   |
| eyebrow          | Database                                                        |
| sublabel         | "{pct}% pool utilization"                                       |
| slot_kind        | operational                                                     |
| priority_formula | `pct > 90 ? 80 : (pct > 70 ? 50 : 0)`                           |
| staleness_window | 12h                                                             |
| dismiss_behavior | snooze-1h                                                       |
| grouping_key     | database-maintenance                                            |
| dependencies     | hermes                                                          |
| admin_module     | /admin/system                                                   |

---

#### Hermes Morning Report Age

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| id               | `admin.infrastructure.hermes-report-age`            |
| category         | infrastructure                                      |
| label            | Hermes Report: {age} ago                            |
| description      | Time since last Hermes morning report was generated |
| severity         | medium                                              |
| data_source      | `docs/hermes/ latest report file modification time` |
| query_hint       | `stat latest file in docs/hermes/ for mtime`        |
| threshold        | age > 26h (missed morning report)                   |
| refresh_rate     | 6h                                                  |
| icon             | 📋                                                  |
| presentation     | badge                                               |
| action_label     | View Reports                                        |
| href             | /admin/system                                       |
| eyebrow          | Hermes                                              |
| sublabel         | "Last: {timestamp}"                                 |
| slot_kind        | operational                                         |
| priority_formula | `hoursOld > 48 ? 60 : (hoursOld > 26 ? 30 : 0)`     |
| staleness_window | 12h                                                 |
| dismiss_behavior | snooze-24h                                          |
| grouping_key     | hermes                                              |
| dependencies     | hermes                                              |
| admin_module     | /admin/system                                       |

---

### Category: Growth & Marketing

---

#### SEO: Top Pages by Traffic

| Field            | Value                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.seo-top-pages`                                                                                            |
| category         | growth-marketing                                                                                                                  |
| label            | Top Page: {pagePath}                                                                                                              |
| description      | Highest traffic pages in the last 7 days                                                                                          |
| severity         | info                                                                                                                              |
| data_source      | Analytics, server access logs                                                                                                     |
| query_hint       | `SELECT path, COUNT(*) FROM page_views WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY path ORDER BY COUNT(*) DESC LIMIT 5` |
| threshold        | Always show                                                                                                                       |
| refresh_rate     | daily                                                                                                                             |
| icon             | 📈                                                                                                                                |
| presentation     | card                                                                                                                              |
| action_label     | View Analytics                                                                                                                    |
| href             | /admin/analytics                                                                                                                  |
| eyebrow          | SEO                                                                                                                               |
| sublabel         | "{viewCount} views this week"                                                                                                     |
| slot_kind        | metric                                                                                                                            |
| priority_formula | `5`                                                                                                                               |
| staleness_window | 48h                                                                                                                               |
| dismiss_behavior | permanent                                                                                                                         |
| grouping_key     | seo                                                                                                                               |
| dependencies     | postgres                                                                                                                          |
| admin_module     | /admin/analytics                                                                                                                  |

---

#### SEO: 404 Errors

| Field            | Value                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.seo-404s`                                                                                                           |
| category         | growth-marketing                                                                                                                            |
| label            | 404s: {count}                                                                                                                               |
| description      | Pages returning 404 errors (broken links, missing content)                                                                                  |
| severity         | medium                                                                                                                                      |
| data_source      | Application logs, `silent_failures` table                                                                                                   |
| query_hint       | `SELECT path, COUNT(*) FROM request_log WHERE status = 404 AND created_at > NOW() - INTERVAL '7 days' GROUP BY path ORDER BY COUNT(*) DESC` |
| threshold        | count > 5 unique paths                                                                                                                      |
| refresh_rate     | 6h                                                                                                                                          |
| icon             | 🔗                                                                                                                                          |
| presentation     | badge                                                                                                                                       |
| action_label     | View 404s                                                                                                                                   |
| href             | /admin/analytics                                                                                                                            |
| eyebrow          | SEO                                                                                                                                         |
| sublabel         | "{uniquePaths} broken paths"                                                                                                                |
| slot_kind        | audit                                                                                                                                       |
| priority_formula | `min(50, uniquePaths * 5)`                                                                                                                  |
| staleness_window | 24h                                                                                                                                         |
| dismiss_behavior | snooze-24h                                                                                                                                  |
| grouping_key     | seo                                                                                                                                         |
| dependencies     | postgres                                                                                                                                    |
| admin_module     | /admin/analytics                                                                                                                            |

---

#### SEO: Crawl Errors

| Field            | Value                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.seo-crawl-errors`                                                                                     |
| category         | growth-marketing                                                                                                              |
| label            | Crawl Errors: {count}                                                                                                         |
| description      | Search engine crawl errors detected in the last 7 days                                                                        |
| severity         | medium                                                                                                                        |
| data_source      | Application logs, robots.txt access patterns                                                                                  |
| query_hint       | `SELECT COUNT(*) FROM request_log WHERE user_agent LIKE '%bot%' AND status >= 400 AND created_at > NOW() - INTERVAL '7 days'` |
| threshold        | count > 10                                                                                                                    |
| refresh_rate     | daily                                                                                                                         |
| icon             | 🕷️                                                                                                                            |
| presentation     | badge                                                                                                                         |
| action_label     | View Crawl Issues                                                                                                             |
| href             | /admin/analytics                                                                                                              |
| eyebrow          | SEO                                                                                                                           |
| sublabel         | "{count} errors from {botCount} bots"                                                                                         |
| slot_kind        | audit                                                                                                                         |
| priority_formula | `min(45, count * 2)`                                                                                                          |
| staleness_window | 48h                                                                                                                           |
| dismiss_behavior | snooze-24h                                                                                                                    |
| grouping_key     | seo                                                                                                                           |
| dependencies     | postgres                                                                                                                      |
| admin_module     | /admin/analytics                                                                                                              |

---

#### Social Feed: New Posts Today

| Field            | Value                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.social-posts-today`                               |
| category         | growth-marketing                                                          |
| label            | Social Posts: {count}                                                     |
| description      | New social feed posts created today                                       |
| severity         | info                                                                      |
| data_source      | `social_posts` table                                                      |
| query_hint       | `SELECT COUNT(*) FROM social_posts WHERE created_at::date = CURRENT_DATE` |
| threshold        | Always show                                                               |
| refresh_rate     | 1h                                                                        |
| icon             | 📱                                                                        |
| presentation     | metric                                                                    |
| action_label     | View Feed                                                                 |
| href             | /admin/social                                                             |
| eyebrow          | Social                                                                    |
| sublabel         | "vs {yesterdayCount} yesterday"                                           |
| slot_kind        | metric                                                                    |
| priority_formula | `5`                                                                       |
| staleness_window | 6h                                                                        |
| dismiss_behavior | permanent                                                                 |
| grouping_key     | social                                                                    |
| dependencies     | postgres                                                                  |
| admin_module     | /admin/social                                                             |

---

#### Social Feed: Engagement Rate

| Field            | Value                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.social-engagement`                                                                                                                                                          |
| category         | growth-marketing                                                                                                                                                                                    |
| label            | Engagement: {pct}%                                                                                                                                                                                  |
| description      | Social feed engagement rate (interactions / impressions) over the last 7 days                                                                                                                       |
| severity         | low                                                                                                                                                                                                 |
| data_source      | `social_posts` table, `social_interactions` table                                                                                                                                                   |
| query_hint       | `SELECT COUNT(DISTINCT si.id) * 100.0 / NULLIF(SUM(sp.impressions), 0) FROM social_posts sp LEFT JOIN social_interactions si ON sp.id = si.post_id WHERE sp.created_at > NOW() - INTERVAL '7 days'` |
| threshold        | pct < 2%                                                                                                                                                                                            |
| refresh_rate     | daily                                                                                                                                                                                               |
| icon             | 💬                                                                                                                                                                                                  |
| presentation     | metric                                                                                                                                                                                              |
| action_label     | View Engagement                                                                                                                                                                                     |
| href             | /admin/social                                                                                                                                                                                       |
| eyebrow          | Social                                                                                                                                                                                              |
| sublabel         | "7d rolling"                                                                                                                                                                                        |
| slot_kind        | metric                                                                                                                                                                                              |
| priority_formula | `pct < 1 ? 25 : (pct < 2 ? 10 : 5)`                                                                                                                                                                 |
| staleness_window | 48h                                                                                                                                                                                                 |
| dismiss_behavior | snooze-24h                                                                                                                                                                                          |
| grouping_key     | social                                                                                                                                                                                              |
| dependencies     | postgres                                                                                                                                                                                            |
| admin_module     | /admin/social                                                                                                                                                                                       |

---

#### Referral Partners: Active Count

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| id               | `admin.growth-marketing.referral-active`                     |
| category         | growth-marketing                                             |
| label            | Active Partners: {count}                                     |
| description      | Number of active referral partners                           |
| severity         | info                                                         |
| data_source      | `referral_partners` table                                    |
| query_hint       | `SELECT COUNT(*) FROM referral_partners WHERE active = true` |
| threshold        | Always show                                                  |
| refresh_rate     | daily                                                        |
| icon             | 🤝                                                           |
| presentation     | metric                                                       |
| action_label     | View Partners                                                |
| href             | /admin/referral-partners                                     |
| eyebrow          | Referrals                                                    |
| sublabel         | "{newThisMonth} added this month"                            |
| slot_kind        | metric                                                       |
| priority_formula | `5`                                                          |
| staleness_window | 48h                                                          |
| dismiss_behavior | permanent                                                    |
| grouping_key     | referrals                                                    |
| dependencies     | postgres                                                     |
| admin_module     | /admin/referral-partners                                     |

---

#### Referral Conversions: This Month

| Field            | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.referral-conversions`                                                     |
| category         | growth-marketing                                                                                  |
| label            | Referral Converts: {count}                                                                        |
| description      | Referral-driven signups or bookings this month                                                    |
| severity         | low                                                                                               |
| data_source      | `referral_conversions` table                                                                      |
| query_hint       | `SELECT COUNT(*) FROM referral_conversions WHERE created_at >= date_trunc('month', CURRENT_DATE)` |
| threshold        | Always show                                                                                       |
| refresh_rate     | daily                                                                                             |
| icon             | 🎯                                                                                                |
| presentation     | metric                                                                                            |
| action_label     | View Conversions                                                                                  |
| href             | /admin/referral-partners                                                                          |
| eyebrow          | Referrals                                                                                         |
| sublabel         | "vs {lastMonthCount} last month"                                                                  |
| slot_kind        | metric                                                                                            |
| priority_formula | `5`                                                                                               |
| staleness_window | 48h                                                                                               |
| dismiss_behavior | permanent                                                                                         |
| grouping_key     | referrals                                                                                         |
| dependencies     | postgres                                                                                          |
| admin_module     | /admin/referral-partners                                                                          |

---

#### Beta Feature: Adoption Rate

| Field            | Value                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.beta-adoption`                                                                          |
| category         | growth-marketing                                                                                                |
| label            | Beta Adoption: {featureName} {pct}%                                                                             |
| description      | Adoption rate per active beta feature flag                                                                      |
| severity         | low                                                                                                             |
| data_source      | `feature_flags` table, usage tracking                                                                           |
| query_hint       | `SELECT flag_name, users_using * 100.0 / eligible_users FROM feature_flags WHERE beta = true AND active = true` |
| threshold        | pct < 10% for any flag active > 14d                                                                             |
| refresh_rate     | daily                                                                                                           |
| icon             | 🧪                                                                                                              |
| presentation     | card                                                                                                            |
| action_label     | View Beta                                                                                                       |
| href             | /admin/beta                                                                                                     |
| eyebrow          | Beta                                                                                                            |
| sublabel         | "{usersUsing}/{eligibleUsers} users"                                                                            |
| slot_kind        | metric                                                                                                          |
| priority_formula | `pct < 5 ? 20 : 5`                                                                                              |
| staleness_window | 48h                                                                                                             |
| dismiss_behavior | snooze-24h                                                                                                      |
| grouping_key     | beta                                                                                                            |
| dependencies     | postgres                                                                                                        |
| admin_module     | /admin/beta                                                                                                     |

---

#### Survey: Pending Responses

| Field            | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| id               | `admin.growth-marketing.survey-pending`                                |
| category         | growth-marketing                                                       |
| label            | Survey Responses: {count}                                              |
| description      | Unreviewed survey submissions                                          |
| severity         | low                                                                    |
| data_source      | `beta_survey_responses` table                                          |
| query_hint       | `SELECT COUNT(*) FROM beta_survey_responses WHERE reviewed_at IS NULL` |
| threshold        | count > 0                                                              |
| refresh_rate     | 6h                                                                     |
| icon             | 📋                                                                     |
| presentation     | badge                                                                  |
| action_label     | Review Surveys                                                         |
| href             | /admin/beta-surveys                                                    |
| eyebrow          | Surveys                                                                |
| sublabel         | "{count} unreviewed"                                                   |
| slot_kind        | operational                                                            |
| priority_formula | `min(30, count * 5)`                                                   |
| staleness_window | 24h                                                                    |
| dismiss_behavior | snooze-24h                                                             |
| grouping_key     | surveys                                                                |
| dependencies     | postgres                                                               |
| admin_module     | /admin/beta-surveys                                                    |

---

#### Survey: Completion Rate

| Field            | Value                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id               | `admin.growth-marketing.survey-completion`                                                                                                                                                 |
| category         | growth-marketing                                                                                                                                                                           |
| label            | Survey Completion: {pct}%                                                                                                                                                                  |
| description      | Percentage of invited users who completed the survey                                                                                                                                       |
| severity         | low                                                                                                                                                                                        |
| data_source      | `beta_survey_responses` table, `beta_survey_invites` table                                                                                                                                 |
| query_hint       | `SELECT COUNT(DISTINCT r.user_id) * 100.0 / COUNT(DISTINCT i.user_id) FROM beta_survey_invites i LEFT JOIN beta_survey_responses r ON i.survey_id = r.survey_id AND i.user_id = r.user_id` |
| threshold        | pct < 20%                                                                                                                                                                                  |
| refresh_rate     | daily                                                                                                                                                                                      |
| icon             | ✅                                                                                                                                                                                         |
| presentation     | metric                                                                                                                                                                                     |
| action_label     | View Completion                                                                                                                                                                            |
| href             | /admin/beta-surveys                                                                                                                                                                        |
| eyebrow          | Surveys                                                                                                                                                                                    |
| sublabel         | "{completedCount}/{invitedCount} users"                                                                                                                                                    |
| slot_kind        | metric                                                                                                                                                                                     |
| priority_formula | `pct < 10 ? 20 : 5`                                                                                                                                                                        |
| staleness_window | 48h                                                                                                                                                                                        |
| dismiss_behavior | snooze-24h                                                                                                                                                                                 |
| grouping_key     | surveys                                                                                                                                                                                    |
| dependencies     | postgres                                                                                                                                                                                   |
| admin_module     | /admin/beta-surveys                                                                                                                                                                        |

---

#### Early Signups: Total

| Field            | Value                                        |
| ---------------- | -------------------------------------------- |
| id               | `admin.growth-marketing.early-signups-total` |
| category         | growth-marketing                             |
| label            | Early Signups: {count}                       |
| description      | Total early/waitlist signup count            |
| severity         | info                                         |
| data_source      | `early_signups` table                        |
| query_hint       | `SELECT COUNT(*) FROM early_signups`         |
| threshold        | Always show                                  |
| refresh_rate     | 6h                                           |
| icon             | 📝                                           |
| presentation     | metric                                       |
| action_label     | View Signups                                 |
| href             | /admin/analytics                             |
| eyebrow          | Growth                                       |
| sublabel         | "Total all-time"                             |
| slot_kind        | metric                                       |
| priority_formula | `5`                                          |
| staleness_window | 24h                                          |
| dismiss_behavior | permanent                                    |
| grouping_key     | early-signups                                |
| dependencies     | postgres                                     |
| admin_module     | /admin/analytics                             |

---

#### Early Signups: This Week

| Field            | Value                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.early-signups-week`                                               |
| category         | growth-marketing                                                                          |
| label            | Early Signups: +{count}                                                                   |
| description      | New early/waitlist signups this week                                                      |
| severity         | info                                                                                      |
| data_source      | `early_signups` table                                                                     |
| query_hint       | `SELECT COUNT(*) FROM early_signups WHERE created_at >= date_trunc('week', CURRENT_DATE)` |
| threshold        | Always show                                                                               |
| refresh_rate     | 6h                                                                                        |
| icon             | 📝                                                                                        |
| presentation     | metric                                                                                    |
| action_label     | View Signups                                                                              |
| href             | /admin/analytics                                                                          |
| eyebrow          | Growth                                                                                    |
| sublabel         | "vs {lastWeekCount} last week"                                                            |
| slot_kind        | metric                                                                                    |
| priority_formula | `5`                                                                                       |
| staleness_window | 24h                                                                                       |
| dismiss_behavior | permanent                                                                                 |
| grouping_key     | early-signups                                                                             |
| dependencies     | postgres                                                                                  |
| admin_module     | /admin/analytics                                                                          |

---

#### Outreach: Pending Campaigns

| Field            | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.outreach-pending`                                       |
| category         | growth-marketing                                                                |
| label            | Pending Outreach: {count}                                                       |
| description      | Outreach campaigns in draft or scheduled state                                  |
| severity         | low                                                                             |
| data_source      | `outreach_campaigns` table                                                      |
| query_hint       | `SELECT COUNT(*) FROM outreach_campaigns WHERE status IN ('draft','scheduled')` |
| threshold        | count > 0                                                                       |
| refresh_rate     | 6h                                                                              |
| icon             | 📤                                                                              |
| presentation     | badge                                                                           |
| action_label     | View Campaigns                                                                  |
| href             | /admin/outreach                                                                 |
| eyebrow          | Outreach                                                                        |
| sublabel         | "{draftCount} draft, {scheduledCount} scheduled"                                |
| slot_kind        | operational                                                                     |
| priority_formula | `min(25, count * 5)`                                                            |
| staleness_window | 24h                                                                             |
| dismiss_behavior | snooze-24h                                                                      |
| grouping_key     | outreach                                                                        |
| dependencies     | postgres                                                                        |
| admin_module     | /admin/outreach                                                                 |

---

#### Web Research: Pending Items

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| id               | `admin.growth-marketing.web-research-pending`                |
| category         | growth-marketing                                             |
| label            | Research Queue: {count}                                      |
| description      | Pending web research items awaiting review or action         |
| severity         | low                                                          |
| data_source      | `web_research` table                                         |
| query_hint       | `SELECT COUNT(*) FROM web_research WHERE status = 'pending'` |
| threshold        | count > 0                                                    |
| refresh_rate     | 6h                                                           |
| icon             | 🔬                                                           |
| presentation     | badge                                                        |
| action_label     | View Research                                                |
| href             | /admin/web-research                                          |
| eyebrow          | Research                                                     |
| sublabel         | "{count} items pending"                                      |
| slot_kind        | operational                                                  |
| priority_formula | `min(20, count * 3)`                                         |
| staleness_window | 24h                                                          |
| dismiss_behavior | snooze-24h                                                   |
| grouping_key     | research                                                     |
| dependencies     | postgres                                                     |
| admin_module     | /admin/web-research                                          |

---

#### Outreach Bounce Rate

| Field            | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| id               | `admin.growth-marketing.outreach-bounce-rate`                     |
| category         | growth-marketing                                                  |
| label            | Bounce Rate: {rate}%                                              |
| description      | Email outreach bounce rate with warning threshold                 |
| severity         | high                                                              |
| data_source      | `outreach campaign tracking in lib/discover/outreach-campaign.ts` |
| query_hint       | `bounced / total_sent * 100 from outreach batch history`          |
| threshold        | rate > 5% (warn) or rate > 10% (critical, domain reputation risk) |
| refresh_rate     | daily                                                             |
| icon             | 📧                                                                |
| presentation     | alert-row                                                         |
| action_label     | View Campaigns                                                    |
| href             | /admin/outreach                                                   |
| eyebrow          | Email Health                                                      |
| sublabel         | "{bouncedCount} bounced of {sentCount} sent"                      |
| slot_kind        | alert                                                             |
| priority_formula | `rate > 10 ? 70 : (rate > 5 ? 40 : 0)`                            |
| staleness_window | 24h                                                               |
| dismiss_behavior | snooze-24h                                                        |
| grouping_key     | outreach                                                          |
| dependencies     | postgres                                                          |
| admin_module     | /admin/outreach                                                   |

---

#### Outreach Dead Leads

| Field            | Value                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.outreach-dead-leads`                                                |
| category         | growth-marketing                                                                            |
| label            | Dead Leads: {count}                                                                         |
| description      | Outreach candidates without email addresses (unreachable)                                   |
| severity         | low                                                                                         |
| data_source      | `outreach candidates WHERE email IS NULL`                                                   |
| query_hint       | `SELECT COUNT(*) FROM outreach_candidates WHERE email IS NULL AND status = 'not_contacted'` |
| threshold        | count > 50                                                                                  |
| refresh_rate     | daily                                                                                       |
| icon             | 📭                                                                                          |
| presentation     | metric                                                                                      |
| action_label     | View Leads                                                                                  |
| href             | /admin/outreach                                                                             |
| eyebrow          | Lead Quality                                                                                |
| sublabel         | "{pct}% of total candidates"                                                                |
| slot_kind        | audit                                                                                       |
| priority_formula | `pct > 30 ? 30 : 5`                                                                         |
| staleness_window | 24h                                                                                         |
| dismiss_behavior | permanent                                                                                   |
| grouping_key     | outreach                                                                                    |
| dependencies     | postgres                                                                                    |
| admin_module     | /admin/outreach                                                                             |

---

#### Web Research Provider Health

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| id               | `admin.growth-marketing.web-research-providers`           |
| category         | growth-marketing                                          |
| label            | Research Providers: {activeCount}/{totalCount}            |
| description      | Web research provider credential status and availability  |
| severity         | medium                                                    |
| data_source      | `getWebResearchAdminDashboard() provider status`          |
| query_hint       | `check each provider: enabled, credentialStatus, message` |
| threshold        | any provider down or credentials expired                  |
| refresh_rate     | 6h                                                        |
| icon             | 🔬                                                        |
| presentation     | badge                                                     |
| action_label     | View Providers                                            |
| href             | /admin/web-research                                       |
| eyebrow          | Research                                                  |
| sublabel         | "{downCount} providers down"                              |
| slot_kind        | operational                                               |
| priority_formula | `downCount * 20`                                          |
| staleness_window | 12h                                                       |
| dismiss_behavior | snooze-24h                                                |
| grouping_key     | research                                                  |
| dependencies     | postgres                                                  |
| admin_module     | /admin/web-research                                       |

---

#### Web Research Candidate Queue

| Field            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| id               | `admin.growth-marketing.web-research-candidates`                            |
| category         | growth-marketing                                                            |
| label            | Research Queue: {pendingCount}                                              |
| description      | Web research candidates pending review before publication                   |
| severity         | low                                                                         |
| data_source      | `getWebResearchAdminDashboard() candidate pipeline`                         |
| query_hint       | `count candidates by status: pending_review, reviewed, published, rejected` |
| threshold        | pendingCount > 20                                                           |
| refresh_rate     | 6h                                                                          |
| icon             | 📋                                                                          |
| presentation     | badge                                                                       |
| action_label     | Review Candidates                                                           |
| href             | /admin/web-research                                                         |
| eyebrow          | Research                                                                    |
| sublabel         | "{reviewedCount} ready to publish"                                          |
| slot_kind        | operational                                                                 |
| priority_formula | `pendingCount > 50 ? 30 : 10`                                               |
| staleness_window | 24h                                                                         |
| dismiss_behavior | snooze-24h                                                                  |
| grouping_key     | research                                                                    |
| dependencies     | postgres                                                                    |
| admin_module     | /admin/web-research                                                         |

---

## Summary Statistics

### Total Items: 152

### By Category

| Category            | Count                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| System Health       | 38                                                                                                         |
| Data Quality        | 22                                                                                                         |
| User Health         | 18                                                                                                         |
| Business Metrics    | 19                                                                                                         |
| Inquiry Pipeline    | 9                                                                                                          |
| Content & Quality   | 11                                                                                                         |
| Compliance & Safety | 9                                                                                                          |
| Infrastructure      | 22                                                                                                         |
| Growth & Marketing  | 18                                                                                                         |
| **Total**           | **152** (note: some items have overlap with infrastructure and system health, counted in primary category) |

### By Severity

| Severity  | Count   |
| --------- | ------- |
| Critical  | 17      |
| High      | 44      |
| Medium    | 45      |
| Low       | 25      |
| Info      | 21      |
| **Total** | **152** |

### By Refresh Rate

| Refresh Rate | Count   |
| ------------ | ------- |
| realtime     | 0       |
| 1m           | 6       |
| 5m           | 20      |
| 15m          | 22      |
| 1h           | 20      |
| 6h           | 36      |
| daily        | 48      |
| **Total**    | **152** |

### By Presentation

| Presentation | Count                                                       |
| ------------ | ----------------------------------------------------------- |
| banner       | 16                                                          |
| alert-row    | 30                                                          |
| card         | 17                                                          |
| badge        | 33                                                          |
| metric       | 47                                                          |
| pill         | 4                                                           |
| **Total**    | **147** (5 items share presentation types across groupings) |

### By Slot Kind

| Slot Kind   | Count   |
| ----------- | ------- |
| operational | 38      |
| alert       | 28      |
| metric      | 40      |
| trend       | 13      |
| audit       | 22      |
| diagnostic  | 11      |
| **Total**   | **152** |

---

## Coverage Matrix

This matrix shows which existing admin modules are covered by rail items and to what degree.

| Admin Module       | Route                     | Rail Items | Coverage                                                                  |
| ------------------ | ------------------------- | ---------- | ------------------------------------------------------------------------- |
| System             | /admin/system             | 18         | **Full**                                                                  |
| Silent Failures    | /admin/silent-failures    | 8          | **Full**                                                                  |
| Pricing Health     | /admin/pricing-health     | 9          | **Full** (added PIE Governor)                                             |
| Pricing Coverage   | /admin/pricing-coverage   | 2          | **Full**                                                                  |
| Data Engine        | /admin/openclaw           | 5          | **Full**                                                                  |
| Data Engine Health | /admin/openclaw/health    | 1          | **Partial** (detail view still needed)                                    |
| Users              | /admin/users              | 6          | **Full** (added Chef Admin Status)                                        |
| Clients            | /admin/clients            | 3          | **Full**                                                                  |
| Pulse              | /admin/pulse              | 5          | **Full**                                                                  |
| Financials         | /admin/financials         | 11         | **Full** (added Revenue Breakdown, COGS, OpEx, Net Profit)                |
| Reconciliation     | /admin/reconciliation     | 1          | **Partial** (detail reconciliation still manual)                          |
| Payments           | /admin/system/payments    | 6          | **Full** (added Stripe Mode, Stripe Webhooks, Connect Status)             |
| Inquiries          | /admin/inquiries          | 7          | **Full**                                                                  |
| Directory          | /admin/directory          | 5          | **Full**                                                                  |
| Directory Listings | /admin/directory-listings | 4          | **Full**                                                                  |
| PIE Compliance     | /admin/pie-compliance     | 2          | **Full**                                                                  |
| Flags              | /admin/flags              | 2          | **Full**                                                                  |
| Cannabis           | /admin/cannabis           | 2          | **Full** (added Cannabis Tier Queue)                                      |
| Audit              | /admin/audit              | 4          | **Full**                                                                  |
| Analytics          | /admin/analytics          | 5          | **Full**                                                                  |
| Social             | /admin/social             | 3          | **Full** (added Review Moderation Queue)                                  |
| Outreach           | /admin/outreach           | 3          | **Full** (added Bounce Rate, Dead Leads)                                  |
| Referral Partners  | /admin/referral-partners  | 2          | **Full**                                                                  |
| Beta               | /admin/beta               | 1          | **Full**                                                                  |
| Beta Surveys       | /admin/beta-surveys       | 2          | **Full**                                                                  |
| Beta Onboarding    | /admin/beta/onboarding    | 2          | **Full**                                                                  |
| Web Research       | /admin/web-research       | 4          | **Full** (added Provider Health, Candidate Queue, existing Pending Items) |
| Notifications      | /admin/notifications      | 1          | **Partial**                                                               |
| Presence           | /admin/presence           | 1          | **Partial**                                                               |
| Feedback           | /admin/feedback           | 4          | **Full** (added Feedback Sentiment, Security Reports)                     |
| Command Center     | /admin/command-center     | 0          | **Not covered** (orchestration hub, not metric source)                    |
| Communications     | /admin/communications     | 1          | **Partial** (added Platform Announcement Status)                          |
| Conversations      | /admin/conversations      | 0          | **Not covered** (detail view, not metric source)                          |
| Events             | /admin/events             | 0          | **Partial** (zombie events covered under system health)                   |
| Hub                | /admin/hub                | 1          | **Partial** (added Dinner Circle Compliance)                              |
| Services           | /admin/services           | 1          | **Full** (added Service Toggle State)                                     |
| Price Catalog      | /admin/price-catalog      | 0          | **Not covered** (browse view, not alert source)                           |

### Notes on Uncovered Modules

- **Command Center** (`/admin/command-center`): This is an orchestration/navigation surface, not a data source. The rail replaces the need to visit it manually.
- **Communications** (`/admin/communications`): Now partially covered by Platform Announcement Status. Inquiry aging, unread messages, and notification items cover remaining purpose.
- **Conversations** (`/admin/conversations`): Detail view for individual conversations; not suitable for rail-level aggregation.
- **Events** (`/admin/events`): Zombie events are covered. Active event management is operational (not an alert surface).
- **Hub** (`/admin/hub`): Now partially covered by Dinner Circle Compliance. The rail itself replaces the navigation function.
- **Services** (`/admin/services`): Manual service start/stop; individual service items are already tracked.
- **Price Catalog** (`/admin/price-catalog`): Browse/reference surface; PIE sync and coverage items cover its health.
