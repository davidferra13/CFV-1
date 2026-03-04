# Remy Action Audit Log

Every Remy physical action executed on behalf of a chef is logged server-side in `remy_action_audit_log`.

## Scope

- Logged at the execution choke point: `approveTask(...)` in `lib/ai/command-orchestrator.ts`.
- Covers:
  - Agent registry commit actions (`agentAction.commitAction(...)`).
  - Legacy write path (`event.create_draft` insert).
  - Blocked attempts (restricted actions or invalid commit payloads).
- Invisible to chefs by default (no UI requirement).

## Reliability guarantees

- Execution is hard-blocked if audit row creation fails.
- Final audit update is retried once before giving up.
- If finalization still fails, action result is not rolled back, but a server error is logged and the row remains `started`.

## Stored fields

- Actor + tenant: `tenant_id`, `chef_id`, `auth_user_id`.
- Action identity: `task_type`, `source`.
- Status lifecycle: `started`, `success`, `error`, `blocked`.
- Payloads: `request_payload`, `result_payload` (sanitized/truncated).
- Timing: `started_at`, `finished_at`, `duration_ms`, `created_at`.

## Data minimization

Payloads are sanitized and bounded in `lib/ai/remy-action-audit-actions.ts`:

- Truncated strings.
- Bounded array/object size.
- Max depth limit.
- JSON length cap.

## Access control

RLS is enabled for `remy_action_audit_log`:

- Chef tenant members can `SELECT`, `INSERT`, and `UPDATE` rows for their own tenant.
- No `DELETE` policy is provided.

## Deploy

Run your migration flow to create the table:

```bash
supabase db push
```

## Verify quickly

```sql
select status, task_type, started_at, finished_at, duration_ms
from remy_action_audit_log
order by created_at desc
limit 25;
```
