# Prospecting Hub — Wave 4.2: Polish & Power Features

> Implemented: 2026-02-27
> Rating before: 91/100 | Target: 95+/100

## Summary

Five improvements that push the prospecting system from "solid" to "professional-grade":

| #   | Feature                     | What It Does                                                                       |
| --- | --------------------------- | ---------------------------------------------------------------------------------- |
| 1   | **Email Send from Dossier** | Send emails directly to prospects via connected Gmail API — no copy-paste          |
| 2   | **Prospect Tag Editor**     | Add/remove tags inline on the dossier page with instant save                       |
| 3   | **Pipeline Stage History**  | Track every stage transition with timestamps for funnel analytics                  |
| 4   | **Bulk Actions**            | Select multiple prospects in the table + batch update status/stage/priority/delete |
| 5   | **Follow-Up Reminders**     | Sync overdue follow-ups into the chef's todo list as actionable reminders          |

## Files Created

| File                                                                          | Purpose                                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `components/prospecting/send-email-panel.tsx`                                 | Gmail send form with subject/body, logs outreach automatically |
| `components/prospecting/prospect-tag-editor.tsx`                              | Inline tag add/remove with keyboard support (Enter to add)     |
| `components/prospecting/stage-history-panel.tsx`                              | Timeline of pipeline stage transitions with color-coded badges |
| `components/prospecting/bulk-action-bar.tsx`                                  | Batch status/stage/priority/delete bar with confirmation modal |
| `components/prospecting/follow-up-reminder-button.tsx`                        | Syncs due follow-ups into chef_todos                           |
| `supabase/migrations/20260327000015_prospect_stage_history_and_reminders.sql` | `prospect_stage_history` table with RLS                        |

## Files Modified

| File                                             | Changes                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/prospecting/pipeline-actions.ts`            | Added 7 new server actions: `sendProspectEmail`, `updateProspectTags`, `getStageHistory`, `bulkUpdateProspects`, `bulkDeleteProspects`, `createFollowUpReminders`; updated `updatePipelineStage` to record history |
| `lib/prospecting/types.ts`                       | Added `StageHistoryEntry` interface                                                                                                                                                                                |
| `components/prospecting/prospect-table.tsx`      | Added checkbox selection column + `BulkActionBar` integration                                                                                                                                                      |
| `app/(chef)/prospecting/[id]/page.tsx`           | Fetches `getStageHistory` in parallel, passes to dossier client                                                                                                                                                    |
| `app/(chef)/prospecting/[id]/dossier-client.tsx` | Added `SendEmailPanel`, `ProspectTagEditor`, `StageHistoryPanel` imports and render                                                                                                                                |
| `app/(chef)/prospecting/page.tsx`                | Added `FollowUpReminderButton` to batch actions row                                                                                                                                                                |

## Architecture Notes

### Email Send

- Uses existing Gmail infrastructure: `getGoogleAccessToken()` + `sendEmail()`
- Auto-advances pipeline stage (new/researched -> contacted) on send
- Logs outreach + activity automatically
- Pre-fills body with AI draft email if one exists

### Stage History

- Records `from_stage` -> `to_stage` + timestamp + optional notes
- Inserted on every `updatePipelineStage` call (non-blocking)
- Also recorded during bulk updates and email-triggered auto-advances
- Enables future conversion funnel analytics (time in stage, dropout rates)

### Bulk Actions

- Checkbox column on prospect table with select-all
- Batch update: status, pipeline stage, priority
- Batch delete with confirmation modal
- Max 100 per batch (safety limit)
- Stage history recorded for bulk pipeline changes

### Follow-Up Reminders

- Scans for prospects with status='follow_up' and overdue `next_follow_up_at`
- Creates `chef_todos` entries (avoids duplicates via text matching)
- Manual trigger via "Sync Reminders" button — no background cron needed
