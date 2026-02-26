# Automations Overhaul

**Date:** 2026-02-27
**Branch:** fix/cron-get-post-mismatch

## Why This Change Was Made

The automations system had four problems that this overhaul addresses:

1. **Deduplication bug (silent spam).** Time-based cron triggers (`event_approaching`, `no_response_timeout`) fired on every 15-minute cycle. A confirmed event within 48h would trigger any matching custom rule ~192 times before the event. Chefs with custom rules were getting hundreds of duplicate notifications without knowing it.

2. **No chef opt-in/out.** Built-in automations (follow-up reminders, event approaching alerts, inquiry auto-expiry, client day-before emails, time-tracking nudges) were always-on. Chefs had no way to turn off what didn't fit their workflow.

3. **No client opt-out.** The lifecycle cron sent day-before event reminder emails to clients unconditionally. Individual clients couldn't be opted out.

4. **Unintuitive rule builder.** The condition builder required knowing exact internal field names (typed as raw text). The template picker required pasting a UUID. No rule editing existed — only create and delete.

---

## What Changed

### Database (`20260227000002_automation_settings.sql`)

**New table: `chef_automation_settings`**

- One row per chef (unique on `tenant_id`)
- Toggles for each built-in automation: `follow_up_reminders_enabled`, `no_response_alerts_enabled`, `event_approaching_alerts_enabled`, `inquiry_auto_expiry_enabled`, `quote_auto_expiry_enabled`, `client_event_reminders_enabled`, `time_tracking_reminders_enabled`
- Configurable parameters: `follow_up_reminder_interval_hours` (default 48), `no_response_threshold_days` (default 3), `event_approaching_hours` (default 48), `inquiry_expiry_days` (default 30)
- All columns default to enabled (opt-out model — existing behavior preserved by default)

**New column on `clients`: `automated_emails_enabled boolean DEFAULT true`**

- When `false`, the lifecycle cron skips sending automated emails to that client
- Chef-controlled; clients do not see or manage this setting

**New index on `automation_executions(rule_id, trigger_entity_id, status, executed_at DESC)`**

- Speeds up the per-entity cooldown check added to the engine

---

### Deduplication: `lib/automations/engine.ts`

Added per-entity cooldown windows to the rule evaluation loop. Before executing a rule for a specific entity, the engine queries `automation_executions` for a recent successful execution of the same rule on the same entity:

| Trigger               | Cooldown |
| --------------------- | -------- |
| `event_approaching`   | 12 hours |
| `no_response_timeout` | 24 hours |
| `follow_up_overdue`   | 24 hours |
| `quote_expiring`      | 24 hours |

If a matching recent execution exists, the rule is skipped silently (no log entry). This eliminates the 192x duplicate problem for time-based triggers.

---

### New Server Actions: `lib/automations/settings-actions.ts`

- `getAutomationSettings()` — authenticated chef fetch (returns defaults if no DB row yet)
- `updateAutomationSettings(input)` — upserts the chef's settings (creates on first save)
- `getAutomationSettingsForTenant(tenantId)` — admin helper for cron routes (no auth check)

---

### New Type Definitions: `lib/automations/types.ts`

- `TRIGGER_CONTEXT_FIELDS` — maps each trigger event to its available context fields with human-readable labels. Used by the rule builder to show dropdowns.
- `ChefAutomationSettings` — TypeScript type mirroring the DB table.
- `DEFAULT_AUTOMATION_SETTINGS` — used when no row exists yet (all defaults, all enabled).

---

### Built-in Settings UI: `components/automations/built-in-settings.tsx`

A new card component with toggle switches for each built-in automation. Plain-English descriptions. Inline parameter inputs for configurable thresholds. Single "Save" button writes via `updateAutomationSettings()`.

Displayed at the top of `/settings/automations` above the Custom Rules section.

---

### Rule Builder UX Overhaul: `components/automations/rule-builder.tsx`

- **Condition field picker** — dropdown populated from `TRIGGER_CONTEXT_FIELDS[selectedTrigger]`, replacing the freeform text input. Shows the hint text (example values) in the value placeholder.
- **Template picker** — fetches chef's active response templates via `getTemplatesForAutomations()` and shows a named dropdown, replacing UUID paste.
- **Edit mode** — accepts optional `initialRule` prop; form pre-populates for editing; submit calls `updateAutomationRule()` instead of `createAutomationRule()`.
- **Quick-start gallery** — 4 pre-built rule starters shown when creating a new rule (Wix lead alert, no-response follow-up, day-before prep reminder, inquiry status note). Chefs can click to pre-fill the form and customise.
- Accessibility: `aria-label` added to all unlabeled `<select>` elements; `type="button"` on all `<button>` elements.

---

### Automations List: `app/(chef)/settings/automations/automations-list.tsx`

- **Built-in automations section** at the top using `<BuiltInSettings>`.
- **Edit button** on each rule card — opens `<RuleBuilder>` in edit mode inline.
- **Better empty state** with description and "Create your first rule" CTA.
- Rule cards now show last-fired date alongside fire count.

---

### Automations Page: `app/(chef)/settings/automations/page.tsx`

Added `getAutomationSettings()` to the parallel data fetch; passes `settings` to `AutomationsList`.

---

### Automations Cron: `app/api/scheduled/automations/route.ts`

- `no_response_timeout` now queries all awaiting-client inquiries and applies per-tenant `no_response_threshold_days` before firing.
- `event_approaching` queries up to 168h ahead and filters per-tenant `event_approaching_hours`; skipped for tenants with `event_approaching_alerts_enabled = false`.
- Both checks respect chef settings via `getAutomationSettingsForTenant()`.
- Engine deduplication handles the "fires too often" problem — no additional debouncing needed in the cron itself.

### Time-Tracking Reminders: `lib/events/time-reminders.ts`

- `runTimeTrackingReminderSweep()` now respects `time_tracking_reminders_enabled` per tenant.
- After building the tenant ID list from relevant events, the sweep does a single batch query against `chef_automation_settings` for any tenants that have explicitly set `time_tracking_reminders_enabled = false`.
- Those tenants are added to a `disabledTenants` Set and skipped in the main event loop.
- Missing row = enabled (opt-out model, consistent with all other built-in automations).
- No N+1: one additional query covers all tenants regardless of event count.

---

### Follow-ups Cron: `app/api/scheduled/follow-ups/route.ts`

- Checks `follow_up_reminders_enabled` per tenant; skips if disabled.
- Uses `follow_up_reminder_interval_hours` for rescheduling (previously hardcoded to 48h).
- Returns `skipped` count in the response alongside `notified` and `errors`.

---

### Lifecycle Cron: `app/api/scheduled/lifecycle/route.ts`

- **Inquiry auto-expiry**: uses per-tenant `inquiry_expiry_days` (previously hardcoded to 30); skips if `inquiry_auto_expiry_enabled = false`.
- **Quote auto-expiry**: skips if `quote_auto_expiry_enabled = false`.
- **Client reminder emails**: two opt-out levels applied:
  1. Chef-level: skips all for tenant if `client_event_reminders_enabled = false`
  2. Client-level: skips individual clients with `automated_emails_enabled = false`
- Response includes `inquiriesSkipped`, `quotesSkipped`, `remindersSkipped` for observability.

---

### Client Email Toggle: `components/clients/client-email-toggle.tsx`

Small `'use client'` toggle component added to the Client Information card on the client detail page (`app/(chef)/clients/[id]/page.tsx`). Chef can toggle automated emails on/off per client. Optimistic UI with error revert.

Server action: `setClientAutomatedEmails(clientId, enabled)` in `lib/clients/actions.ts`.

---

## Architecture: Two Systems

```
Built-in Automations (system)        Custom Rule Engine (chef-defined)
────────────────────────────         ─────────────────────────────────
Always run for all chefs             Only run if chef created rules
Chef can toggle each ON/OFF          Each rule can be paused/deleted
Chef sets parameters per toggle      Rule builder uses guided dropdowns
Client can opt out (emails only)     Engine deduplication prevents spam
```

Built-ins are separate from custom rules. Disabling a built-in (e.g. Follow-up Reminders) does NOT affect custom rules with a `follow_up_overdue` trigger — those are additive.

---

## How to Apply

1. Apply the migration:
   ```
   supabase db push --linked
   ```
2. Verify the `chef_automation_settings` table and `clients.automated_emails_enabled` column were created.
3. Verify the index on `automation_executions` was created.
4. Visit `/settings/automations` — Built-in Automations section should appear at the top.
5. Test: toggle a built-in off, verify the relevant cron respects it by checking logs.
6. Test: create a rule using the new builder — field picker dropdown should show options based on the selected trigger.
7. Test: edit an existing rule — form should pre-populate.

---

## Files Changed

| File                                                         | Change                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `supabase/migrations/20260227000002_automation_settings.sql` | New                                                                               |
| `lib/automations/types.ts`                                   | Added TRIGGER_CONTEXT_FIELDS, ChefAutomationSettings, DEFAULT_AUTOMATION_SETTINGS |
| `lib/automations/engine.ts`                                  | Added cooldown deduplication                                                      |
| `lib/automations/settings-actions.ts`                        | New — get/update automation settings                                              |
| `lib/automations/actions.ts`                                 | Added getTemplatesForAutomations()                                                |
| `lib/clients/actions.ts`                                     | Added setClientAutomatedEmails()                                                  |
| `components/automations/built-in-settings.tsx`               | New — built-in toggle UI                                                          |
| `components/automations/rule-builder.tsx`                    | Field dropdowns, template picker, edit mode, quick-start                          |
| `components/clients/client-email-toggle.tsx`                 | New — client email opt-out toggle                                                 |
| `app/(chef)/settings/automations/automations-list.tsx`       | Built-in section + edit buttons                                                   |
| `app/(chef)/settings/automations/page.tsx`                   | Load settings                                                                     |
| `app/(chef)/clients/[id]/page.tsx`                           | Added ClientEmailToggle to client info card                                       |
| `app/api/scheduled/automations/route.ts`                     | Respect chef settings                                                             |
| `app/api/scheduled/follow-ups/route.ts`                      | Respect chef settings + configurable interval                                     |
| `app/api/scheduled/lifecycle/route.ts`                       | Respect chef + client settings                                                    |
| `lib/events/time-reminders.ts`                               | Respect time_tracking_reminders_enabled per tenant                                |
