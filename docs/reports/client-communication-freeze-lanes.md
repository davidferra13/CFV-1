# Client Communication Freeze Lanes

- Date: 2026-05-01
- Branch: `feature/v1-builder-runtime-scaffold`
- Scope: client and communication orphan bucket files assigned to this worker
- Decision: prune only two unreferenced duplicate client wrappers, retain high-risk client history and communication behavior

## Guardrails

- No product feature work was added.
- No database files, migrations, generated types, runtime processes, server controls, or production paths were touched.
- Searches used exact path imports, exported symbol refs, docs, and canonical owner checks.
- Historical docs and reports were treated as audit artifacts, not live callers.

## Deleted Duplicate Wrappers

| File                                           | Classification            | Proof                                                                                                                                                               | Canonical owner                                                                                                                                                                                  |
| ---------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/communication/email-composer.tsx`  | duplicate prune-candidate | Exact path search found no live app, component, lib, test, or script imports. The component only opened `mailto:` and did not use a server action or send pipeline. | `components/messages/message-log-form.tsx`, `components/communication/schedule-message-dialog.tsx`, inquiry response composer, and explicit handoff actions on client, event, and inquiry pages. |
| `components/communication/sync-now-button.tsx` | duplicate prune-candidate | Exact path search found no live app, component, lib, test, or script imports. The component only called `triggerGmailSync()`.                                       | `components/settings/google-integrations.tsx` and `components/inquiries/gmail-sync-strip.tsx`, both live callers of `triggerGmailSync()` from `lib/gmail/actions.ts`.                            |

`tsconfig.ci.expanded.json` was updated only to remove the two deleted explicit file entries.

## Retained Or Recovered

| File                                               | Classification | Reason                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/clients/dietary-alert-panel.tsx`       | keep/recover   | No live import path found, but it renders and acknowledges dietary change alerts. Dietary safety is protected behavior and `lib/clients/actions.ts` still logs dietary changes through `lib/clients/dietary-alert-actions.ts`.                                                           |
| `components/clients/dietary-trend-dashboard.tsx`   | keep/recover   | No live import path found, but it reads dietary trend data. Dietary trend behavior should be recovered or reviewed with the dietary owner instead of deleted.                                                                                                                            |
| `components/clients/followup-rules-manager.tsx`    | keep/recover   | No live import path found, but it manages `client_followup_rules`. `app/api/scheduled/client-followup-rules/route.ts` now references that table, so this is not a safe stray duplicate.                                                                                                  |
| `components/clients/gift-log-panel.tsx`            | keep/recover   | No live import path found, but it is a CRUD surface for `lib/clients/gifting-actions.ts`. `components/dashboard/gift-suggestions-widget.tsx` also writes gift entries, so gift history should remain recoverable.                                                                        |
| `components/clients/household-allergen-matrix.tsx` | keep/recover   | Only a graveyard relative import was found, but allergen matrix display is safety-critical and not a pure duplicate wrapper.                                                                                                                                                             |
| `components/clients/kitchen-inventory-panel.tsx`   | keep/recover   | No live import path found, but it fronts `lib/clients/kitchen-inventory-actions.ts`. The live client detail page uses `KitchenProfilePanel`, but inventory CRUD behavior is unique enough to retain for owner review.                                                                    |
| `components/clients/preference-insights.tsx`       | keep/recover   | No live import path found, but it displays learned preference patterns. Preference history and client memory should not be deleted without owner confirmation.                                                                                                                           |
| `components/clients/preference-panel.tsx`          | keep/recover   | No live import path found, but it uses `lib/clients/preference-actions.ts` for client preference CRUD. Live client surfaces use `ClientPreferencePanel` and `ClientPreferences`, but this file is not just a pass-through wrapper.                                                       |
| `components/clients/referral-panel.tsx`            | keep/recover   | No live import path found, but it uses live referral actions and per-client referral CRUD. `components/analytics/referral-dashboard.tsx` shares the referral action owner, so deletion would remove dormant but unique client referral management UI.                                    |
| `lib/clients/communication-actions.ts`             | keep/recover   | No live import path found, but it aggregates client timeline and communication stats from events, inquiries, messages, notes, quotes, payments, and referrals. Client history is protected behavior.                                                                                     |
| `lib/clients/lifetime-value-actions.ts`            | keep/recover   | No live import path found, but it computes lifetime value, top clients by revenue, and retention metrics. Money and client value behavior should remain for finance owner review.                                                                                                        |
| `lib/clients/relationship-closure-actions.ts`      | keep/recover   | Specs explicitly assign closure actions to this file. Relationship closure is protected behavior and not a duplicate wrapper.                                                                                                                                                            |
| `lib/communication/automation-actions.ts`          | keep           | `tests/unit/communication-automation-actions.test.ts` reads this file. It owns automation rule CRUD and execution semantics, with non-blocking action handling.                                                                                                                          |
| `lib/communication/follow-up-actions.ts`           | uncertain      | No live import path found, and other follow-up owners exist (`lib/follow-up/follow-up-actions.ts`, `lib/inquiries/follow-up-actions.ts`). It touches communication sequences, so retain until a communication owner confirms table and trigger ownership.                                |
| `lib/communication/payment-milestone-actions.ts`   | uncertain      | Existing communication orphan report found no live imports and canonical payment milestone ownership in `lib/payments/milestones.ts`, but retained this file because it touches money and reminder state. I kept that decision.                                                          |
| `lib/communication/survey-actions.ts`              | uncertain      | Existing communication orphan report found no live imports and canonical survey owners in `lib/post-event/trust-loop-actions.ts` and `lib/feedback/surveys-actions.ts`, but retained this file because it touches client survey submission and review eligibility. I kept that decision. |
| `lib/communication/templates/defaults.ts`          | uncertain      | No live import path found, but the default template content is unique seed material. `lib/communication/templates/actions.ts` is the live CRUD owner, but no live replacement for these shipped defaults was proven.                                                                     |

## Proof Commands

```text
rg -n "dietary-alert-panel|dietary-trend-dashboard|followup-rules-manager|gift-log-panel|household-allergen-matrix|kitchen-inventory-panel|preference-insights|preference-panel|referral-panel|email-composer|sync-now-button|communication-actions|lifetime-value-actions|relationship-closure-actions|automation-actions|follow-up-actions|payment-milestone-actions|survey-actions|communication/templates/defaults" -S .
rg -n "DEFAULT_TEMPLATES|DefaultTemplate|templates/defaults|communication/templates/defaults" app components lib tests scripts docs tsconfig.ci.expanded.json --glob "!lib/communication/templates/defaults.ts"
rg -n "SyncNowButton|sync-now-button|triggerGmailSync|GmailSync|gmail sync|Sync Now" app components lib tests docs --glob "!components/communication/sync-now-button.tsx"
rg -n "EmailComposer|email-composer|mailto:|compose email|ScheduleMessageDialog|MessageLogForm" app components lib tests docs --glob "!components/communication/email-composer.tsx"
rg -n "getClientTimeline|getClientCommunicationStats|addCommunicationNote|getCommunicationNotes|TimelineItem|CommunicationStats|communication-actions" app components lib tests docs --glob "!lib/clients/communication-actions.ts"
rg -n "getClientLifetimeValue|getTopClientsByRevenue|getClientRetentionMetrics|ClientLifetimeValue|TopClientByRevenue|lifetime-value-actions" app components lib tests docs --glob "!lib/clients/lifetime-value-actions.ts"
rg -n -F "@/lib/clients/referral-actions" app components lib tests
rg -n "\b(addReferral|getClientReferrals|updateReferralStatus|deleteReferral|getReferralDashboard)\b" app components lib tests --glob "!components/clients/referral-panel.tsx" --glob "!lib/clients/referral-actions.ts"
```

## Validation Notes

Validation was run after deletion:

- Exact removed-path scan returned no matches in `app`, `components`, `lib`, `tests`, or `scripts`.
- `tsconfig.ci.expanded.json` no longer lists either deleted file.
- The expanded tsconfig missing-file check is polluted by unrelated dirty deletions outside this task: `components/ai/pricing-intelligence-panel.tsx`, `components/ai/recipe-scaling-panel.tsx`, `components/ai/remy-public-widget.tsx`, `components/ui/offline-banner.tsx`, and `components/ui/theme-toggle.tsx`.
- The report passed the banned dash and nocheck directive scan.
- `npm run typecheck:app` was run because TSX files were deleted.
