# Settings and Staff Freeze Lanes

Date: 2026-05-01
Branch: `feature/v1-builder-runtime-scaffold`

## Scope

Owned paths:

- `components/settings/**`
- `components/staff/**`
- `docs/reports/settings-staff-freeze-lanes.md`
- `tsconfig.ci.expanded.json`, only for deleted file entries

Module owners:

- Settings configuration: `chef-workspace/settings-configuration`
- Google and webhooks integration settings: `chef-workspace/settings-configuration` with integration adapters
- AI settings: `ai-boundaries/ollama-gateway`, `ai-boundaries/ai-privacy`
- Public profile and SEO settings: `public-trust/public-chef-profile`
- Staff execution: `staff-partner/staff-execution`
- Payroll and labor edges: `finance-ledger` plus `staff-partner`

## Pruned

| File | Classification | Owner proof | Reachability proof |
| --- | --- | --- | --- |
| `components/settings/connected-accounts.tsx` | duplicate prune-candidate | Gmail connection UI is now owned by root settings `GoogleIntegrations`; generic integration accounts are owned by `components/integrations/connected-accounts.tsx` on `/settings/integrations`. | No exact import from app code. `app/(chef)/settings/integrations/page.tsx` imports `@/components/integrations/connected-accounts`; `app/(chef)/settings/page.tsx` imports `@/components/settings/google-integrations`. |
| `components/settings/google-calendar-connect.tsx` | duplicate prune-candidate | Calendar connection UI is already included in `components/settings/google-integrations.tsx`, rendered from root `/settings`. | No exact import or symbol reference outside itself. Calendar settings route uses `ICalFeedSettings`; root settings uses `GoogleIntegrations`. |
| `components/settings/webhook-manager.tsx` | duplicate prune-candidate | Webhook settings are owned by `/settings/webhooks` and `components/settings/webhook-settings.tsx`, which supports create, delete, pause, test, signing secret display, and delivery logs. | No exact import or symbol reference outside itself. `app/(chef)/settings/webhooks/page.tsx` dynamically imports `@/components/settings/webhook-settings`. |

## Keep Or Recover

| File | Classification | Reason |
| --- | --- | --- |
| `components/settings/ai-provider-settings.tsx` | uncertain, do not recover as-is | No app import found. The UI exposes browser, server, and local provider preference behavior that conflicts with the single Ollama-compatible provider rule for production direction. Canonical AI trust controls are on `/settings/ai-privacy` through `LocalAiSettings` and server AI remains centered on `parseWithOllama` in `lib/ai/parse-ollama.ts`. Delete only after an AI-boundaries owner confirms browser-local Remy settings are intentionally superseded. |
| `components/settings/cancellation-policy-editor.tsx` | keep/recover | No app import found, but cancellation policy is an event and money boundary. It uses `lib/events/cancellation-actions` and protected form recovery. Not a safe deletion without canonical policy editor proof. |
| `components/settings/gratuity-settings.tsx` | keep/recover | No app import found, but gratuity affects quote money presentation through `lib/chef/gratuity-actions`. Not a safe deletion without canonical gratuity settings proof. |
| `components/settings/off-hours-form.tsx` | keep/recover | No app import found. Notification off-hours behavior is user-visible alert delivery configuration. Keep pending a notification settings owner decision. |
| `components/settings/portal-seo-health.tsx` | keep/recover | No app import found, but public profile SEO belongs to `public-trust/public-chef-profile`. Keep pending public profile owner placement. |
| `components/settings/primary-nav-form.tsx` | keep/recover | Navigation settings page exists and imports `MobileTabForm`, `ArchetypePicker`, and `ShellDiagnosticsCard`; this primary bar editor has no current app import but belongs to shell governance. Keep pending navigation owner decision. |
| `components/settings/settings-guided-overview.tsx` | keep/recover | Unit test `tests/unit/settings-readability.test.ts` reads this file, but root settings currently renders `SettingsFixActions` instead. Keep pending settings UX owner decision on whether to restore or remove the readability test. |
| `components/staff/clock-panel.tsx` | keep/recover | No app import found, but time tracking is high-risk staff/payroll behavior and calls `lib/staff/clock-actions`. Not duplicate-safe. |
| `components/staff/coc-acknowledgment-button.tsx` | keep/recover | No app import found, but code-of-conduct acknowledgement affects staff access and compliance. Not duplicate-safe. |
| `components/staff/contractor-agreement-panel.tsx` | keep/recover | No app import found, but contractor agreements are compliance and payment-adjacent staff records. Not duplicate-safe. |
| `components/staff/drag-schedule.tsx` | uncertain | No app import found. It overlaps staff scheduling, but canonical chef schedule currently imports `components/staffing/StaffScheduler.tsx`, outside this task scope. Do not delete without staff scheduling owner confirmation. |
| `components/staff/labor-dashboard.tsx` | keep/recover | No app import found, but labor analytics are money-facing. Remy read actions also expose labor dashboard data. Not duplicate-safe. |
| `components/staff/payroll-summary.tsx` | keep/recover | No app import found, but payroll is finance-ledger adjacent and calls `getPayrollSummary`. Not duplicate-safe. |
| `components/staff/send-staff-portal-button.tsx` | keep/recover | No app import found, but staff portal access token generation is access-sensitive. Not duplicate-safe. |
| `components/staff/staff-availability-manager.tsx` | uncertain | No app import found. Chef availability route canonically uses `AvailabilityGrid`, but this component provides recurring and date-specific staff availability editing. Do not delete until staff scheduling owner decides whether it should recover or be superseded. |
| `components/staff/staff-schedule-calendar.tsx` | uncertain | No app import found. Chef schedule route canonically uses `components/staffing/StaffScheduler.tsx`, but this component composes `ShiftForm` and scheduling actions. Do not delete without owner confirmation because it may represent a richer editor lane. |
| `components/staff/va-task-board.tsx` | keep/recover | No app import found, but it owns the VA task board with `VaTaskForm` and `VaTaskDetail`. Not duplicate-safe without a canonical VA task route owner proof. |

## Reachable Keep

These owned files have current app or test imports and were not changed:

- `components/settings/account-access-monitor.tsx`
- `components/settings/api-key-manager.tsx`
- `components/settings/archetype-picker.tsx`
- `components/settings/booking-page-settings.tsx`
- `components/settings/branding-card.tsx`
- `components/settings/business-mode-toggle.tsx`
- `components/settings/cancel-deletion-card.tsx`
- `components/settings/change-password-form.tsx`
- `components/settings/chef-background-settings.tsx`
- `components/settings/client-dashboard-layout-form.tsx`
- `components/settings/color-palette-picker.tsx`
- `components/settings/custom-field-builder.tsx`
- `components/settings/dashboard-layout-form.tsx`
- `components/settings/default-knowledge-client.tsx`
- `components/settings/delete-account-form.tsx`
- `components/settings/deletion-pending-banner.tsx`
- `components/settings/desktop-app-settings.tsx`
- `components/settings/discovery-profile-settings.tsx`
- `components/settings/email-change-form.tsx`
- `components/settings/embed-code-panel.tsx`
- `components/settings/event-label-editor.tsx`
- `components/settings/gdpr-tools.tsx`
- `components/settings/google-integrations.tsx`
- `components/settings/google-review-url-form.tsx`
- `components/settings/guided-pricing-setup.tsx`
- `components/settings/ical-feed-settings.tsx`
- `components/settings/incidents-dashboard.tsx`
- `components/settings/integration-callback-toast.tsx`
- `components/settings/integration-center.tsx`
- `components/settings/menu-engine-form.tsx`
- `components/settings/mobile-tab-form.tsx`
- `components/settings/notification-settings-form.tsx`
- `components/settings/notification-tier-settings.tsx`
- `components/settings/payment-methods-settings.tsx`
- `components/settings/platform-connection-card.tsx`
- `components/settings/preferences-form.tsx`
- `components/settings/pricing-config-form.tsx`
- `components/settings/print-settings-form.tsx`
- `components/settings/public-profile-settings.tsx`
- `components/settings/schedule-blocks-manager.tsx`
- `components/settings/scheduling-rules-form.tsx`
- `components/settings/seasonal-palette-form.tsx`
- `components/settings/seasonal-palette-list.tsx`
- `components/settings/settings-advanced-directory.tsx`
- `components/settings/settings-category.tsx`
- `components/settings/settings-fix-actions.tsx`
- `components/settings/settings-tone.ts`
- `components/settings/shell-diagnostics-card.tsx`
- `components/settings/taxonomy-settings.tsx`
- `components/settings/webhook-settings.tsx`
- `components/settings/yelp-settings.tsx`
- `components/settings/zapier-settings.tsx`
- `components/staff/availability-grid.tsx`
- `components/staff/create-staff-login-form.tsx`
- `components/staff/offline-detector.tsx`
- `components/staff/onboarding-checklist.tsx`
- `components/staff/performance-board.tsx`
- `components/staff/shift-form.tsx`
- `components/staff/staff-board-refresher.tsx`
- `components/staff/staff-clipboard-view.tsx`
- `components/staff/staff-event-view.tsx`
- `components/staff/staff-member-form.tsx`
- `components/staff/staff-nav.tsx`
- `components/staff/staff-notification-bell.tsx`
- `components/staff/staff-notification-list.tsx`
- `components/staff/staff-search-filter.tsx`
- `components/staff/staff-shift-controls.tsx`
- `components/staff/staff-task-checkbox.tsx`
- `components/staff/va-task-detail.tsx`
- `components/staff/va-task-form.tsx`
